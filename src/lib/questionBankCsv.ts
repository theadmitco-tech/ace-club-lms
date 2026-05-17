import type { AnswerOption } from './types';

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D', 'E'];
const STANDALONE_TYPES = ['QA', 'CR', 'DS'];
const SET_TYPES = ['RC', 'DI'];
const DI_TYPES = ['table', 'graph', 'caselet', 'multi_source'];
const SET_QUESTION_TYPES = ['mcq', 'multi_select', 'numeric', 'dropdown'];

type CsvRecord = Record<string, string> & { __rowNumber: string };

export interface ParsedSetQuestion extends Record<string, unknown> {
  set_external_id?: string | null;
  set_id?: string | null;
  external_id?: string | null;
}

export interface QuestionBankCsvParseResult {
  importBatchId: string;
  errors: string[];
  warnings: string[];
  standaloneQuestions: Record<string, unknown>[];
  questionSets: Record<string, unknown>[];
  setQuestions: ParsedSetQuestion[];
  counts: {
    questions: number;
    questionSets: number;
    setQuestions: number;
  };
}

export interface QuestionBankCsvInputs {
  questionsCsv?: string;
  questionSetsCsv?: string;
  setQuestionsCsv?: string;
  importBatchId?: string;
}

export function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function recordsFromCsv(content?: string): CsvRecord[] {
  if (!content?.trim()) return [];
  const rows = parseCsv(content);
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((row, index) => {
    const record: CsvRecord = { __rowNumber: String(index + 2) };
    headers.forEach((header, headerIndex) => {
      record[header] = (row[headerIndex] || '').trim();
    });
    return record;
  });
}

function optional(value?: string) {
  return value ? value : null;
}

function parseInteger(record: CsvRecord, field: string, errors: string[], fileName: string, defaultValue: number | null = null) {
  if (!record[field]) return defaultValue;
  const value = Number.parseInt(record[field], 10);
  if (!Number.isInteger(value)) {
    errors.push(`${fileName} row ${record.__rowNumber}: ${field} must be an integer`);
    return defaultValue;
  }
  return value;
}

function parseDifficulty(record: CsvRecord, errors: string[], fileName: string) {
  const difficulty = parseInteger(record, 'difficulty', errors, fileName);
  if (difficulty == null || difficulty < 1 || difficulty > 5) {
    errors.push(`${fileName} row ${record.__rowNumber}: difficulty must be 1-5`);
  }
  return difficulty;
}

