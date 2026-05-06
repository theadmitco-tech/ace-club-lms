'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/AuthContext';

type Difficulty = 'basic' | 'advanced';

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
  order_index: number;
  created_at: string;
};

const emptyQuestionDraft = {
  question_text: '',
  optionsText: '',
  correct_answer: '',
  explanation: '',
  difficulty: 'basic' as Difficulty,
};

function toOptionsText(options: unknown) {
  return Array.isArray(options) ? options.join('\n') : '';
}

function parseOptions(optionsText: string) {
  return optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
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
  const [newQuestion, setNewQuestion] = useState(emptyQuestionDraft);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState(emptyQuestionDraft);
  const [tablesUnavailable, setTablesUnavailable] = useState(false);

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
        title: `${masterSession?.title || 'Session'} Worksheet`,
      })
      .select()
      .single();

    if (error) throw error;
    setPracticeSet(data as MasterPracticeSet);
    return data as MasterPracticeSet;
  };

  const validateQuestionDraft = (draft: typeof emptyQuestionDraft) => {
    const options = parseOptions(draft.optionsText);

    if (!draft.question_text.trim() || !draft.correct_answer.trim()) {
      addToast('error', 'Add a prompt and the correct answer.');
      return null;
    }

    if (options.length === 1) {
      addToast('error', 'Use zero options for open-answer questions, or at least two options for multiple choice.');
      return null;
    }

    if (options.length > 0 && !options.includes(draft.correct_answer.trim())) {
      addToast('error', 'Correct answer must exactly match one option.');
      return null;
    }

    return options;
  };

  const handleAddQuestion = async () => {
    const options = validateQuestionDraft(newQuestion);
    if (!options) return;

    try {
      const set = await ensurePracticeSet();
      const { error } = await supabase.from('master_practice_questions').insert({
        master_practice_set_id: set.id,
        question_text: newQuestion.question_text.trim(),
        options,
        correct_answer: newQuestion.correct_answer.trim(),
        explanation: newQuestion.explanation.trim(),
        difficulty: newQuestion.difficulty,
        order_index: questions.length + 1,
      });

      if (error) throw error;

      addToast('success', 'Worksheet question added.');
      setNewQuestion(emptyQuestionDraft);
      setShowAddQuestion(false);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to add worksheet question.');
    }
  };

  const handleStartEditQuestion = (question: MasterPracticeQuestion) => {
    setEditingQuestionId(question.id);
    setEditingQuestion({
      question_text: question.question_text || '',
      optionsText: toOptionsText(question.options),
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || '',
      difficulty: question.difficulty === 'advanced' ? 'advanced' : 'basic',
    });
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
      .update({
        question_text: editingQuestion.question_text.trim(),
        options,
        correct_answer: editingQuestion.correct_answer.trim(),
        explanation: editingQuestion.explanation.trim(),
        difficulty: editingQuestion.difficulty,
      })
      .eq('id', editingQuestionId);

    if (error) {
      console.error(error);
      addToast('error', 'Failed to update worksheet question.');
    } else {
      addToast('success', 'Worksheet question updated.');
      handleCancelEditQuestion();
      fetchData();
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const { error } = await supabase.from('master_practice_questions').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete worksheet question.');
    } else {
      addToast('success', 'Worksheet question deleted.');
      fetchData();
    }
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
          <h1 className="admin-page-title">{masterSession?.title} Worksheet</h1>
          <p className="admin-page-subtitle">Session {masterSession?.session_number} global worksheet questions</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/curriculum')}>
          ← Back to Master Base
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Worksheet Questions ({questions.length})</h2>
            <p className="admin-page-subtitle">These questions are shared by every batch for this session number.</p>
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
                          <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{question.question_text}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {question.difficulty === 'advanced' ? 'Advanced' : 'Basic'} · Answer: {question.correct_answer}
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
                <p className="empty-state-text">No worksheet questions yet.</p>
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
  draft: typeof emptyQuestionDraft;
  idPrefix: string;
  onChange: (draft: typeof emptyQuestionDraft) => void;
  onSave: () => void;
  saveLabel: string;
  onCancel?: () => void;
}) {
  return (
    <div className="admin-form" style={{ flex: 1 }}>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-prompt`} className="form-label">Question Prompt</label>
        <textarea
          id={`${idPrefix}-prompt`}
          className="form-textarea"
          value={draft.question_text}
          onChange={(e) => onChange({ ...draft, question_text: e.target.value })}
          placeholder="Paste exact worksheet wording here."
        />
      </div>
      <div className="admin-form-row">
        <div className="form-group">
          <label htmlFor={`${idPrefix}-options`} className="form-label">Options (one per line, optional for open answer)</label>
          <textarea
            id={`${idPrefix}-options`}
            className="form-textarea"
            value={draft.optionsText}
            onChange={(e) => onChange({ ...draft, optionsText: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-answer`} className="form-label">Correct Answer</label>
          <input
            id={`${idPrefix}-answer`}
            className="form-input"
            value={draft.correct_answer}
            onChange={(e) => onChange({ ...draft, correct_answer: e.target.value })}
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
      </div>
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
