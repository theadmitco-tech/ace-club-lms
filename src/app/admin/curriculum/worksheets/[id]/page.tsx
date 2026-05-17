'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import { parseCsv } from '@/lib/questionBankCsv';

type Difficulty = 'basic' | 'advanced';
type QuestionType = 'problem_solving' | 'data_sufficiency' | 'critical_reasoning' | 'reading_comprehension' | 'data_insights';
type DiQuestionType = 'data_sufficiency' | 'multi_source_reasoning' | 'table_analysis' | 'graphics_interpretation' | 'two_part_analysis';
type AnswerMode = 'single_choice' | 'multi_select' | 'numeric' | 'two_part' | 'dropdown';
type ContentFormat = 'plain' | 'markdown';

type MasterPracticeSet = {
  id: string;
  master_session_id: string;
  title: string;
  created_at: string;
};

type MasterPracticeQuestion = {
  id: string;
  master_practice_set_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: Difficulty;
  question_type?: QuestionType;
  di_question_type?: DiQuestionType | null;
  answer_mode?: AnswerMode;
  stimulus_group_key?: string | null;
  stimulus_title?: string | null;
  stimulus_text?: string | null;
  stimulus_data?: Record<string, unknown> | null;
  content_format?: ContentFormat;
  admin_notes?: string | null;
  order_index: number;
  created_at: string;
};

type QuestionDraft = {
  question_text: string;
  optionsText: string;
  correct_answer: string;
  explanation: string;
  difficulty: Difficulty;
  question_type: QuestionType;
  di_question_type: DiQuestionType | '';
  answer_mode: AnswerMode;
  stimulus_group_key: string;
  stimulus_title: string;
  stimulus_text: string;
  stimulusDataText: string;
  content_format: ContentFormat;
  admin_notes: string;
};

const emptyQuestionDraft: QuestionDraft = {
  question_text: '',
  optionsText: '',
  correct_answer: '',
  explanation: '',
  difficulty: 'basic',
  question_type: 'problem_solving',
  di_question_type: '',
  answer_mode: 'single_choice',
  stimulus_group_key: '',
  stimulus_title: '',
  stimulus_text: '',
  stimulusDataText: '',
  content_format: 'plain',
  admin_notes: '',
};

const questionTypeLabels: Record<QuestionType, string> = {
  problem_solving: 'Quant / Problem Solving',
  data_sufficiency: 'Data Sufficiency',
  critical_reasoning: 'Critical Reasoning',
  reading_comprehension: 'Reading Comprehension',
  data_insights: 'Data Insights',
};

const diTypeLabels: Record<DiQuestionType, string> = {
  data_sufficiency: 'DI Data Sufficiency',
  multi_source_reasoning: 'Multi-Source Reasoning',
  table_analysis: 'Table Analysis',
  graphics_interpretation: 'Graphics Interpretation',
  two_part_analysis: 'Two-Part Analysis',
};

function toOptionsText(options: unknown) {
  return Array.isArray(options) ? options.join('\n') : '';
}

function decodeCsvText(value: string) {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\r\n/g, '\n');
}

function formatReadableText(value: string) {
  return decodeCsvText(value)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/([^\n])\n(?=\([12]\)\s)/g, '$1\n\n')
    .replace(/([.!?])\s+(?=(?:Which|What|If|How|The|In|According|Statement)\b)/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseOptions(optionsText: string) {
  const trimmed = decodeCsvText(optionsText).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((option) => String(option).trim()).filter(Boolean);
    } catch {
      // Fall through to line parsing.
    }
  }

  return trimmed
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
}

function optionLetterToIndex(answer: string) {
  const normalized = answer.trim().toUpperCase();
  if (!/^[A-E]$/.test(normalized)) return -1;
  return normalized.charCodeAt(0) - 65;
}