function parseBoolean(value?: string, defaultValue = true) {
  if (!value) return defaultValue;
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

function parseList(value?: string) {
  if (!value) return null;
  return value
    .split(/[|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson(value: string | undefined, errors: string[], fileName: string, rowNumber: string, field: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    errors.push(`${fileName} row ${rowNumber}: ${field} must be valid JSON`);
    return null;
  }
}

function required(record: CsvRecord, field: string, errors: string[], fileName: string) {
  if (!record[field]) errors.push(`${fileName} row ${record.__rowNumber}: missing ${field}`);
}

function validateAllowed(value: string | undefined, allowed: string[], errors: string[], fileName: string, rowNumber: string, field: string) {
  if (value && !allowed.includes(value)) {
    errors.push(`${fileName} row ${rowNumber}: ${field} must be one of ${allowed.join(', ')}`);
  }
}

function optionExists(record: CsvRecord, option?: string) {
  return Boolean(option && record[`option_${option.toLowerCase()}`]);
}

function mapStandalone(record: CsvRecord, importBatchId: string, errors: string[]) {
  ['section', 'question_type', 'primary_topic', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d'].forEach((field) =>
    required(record, field, errors, 'questions.csv')
  );
  validateAllowed(record.section, ['Quant', 'Verbal'], errors, 'questions.csv', record.__rowNumber, 'section');
  validateAllowed(record.question_type, STANDALONE_TYPES, errors, 'questions.csv', record.__rowNumber, 'question_type');
  validateAllowed(record.correct_option, ANSWER_OPTIONS, errors, 'questions.csv', record.__rowNumber, 'correct_option');

  if (!record.correct_option && !record.correct_value) {
    errors.push(`questions.csv row ${record.__rowNumber}: correct_option or correct_value is required`);
  }
  if (record.correct_option && !optionExists(record, record.correct_option)) {
    errors.push(`questions.csv row ${record.__rowNumber}: correct_option ${record.correct_option} has no matching option text`);
  }

  return {
    external_id: optional(record.external_id),
    import_batch_id: importBatchId,
    section: record.section,
    question_type: record.question_type,
    primary_topic: record.primary_topic,
    subtopic: record.subtopic || '',
    difficulty: parseDifficulty(record, errors, 'questions.csv'),
    question_text: record.question_text,
    option_a: record.option_a,
    option_b: record.option_b,
    option_c: record.option_c,
    option_d: record.option_d,
    option_e: optional(record.option_e),
    correct_option: optional(record.correct_option),
    correct_value: optional(record.correct_value),
    explanation: record.explanation || '',
    short_explanation: optional(record.short_explanation),
    time_estimate_sec: parseInteger(record, 'time_estimate_sec', errors, 'questions.csv'),
    concept_tested: optional(record.concept_tested),
    common_trap: optional(record.common_trap),
    skill: optional(record.skill),
    tags: parseList(record.tags),
    is_active: parseBoolean(record.is_active),
    display_order: parseInteger(record, 'display_order', errors, 'questions.csv', 0),
  };
}

function mapQuestionSet(record: CsvRecord, importBatchId: string, errors: string[]) {
  ['type', 'section', 'primary_topic'].forEach((field) => required(record, field, errors, 'question_sets.csv'));
  validateAllowed(record.type, SET_TYPES, errors, 'question_sets.csv', record.__rowNumber, 'type');
  validateAllowed(record.di_type, DI_TYPES, errors, 'question_sets.csv', record.__rowNumber, 'di_type');
  validateAllowed(record.section, ['Verbal', 'DI'], errors, 'question_sets.csv', record.__rowNumber, 'section');

  if (record.type === 'RC' && (!record.passage_text || record.di_type || record.section !== 'Verbal')) {
    errors.push(`question_sets.csv row ${record.__rowNumber}: RC rows require section Verbal, passage_text, and blank di_type`);
  }
  if (record.type === 'DI' && (!record.stimulus_data || !record.di_type || record.section !== 'DI')) {
    errors.push(`question_sets.csv row ${record.__rowNumber}: DI rows require section DI, di_type, and stimulus_data`);
  }

  return {
    external_id: optional(record.external_id),
    import_batch_id: importBatchId,
    type: record.type,
    di_type: optional(record.di_type),
    section: record.section,
    primary_topic: record.primary_topic,
    subtopic: record.subtopic || '',
    difficulty: parseDifficulty(record, errors, 'question_sets.csv'),
    passage_text: optional(record.passage_text),
    stimulus_data: parseJson(record.stimulus_data, errors, 'question_sets.csv', record.__rowNumber, 'stimulus_data'),
    time_estimate_sec: parseInteger(record, 'time_estimate_sec', errors, 'question_sets.csv'),
    concept_tested: optional(record.concept_tested),
    tags: parseList(record.tags),
    is_active: parseBoolean(record.is_active),
    display_order: parseInteger(record, 'display_order', errors, 'question_sets.csv', 0),
  };
}

function mapSetQuestion(record: CsvRecord, importBatchId: string, errors: string[], knownSetExternalIds: Set<string>) {
  ['question_type', 'question_text'].forEach((field) => required(record, field, errors, 'set_questions.csv'));
  validateAllowed(record.question_type, SET_QUESTION_TYPES, errors, 'set_questions.csv', record.__rowNumber, 'question_type');
  validateAllowed(record.correct_option, ANSWER_OPTIONS, errors, 'set_questions.csv', record.__rowNumber, 'correct_option');

  if (!record.set_id && !record.set_external_id) {
    errors.push(`set_questions.csv row ${record.__rowNumber}: set_id or set_external_id is required`);
  }
  if (record.set_external_id && knownSetExternalIds.size > 0 && !knownSetExternalIds.has(record.set_external_id)) {
    errors.push(`set_questions.csv row ${record.__rowNumber}: set_external_id was not found in question_sets.csv`);
  }

  const correctOptions = parseList(record.correct_options) as AnswerOption[] | null;
  if (record.question_type === 'multi_select') {
    if (!correctOptions?.length) errors.push(`set_questions.csv row ${record.__rowNumber}: multi_select requires correct_options`);
    for (const option of correctOptions || []) {
      if (!ANSWER_OPTIONS.includes(option) || !optionExists(record, option)) {
        errors.push(`set_questions.csv row ${record.__rowNumber}: correct_options contains unavailable option ${option}`);
      }
    }
  } else if (record.question_type === 'numeric') {
    if (!record.correct_value) errors.push(`set_questions.csv row ${record.__rowNumber}: numeric requires correct_value`);
  } else if (!record.correct_option || !optionExists(record, record.correct_option)) {
    errors.push(`set_questions.csv row ${record.__rowNumber}: ${record.question_type} requires a correct_option with matching option text`);
  }

  return {
    external_id: optional(record.external_id),
    import_batch_id: importBatchId,
    set_id: optional(record.set_id),
    set_external_id: optional(record.set_external_id),
    question_type: record.question_type,
    question_text: record.question_text,
    option_a: optional(record.option_a),
    option_b: optional(record.option_b),
    option_c: optional(record.option_c),
    option_d: optional(record.option_d),
    option_e: optional(record.option_e),
    correct_option: optional(record.correct_option),
    correct_options: correctOptions,
    correct_value: optional(record.correct_value),
    explanation: record.explanation || '',
    short_explanation: optional(record.short_explanation),
    difficulty: parseDifficulty(record, errors, 'set_questions.csv'),
    time_estimate_sec: parseInteger(record, 'time_estimate_sec', errors, 'set_questions.csv'),
    concept_tested: optional(record.concept_tested),
    common_trap: optional(record.common_trap),
    skill: optional(record.skill),
    tags: parseList(record.tags),
    display_order: parseInteger(record, 'display_order', errors, 'set_questions.csv', 0),
    is_active: parseBoolean(record.is_active),
  };
}

export function parseQuestionBankCsv(inputs: QuestionBankCsvInputs): QuestionBankCsvParseResult {
  const importBatchId = inputs.importBatchId || crypto.randomUUID();
  const errors: string[] = [];
  const warnings: string[] = [];
  const standaloneRecords = recordsFromCsv(inputs.questionsCsv);
  const setRecords = recordsFromCsv(inputs.questionSetsCsv);
  const setQuestionRecords = recordsFromCsv(inputs.setQuestionsCsv);
  const knownSetExternalIds = new Set(setRecords.map((record) => record.external_id).filter(Boolean));

  if (setQuestionRecords.length > 0 && setRecords.length === 0) {
    warnings.push('set_questions.csv was provided without question_sets.csv. Existing set_id values will work; set_external_id references must already exist in Supabase.');
  }

  const standaloneQuestions = standaloneRecords.map((record) => mapStandalone(record, importBatchId, errors));
  const questionSets = setRecords.map((record) => mapQuestionSet(record, importBatchId, errors));
  const setQuestions = setQuestionRecords.map((record) => mapSetQuestion(record, importBatchId, errors, knownSetExternalIds));

  if (standaloneQuestions.length + questionSets.length + setQuestions.length === 0) {
    errors.push('No CSV rows found. Upload at least one of questions.csv, question_sets.csv, or set_questions.csv.');
  }

  return {
    importBatchId,
    errors,
    warnings,
    standaloneQuestions,
    questionSets,
    setQuestions,
    counts: {
      questions: standaloneQuestions.length,
      questionSets: questionSets.length,
      setQuestions: setQuestions.length,
    },
  };
}
