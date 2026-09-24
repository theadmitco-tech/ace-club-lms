import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import validationModule from '../src/lib/mockQuestionBank/validation.ts';

const { sha256 } = validationModule;
const outputDirectory = '/private/tmp/ace-club-phase1-acceptance';
const questionHeaders = ['source_namespace', 'source_question_id', 'canonical_question_key', 'duplicate_check', 'section', 'question_type', 'response_type', 'topic', 'subtopic', 'difficulty', 'source_stimulus_id', 'stimulus_group_order', 'question_content_json', 'interaction_config_json', 'stimulus_display_config_json', 'explanation_json', 'source_reference', 'answer_confirmation', 'conflict_action', 'answer_check', 'asset_check', 'validation_status', 'validation_notes'];
const stimulusHeaders = ['source_namespace', 'source_stimulus_id', 'canonical_stimulus_key', 'duplicate_check', 'stimulus_type', 'content_json', 'config_json', 'revision_note', 'conflict_action'];
const optionHeaders = ['source_namespace', 'source_question_id', 'response_slot_id', 'option_id', 'display_order', 'option_content_json', 'is_correct'];
const assetHeaders = ['source_namespace', 'source_asset_id', 'canonical_asset_key', 'duplicate_check', 'file_name', 'mime_type', 'alt_text', 'usage', 'source_question_id', 'source_stimulus_id', 'sha256', 'file_size_bytes', 'width_px', 'height_px'];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64');

function rich(text) { return { type: 'doc', version: 1, blocks: [{ type: 'paragraph', children: [{ type: 'text', text }] }] }; }
function addRows(sheet, headers, rows) { sheet.addRow(headers); for (const row of rows) sheet.addRow(headers.map((header) => row[header] ?? '')); }
function choices(questionId, correct = 2) {
  return [1, 2, 3, 4, 5].map((order) => ({ source_namespace: 'UNNATI', source_question_id: questionId, response_slot_id: 'answer', option_id: `opt-${order}`, display_order: order, option_content_json: JSON.stringify(rich(`Synthetic choice ${order}`)), is_correct: order === correct }));
}