function isValidAnswer(answer: string, options: string[], answerMode: AnswerMode) {
  const trimmed = answer.trim();
  if (!trimmed) return false;
  if (answerMode === 'numeric' || options.length === 0) return true;
  if (answerMode === 'multi_select') {
    return trimmed
      .split(/[|,;]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .every((value) => options.includes(value) || optionLetterToIndex(value) >= 0);
  }

  return options.includes(trimmed) || optionLetterToIndex(trimmed) >= 0;
}

function draftFromQuestion(question: MasterPracticeQuestion): QuestionDraft {
  return {
    question_text: question.question_text || '',
    optionsText: toOptionsText(question.options),
    correct_answer: question.correct_answer || '',
    explanation: question.explanation || '',
    difficulty: question.difficulty === 'advanced' ? 'advanced' : 'basic',
    question_type: question.question_type || 'problem_solving',
    di_question_type: question.di_question_type || '',
    answer_mode: question.answer_mode || 'single_choice',
    stimulus_group_key: question.stimulus_group_key || '',
    stimulus_title: question.stimulus_title || '',
    stimulus_text: question.stimulus_text || '',
    stimulusDataText: question.stimulus_data ? JSON.stringify(question.stimulus_data, null, 2) : '',
    content_format: question.content_format || 'plain',
    admin_notes: question.admin_notes || '',
  };
}

function guessQuestionType(rowType?: string): QuestionType {
  const value = (rowType || '').toLowerCase();
  if (value.includes('di') || value.includes('insight')) return 'data_insights';
  if (value.includes('rc') || value.includes('reading')) return 'reading_comprehension';
  if (value.includes('cr') || value.includes('critical')) return 'critical_reasoning';
  if (value.includes('ds') || value.includes('sufficiency')) return 'data_sufficiency';
  return 'problem_solving';
}

function parseStimulusData(value: string) {
  if (!value.trim()) return null;
  return JSON.parse(value);
}

function rowValue(record: Record<string, string>, key: string) {
  return decodeCsvText(record[key] || record[key.toLowerCase()] || record[key.toUpperCase()] || '');
}

function extractPdfTextFallback(rawText: string) {
  const chunks = [...rawText.matchAll(/\(([^()]{6,})\)/g)]
    .map((match) => match[1])
    .map((text) => text.replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim())
    .filter(Boolean);
  return chunks.join(' ').replace(/\s+/g, ' ').slice(0, 6000);
}

export default function AdminMasterWorksheetEditorPage() {
  const params = useParams();
  const router = useRouter();
  const masterSessionId = params.id as string;
  const supabase = createClient();
  const { addToast } = useAuth();

  const [masterSession, setMasterSession] = useState<any | null>(null);
  const [practiceSet, setPracticeSet] = useState<MasterPracticeSet | null>(null);
  const [questions, setQuestions] = useState<MasterPracticeQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuestionDraft>(emptyQuestionDraft);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDraft>(emptyQuestionDraft);
  const [tablesUnavailable, setTablesUnavailable] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ rows: Record<string, string>[]; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pdfDraftNote, setPdfDraftNote] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setTablesUnavailable(false);

    const { data: session, error: sessionError } = await supabase
      .from('master_sessions')
      .select('id, title, session_number')
      .eq('id', masterSessionId)
      .single();

    if (sessionError || !session) {
      addToast('error', 'Failed to load master session.');
      setIsLoading(false);
      return;
    }

    setMasterSession(session);

    try {
      const { data: sets, error: setError } = await supabase
        .from('master_practice_sets')
        .select('*')
        .eq('master_session_id', masterSessionId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (setError) throw setError;

      const firstSet = (sets?.[0] || null) as MasterPracticeSet | null;
      setPracticeSet(firstSet);

      if (!firstSet) {
        setQuestions([]);
        setIsLoading(false);
        return;
      }

      const { data: questionData, error: questionError } = await supabase
        .from('master_practice_questions')
        .select('*')
        .eq('master_practice_set_id', firstSet.id)
        .order('order_index', { ascending: true });

      if (questionError) throw questionError;

      setQuestions((questionData || []).map((question: any) => ({
        ...question,
        options: Array.isArray(question.options) ? question.options : [],
      })));
    } catch (error) {
      console.info('Master practice tables are not available yet.', error);
      setTablesUnavailable(true);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (masterSessionId) void fetchData();
  }, [masterSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensurePracticeSet = async () => {
    if (practiceSet) return practiceSet;

    const { data, error } = await supabase
      .from('master_practice_sets')
      .insert({
        master_session_id: masterSessionId,
        title: `${masterSession?.title || 'Session'} Questions`,
      })
      .select()
      .single();

    if (error) throw error;
    setPracticeSet(data as MasterPracticeSet);
    return data as MasterPracticeSet;
  };

  const validateQuestionDraft = (draft: QuestionDraft) => {
    const options = parseOptions(draft.optionsText);

    if (!draft.question_text.trim() || !draft.correct_answer.trim()) {
      addToast('error', 'Add a prompt and the correct answer.');
      return null;
    }

    if (options.length === 1) {
      addToast('error', 'Use zero options for open-answer questions, or at least two options for multiple choice.');
      return null;
    }

    if (!isValidAnswer(draft.correct_answer, options, draft.answer_mode)) {
      addToast('error', 'Correct answer must be A-E, exact option text, or a valid numeric/open response.');
      return null;
    }

    if (draft.question_type === 'data_insights' && !draft.di_question_type) {
      addToast('error', 'Pick the DI question type.');
      return null;
    }

    try {
      parseStimulusData(draft.stimulusDataText);
    } catch {
      addToast('error', 'Stimulus data must be valid JSON.');
      return null;
    }

    return options;
  };

  const draftPayload = (draft: QuestionDraft, options: string[]) => ({
    question_text: draft.question_text.trim(),
    options,
    correct_answer: draft.correct_answer.trim(),
    explanation: draft.explanation.trim(),
    difficulty: draft.difficulty,
    question_type: draft.question_type,
    di_question_type: draft.question_type === 'data_insights' ? draft.di_question_type || null : null,
    answer_mode: draft.answer_mode,
    stimulus_group_key: draft.stimulus_group_key.trim() || null,
    stimulus_title: draft.stimulus_title.trim() || null,
    stimulus_text: draft.stimulus_text.trim() || null,
    stimulus_data: parseStimulusData(draft.stimulusDataText),
    content_format: draft.content_format,
    admin_notes: draft.admin_notes.trim() || null,
  });

  const handleAddQuestion = async () => {
    const options = validateQuestionDraft(newQuestion);
    if (!options) return;

    try {
      const set = await ensurePracticeSet();
      const { error } = await supabase.from('master_practice_questions').insert({
        master_practice_set_id: set.id,
        ...draftPayload(newQuestion, options),
        order_index: questions.length + 1,
      });

      if (error) throw error;

      addToast('success', 'Session question added.');
      setNewQuestion(emptyQuestionDraft);
      setShowAddQuestion(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to add question. If this mentions a missing column, run supabase_master_question_metadata.sql.');
    }
  };

  const handleStartEditQuestion = (question: MasterPracticeQuestion) => {
    setEditingQuestionId(question.id);
    setEditingQuestion(draftFromQuestion(question));
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestion(emptyQuestionDraft);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestionId) return;

    const options = validateQuestionDraft(editingQuestion);
    if (!options) return;

    const { error } = await supabase
      .from('master_practice_questions')
      .update(draftPayload(editingQuestion, options))
      .eq('id', editingQuestionId);

    if (error) {
      console.error(error);
      addToast('error', 'Failed to update question. If this mentions a missing column, run supabase_master_question_metadata.sql.');
    } else {
      addToast('success', 'Question updated.');
      handleCancelEditQuestion();
      fetchData();
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const { error } = await supabase.from('master_practice_questions').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete question.');
    } else {
      addToast('success', 'Question deleted.');
      fetchData();
    }
  };

  const handleCsvUpload = async (file?: File) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setCsvPreview({ rows: [], errors: ['CSV has no data rows.'] });
      return;
    }

    const headers = rows[0].map((header) => header.trim());
    const records = rows.slice(1).map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (row[index] || '').trim();
      });
      return record;
    });

    const errors: string[] = [];
    records.forEach((record, index) => {
      if (!rowValue(record, 'question_text')) errors.push(`Row ${index + 2}: missing question_text`);
      if (!rowValue(record, 'correct_answer')) errors.push(`Row ${index + 2}: missing correct_answer`);
    });

    setCsvPreview({ rows: records, errors });
  };

  const importCsvPreview = async () => {
    if (!csvPreview || csvPreview.errors.length > 0) return;
    setIsImporting(true);
    try {
      const set = await ensurePracticeSet();
      const startingOrder = questions.length;
      const rows = csvPreview.rows.map((record, index) => {
        const questionType = guessQuestionType(rowValue(record, 'question_type'));
        const diType = rowValue(record, 'di_question_type') as DiQuestionType;
        const stimulusData = rowValue(record, 'stimulus_data');
        const options = parseOptions(rowValue(record, 'options') || [rowValue(record, 'option_a'), rowValue(record, 'option_b'), rowValue(record, 'option_c'), rowValue(record, 'option_d'), rowValue(record, 'option_e')].filter(Boolean).join('\n'));
        const importedOrder = Number.parseInt(rowValue(record, 'order_index'), 10);

        return {
          master_practice_set_id: set.id,
          question_text: formatReadableText(rowValue(record, 'question_text')),
          options,
          correct_answer: rowValue(record, 'correct_answer'),
          explanation: formatReadableText(rowValue(record, 'explanation')),
          difficulty: rowValue(record, 'difficulty') === 'advanced' ? 'advanced' : 'basic',
          question_type: questionType,
          di_question_type: questionType === 'data_insights' && diType ? diType : null,
          answer_mode: (rowValue(record, 'answer_mode') as AnswerMode) || 'single_choice',
          stimulus_group_key: rowValue(record, 'stimulus_group_key') || null,
          stimulus_title: rowValue(record, 'stimulus_title') || null,
          stimulus_text: formatReadableText(rowValue(record, 'stimulus_text') || rowValue(record, 'passage_text')) || null,
          stimulus_data: stimulusData ? JSON.parse(stimulusData) : null,
          content_format: (rowValue(record, 'content_format') as ContentFormat) || 'plain',
          admin_notes: rowValue(record, 'admin_notes') || null,
          order_index: Number.isInteger(importedOrder) ? importedOrder : startingOrder + index + 1,
        };
      });

      const { error } = await supabase.from('master_practice_questions').insert(rows);
      if (error) throw error;
      addToast('success', `${rows.length} question(s) imported. Existing questions were retained.`);
      setCsvPreview(null);
      setShowBulkUpload(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('error', 'CSV import failed. Check JSON fields and run supabase_master_question_metadata.sql if needed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePdfDraftUpload = async (file?: File) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const rawText = new TextDecoder('latin1').decode(buffer);
    const extracted = extractPdfTextFallback(rawText);

    if (!extracted) {
      setPdfDraftNote(`Uploaded ${file.name}. This PDF needs OCR/AI extraction; no selectable text was found in-browser.`);
      return;
    }

    setNewQuestion((current) => ({ ...current, question_text: extracted, admin_notes: `Best-effort text extracted from ${file.name}. Review before saving.` }));
    setShowAddQuestion(true);
    setPdfDraftNote(`Best-effort text extracted from ${file.name}. Please review and split into questions before saving.`);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{masterSession?.title} Questions</h1>
          <p className="admin-page-subtitle">Session {masterSession?.session_number} universal questions. Shared across every batch.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/curriculum')}>
          ← Back to Master Base
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Bulk upload</h2>
            <p className="admin-page-subtitle">CSV import appends to this session. PDF extraction is best-effort until the AI review pipeline is added.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkUpload(!showBulkUpload)}>
            {showBulkUpload ? 'Hide upload' : 'Upload questions'}
          </button>
        </div>

        {showBulkUpload && (
          <div className="admin-form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="session-csv-upload">CSV file</label>
              <input id="session-csv-upload" className="form-input" type="file" accept=".csv,text/csv" onChange={(event) => handleCsvUpload(event.target.files?.[0])} />
              <p className="admin-page-subtitle">
                Supported columns: order_index, question_text, options, option_a-e, correct_answer, explanation, difficulty,
                question_type, di_question_type, answer_mode, stimulus_group_key, stimulus_title, stimulus_text, passage_text,
                stimulus_data, content_format, admin_notes.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="session-pdf-upload">PDF draft</label>
              <input id="session-pdf-upload" className="form-input" type="file" accept="application/pdf,.pdf" onChange={(event) => handlePdfDraftUpload(event.target.files?.[0])} />
              <p className="admin-page-subtitle">Possible long term: PDF → OCR → AI split/classify → admin review. This first pass only extracts selectable text when available.</p>
            </div>
          </div>
        )}

        {pdfDraftNote && <div className="question-bank-warning" style={{ marginTop: 'var(--space-md)' }}>{pdfDraftNote}</div>}

        {csvPreview && (
          <div className="question-bank-validation">
            <div className="question-bank-validation-summary">
              <strong>{csvPreview.rows.length} row(s) ready</strong>
              <span>{csvPreview.errors.length ? `${csvPreview.errors.length} issue(s)` : 'No validation errors'}</span>
            </div>
            {csvPreview.errors.length > 0 ? (
              <div className="question-bank-errors">
                {csvPreview.errors.map((error) => <div key={error}>• {error}</div>)}
              </div>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={importCsvPreview} disabled={isImporting}>
                {isImporting ? 'Importing...' : `Import ${csvPreview.rows.length} questions`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Questions ({questions.length})</h2>
            <p className="admin-page-subtitle">Use shared stimulus groups for RC passages and DI prompts that feed multiple questions.</p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddQuestion(!showAddQuestion)}
            disabled={tablesUnavailable}
          >
            {showAddQuestion ? 'Cancel' : '+ Add Question'}
          </button>
        </div>

        {tablesUnavailable ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p className="empty-state-text">Master practice tables are not available yet. Run <code>supabase_master_practice.sql</code> in Supabase.</p>
          </div>
        ) : (
          <>
            {showAddQuestion && (
              <div style={{
                padding: 'var(--space-xl)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-secondary)',
                marginBottom: 'var(--space-lg)',
              }}>
                <QuestionDraftForm
                  draft={newQuestion}
                  idPrefix="new-master-practice"
                  onChange={setNewQuestion}
                  onSave={handleAddQuestion}
                  saveLabel="Add Question"
                />
              </div>
            )}

            {questions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    style={{
                      display: 'flex',
                      alignItems: editingQuestionId === question.id ? 'flex-start' : 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{index + 1}</span>
                    {editingQuestionId === question.id ? (
                      <QuestionDraftForm
                        draft={editingQuestion}
                        idPrefix={`edit-master-practice-${question.id}`}
                        onChange={setEditingQuestion}
                        onSave={handleUpdateQuestion}
                        saveLabel="Save"
                        onCancel={handleCancelEditQuestion}
                      />
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: 4 }}>
                            <span className="badge badge-available">{questionTypeLabels[question.question_type || 'problem_solving']}</span>
                            {question.di_question_type && <span className="badge badge-upcoming">{diTypeLabels[question.di_question_type]}</span>}
                            {question.stimulus_group_key && <span className="badge badge-locked">Group: {question.stimulus_group_key}</span>}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{question.question_text}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {question.difficulty === 'advanced' ? 'Advanced' : 'Basic'} · {question.answer_mode || 'single_choice'} · Answer: {question.correct_answer}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleStartEditQuestion(question)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          style={{ color: 'var(--error)' }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-state-icon">✍️</div>
                <p className="empty-state-text">No questions yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function QuestionDraftForm({
  draft,
  idPrefix,
  onChange,
  onSave,
  saveLabel,
  onCancel,
}: {
  draft: QuestionDraft;
  idPrefix: string;
  onChange: (draft: QuestionDraft) => void;
  onSave: () => void;
  saveLabel: string;
  onCancel?: () => void;
}) {
  const showStimulus = draft.question_type === 'reading_comprehension' || draft.question_type === 'data_insights';
  const applyPatchToDraft = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch });
  const formatDraftText = () => applyPatchToDraft({
    question_text: formatReadableText(draft.question_text),
    stimulus_text: formatReadableText(draft.stimulus_text),
    explanation: formatReadableText(draft.explanation),
    optionsText: parseOptions(draft.optionsText).join('\n'),
  });
  const setQuestionKind = (questionType: QuestionType) => {
    if (questionType === 'data_sufficiency') {
      applyPatchToDraft({
        question_type: questionType,
        answer_mode: 'single_choice',
        di_question_type: '',
        optionsText: [
          'Statement (1) alone is sufficient',
          'Statement (2) alone is sufficient',
          'Both statements together are sufficient',
          'Each statement alone is sufficient',
          'Statements together are not sufficient',
        ].join('\n'),
      });
      return;
    }

    if (questionType === 'reading_comprehension') {
      applyPatchToDraft({
        question_type: questionType,
        answer_mode: 'single_choice',
        content_format: 'markdown',
        di_question_type: '',
        stimulus_group_key: draft.stimulus_group_key || 'rc-passage-1',
      });
      return;
    }

    if (questionType === 'data_insights') {
      applyPatchToDraft({
        question_type: questionType,
        di_question_type: draft.di_question_type || 'table_analysis',
        answer_mode: draft.answer_mode === 'single_choice' ? 'dropdown' : draft.answer_mode,
        stimulus_group_key: draft.stimulus_group_key || 'di-source-1',
      });
      return;
    }

    applyPatchToDraft({
      question_type: questionType,
      di_question_type: '',
      answer_mode: 'single_choice',
    });
  };

  return (
    <div className="admin-form" style={{ flex: 1, maxWidth: '100%' }}>
      <div className="question-editor-guide">
        <div>
          <span>Step 1</span>
          <strong>Choose what kind of question this is</strong>
          <p>The form will only ask for extra passage/source fields when they are needed.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={formatDraftText}
          title="Restores paragraph breaks from CSV/PDF text."
        >
          Fix spacing
        </button>
      </div>

      <div className="question-kind-grid" role="list" aria-label="Question kind">
        {[
          ['problem_solving', 'Quant', 'Normal five-option Quant question.'],
          ['data_sufficiency', 'DS', 'Adds standard DS answer choices.'],
          ['critical_reasoning', 'CR', 'Argument prompt with optional boldface.'],
          ['reading_comprehension', 'RC', 'Shared passage plus multiple questions.'],
          ['data_insights', 'DI', 'Tables, graphs, MSR, two-part, dropdowns.'],
        ].map(([value, label, description]) => (
          <button
            key={value}
            type="button"
            className={`question-kind-card ${draft.question_type === value ? 'active' : ''}`}
            onClick={() => setQuestionKind(value as QuestionType)}
          >
            <strong>{label}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>

      <div className="admin-form-row">
        <div className="form-group">
          <label className="form-label">Selected Format</label>
          <div className="question-editor-selected-kind">
            <strong>{questionTypeLabels[draft.question_type]}</strong>
            <span>{draft.question_type === 'reading_comprehension' ? 'Use one shared passage group for all questions from the same passage.' : draft.question_type === 'data_insights' ? 'Choose the DI subtype below, then add source/table/graph details.' : 'Add prompt, choices, answer, and explanation.'}</span>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-answer-mode`} className="form-label">Answer Mode</label>
          <select
            id={`${idPrefix}-answer-mode`}
            className="form-input"
            value={draft.answer_mode}
            onChange={(e) => onChange({ ...draft, answer_mode: e.target.value as AnswerMode })}
          >
            <option value="single_choice">Single choice</option>
            <option value="multi_select">Multi-select</option>
            <option value="numeric">Numeric</option>
            <option value="two_part">Two-part</option>
            <option value="dropdown">Dropdown</option>
          </select>
        </div>
      </div>

      {draft.question_type === 'data_insights' && (
        <div className="form-group">
          <label htmlFor={`${idPrefix}-di-type`} className="form-label">DI Question Type</label>
          <select
            id={`${idPrefix}-di-type`}
            className="form-input"
            value={draft.di_question_type}
            onChange={(e) => onChange({ ...draft, di_question_type: e.target.value as DiQuestionType })}
          >
            <option value="">Choose DI type</option>
            {Object.entries(diTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="admin-page-subtitle">GMAT DI uses Data Sufficiency, Multi-Source Reasoning, Table Analysis, Graphics Interpretation, and Two-Part Analysis. Tables/graphs should use stimulus data JSON when possible.</p>
        </div>
      )}

      {showStimulus && (
        <div className="question-editor-section">
          <div className="question-editor-section-heading">
            <span>Step 2</span>
            <strong>{draft.question_type === 'reading_comprehension' ? 'Add the shared RC passage' : 'Add the shared DI source'}</strong>
            <p>Use the same group key for every question that belongs to this passage/source.</p>
          </div>
          <div className="admin-form-row">
            <div className="form-group">
              <label htmlFor={`${idPrefix}-stimulus-key`} className="form-label">Shared Stimulus Group</label>
              <input
                id={`${idPrefix}-stimulus-key`}
                className="form-input"
                value={draft.stimulus_group_key}
                onChange={(e) => onChange({ ...draft, stimulus_group_key: e.target.value })}
                placeholder="Example: rc-session3-passage1"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`${idPrefix}-stimulus-title`} className="form-label">Stimulus Title</label>
              <input
                id={`${idPrefix}-stimulus-title`}
                className="form-input"
                value={draft.stimulus_title}
                onChange={(e) => onChange({ ...draft, stimulus_title: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor={`${idPrefix}-stimulus-text`} className="form-label">{draft.question_type === 'reading_comprehension' ? 'RC Passage' : 'DI Prompt / Source Text'}</label>
            <textarea
              id={`${idPrefix}-stimulus-text`}
              className="form-textarea"
              value={draft.stimulus_text}
              onChange={(e) => onChange({ ...draft, stimulus_text: e.target.value })}
              placeholder="Paste the shared passage/source once, then reuse the same group key for its questions."
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${idPrefix}-stimulus-data`} className="form-label">Stimulus Data JSON</label>
            <textarea
              id={`${idPrefix}-stimulus-data`}
              className="form-textarea"
              value={draft.stimulusDataText}
              onChange={(e) => onChange({ ...draft, stimulusDataText: e.target.value })}
              placeholder='Optional. Example: {"columns":["Year","Value"],"rows":[["2025",10]]}'
            />
          </div>
        </div>
      )}

      <div className="question-editor-section-heading">
        <span>{showStimulus ? 'Step 3' : 'Step 2'}</span>
        <strong>Add the question students will answer</strong>
        <p>Paste exact wording. Use the Fix spacing button if CSV/PDF text came in as one paragraph.</p>
      </div>

      <div className="form-group">
        <label htmlFor={`${idPrefix}-prompt`} className="form-label">Question Prompt</label>
        <textarea
          id={`${idPrefix}-prompt`}
          className="form-textarea"
          value={draft.question_text}
          onChange={(e) => onChange({ ...draft, question_text: e.target.value })}
          placeholder="Paste exact wording here. Use **bold** if content format is Markdown."
        />
      </div>
      <div className="admin-form-row">
        <div className="form-group">
          <label htmlFor={`${idPrefix}-options`} className="form-label">Options</label>
          <textarea
            id={`${idPrefix}-options`}
            className="form-textarea"
            value={draft.optionsText}
            onChange={(e) => onChange({ ...draft, optionsText: e.target.value })}
            placeholder="One per line, or paste a JSON array."
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-answer`} className="form-label">Correct Answer</label>
          <input
            id={`${idPrefix}-answer`}
            className="form-input"
            value={draft.correct_answer}
            onChange={(e) => onChange({ ...draft, correct_answer: e.target.value })}
            placeholder="A, B, exact option text, or numeric value"
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-explanation`} className="form-label">Explanation</label>
        <textarea
          id={`${idPrefix}-explanation`}
          className="form-textarea"
          value={draft.explanation}
          onChange={(e) => onChange({ ...draft, explanation: e.target.value })}
        />
      </div>
      <div className="admin-form-row">
        <div className="form-group">
          <label htmlFor={`${idPrefix}-difficulty`} className="form-label">Difficulty</label>
          <select
            id={`${idPrefix}-difficulty`}
            className="form-input"
            value={draft.difficulty}
            onChange={(e) => onChange({ ...draft, difficulty: e.target.value as Difficulty })}
          >
            <option value="basic">Basic</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-format`} className="form-label">Text Format</label>
          <select
            id={`${idPrefix}-format`}
            className="form-input"
            value={draft.content_format}
            onChange={(e) => onChange({ ...draft, content_format: e.target.value as ContentFormat })}
          >
            <option value="plain">Plain text</option>
            <option value="markdown">Markdown / boldface</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-notes`} className="form-label">Admin Notes</label>
        <textarea
          id={`${idPrefix}-notes`}
          className="form-textarea"
          value={draft.admin_notes}
          onChange={(e) => onChange({ ...draft, admin_notes: e.target.value })}
          placeholder="Internal review notes, PDF extraction warnings, source notes, etc."
        />
      </div>

      <details className="question-editor-columns">
        <summary>CSV import columns and what they map to</summary>
        <div className="question-editor-column-help">
          <span><code>order_index</code> display order</span>
          <span><code>question_text</code> question prompt</span>
          <span><code>options</code> JSON array or line-separated choices</span>
          <span><code>option_a-e</code> alternate choice columns</span>
          <span><code>correct_answer</code> A-E, exact option, or numeric answer</span>
          <span><code>explanation</code> answer explanation</span>
          <span><code>difficulty</code> basic / advanced</span>
          <span><code>question_type</code> Quant, DS, CR, RC, DI</span>
          <span><code>di_question_type</code> one of the five DI formats</span>
          <span><code>answer_mode</code> single, multi, numeric, two-part, dropdown</span>
          <span><code>stimulus_group_key</code> shared RC/DI group</span>
          <span><code>stimulus_title</code> passage/source title</span>
          <span><code>stimulus_text</code> RC passage or DI source text</span>
          <span><code>passage_text</code> alias for stimulus text</span>
          <span><code>stimulus_data</code> table/graph JSON</span>
          <span><code>content_format</code> plain / markdown</span>
          <span><code>admin_notes</code> private notes</span>
        </div>
      </details>

      <div className="admin-form-actions">
        <button className="btn btn-primary btn-sm" onClick={onSave}>
          {saveLabel}
        </button>
        {onCancel && (
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
