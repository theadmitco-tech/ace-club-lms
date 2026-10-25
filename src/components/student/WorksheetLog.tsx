'use client';

import { useMemo, useRef, useState } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isWorksheetRecovery, isWorksheetSaveReceipt, type WorksheetEdit, type WorksheetRecovery } from '@/lib/worksheetRecovery';
import {
  formatTrackerDuration,
  parseTrackerDuration,
  type StudentQuestionLog,
  type StudentQuestionStatus,
  type StudentWorksheetLog,
} from '@/lib/studentPractice';
import { createClient } from '@/utils/supabase/client';

type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

type PendingBulk = {
  ids: string[];
  status: StudentQuestionStatus;
};

function statusLabel(status: StudentQuestionStatus | null) {
  if (status === 'done') return 'Done';
  if (status === 'review') return 'Come back for review';
  return 'Not updated';
}

export function WorksheetLog({ worksheet, ownerId }: { worksheet: StudentWorksheetLog; ownerId: string }) {
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

  const inFlight = useRef(new Set<string>());
  const edits = useRef(new Map<string, WorksheetEdit>());
  const recovery = useDraftRecovery<WorksheetRecovery>(ownerId, `worksheet:${worksheet.course_id}:${worksheet.material_id}`, isWorksheetRecovery);

  function remember(question: StudentQuestionLog, timeValue: string) {
    edits.current.set(question.id, { id: question.id, status: question.status, comment: question.comment,
      timeValue, baseUpdatedAt: edits.current.get(question.id)?.baseUpdatedAt ?? question.updated_at });
    recovery.remember({ edits: [...edits.current.values()] });
  }

  function restore() {
    if (!recovery.recovered) return;
    const restored: string[] = [];
    let conflicts = 0;
    for (const edit of recovery.recovered.edits) {
      const current = worksheet.questions.find((question) => question.id === edit.id);
      if (!current || current.updated_at !== edit.baseUpdatedAt) { conflicts++; continue; }
      edits.current.set(edit.id, edit);
      restored.push(edit.id);
      updateQuestion(edit.id, { status: edit.status, comment: edit.comment });
      setTimeValues((values) => ({ ...values, [edit.id]: edit.timeValue }));
      setSaveStates((values) => ({ ...values, [edit.id]: 'error' }));
      setErrors((values) => ({ ...values, [edit.id]: 'Restored edits have not been saved. Retry this question.' }));
    }
    if (edits.current.size) recovery.remember({ edits: [...edits.current.values()] });
    else recovery.forget();
    if (conflicts) setBulkMessage(`${restored.length} question edits restored. ${conflicts} changed or removed questions were kept as currently saved.`);
  }

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
    if (inFlight.current.has(question.id)) return { ok: false as const, message: 'This question is already saving.' };
    remember(question, timeValue);
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

    inFlight.current.add(question.id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('update_student_question_log', {
        p_material_id: worksheet.material_id,
        p_question_id: question.id,
        p_status: question.status,
        p_time_taken_seconds: duration.seconds,
        p_comment: question.comment,
      });

      if (error || !isWorksheetSaveReceipt(data, question.id)) {
        const message = 'Could not save. Retry this question.';
        setSaveStates((current) => ({ ...current, [question.id]: 'error' }));
        setErrors((current) => ({ ...current, [question.id]: message }));
        return { ok: false as const, message };
      }

      const saved = data;
      edits.current.delete(question.id);
      if (edits.current.size) recovery.remember({ edits: [...edits.current.values()] });
      else recovery.forget();
      updateQuestion(question.id, saved);
      setTimeValues((current) => ({
        ...current,
        [question.id]: formatTrackerDuration(saved.time_taken_seconds),
      }));
      setSaveStates((current) => ({ ...current, [question.id]: 'saved' }));
      return { ok: true as const };
    } catch {
      const message = 'Could not save. Retry this question.';
      setSaveStates((current) => ({ ...current, [question.id]: 'error' }));
      setErrors((current) => ({ ...current, [question.id]: message }));
      return { ok: false as const, message };
    } finally {
      inFlight.current.delete(question.id);
    }
  }

  async function saveStatus(question: StudentQuestionLog, status: StudentQuestionStatus) {
    if (inFlight.current.has(question.id) || bulkSaving) return;
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
    if (selected.size === 0 || inFlight.current.size > 0 || bulkSaving) return;
    setPendingBulk({ ids: Array.from(selected), status });
    setBulkMessage(null);
  }

  async function applyBulk(bulk: PendingBulk) {
    if (inFlight.current.size > 0 || bulkSaving) return;
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

  const recoveryPending = !!recovery.recovered;
  const anySaving = Object.values(saveStates).includes('saving');
  const allSelected = questions.length > 0 && selected.size === questions.length;

  return (
    <section className="worksheet-log worksheet-log-panel" id="worksheet-log" aria-labelledby="worksheet-log-title">
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
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
            disabled={bulkSaving || anySaving || recoveryPending}
            onChange={() => setSelected(allSelected
              ? new Set<string>()
              : new Set(questions.map((question) => question.id)))}
          />
          Select all
        </label>
        <span>{selected.size} selected</span>
        <button type="button" disabled={selected.size === 0 || bulkSaving || anySaving || recoveryPending} onClick={() => requestBulk('done')}>
          Mark selected Done
        </button>
        <button type="button" disabled={selected.size === 0 || bulkSaving || anySaving || recoveryPending} onClick={() => requestBulk('review')}>
          Mark selected for review
        </button>
        {selected.size > 0 && (
          <button className="bulk-clear" type="button" disabled={bulkSaving || anySaving || recoveryPending} onClick={() => setSelected(new Set())}>Clear</button>
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
                      disabled={bulkSaving || anySaving || recoveryPending}
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
                        disabled={saveState === 'saving' || bulkSaving || recoveryPending}
                        onClick={() => void saveStatus(question, 'done')}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        className={question.status === 'review' ? 'active status-review' : ''}
                        aria-pressed={question.status === 'review'}
                        disabled={saveState === 'saving' || bulkSaving || recoveryPending}
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
                      disabled={saveState === 'saving' || bulkSaving || recoveryPending}
                      placeholder="2:30"
                      aria-label={`Time taken for question ${question.question_number}`}
                      onChange={(event) => {
                        remember(question, event.target.value);
                        setSaveStates((current) => ({ ...current, [question.id]: 'unsaved' }));
                        setTimeValues((current) => ({ ...current, [question.id]: event.target.value }));
                      }}
                      onBlur={() => void persistQuestion(question, timeValues[question.id] ?? '')}
                    />
                  </td>
                  <td>
                    <textarea
                      value={question.comment ?? ''}
                      disabled={saveState === 'saving' || bulkSaving || recoveryPending}
                      maxLength={2000}
                      rows={2}
                      placeholder="Optional reflection"
                      aria-label={`Comment for question ${question.question_number}`}
                      onChange={(event) => {
                        const next = { ...question, comment: event.target.value };
                        remember(next, timeValues[question.id] ?? '');
                        setSaveStates((current) => ({ ...current, [question.id]: 'unsaved' }));
                        updateQuestion(question.id, { comment: event.target.value });
                      }}
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
                    {saveState === 'unsaved' && 'Unsaved edits'}
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