async function workbookBytes({ packageId, questions, stimuli = [], options, assets = [] }) {
  const workbook = new ExcelJS.Workbook();
  const manifest = workbook.addWorksheet('Manifest');
  manifest.addRow(['Ace Club Phase 1 synthetic acceptance package']); manifest.addRow([]); manifest.addRow(['Field', 'Value']);
  for (const [field, value] of [['schema_version', 'ace-gmat-question-package/1.0'], ['package_id', packageId], ['package_name', packageId], ['submitting_namespace', 'UNNATI'], ['import_policy', 'all_or_nothing']]) manifest.addRow([field, value]);
  addRows(workbook.addWorksheet('Questions'), questionHeaders, questions);
  addRows(workbook.addWorksheet('Stimuli'), stimulusHeaders, stimuli);
  addRows(workbook.addWorksheet('Response Options'), optionHeaders, options);
  addRows(workbook.addWorksheet('Assets'), assetHeaders, assets);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function question({ id, type, section, responseType, topic, subtopic, text, stimulusId = '', order = '' }) {
  return {
    source_namespace: 'UNNATI', source_question_id: id, section, question_type: type, response_type: responseType,
    topic, subtopic, difficulty: 'Medium', source_stimulus_id: stimulusId, stimulus_group_order: order,
    question_content_json: JSON.stringify(rich(text)), interaction_config_json: JSON.stringify(responseType === 'dropdowns' ? { slots: [{ id: 'change', kind: 'dropdown' }, { id: 'region', kind: 'dropdown' }] } : { slots: [{ id: 'answer', kind: 'single_choice' }] }),
    stimulus_display_config_json: '{}', explanation_json: JSON.stringify(rich('Synthetic acceptance explanation.')),
    source_reference: 'phase1-synthetic-acceptance', answer_confirmation: 'FOUNDER_CONFIRMED', conflict_action: 'reject',
    answer_check: 'PASS', asset_check: type === 'GI' ? 'PASS' : 'NOT_APPLICABLE', validation_status: 'READY', validation_notes: 'Synthetic Staging acceptance fixture.',
  };
}

await mkdir(outputDirectory, { recursive: true });

const psId = 'Q-PS-a1111111-1111-4111-8111-111111111111';
await writeFile(`${outputDirectory}/01-text-only.xlsx`, await workbookBytes({
  packageId: 'phase1-acceptance-text-v1',
  questions: [question({ id: psId, type: 'PS', section: 'Quant', responseType: 'single_choice', topic: 'Arithmetic', subtopic: 'Percentages', text: 'Synthetic text-only acceptance question: what is 20% of 50?' })],
  options: choices(psId, 2),
}));

const passageId = 'STIM-b2222222-2222-4222-8222-222222222222';
const rc1 = 'Q-RC-b3333333-3333-4333-8333-333333333333';
const rc2 = 'Q-RC-b4444444-4444-4444-8444-444444444444';
await writeFile(`${outputDirectory}/02-shared-stimulus.xlsx`, await workbookBytes({
  packageId: 'phase1-acceptance-shared-stimulus-v1',
  stimuli: [{ source_namespace: 'UNNATI', source_stimulus_id: passageId, stimulus_type: 'passage', content_json: JSON.stringify(rich('Synthetic passage used by two contiguous RC questions.')), config_json: '{}', revision_note: 'Synthetic acceptance fixture.', conflict_action: 'reject' }],
  questions: [
    question({ id: rc1, type: 'RC', section: 'Verbal', responseType: 'single_choice', topic: 'Reading Comprehension', subtopic: 'Inference', text: 'Synthetic shared-stimulus question one.', stimulusId: passageId, order: 1 }),
    question({ id: rc2, type: 'RC', section: 'Verbal', responseType: 'single_choice', topic: 'Reading Comprehension', subtopic: 'Inference', text: 'Synthetic shared-stimulus question two.', stimulusId: passageId, order: 2 }),
  ],
  options: [...choices(rc1, 1), ...choices(rc2, 3)],
}));

const assetId = 'ASSET-c5555555-5555-4555-8555-555555555555';
const graphicId = 'STIM-c6666666-6666-4666-8666-666666666666';
const giId = 'Q-GI-c7777777-7777-4777-8777-777777777777';
const giOptions = ['change', 'region'].flatMap((slot, slotIndex) => [1, 2, 3].map((order) => ({ source_namespace: 'UNNATI', source_question_id: giId, response_slot_id: slot, option_id: `${slot}-${order}`, display_order: order, option_content_json: JSON.stringify(rich(`Synthetic ${slot} ${order}`)), is_correct: order === slotIndex + 1 })));
const giWorkbook = await workbookBytes({
  packageId: 'phase1-acceptance-image-gi-v1',
  stimuli: [{ source_namespace: 'UNNATI', source_stimulus_id: graphicId, stimulus_type: 'graphic', content_json: JSON.stringify({ asset_id: assetId }), config_json: '{}', revision_note: 'Synthetic acceptance fixture.', conflict_action: 'reject' }],
  questions: [question({ id: giId, type: 'GI', section: 'DI', responseType: 'dropdowns', topic: 'Graphics Interpretation', subtopic: 'Percent change', text: 'Synthetic image/GI acceptance question.', stimulusId: graphicId, order: 1 })],
  options: giOptions,
  assets: [{ source_namespace: 'UNNATI', source_asset_id: assetId, file_name: 'assets/chart.png', mime_type: 'image/png', alt_text: 'Synthetic one-pixel acceptance chart.', usage: 'stimulus_content', source_stimulus_id: graphicId, sha256: sha256(png), file_size_bytes: png.length, width_px: 1, height_px: 1 }],
});
const zip = new JSZip(); zip.file('questions.xlsx', giWorkbook); zip.file('assets/chart.png', png);
await writeFile(`${outputDirectory}/03-image-gi.zip`, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

console.log(JSON.stringify({ outputDirectory, files: ['01-text-only.xlsx', '02-shared-stimulus.xlsx', '03-image-gi.zip'] }));
