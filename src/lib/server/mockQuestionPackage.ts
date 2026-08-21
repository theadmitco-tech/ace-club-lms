import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { CellValue, Worksheet } from 'exceljs';
import {
  MOCK_DIFFICULTIES,
  MOCK_QUESTION_TYPES,
  MOCK_RESPONSE_TYPES,
  type MockDifficulty,
  type MockQuestionType,
  type MockResponseType,
  type MockSection,
  type NormalizedAsset,
  type NormalizedOption,
  type NormalizedQuestion,
  type NormalizedStimulus,
  type PackageIssue,
  type ParsedQuestionPackage,
  type ParseQuestionPackageContext,
  type RichContentV1,
} from '../mockQuestionBank/types';
import {
  expectedSection,
  getImageMetadata,
  responseTypeAllowed,
  sha256,
  stableStringify,
  validateRichContent,
  validateSafeJson,
} from '../mockQuestionBank/validation';

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 70 * 1024 * 1024;
const MAX_JSON_BYTES = 512 * 1024;
const MAX_QUESTIONS = 500;
const MAX_STIMULI = 200;
const MAX_ASSETS = 200;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const SCHEMA_VERSION = 'ace-gmat-question-package/1.0' as const;
const UUID_V4 = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const QUESTION_ID = new RegExp(`^Q-(PS|DS|CR|RC|GI|TI|MSR|TPA)-${UUID_V4}$`, 'i');
const STIMULUS_ID = new RegExp(`^STIM-${UUID_V4}$`, 'i');
const ASSET_ID = new RegExp(`^ASSET-${UUID_V4}$`, 'i');
const NAMESPACE = /^[A-Z][A-Z0-9]{1,7}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ALLOWED_STIMULI = new Set(['rich_text', 'passage', 'graphic', 'sortable_table', 'tabbed_content', 'two_part_context']);
const ALLOWED_ACTIONS = new Set(['reject', 'skip', 'new_revision']);
const IGNORED_FORMULA_FIELDS = new Set(['canonical_question_key', 'canonical_stimulus_key', 'canonical_asset_key', 'duplicate_check']);

type WorkbookRow = Record<string, string | number | boolean | null> & { __row: number };
type PackageFiles = { workbookBytes: Buffer; assets: Map<string, Buffer> };

