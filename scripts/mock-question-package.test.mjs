import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import parserModule from '../src/lib/server/mockQuestionPackage.ts';
import validationModule from '../src/lib/mockQuestionBank/validation.ts';

const { parseMockQuestionPackage } = parserModule;
const { sha256 } = validationModule;

const questionHeaders = ['source_namespace', 'source_question_id', 'canonical_question_key', 'duplicate_check', 'section', 'question_type', 'response_type', 'topic', 'subtopic', 'difficulty', 'source_stimulus_id', 'stimulus_group_order', 'question_content_json', 'interaction_config_json', 'stimulus_display_config_json', 'explanation_json', 'source_reference', 'answer_confirmation', 'conflict_action', 'answer_check', 'asset_check', 'validation_status', 'validation_notes'];
const stimulusHeaders = ['source_namespace', 'source_stimulus_id', 'canonical_stimulus_key', 'duplicate_check', 'stimulus_type', 'content_json', 'config_json', 'revision_note', 'conflict_action'];
const optionHeaders = ['source_namespace', 'source_question_id', 'response_slot_id', 'option_id', 'display_order', 'option_content_json', 'is_correct'];
const assetHeaders = ['source_namespace', 'source_asset_id', 'canonical_asset_key', 'duplicate_check', 'file_name', 'mime_type', 'alt_text', 'usage', 'source_question_id', 'source_stimulus_id', 'sha256', 'file_size_bytes', 'width_px', 'height_px'];
const uuids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777', '88888888-8888-4888-8888-888888888888'];
const types = ['PS', 'DS', 'CR', 'RC', 'GI', 'TI', 'MSR', 'TPA'];
const topics = ['Arithmetic', 'Algebra', 'Critical Reasoning', 'Reading Comprehension', 'Graphics Interpretation', 'Table Analysis', 'Multi-Source Reasoning', 'Two-Part Analysis'];
const subtopics = ['Percentages', 'Linear equations', 'Strengthen', 'Inference', 'Percent change', 'Classification', 'Synthesis', 'Optimization'];
const sections = ['Quant', 'Quant', 'Verbal', 'Verbal', 'DI', 'DI', 'DI', 'DI'];
const responses = ['single_choice', 'single_choice', 'single_choice', 'single_choice', 'dropdowns', 'binary_matrix', 'single_choice', 'two_part_matrix'];
const stimulusTypes = ['rich_text', 'passage', 'graphic', 'sortable_table', 'tabbed_content', 'two_part_context'];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64');

function rich(text) { return { type: 'doc', version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text }] }] }; }
function setRows(sheet, headers, rows) { sheet.addRow(headers); for (const row of rows) sheet.addRow(headers.map((header) => row[header] ?? '')); }
function optionRows(type, questionId) {
  if (type === 'GI') return ['change', 'region'].flatMap((slot, slotIndex) => [1, 2, 3].map((order) => ({ source_namespace: 'UNNATI', source_question_id: questionId, response_slot_id: slot, option_id: `${slot}-${order}`, display_order: order, option_content_json: JSON.stringify(rich(`${slot} ${order}`)), is_correct: order === slotIndex + 1 })));
  if (type === 'TI') return ['row-1', 'row-2'].flatMap((slot, slotIndex) => ['yes', 'no'].map((option, index) => ({ source_namespace: 'UNNATI', source_question_id: questionId, response_slot_id: slot, option_id: option, display_order: index + 1, option_content_json: JSON.stringify(rich(option)), is_correct: index === slotIndex })));
  if (type === 'TPA') return ['part-1', 'part-2'].flatMap((slot, slotIndex) => [1, 2, 3].map((order) => ({ source_namespace: 'UNNATI', source_question_id: questionId, response_slot_id: slot, option_id: `value-${order}`, display_order: order, option_content_json: JSON.stringify(rich(`Value ${order}`)), is_correct: order === slotIndex + 1 })));
  return [1, 2, 3, 4, 5].map((order) => ({ source_namespace: 'UNNATI', source_question_id: questionId, response_slot_id: 'answer', option_id: `opt-${order}`, display_order: order, option_content_json: JSON.stringify(rich(`Choice ${order}`)), is_correct: order === 2 }));
}

