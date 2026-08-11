'use client';

import { useMemo, useState } from 'react';
import {
  formatTrackerDuration,
  parseTrackerDuration,
  type StudentQuestionLog,
  type StudentQuestionStatus,
  type StudentWorksheetLog,
} from '@/lib/studentPractice';
import { createClient } from '@/utils/supabase/client';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type SavedQuestion = {
  id: string;
  status: StudentQuestionStatus | null;
  time_taken_seconds: number | null;
  comment: string | null;
  updated_at: string;
};

type PendingBulk = {
  ids: string[];
  status: StudentQuestionStatus;
};

function statusLabel(status: StudentQuestionStatus | null) {
  if (status === 'done') return 'Done';
  if (status === 'review') return 'Come back for review';
  return 'Not updated';
}

export function WorksheetLog({ worksheet }: { worksheet: StudentWorksheetLog }) {
  const [questions, setQuestions] = useState(worksheet.questions);
  const [timeValues, setTimeValues] = useState<Record<string, string>>(() => (
    Object.fromEntries(worksheet.questions.map((question) => [
      question.id,
      formatTrackerDuration(question.time_taken_seconds),
    ]))
  ));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingBulk, setPendingBulk] = useState<PendingBulk | null>(null);
  const [failedBulk, setFailedBulk] = useState<PendingBulk | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const totals = useMemo(() => ({
    done: questions.filter((question) => question.status === 'done').length,
    review: questions.filter((question) => question.status === 'review').length,
  }), [questions]);

  function updateQuestion(questionId: string, change: Partial<StudentQuestionLog>) {
    setQuestions((current) => current.map((question) => (
      question.id === questionId ? { ...question, ...change } : question
    )));
  }

  async function persistQuestion(question: StudentQuestionLog, timeValue: string) {
    const duration = parseTrackerDuration(timeValue);
    if (duration.error) {
      setSaveStates((current) => ({ ...current, [question.id]: 'error' }));
      setErrors((current) => ({ ...current, [question.id]: duration.error! }));
      return { ok: false as const, message: duration.error };
    }

    setSaveStates((current) => ({ ...current, [question.id]: 'saving' }));
    setErrors((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });

    const supabase = createClient();
    const { data, error } = await supabase.rpc('update_student_question_log', {
      p_material_id: worksheet.material_id,
      p_question_id: question.id,
      p_status: question.status,
      p_time_taken_seconds: duration.seconds,
      p_comment: question.comment,
    });

    if (error || !data) {
      const message = 'Could not save. Retry this question.';
      setSaveStates((current) => ({ ...current, [question.id]: 'error' }));
      setErrors((current) => ({ ...current, [question.id]: message }));
      return { ok: false as const, message };
    }

    const saved = data as SavedQuestion;
    updateQuestion(question.id, saved);
    setTimeValues((current) => ({
      ...current,
      [question.id]: formatTrackerDuration(saved.time_taken_seconds),
    }));
    setSaveStates((current) => ({ ...current, [question.id]: 'saved' }));
    return { ok: true as const };
  }

  async function saveStatus(question: StudentQuestionLog, status: StudentQuestionStatus) {
    const next = { ...question, status };
    updateQuestion(question.id, { status });
    await persistQuestion(next, timeValues[question.id] ?? '');
  }

  function toggleSelected(questionId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function requestBulk(status: StudentQuestionStatus) {
    if (selected.size === 0) return;
    setPendingBulk({ ids: Array.from(selected), status });
    setBulkMessage(null);
  }

  async function applyBulk(bulk: PendingBulk) {
    setPendingBulk(null);
    setFailedBulk(null);
    setBulkSaving(true);
    setBulkMessage(`Saving ${bulk.ids.length} selected question${bulk.ids.length === 1 ? '' : 's'}…`);

    const selectedRows = questions
      .filter((question) => bulk.ids.includes(question.id))
      .map((question) => ({ ...question, status: bulk.status }));
    const previousStatuses = new Map(
      questions
        .filter((question) => bulk.ids.includes(question.id))
        .map((question) => [question.id, question.status]),
    );

    setQuestions((current) => current.map((question) => (
      bulk.ids.includes(question.id) ? { ...question, status: bulk.status } : question
    )));

    const results = await Promise.all(selectedRows.map(async (question) => ({
      id: question.id,
      result: await persistQuestion(question, timeValues[question.id] ?? ''),
    })));
    const failedIds = results.filter(({ result }) => !result.ok).map(({ id }) => id);
    const savedCount = results.length - failedIds.length;
    setBulkSaving(false);

    if (failedIds.length > 0) {
      const failedNumbers = questions
        .filter((question) => failedIds.includes(question.id))
        .map((question) => question.question_number);
      setQuestions((current) => current.map((question) => (
        failedIds.includes(question.id)
          ? { ...question, status: previousStatuses.get(question.id) ?? null }
          : question
      )));
      setFailedBulk({ ids: failedIds, status: bulk.status });
      setSelected(new Set(failedIds));
      setBulkMessage(
        `${savedCount} saved. Questions ${failedNumbers.join(', ')} could not be saved; only those questions will retry.`,
      );
      return;
    }

    setSelected(new Set());
    setBulkMessage(`${savedCount} question${savedCount === 1 ? '' : 's'} saved.`);
  }

  const allSelected = questions.length > 0 && selected.size === questions.length;

  return (
    <section className="worksheet-log worksheet-log-panel" id="worksheet-log" aria-labelledby="worksheet-log-title">
      <div className="worksheet-log-heading">
        <div>
          <span className="student-eyebrow">Manual tracker</span>
          <h2 className="sr-only" id="worksheet-log-title">Update log</h2>
        </div>
        <div className="worksheet-log-totals" aria-label="Worksheet progress totals">
          <span><strong>{totals.done}</strong> Done</span>
          <span><strong>{totals.review}</strong> Review</span>
          <span><strong>{questions.length - totals.done - totals.review}</strong> Not updated</span>
        </div>
      </div>

      <div className="worksheet-bulk-bar">
        <label className="select-all-control">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={bulkSaving}
            onChange={() => setSelected(allSelected
              ? new Set<string>()
              : new Set(questions.map((question) => question.id)))}
          />
          Select all
        </label>
        <span>{selected.size} selected</span>
        <button type="button" disabled={selected.size === 0 || bulkSaving} onClick={() => requestBulk('done')}>
          Mark selected Done
        </button>
        <button type="button" disabled={selected.size === 0 || bulkSaving} onClick={() => requestBulk('review')}>
          Mark selected for review
        </button>
        {selected.size > 0 && (
          <button className="bulk-clear" type="button" disabled={bulkSaving} onClick={() => setSelected(new Set())}>Clear</button>
        )}
      </div>

      {pendingBulk && (
        <div className="bulk-confirmation" role="alert">
          <span>
            Mark {pendingBulk.ids.length} selected question{pendingBulk.ids.length === 1 ? '' : 's'} as {statusLabel(pendingBulk.status)}?
          </span>
          <button type="button" onClick={() => void applyBulk(pendingBulk)}>Confirm</button>
          <button type="button" onClick={() => setPendingBulk(null)}>Cancel</button>
        </div>
      )}

      {bulkMessage && (
        <div className={failedBulk ? 'bulk-result bulk-result-error' : 'bulk-result'} role="status">
          <span>{bulkMessage}</span>
          {failedBulk && (
            <button type="button" onClick={() => void applyBulk(failedBulk)}>Retry failed only</button>
          )}
        </div>
      )}

      <div
        className="worksheet-log-table-wrap"
        role="region"
        aria-label="Worksheet questions"
        tabIndex={0}
      >
        <table className="worksheet-log-table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Select</span></th>
              <th scope="col">Question</th>
              <th scope="col">Status</th>
              <th scope="col">Time (mm:ss)</th>
              <th scope="col">Comment</th>
              <th scope="col">Save state</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const saveState = saveStates[question.id] ?? 'idle';
              return (
                <tr className={selected.has(question.id) ? 'question-selected' : ''} key={question.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(question.id)}
                      disabled={bulkSaving}
                      onChange={() => toggleSelected(question.id)}
                      aria-label={`Select question ${question.question_number}`}
                    />
                  </td>
                  <th scope="row">{question.question_number}</th>
                  <td>
                    <div className="question-status-controls" aria-label={`Status for question ${question.question_number}`}>
                      <button
                        type="button"
                        className={question.status === 'done' ? 'active status-done' : ''}
                        aria-pressed={question.status === 'done'}
                        disabled={saveState === 'saving'}
                        onClick={() => void saveStatus(question, 'done')}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        className={question.status === 'review' ? 'active status-review' : ''}
                        aria-pressed={question.status === 'review'}
                        disabled={saveState === 'saving'}
                        onClick={() => void saveStatus(question, 'review')}
                      >
                        Review
                      </button>
                    </div>
                    <small className={`question-status-copy status-${question.status ?? 'untouched'}`}>
                      {statusLabel(question.status)}
                    </small>
                  </td>
                  <td>
                    <input
                      className="tracker-time-input"
                      inputMode="numeric"
                      value={timeValues[question.id] ?? ''}
                      disabled={saveState === 'saving' || bulkSaving}
                      placeholder="2:30"
                      aria-label={`Time taken for question ${question.question_number}`}
                      onChange={(event) => setTimeValues((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))}
                      onBlur={() => void persistQuestion(question, timeValues[question.id] ?? '')}
                    />
                  </td>
                  <td>
                    <textarea
                      value={question.comment ?? ''}
                      disabled={saveState === 'saving' || bulkSaving}
                      maxLength={2000}
                      rows={2}
                      placeholder="Optional reflection"
                      aria-label={`Comment for question ${question.question_number}`}
                      onChange={(event) => updateQuestion(question.id, { comment: event.target.value })}
                      onBlur={(event) => void persistQuestion(
                        { ...question, comment: event.target.value },
                        timeValues[question.id] ?? '',
                      )}
                    />
                  </td>
                  <td className={`save-state save-state-${saveState}`}>
                    {saveState === 'saving' && 'Saving…'}
                    {saveState === 'saved' && 'Saved'}
                    {saveState === 'error' && (
                      <>
                        <span>{errors[question.id]}</span>
                        <button type="button" onClick={() => void persistQuestion(question, timeValues[question.id] ?? '')}>
                          Retry
                        </button>
                      </>
                    )}
                    {saveState === 'idle' && (question.updated_at ? 'Saved' : 'Not updated')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