function addIssue(
  issues: PackageIssue[],
  sheet: string,
  message: string,
  correctiveAction: string,
  row?: number,
  field?: string,
  severity: 'error' | 'warning' = 'error',
) {
  issues.push({ severity, sheet, row, field, message, correctiveAction });
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  const minimum = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function inspectZipDirectory(bytes: Buffer) {
  const eocd = findEndOfCentralDirectory(bytes);
  if (eocd < 0) throw new Error('The ZIP central directory is missing or corrupt.');
  const entryCount = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  let offset = bytes.readUInt32LE(eocd + 16);
  if (entryCount > 250 || centralSize > 2 * 1024 * 1024) throw new Error('The ZIP contains too many entries.');
  let totalUncompressed = 0;
  const names: string[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('The ZIP directory is corrupt.');
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const uncompressed = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength).replaceAll('\\', '/');
    if (flags & 1) throw new Error('Encrypted ZIP entries are not accepted.');
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method for ${name}.`);
    if (!name || name.startsWith('/') || name.includes('\0') || name.split('/').some((part) => part === '..')) {
      throw new Error(`Unsafe ZIP path: ${name || '(empty)'}.`);
    }
    totalUncompressed += uncompressed;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error('The ZIP expands beyond the 70 MB safety limit.');
    names.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

async function normalizeWorkbookNamespacePrefixes(bytes: Buffer): Promise<Buffer> {
  inspectZipDirectory(bytes);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false });
  let changed = false;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.toLowerCase().endsWith('.xml')) continue;
    const xml = await entry.async('string');
    const match = xml.match(/xmlns:([A-Za-z][\w.-]*)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/);
    if (!match) continue;
    const prefix = match[1];
    const normalized = xml
      .replace(match[0], 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')
      .replaceAll(`<${prefix}:`, '<')
      .replaceAll(`</${prefix}:`, '</');
    if (normalized !== xml) {
      zip.file(entry.name, normalized);
      changed = true;
    }
  }
  if (!changed) return bytes;
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

async function unpackPackage(bytes: Buffer, fileName: string): Promise<PackageFiles> {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.xlsx')) {
    if (bytes.length > MAX_WORKBOOK_BYTES) throw new Error('Workbook exceeds the 10 MB limit.');
    return { workbookBytes: await normalizeWorkbookNamespacePrefixes(bytes), assets: new Map() };
  }
  if (!lowerName.endsWith('.zip')) throw new Error('Choose an .xlsx workbook or a .zip package.');
  if (bytes.length > MAX_ZIP_BYTES) throw new Error('ZIP package exceeds the 50 MB limit.');
  const names = inspectZipDirectory(bytes);
  const workbookNames = names.filter((name) => !name.endsWith('/') && !name.includes('/') && name.toLowerCase().endsWith('.xlsx'));
  const unexpected = names.filter((name) => !name.endsWith('/') && !workbookNames.includes(name) && !name.startsWith('assets/'));
  if (workbookNames.length !== 1) throw new Error('ZIP must contain exactly one XLSX workbook at its root.');
  if (unexpected.length) throw new Error(`ZIP contains unexpected file: ${unexpected[0]}.`);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false });
  const rawWorkbookBytes = await zip.file(workbookNames[0])!.async('nodebuffer');
  if (rawWorkbookBytes.length > MAX_WORKBOOK_BYTES) throw new Error('Workbook exceeds the 10 MB limit.');
  const workbookBytes = await normalizeWorkbookNamespacePrefixes(rawWorkbookBytes);
  const assets = new Map<string, Buffer>();
  for (const name of names.filter((entry) => entry.startsWith('assets/') && !entry.endsWith('/'))) {
    const assetBytes = await zip.file(name)!.async('nodebuffer');
    if (assetBytes.length > MAX_ASSET_BYTES) throw new Error(`Asset ${name} exceeds the 10 MB limit.`);
    assets.set(name, assetBytes);
  }
  if (assets.size > MAX_ASSETS) throw new Error(`Package exceeds the ${MAX_ASSETS}-asset limit.`);
  return { workbookBytes, assets };
}

function cellPrimitive(value: CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if ('result' in value) return cellPrimitive(value.result as CellValue);
  if ('text' in value) return value.text;
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('hyperlink' in value) return String(value.hyperlink);
  return String(value);
}

function readSheet(workbook: ExcelJS.Workbook, name: string, issues: PackageIssue[]): WorkbookRow[] {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) {
    addIssue(issues, name, `Required sheet “${name}” is missing.`, `Restore the ${name} sheet from the canonical template.`);
    return [];
  }
  const headers = (sheet.getRow(1).values as CellValue[]).slice(1).map((value) => String(cellPrimitive(value) ?? '').trim());
  if (!headers.length || headers.some((header) => !header)) {
    addIssue(issues, name, 'Header row is incomplete.', 'Use row 1 from the canonical template.');
    return [];
  }
  const rows: WorkbookRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = { __row: rowNumber } as WorkbookRow;
    let hasValue = false;
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const advisoryFormula = cell.type === ExcelJS.ValueType.Formula && IGNORED_FORMULA_FIELDS.has(header);
      if (cell.type === ExcelJS.ValueType.Formula && !advisoryFormula) {
        addIssue(issues, name, 'Formulas are not accepted in import data fields.', `Replace the formula in ${header} with its literal value.`, rowNumber, header);
      }
      const value = cellPrimitive(cell.value);
      record[header] = typeof value === 'string' ? value.trim() : value;
      if (!advisoryFormula && value !== null && value !== '') hasValue = true;
    });
    if (hasValue) rows.push(record);
  });
  return rows;
}

function text(row: WorkbookRow, field: string): string {
  const value = row[field];
  return value === null || value === undefined ? '' : String(value).trim();
}

function integer(row: WorkbookRow, field: string): number | null {
  const raw = row[field];
  const value = typeof raw === 'number' ? raw : Number.parseInt(text(row, field), 10);
  return Number.isInteger(value) ? value : null;
}

function boolean(row: WorkbookRow, field: string): boolean | null {
  const raw = row[field];
  if (typeof raw === 'boolean') return raw;
  const value = text(row, field).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(value)) return true;
  if (['false', '0', 'no', 'n'].includes(value)) return false;
  return null;
}

function jsonField(
  row: WorkbookRow,
  field: string,
  sheet: string,
  issues: PackageIssue[],
  required = true,
): unknown | null {
  const raw = text(row, field);
  if (!raw) {
    if (required) addIssue(issues, sheet, `${field} is required.`, `Populate ${field} with valid JSON.`, row.__row, field);
    return null;
  }
  if (Buffer.byteLength(raw) > MAX_JSON_BYTES) {
    addIssue(issues, sheet, `${field} exceeds 512 KB.`, `Reduce ${field} below 512 KB.`, row.__row, field);
    return null;
  }
  try {
    const value = JSON.parse(raw) as unknown;
    for (const error of validateSafeJson(value)) addIssue(issues, sheet, error, `Remove unsafe or unsupported JSON from ${field}.`, row.__row, field);
    return value;
  } catch {
    addIssue(issues, sheet, `${field} is not valid JSON.`, `Correct the JSON syntax in ${field}.`, row.__row, field);
    return null;
  }
}

function manifestValues(sheet: Worksheet | undefined): Map<string, string> {
  const values = new Map<string, string>();
  if (!sheet) return values;
  sheet.eachRow((row, number) => {
    if (number < 4) return;
    const key = String(cellPrimitive(row.getCell(1).value) ?? '').trim();
    const value = String(cellPrimitive(row.getCell(2).value) ?? '').trim();
    if (key) values.set(key, value);
  });
  return values;
}

function normalizeSection(value: string): MockSection | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'quant') return 'quant';
  if (normalized === 'verbal') return 'verbal';
  if (normalized === 'di' || normalized === 'data insights' || normalized === 'data_insights') return 'data_insights';
  return null;
}

function normalizeResponseType(value: string): MockResponseType | null {
  const normalized = value.trim().toLowerCase();
  if (MOCK_RESPONSE_TYPES.includes(normalized as MockResponseType)) return normalized as MockResponseType;
  if (normalized === 'multi_slot_single_choice') return 'dropdowns';
  if (normalized === 'table_binary') return 'binary_matrix';
  if (normalized === 'two_part_choice') return 'two_part_matrix';
  return null;
}

function parseOptions(rows: WorkbookRow[], namespace: string, issues: PackageIssue[]) {
  const byQuestion = new Map<string, NormalizedOption[]>();
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceNamespace = text(row, 'source_namespace').toUpperCase();
    const questionId = text(row, 'source_question_id');
    const slotId = text(row, 'response_slot_id');
    const optionId = text(row, 'option_id');
    const displayOrder = integer(row, 'display_order');
    const isCorrect = boolean(row, 'is_correct');
    if (sourceNamespace !== namespace) addIssue(issues, 'Response Options', 'Option namespace differs from the Manifest.', 'Use the one submitting namespace throughout the package.', row.__row, 'source_namespace');
    if (!QUESTION_ID.test(questionId)) addIssue(issues, 'Response Options', 'Invalid source_question_id.', 'Use Q-{TYPE}-{UUIDv4}.', row.__row, 'source_question_id');
    if (!SAFE_ID.test(slotId)) addIssue(issues, 'Response Options', 'Invalid response_slot_id.', 'Use a stable 1–80 character letter/number/dash/underscore ID.', row.__row, 'response_slot_id');
    if (!SAFE_ID.test(optionId)) addIssue(issues, 'Response Options', 'Invalid option_id.', 'Use a stable 1–80 character letter/number/dash/underscore ID.', row.__row, 'option_id');
    if (displayOrder === null || displayOrder < 1) addIssue(issues, 'Response Options', 'display_order must be a positive integer.', 'Enter 1, 2, 3… within each slot.', row.__row, 'display_order');
    if (isCorrect === null) addIssue(issues, 'Response Options', 'is_correct must be TRUE or FALSE.', 'Mark exactly one option correct in each response slot.', row.__row, 'is_correct');
    const contentRaw = jsonField(row, 'option_content_json', 'Response Options', issues);
    const content = validateRichContent(contentRaw);
    for (const error of content.errors) addIssue(issues, 'Response Options', error, 'Use only RichContentV1 allowlisted nodes.', row.__row, 'option_content_json');
    const key = `${questionId}::${slotId}::${optionId}`;
    if (seen.has(key)) addIssue(issues, 'Response Options', 'Duplicate option identity in package.', 'Keep one row per question/slot/option ID.', row.__row, 'option_id');
    seen.add(key);
    if (questionId && slotId && optionId && displayOrder && isCorrect !== null && content.value) {
      const option: NormalizedOption = { slotId, optionId, displayOrder, content: content.value, isCorrect };
      byQuestion.set(questionId, [...(byQuestion.get(questionId) ?? []), option]);
    }
  }
  return byQuestion;
}

function validateOptionShape(question: NormalizedQuestion, issues: PackageIssue[], row: number) {
  if (!question.options.length) {
    addIssue(issues, 'Questions', 'Question has no response options.', 'Add Response Options rows with stable slot and option IDs.', row, 'source_question_id');
    return;
  }
  const slots = new Map<string, NormalizedOption[]>();
  for (const option of question.options) slots.set(option.slotId, [...(slots.get(option.slotId) ?? []), option]);
  for (const [slot, options] of slots) {
    if (options.filter((option) => option.isCorrect).length !== 1) {
      addIssue(issues, 'Response Options', `Slot ${slot} must have exactly one correct option.`, 'Correct the is_correct flags.', row, 'is_correct');
    }
    const order = options.map((option) => option.displayOrder);
    if (new Set(order).size !== order.length) addIssue(issues, 'Response Options', `Slot ${slot} repeats a display order.`, 'Use a unique display order within the slot.', row, 'display_order');
  }
  if (question.responseType === 'single_choice' && slots.size !== 1) addIssue(issues, 'Questions', 'single_choice requires exactly one response slot.', 'Use one stable slot, normally “answer”.', row, 'response_type');
  if ((question.questionType === 'PS' || question.questionType === 'DS' || question.questionType === 'CR' || question.questionType === 'RC') && question.options.length !== 5) {
    addIssue(issues, 'Response Options', `${question.questionType} requires five response options.`, 'Provide five ordered options.', row, 'source_question_id');
  }
  if (question.responseType === 'two_part_matrix' && slots.size !== 2) addIssue(issues, 'Questions', 'TPA requires exactly two response slots.', 'Provide the two declared TPA columns.', row, 'response_type');
}

function parseStimuli(rows: WorkbookRow[], namespace: string, issues: PackageIssue[], context: ParseQuestionPackageContext) {
  const stimuli: NormalizedStimulus[] = [];
  const seen = new Set<string>();
  const duplicateKeys: string[] = [];
  for (const row of rows) {
    const sourceNamespace = text(row, 'source_namespace').toUpperCase();
    const sourceStimulusId = text(row, 'source_stimulus_id');
    const stimulusType = text(row, 'stimulus_type').toLowerCase();
    const action = text(row, 'conflict_action').toLowerCase() || 'reject';
    if (sourceNamespace !== namespace) addIssue(issues, 'Stimuli', 'Stimulus namespace differs from the Manifest.', 'Use the one submitting namespace throughout the package.', row.__row, 'source_namespace');
    if (!STIMULUS_ID.test(sourceStimulusId)) addIssue(issues, 'Stimuli', 'Invalid source_stimulus_id.', 'Use STIM-{UUIDv4}.', row.__row, 'source_stimulus_id');
    if (!ALLOWED_STIMULI.has(stimulusType)) addIssue(issues, 'Stimuli', 'Unsupported stimulus_type.', 'Use an allowed stimulus type from the template.', row.__row, 'stimulus_type');
    if (!ALLOWED_ACTIONS.has(action)) addIssue(issues, 'Stimuli', 'Invalid conflict_action.', 'Use reject, skip, or new_revision.', row.__row, 'conflict_action');
    const key = `${sourceNamespace}::${sourceStimulusId}`;
    if (seen.has(key)) addIssue(issues, 'Stimuli', 'Duplicate stimulus identity within package.', 'Keep one row per namespace/stimulus ID.', row.__row, 'source_stimulus_id');
    seen.add(key);
    const content = jsonField(row, 'content_json', 'Stimuli', issues);
    const config = jsonField(row, 'config_json', 'Stimuli', issues, false) ?? {};
    const fingerprint = sha256(stableStringify({ stimulusType, content, config }));
    const existing = context.existing.stimuli.get(key);
    if (existing) {
      duplicateKeys.push(key);
      if (action === 'reject') addIssue(issues, 'Stimuli', 'Existing stimulus ID conflicts with reject policy.', 'Choose skip or new_revision explicitly after review.', row.__row, 'conflict_action');
    } else if (action !== 'reject') {
      addIssue(issues, 'Stimuli', `${action} has no existing stimulus to act on.`, 'Use reject for a new stimulus.', row.__row, 'conflict_action');
    }
    if (!existing && context.existing.stimulusFingerprints.has(fingerprint)) {
      duplicateKeys.push(key);
      addIssue(issues, 'Stimuli', 'Content resembles an existing stimulus.', 'Review the likely duplicate before import.', row.__row, 'content_json', 'warning');
    }
    if (sourceNamespace && sourceStimulusId && ALLOWED_STIMULI.has(stimulusType) && ALLOWED_ACTIONS.has(action) && content !== null) {
      stimuli.push({
        sourceNamespace,
        sourceStimulusId,
        stimulusType: stimulusType as NormalizedStimulus['stimulusType'],
        title: null,
        content,
        config,
        revisionNote: text(row, 'revision_note') || null,
        action: action as NormalizedStimulus['action'],
        contentFingerprint: fingerprint,
      });
    }
  }
  return { stimuli, duplicateKeys };
}

function parseAssets(
  rows: WorkbookRow[], namespace: string, packageId: string, files: Map<string, Buffer>, issues: PackageIssue[], context: ParseQuestionPackageContext,
) {
  const assets: NormalizedAsset[] = [];
  const assetBytes = new Map<string, Buffer>();
  const seen = new Set<string>();
  const duplicateKeys: string[] = [];
  for (const row of rows) {
    const sourceNamespace = text(row, 'source_namespace').toUpperCase();
    const sourceAssetId = text(row, 'source_asset_id');
    const fileName = text(row, 'file_name').replaceAll('\\', '/');
    const declaredMime = text(row, 'mime_type').toLowerCase();
    const declaredSha = text(row, 'sha256').toLowerCase();
    const altText = text(row, 'alt_text');
    const declaredSize = integer(row, 'file_size_bytes');
    const declaredWidth = integer(row, 'width_px');
    const declaredHeight = integer(row, 'height_px');
    if (sourceNamespace !== namespace) addIssue(issues, 'Assets', 'Asset namespace differs from the Manifest.', 'Use the one submitting namespace throughout the package.', row.__row, 'source_namespace');
    if (!ASSET_ID.test(sourceAssetId)) addIssue(issues, 'Assets', 'Invalid source_asset_id.', 'Use ASSET-{UUIDv4}.', row.__row, 'source_asset_id');
    if (!fileName.startsWith('assets/') || fileName.split('/').some((part) => part === '..')) addIssue(issues, 'Assets', 'Asset path must be a safe assets/ path.', 'Place the file under assets/ in the ZIP.', row.__row, 'file_name');
    if (!altText) addIssue(issues, 'Assets', 'Alternative text is required.', 'Describe the meaningful visual information.', row.__row, 'alt_text');
    const key = `${sourceNamespace}::${sourceAssetId}`;
    if (seen.has(key)) addIssue(issues, 'Assets', 'Duplicate asset identity within package.', 'Keep one row per namespace/asset ID.', row.__row, 'source_asset_id');
    seen.add(key);
    const bytes = files.get(fileName);
    if (!bytes) {
      addIssue(issues, 'Assets', `Companion file ${fileName || '(blank)'} is missing.`, 'Add the exact file under assets/ and re-upload the ZIP.', row.__row, 'file_name');
      continue;
    }
    const metadata = getImageMetadata(bytes);
    if (!metadata) {
      addIssue(issues, 'Assets', 'File signature is not an accepted PNG, JPEG, or WebP image.', 'Supply the original supported image.', row.__row, 'mime_type');
      continue;
    }
    const actualSha = sha256(bytes);
    if (metadata.mimeType !== declaredMime) addIssue(issues, 'Assets', 'Declared MIME type does not match the file signature.', `Use ${metadata.mimeType} or replace the file.`, row.__row, 'mime_type');
    if (!SHA256.test(declaredSha) || declaredSha !== actualSha) addIssue(issues, 'Assets', 'Declared SHA-256 does not match the file.', `Set sha256 to ${actualSha}.`, row.__row, 'sha256');
    if (declaredSize !== bytes.length) addIssue(issues, 'Assets', 'Declared file size does not match the file.', `Set file_size_bytes to ${bytes.length}.`, row.__row, 'file_size_bytes');
    if (declaredWidth !== metadata.width || declaredHeight !== metadata.height) addIssue(issues, 'Assets', 'Declared dimensions do not match the image.', `Set dimensions to ${metadata.width} × ${metadata.height}.`, row.__row, 'width_px');
    const existing = context.existing.assets.get(key);
    if (existing) {
      duplicateKeys.push(key);
      addIssue(issues, 'Assets', 'Asset source ID already exists.', 'Use the existing immutable asset or create a new asset ID.', row.__row, 'source_asset_id');
    }
    if (metadata.mimeType === declaredMime && declaredSha === actualSha && declaredSize === bytes.length && declaredWidth === metadata.width && declaredHeight === metadata.height && altText) {
      const finalPath = `${namespace.toLowerCase()}/${packageId.replace(/[^A-Za-z0-9_-]/g, '_')}/${actualSha}-${sourceAssetId}.bin`;
      assets.push({
        sourceNamespace, sourceAssetId, fileName, mimeType: metadata.mimeType as NormalizedAsset['mimeType'], altText,
        usage: text(row, 'usage'), sourceQuestionId: text(row, 'source_question_id') || null,
        sourceStimulusId: text(row, 'source_stimulus_id') || null, sha256: actualSha, byteSize: bytes.length,
        widthPx: metadata.width, heightPx: metadata.height, finalPath,
      });
      assetBytes.set(sourceAssetId, bytes);
    }
  }
  for (const fileName of files.keys()) {
    if (!rows.some((row) => text(row, 'file_name').replaceAll('\\', '/') === fileName)) {
      addIssue(issues, 'Assets', `ZIP file ${fileName} has no Assets row.`, 'Remove the unexpected file or add complete metadata.', undefined, 'file_name');
    }
  }
  return { assets, assetBytes, duplicateKeys };
}

function parseQuestions(
  rows: WorkbookRow[], namespace: string, optionsByQuestion: Map<string, NormalizedOption[]>, stimulusTypes: Map<string, string>, issues: PackageIssue[], context: ParseQuestionPackageContext,
) {
  const questions: NormalizedQuestion[] = [];
  const duplicateKeys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sourceNamespace = text(row, 'source_namespace').toUpperCase();
    const sourceQuestionId = text(row, 'source_question_id');
    const questionType = text(row, 'question_type').toUpperCase() as MockQuestionType;
    const section = normalizeSection(text(row, 'section'));
    const responseType = normalizeResponseType(text(row, 'response_type'));
    const topic = text(row, 'topic');
    const subtopic = text(row, 'subtopic') || null;
    const difficulty = text(row, 'difficulty').toLowerCase() as MockDifficulty;
    const sourceStimulusId = text(row, 'source_stimulus_id') || null;
    const stimulusGroupOrder = sourceStimulusId ? integer(row, 'stimulus_group_order') : null;
    const action = text(row, 'conflict_action').toLowerCase() || 'reject';
    const answerConfirmation = text(row, 'answer_confirmation').toUpperCase();
    const answerCheck = text(row, 'answer_check').toUpperCase();
    const assetCheck = text(row, 'asset_check').toUpperCase();
    const validationStatus = text(row, 'validation_status').toUpperCase();
    if (sourceNamespace !== namespace) addIssue(issues, 'Questions', 'Question namespace differs from the Manifest.', 'Use the one submitting namespace throughout the package.', row.__row, 'source_namespace');
    if (!QUESTION_ID.test(sourceQuestionId) || !sourceQuestionId.startsWith(`Q-${questionType}-`)) addIssue(issues, 'Questions', 'Invalid or type-mismatched source_question_id.', 'Use Q-{TYPE}-{UUIDv4}.', row.__row, 'source_question_id');
    if (!MOCK_QUESTION_TYPES.includes(questionType)) addIssue(issues, 'Questions', 'Unsupported question_type.', 'Use PS, DS, CR, RC, GI, TI, MSR, or TPA.', row.__row, 'question_type');
    if (!section || (MOCK_QUESTION_TYPES.includes(questionType) && section !== expectedSection(questionType))) addIssue(issues, 'Questions', 'Section is incompatible with question type.', `Use ${MOCK_QUESTION_TYPES.includes(questionType) ? expectedSection(questionType) : 'the compatible section'}.`, row.__row, 'section');
    if (!responseType || (MOCK_QUESTION_TYPES.includes(questionType) && !responseTypeAllowed(questionType, responseType))) addIssue(issues, 'Questions', 'Response type is incompatible with question type.', 'Choose a response type from the canonical compatibility table.', row.__row, 'response_type');
    if (!MOCK_DIFFICULTIES.includes(difficulty)) addIssue(issues, 'Questions', 'Difficulty must be Easy, Medium, or Hard.', 'Choose an approved editorial difficulty.', row.__row, 'difficulty');
    if (!ALLOWED_ACTIONS.has(action)) addIssue(issues, 'Questions', 'Invalid conflict_action.', 'Use reject, skip, or new_revision.', row.__row, 'conflict_action');
    if (!['FOUNDER_CONFIRMED', 'SOURCE_CONFIRMED'].includes(answerConfirmation)) addIssue(issues, 'Questions', 'A founder- or source-confirmed answer is required.', 'Obtain and record a confirmed answer.', row.__row, 'answer_confirmation');
    if (!['PASS', 'UNVERIFIABLE_REVIEW'].includes(answerCheck)) addIssue(issues, 'Questions', 'Answer check blocks import.', 'Resolve missing or mismatched answer validation.', row.__row, 'answer_check');
    if (!['PASS', 'NOT_APPLICABLE'].includes(assetCheck)) addIssue(issues, 'Questions', 'Asset check blocks import.', 'Add or repair the required asset.', row.__row, 'asset_check');
    if (!['READY', 'REVIEW'].includes(validationStatus)) addIssue(issues, 'Questions', 'Validation status blocks import.', 'Resolve all BLOCKED validation findings.', row.__row, 'validation_status');
    if (!text(row, 'source_reference')) addIssue(issues, 'Questions', 'source_reference is required.', 'Record the supplied URL or filename.', row.__row, 'source_reference');
    const key = `${sourceNamespace}::${sourceQuestionId}`;
    if (seen.has(key)) addIssue(issues, 'Questions', 'Duplicate question identity within package.', 'Keep one row per namespace/question ID.', row.__row, 'source_question_id');
    seen.add(key);
    const existingStimulus = sourceStimulusId ? context.existing.stimuli.get(`${namespace}::${sourceStimulusId}`) : undefined;
    if (sourceStimulusId && !stimulusTypes.has(sourceStimulusId) && !existingStimulus) {
      addIssue(issues, 'Questions', 'Referenced stimulus is unresolved.', 'Add the Stimuli row or choose an existing stimulus explicitly.', row.__row, 'source_stimulus_id');
    }
    if (['RC', 'GI', 'TI', 'MSR', 'TPA'].includes(questionType) && !sourceStimulusId) addIssue(issues, 'Questions', `${questionType} requires a shared stimulus.`, 'Create or select the compatible stimulus.', row.__row, 'source_stimulus_id');
    const stimulusType = sourceStimulusId ? stimulusTypes.get(sourceStimulusId) ?? existingStimulus?.stimulusType : undefined;
    const expectedStimulusType: Partial<Record<MockQuestionType, string>> = { RC: 'passage', GI: 'graphic', TI: 'sortable_table', MSR: 'tabbed_content', TPA: 'two_part_context' };
    if (expectedStimulusType[questionType] && stimulusType && stimulusType !== expectedStimulusType[questionType]) addIssue(issues, 'Questions', `${questionType} is linked to an incompatible ${stimulusType} stimulus.`, `Use a ${expectedStimulusType[questionType]} stimulus.`, row.__row, 'source_stimulus_id');
    if (sourceStimulusId && (!stimulusGroupOrder || stimulusGroupOrder < 1)) addIssue(issues, 'Questions', 'Stimulus-linked questions need a positive group order.', 'Enter the consecutive order within the stimulus group.', row.__row, 'stimulus_group_order');
    const stemRaw = jsonField(row, 'question_content_json', 'Questions', issues);
    const stem = validateRichContent(stemRaw);
    for (const error of stem.errors) addIssue(issues, 'Questions', error, 'Use only RichContentV1 allowlisted nodes.', row.__row, 'question_content_json');
    const interaction = jsonField(row, 'interaction_config_json', 'Questions', issues) as Record<string, unknown> | null;
    const explanationRaw = jsonField(row, 'explanation_json', 'Questions', issues, false);
    const explanationResult = explanationRaw === null ? { value: null as RichContentV1 | null, errors: [] } : validateRichContent(explanationRaw);
    for (const error of explanationResult.errors) addIssue(issues, 'Questions', error, 'Use only RichContentV1 allowlisted nodes.', row.__row, 'explanation_json');
    const options = optionsByQuestion.get(sourceQuestionId) ?? [];
    const fingerprint = sha256(stableStringify({ section, questionType, responseType, topic, subtopic, stem: stemRaw, interaction, sourceStimulusId, options: options.map((option) => ({ slotId: option.slotId, optionId: option.optionId, displayOrder: option.displayOrder, content: option.content })) }));
    const existing = context.existing.questions.get(key);
    if (existing) {
      duplicateKeys.push(key);
      if (action === 'reject') addIssue(issues, 'Questions', 'Existing question ID conflicts with reject policy.', 'Choose skip or new_revision explicitly after review.', row.__row, 'conflict_action');
    } else if (action !== 'reject') {
      addIssue(issues, 'Questions', `${action} has no existing question to act on.`, 'Use reject for a new question.', row.__row, 'conflict_action');
    }
    if (!existing && context.existing.questionFingerprints.has(fingerprint)) {
      duplicateKeys.push(key);
      addIssue(issues, 'Questions', 'Content resembles an existing question.', 'Review the likely duplicate before import.', row.__row, 'question_content_json', 'warning');
    }
    const taxonomyMatches = context.taxonomy.filter((entry) => entry.section === section && entry.topic.toLowerCase() === topic.toLowerCase() && (entry.subtopic ?? '').toLowerCase() === (subtopic ?? '').toLowerCase());
    if (taxonomyMatches.length !== 1) addIssue(issues, 'Questions', taxonomyMatches.length ? 'Taxonomy label is ambiguous.' : 'Taxonomy label is unknown.', 'Choose one active canonical topic/subtopic mapping.', row.__row, subtopic ? 'subtopic' : 'topic');
    const answer: Record<string, string> = {};
    for (const option of options.filter((candidate) => candidate.isCorrect)) answer[option.slotId] = option.optionId;
    const canCreate = sourceNamespace === namespace && QUESTION_ID.test(sourceQuestionId) && MOCK_QUESTION_TYPES.includes(questionType)
      && section && responseType && responseTypeAllowed(questionType, responseType) && MOCK_DIFFICULTIES.includes(difficulty)
      && stem.value && interaction && ALLOWED_ACTIONS.has(action);
    if (canCreate) {
      const question: NormalizedQuestion = {
        sourceNamespace, sourceQuestionId, section, questionType, responseType, topic, subtopic, difficulty,
        sourceStimulusId, stimulusGroupOrder, stem: stem.value!, interaction, explanation: explanationResult.value,
        sourceReference: text(row, 'source_reference'), answerConfirmation: answerConfirmation as NormalizedQuestion['answerConfirmation'],
        answerCheck: answerCheck as NormalizedQuestion['answerCheck'], assetCheck: assetCheck as NormalizedQuestion['assetCheck'],
        validationStatus: validationStatus as NormalizedQuestion['validationStatus'], validationNotes: text(row, 'validation_notes') || null,
        action: action as NormalizedQuestion['action'], contentFingerprint: fingerprint, options, answer,
      };
      validateOptionShape(question, issues, row.__row);
      questions.push(question);
    }
  }
  for (const questionId of optionsByQuestion.keys()) {
    if (!rows.some((row) => text(row, 'source_question_id') === questionId)) addIssue(issues, 'Response Options', `Options reference missing question ${questionId}.`, 'Add the Questions row or remove the orphan options.');
  }
  return { questions, duplicateKeys };
}

export async function parseMockQuestionPackage(
  bytes: Buffer,
  fileName: string,
  context: ParseQuestionPackageContext,
): Promise<ParsedQuestionPackage> {
  const issues: PackageIssue[] = [];
  const packageFingerprint = sha256(bytes);
  let files: PackageFiles;
  try {
    files = await unpackPackage(bytes, fileName);
  } catch (error) {
    addIssue(issues, 'Package', error instanceof Error ? error.message : 'Unable to read package.', 'Use the canonical XLSX or safe ZIP package.');
    files = { workbookBytes: Buffer.alloc(0), assets: new Map() };
  }
  const workbook = new ExcelJS.Workbook();
  if (files.workbookBytes.length) {
    try {
      await workbook.xlsx.load(files.workbookBytes as unknown as ArrayBuffer);
    } catch {
      addIssue(issues, 'Workbook', 'Workbook is corrupt or is not a supported XLSX file.', 'Export a fresh XLSX from the canonical template.');
    }
  }
  const manifest = manifestValues(workbook.getWorksheet('Manifest'));
  if (!workbook.getWorksheet('Manifest')) addIssue(issues, 'Manifest', 'Required Manifest sheet is missing.', 'Restore the Manifest from the canonical template.');
  const schemaVersion = manifest.get('schema_version') ?? '';
  const packageId = manifest.get('package_id') ?? '';
  const packageName = manifest.get('package_name') ?? 'GMAT Question Import';
  const namespace = (manifest.get('submitting_namespace') ?? '').toUpperCase();
  if (schemaVersion !== SCHEMA_VERSION) addIssue(issues, 'Manifest', 'Unsupported schema_version.', `Use ${SCHEMA_VERSION}.`, undefined, 'schema_version');
  if (!packageId || packageId === 'replace-with-unique-package-id' || packageId.length > 160) addIssue(issues, 'Manifest', 'package_id must be a unique, non-placeholder value.', 'Enter a stable package ID up to 160 characters.', undefined, 'package_id');
  if (!NAMESPACE.test(namespace)) addIssue(issues, 'Manifest', 'Invalid submitting_namespace.', 'Use the permanent registered uppercase namespace.', undefined, 'submitting_namespace');
  if (!context.authorizedNamespaces.has(namespace)) addIssue(issues, 'Manifest', 'Uploader is not authorized for this active namespace.', 'Ask an Admin to register this signed-in account as a namespace member.', undefined, 'submitting_namespace');
  if (manifest.get('import_policy') !== 'all_or_nothing') addIssue(issues, 'Manifest', 'Only all_or_nothing import is supported.', 'Set import_policy to all_or_nothing.', undefined, 'import_policy');
  const questionRows = readSheet(workbook, 'Questions', issues);
  const stimulusRows = readSheet(workbook, 'Stimuli', issues);
  const optionRows = readSheet(workbook, 'Response Options', issues);
  const assetRows = readSheet(workbook, 'Assets', issues);
  if (questionRows.length > MAX_QUESTIONS) addIssue(issues, 'Questions', `Package exceeds the ${MAX_QUESTIONS}-question limit.`, 'Split the package into smaller imports.');
  if (stimulusRows.length > MAX_STIMULI) addIssue(issues, 'Stimuli', `Package exceeds the ${MAX_STIMULI}-stimulus limit.`, 'Split the package into smaller imports.');
  if (assetRows.length > MAX_ASSETS) addIssue(issues, 'Assets', `Package exceeds the ${MAX_ASSETS}-asset limit.`, 'Split the package into smaller imports.');
  if (!questionRows.length) addIssue(issues, 'Questions', 'No question rows were found.', 'Add at least one candidate question row.');
  const optionsByQuestion = parseOptions(optionRows, namespace, issues);
  const parsedStimuli = parseStimuli(stimulusRows, namespace, issues, context);
  const parsedQuestions = parseQuestions(questionRows, namespace, optionsByQuestion, new Map(parsedStimuli.stimuli.map((item) => [item.sourceStimulusId, item.stimulusType])), issues, context);
  const parsedAssets = parseAssets(assetRows, namespace, packageId, files.assets, issues, context);
  const assetIds = new Set(parsedAssets.assets.map((asset) => asset.sourceAssetId));
  for (const asset of parsedAssets.assets) {
    if (asset.sourceQuestionId && !parsedQuestions.questions.some((question) => question.sourceQuestionId === asset.sourceQuestionId)) addIssue(issues, 'Assets', 'Asset references an unresolved question.', 'Correct source_question_id.', undefined, 'source_question_id');
    if (asset.sourceStimulusId && !parsedStimuli.stimuli.some((stimulus) => stimulus.sourceStimulusId === asset.sourceStimulusId)) addIssue(issues, 'Assets', 'Asset references an unresolved stimulus.', 'Correct source_stimulus_id.', undefined, 'source_stimulus_id');
  }
  for (const stimulus of parsedStimuli.stimuli) {
    const json = stableStringify(stimulus.content);
    const assetMatches = [...json.matchAll(/ASSET-[0-9a-fA-F-]{36}/g)].map(([id]) => id);
    for (const id of assetMatches) if (!assetIds.has(id) && !context.existing.assets.has(`${namespace}::${id}`)) addIssue(issues, 'Stimuli', `Stimulus references missing asset ${id}.`, 'Add the asset to the package or choose an existing immutable asset.');
  }
  const payloadForDigest = {
    schemaVersion: SCHEMA_VERSION,
    packageId,
    packageName,
    submittingNamespace: namespace,
    packageFingerprint,
    questions: parsedQuestions.questions,
    stimuli: parsedStimuli.stimuli,
    assets: parsedAssets.assets,
  };
  const previewDigest = sha256(stableStringify(payloadForDigest));
  const now = context.now ?? new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.length - errors;
  const duplicateKeys = [...new Set([...parsedQuestions.duplicateKeys, ...parsedStimuli.duplicateKeys, ...parsedAssets.duplicateKeys])];
  const byQuestionType = Object.fromEntries(MOCK_QUESTION_TYPES.map((type) => [type, parsedQuestions.questions.filter((question) => question.questionType === type).length]).filter(([, count]) => count)) as Record<MockQuestionType, number>;
  return {
    preview: {
      valid: errors === 0,
      expiresAt,
      package: { ...payloadForDigest, previewDigest },
      counts: { questions: parsedQuestions.questions.length, stimuli: parsedStimuli.stimuli.length, assets: parsedAssets.assets.length, warnings, errors, likelyDuplicates: duplicateKeys.length },
      byQuestionType,
      issues,
      duplicateKeys,
    },
    assetBytes: parsedAssets.assetBytes,
  };
}