async function prefixSpreadsheetNamespace(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.endsWith('.xml')) continue;
    const xml = await entry.async('string');
    if (!xml.includes('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')) continue;
    zip.file(entry.name, xml
      .replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')
      .replace(/<\/?[A-Za-z][\w.-]*(?=[\s/>])/g, (tag) => tag.replace('<', '<x:').replace('<x:/', '</x:')));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function buildPackage({ badResponse = false, includeAsset = true, prefixedWorkbook = false } = {}) {
  const workbook = new ExcelJS.Workbook();
  const manifest = workbook.addWorksheet('Manifest');
  manifest.addRow(['Ace Club GMAT Mock Engine — Bulk Question Package V1']); manifest.addRow([]); manifest.addRow(['Field', 'Value']);
  for (const [field, value] of [['schema_version', 'ace-gmat-question-package/1.0'], ['package_id', 'phase-1-parser-test'], ['package_name', 'Parser Test'], ['submitting_namespace', 'UNNATI'], ['import_policy', 'all_or_nothing']]) manifest.addRow([field, value]);
  const stimulusRows = stimulusTypes.map((stimulusType, index) => ({ source_namespace: 'UNNATI', source_stimulus_id: `STIM-${uuids[index]}`, stimulus_type: stimulusType, content_json: JSON.stringify(stimulusType === 'graphic' ? { asset_id: `ASSET-${uuids[0]}` } : rich(`${stimulusType} content`)), config_json: '{}', revision_note: 'Test', conflict_action: 'reject' }));
  const questionRows = types.map((type, index) => ({
    source_namespace: 'UNNATI', source_question_id: `Q-${type}-${uuids[index]}`, section: sections[index], question_type: type,
    response_type: badResponse && type === 'TI' ? 'single_choice' : responses[index], topic: topics[index], subtopic: subtopics[index], difficulty: 'Medium',
    source_stimulus_id: index < 2 ? '' : `STIM-${uuids[Math.min(index - 2, 5)]}`, stimulus_group_order: index < 2 ? '' : 1,
    question_content_json: JSON.stringify(rich(`${type} question`)), interaction_config_json: JSON.stringify({ slots: [{ id: 'answer' }] }),
    source_reference: 'founder-source.pdf', answer_confirmation: 'FOUNDER_CONFIRMED', conflict_action: 'reject', answer_check: 'PASS',
    asset_check: type === 'GI' ? 'PASS' : 'NOT_APPLICABLE', validation_status: 'READY', validation_notes: '',
  }));
  const options = types.flatMap((type, index) => optionRows(type, `Q-${type}-${uuids[index]}`));
  const assetRows = includeAsset ? [{ source_namespace: 'UNNATI', source_asset_id: `ASSET-${uuids[0]}`, file_name: 'assets/chart.png', mime_type: 'image/png', alt_text: 'One-pixel test chart.', usage: 'stimulus_content', source_stimulus_id: `STIM-${uuids[2]}`, sha256: sha256(png), file_size_bytes: png.length, width_px: 1, height_px: 1 }] : [];
  setRows(workbook.addWorksheet('Questions'), questionHeaders, questionRows);
  setRows(workbook.addWorksheet('Stimuli'), stimulusHeaders, stimulusRows);
  setRows(workbook.addWorksheet('Response Options'), optionHeaders, options);
  setRows(workbook.addWorksheet('Assets'), assetHeaders, assetRows);
  let workbookBytes = Buffer.from(await workbook.xlsx.writeBuffer());
  if (prefixedWorkbook) workbookBytes = await prefixSpreadsheetNamespace(workbookBytes);
  if (!includeAsset) return { bytes: workbookBytes, name: 'questions.xlsx' };
  const zip = new JSZip(); zip.file('questions.xlsx', workbookBytes); zip.file('assets/chart.png', png);
  return { bytes: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), name: 'questions.zip' };
}

function context() {
  return {
    authorizedNamespaces: new Set(['UNNATI']),
    taxonomy: topics.map((topic, index) => ({ section: index < 2 ? 'quant' : index < 4 ? 'verbal' : 'data_insights', topic, subtopic: subtopics[index] })),
    existing: { questions: new Map(), stimuli: new Map(), assets: new Map(), questionFingerprints: new Set(), stimulusFingerprints: new Set() },
    now: new Date('2026-08-21T10:00:00Z'),
  };
}

test('valid ZIP round-trips all eight question types and private answer declarations', async () => {
  const fixture = await buildPackage();
  const result = await parseMockQuestionPackage(fixture.bytes, fixture.name, context());
  assert.equal(result.preview.valid, true, JSON.stringify(result.preview.issues, null, 2));
  assert.equal(result.preview.counts.questions, 8);
  assert.deepEqual(Object.keys(result.preview.byQuestionType).sort(), [...types].sort());
  assert.equal(result.preview.package.questions.every((question) => Object.keys(question.answer).length >= 1), true);
  assert.equal(result.assetBytes.size, 1);
});

test('accepted namespace-prefixed OOXML is normalized before parsing', async () => {
  const fixture = await buildPackage({ prefixedWorkbook: true });
  const result = await parseMockQuestionPackage(fixture.bytes, fixture.name, context());
  assert.equal(result.preview.valid, true, JSON.stringify(result.preview.issues, null, 2));
  assert.equal(result.preview.counts.questions, 8);
});

test('incompatible declared response type fails closed', async () => {
  const fixture = await buildPackage({ badResponse: true });
  const result = await parseMockQuestionPackage(fixture.bytes, fixture.name, context());
  assert.equal(result.preview.valid, false);
  assert.equal(result.preview.issues.some((issue) => issue.field === 'response_type'), true);
});

test('missing companion asset blocks XLSX-only validation', async () => {
  const fixture = await buildPackage({ includeAsset: false });
  const result = await parseMockQuestionPackage(fixture.bytes, fixture.name, context());
  assert.equal(result.preview.valid, false);
  assert.equal(result.preview.issues.some((issue) => issue.sheet === 'Stimuli' && issue.message.includes('missing asset')), true);
});

test('unauthorized namespace fails without trusting workbook registry values', async () => {
  const fixture = await buildPackage();
  const denied = context(); denied.authorizedNamespaces.clear();
  const result = await parseMockQuestionPackage(fixture.bytes, fixture.name, denied);
  assert.equal(result.preview.valid, false);
  assert.equal(result.preview.issues.some((issue) => issue.message.includes('not authorized')), true);
});
