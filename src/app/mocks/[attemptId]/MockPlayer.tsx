'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { MockQuestionBody, MockStimulus, type MockMediaAsset } from '@/components/mock/MockQuestionContent';
import { formatClock, remainingSeconds, SECTION_LABELS, type MockSection } from '@/lib/mockAttempt';
import type { AttemptMedia, MockAttemptItem } from '@/lib/server/mockAttempts';

type SectionState = { id: string; section: MockSection; sequence_index: number; status: 'pending'|'active'|'review'|'submitted'|'timed_out'; deadline_at: string|null; review_edit_count: number };
type PlayerState = { attempt: { id:string; status:string; section_order:MockSection[]; current_section_index:number; current_item_id:string|null; break_status:string; break_deadline_at:string|null; lock_version:number; mock_attempt_sections:SectionState[] }; activeSection: SectionState|null; items: MockAttemptItem[]; reviewEditedItemIds: string[]; serverNow: string };
type MutationResult = { lock_version?: number; status?: string; current_section_index?: number; break_status?: string };
type OptimisticUpdate = (current: PlayerState) => PlayerState;

function mutationErrorMessage(message: string) {
  if (message.includes('REVIEW_EDIT_LIMIT')) return 'You have used all 3 review edits. You can still change questions you already edited.';
  if (message.includes('STALE_ATTEMPT') || message.includes('STALE_RESPONSE')) return 'This attempt changed in another tab. The latest saved state has been loaded.';
  if (message.includes('BREAK_ACTIVE')) return 'End the active break before beginning the next section.';
  if (message.includes('ATTEMPT_COMPLETED')) return 'This attempt has already been completed.';
  return message || 'That change could not be saved.';
}

function studentMedia(attemptId: string, media: AttemptMedia[] = []): MockMediaAsset[] {
  return media.map((asset) => ({ ...asset, url: `/api/student/mock-attempts/${attemptId}/media/${asset.id}` }));
}

function responseBySlot(item: MockAttemptItem | undefined, response: unknown): Record<string, string> {
  if (response && typeof response === 'object' && !Array.isArray(response)) return response as Record<string, string>;
  if (typeof response === 'string') {
    const slotId = item?.response_config_snapshot.options?.[0]?.response_slot_id;
    return slotId ? { [slotId]: response } : {};
  }
  return {};
}

function draftsFromItems(items: MockAttemptItem[]) {
  return Object.fromEntries(items.map((entry) => [entry.id, responseBySlot(entry, entry.mock_responses[0]?.response)]));
}

function responsesEqual(left: Record<string, string>, right: Record<string, string>) {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

function responseComplete(item: MockAttemptItem | undefined, response: Record<string, string>) {
  const slots = [...new Set(item?.response_config_snapshot.options?.map((option) => option.response_slot_id) ?? [])];
  return slots.length > 0 && slots.every((slotId) => Boolean(response[slotId]));
}

export function MockPlayer({ initialState }: { initialState: PlayerState }) {
  const [state, setState] = useState(initialState);
  const [itemId, setItemId] = useState(initialState.attempt.current_item_id ?? initialState.items[0]?.id ?? '');
  const [seconds, setSeconds] = useState(() => remainingSeconds(initialState.activeSection?.deadline_at ?? null, Date.parse(initialState.serverNow)));
  const [breakSeconds, setBreakSeconds] = useState(() => remainingSeconds(initialState.attempt.break_deadline_at, Date.parse(initialState.serverNow)));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmAnswer, setConfirmAnswer] = useState(false);
  const [reviewOverview, setReviewOverview] = useState(initialState.activeSection?.status === 'review');
  const [draftResponses, setDraftResponses] = useState<Record<string, Record<string, string>>>(() => draftsFromItems(initialState.items));
  const item = useMemo(() => state.items.find((entry) => entry.id === itemId) ?? state.items[0], [state.items, itemId]);
  const responseRow = item?.mock_responses?.[0];
  const savedResponse = responseBySlot(item, responseRow?.response);
  const draftResponse = item ? draftResponses[item.id] ?? savedResponse : {};
  const isReview = state.activeSection?.status === 'review';
  const wasEditedInReview = Boolean(item && state.reviewEditedItemIds.includes(item.id));
  const canEditInReview = !isReview || wasEditedInReview || (state.activeSection?.review_edit_count ?? 0) < 3;
  const answerComplete = responseComplete(item, draftResponse);
  const answerChanged = !responsesEqual(draftResponse, savedResponse);

  const refresh = useCallback(async () => { const response = await fetch(`/api/student/mock-attempts/${state.attempt.id}`, { cache: 'no-store' }); if (response.ok) { const next = await response.json(); setState(next); setItemId(next.attempt.current_item_id ?? next.items[0]?.id ?? ''); setDraftResponses(draftsFromItems(next.items)); setReviewOverview(next.activeSection?.status === 'review'); setSeconds(remainingSeconds(next.activeSection?.deadline_at ?? null)); setBreakSeconds(remainingSeconds(next.attempt.break_deadline_at)); } }, [state.attempt.id]);
  async function mutate(operation: string, payload: unknown = {}, options: { optimistic?: OptimisticUpdate; refreshAfter?: boolean; rollback?: () => void; expectedLockVersion?: number } = {}) {
    const previousState = state;
    const expectedLockVersion = options.expectedLockVersion ?? state.attempt.lock_version;
    setBusy(true); setError('');
    if (options.optimistic) setState(options.optimistic);
    try {
      const response = await fetch(`/api/student/mock-attempts/${state.attempt.id}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ operation, payload, expectedLockVersion, clientMutationId:crypto.randomUUID() }) });
      const result = await response.json() as MutationResult & { error?: string };
      if (!response.ok) {
        setError(mutationErrorMessage(result.error ?? ''));
        options.rollback?.();
        if (response.status === 409) await refresh(); else setState(previousState);
        return null;
      }
      if (options.refreshAfter) await refresh();
      else setState((current) => ({ ...current, attempt: { ...current.attempt,
        lock_version: Math.max(result.lock_version ?? current.attempt.lock_version, current.attempt.lock_version),
        status: result.status ?? current.attempt.status,
        current_section_index: Math.max(result.current_section_index ?? current.attempt.current_section_index, current.attempt.current_section_index),
        break_status: result.break_status ?? current.attempt.break_status,
      } }));
      return result;
    } catch {
      options.rollback?.(); setState(previousState);
      setError('The connection was interrupted. Your last confirmed save is still safe; retry this action.');
      return null;
    } finally { setBusy(false); }
  }
  async function navigateTo(target: MockAttemptItem, expectedLockVersion = state.attempt.lock_version) {
    const previousItemId = itemId;
    setItemId(target.id);
    const result = await mutate('navigate', { attempt_item_id:target.id }, {
      expectedLockVersion,
      optimistic: (current) => ({ ...current, attempt: { ...current.attempt, current_item_id:target.id } }),
      rollback: () => setItemId(previousItemId),
    });
    return result;
  }
  async function saveConfirmedResponse(target: MockAttemptItem, next: Record<string, string>, expectedLockVersion = state.attempt.lock_version) {
    const targetResponse = target.mock_responses[0];
    return mutate('response', { attempt_item_id:target.id, response:next, expected_response_version:targetResponse?.response_version ?? 1 }, {
      expectedLockVersion,
      optimistic: (current) => ({ ...current, items: current.items.map((entry) => entry.id !== target.id ? entry : {
        ...entry,
        mock_responses: [{ ...entry.mock_responses[0], response:next, response_version:(entry.mock_responses[0]?.response_version ?? 1) + 1, answered_at:new Date().toISOString() }],
      }) }),
    });
  }
  async function confirmCurrentResponse() {
    if (!item || !answerComplete || (isReview && !canEditInReview)) return;
    setConfirmAnswer(false);
    let lockVersion = state.attempt.lock_version;
    if (answerChanged) {
      const saved = await saveConfirmedResponse(item, draftResponse, lockVersion);
      if (!saved) return;
      lockVersion = saved.lock_version ?? lockVersion;
    }
    if (isReview) {
      await refresh();
      setReviewOverview(true);
      return;
    }
    if (item.display_order === state.items.length) {
      const reviewed = await mutate('review', {}, { expectedLockVersion:lockVersion, refreshAfter:true });
      if (reviewed) setReviewOverview(true);
      return;
    }
    const next = state.items[item.display_order];
    if (next) await navigateTo(next, lockVersion);
  }
  useEffect(() => { if (!state.activeSection?.deadline_at || state.attempt.status === 'completed') return; const timer = window.setInterval(() => { const next = remainingSeconds(state.activeSection?.deadline_at ?? null); setSeconds(next); if (next === 0) { window.clearInterval(timer); void mutate('timeout', {}, {refreshAfter:true}); } }, 1000); return () => window.clearInterval(timer); }, [state.activeSection?.deadline_at, state.attempt.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.attempt.break_status !== 'active') return; const timer = window.setInterval(() => { const next = remainingSeconds(state.attempt.break_deadline_at); setBreakSeconds(next); if (next === 0) { window.clearInterval(timer); void mutate('break', {action:'end'}, {refreshAfter:true}); } }, 1000); return () => window.clearInterval(timer); }, [state.attempt.break_status, state.attempt.break_deadline_at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.attempt.status === 'completed') return <main className="mock-complete"><BrandLogo variant="dark" className="mock-complete-logo"/><span className="mock-success-mark">✓</span><h1>Mock completed</h1><p>Your responses were submitted successfully. Score reporting will be added in the next phase.</p><Link className="student-button" href="/mocks">Return to mocks</Link></main>;
  if (state.attempt.break_status === 'active') return <main className="mock-gate"><BrandLogo variant="dark" className="mock-gate-logo"/><span className="student-eyebrow">Optional break</span><h1>{formatClock(breakSeconds ?? 600)}</h1><p>Your next section has not started. You can use the remaining break time or continue early.</p>{error && <p className="mock-error">{error}</p>}<button className="student-button" disabled={busy} onClick={() => mutate('break',{action:'end'}, {refreshAfter:true})} type="button">End break</button></main>;
  if (!state.activeSection || state.activeSection.status === 'pending') {
    const section = state.attempt.section_order[state.attempt.current_section_index];
    const canBreak = state.attempt.break_status === 'available' && state.attempt.current_section_index > 0;
    return <main className="mock-gate"><BrandLogo variant="dark" className="mock-gate-logo"/><span className="student-eyebrow">Section {state.attempt.current_section_index + 1} of 3</span><h1>{SECTION_LABELS[section]}</h1><p>You will have 45 minutes. The timer starts only when you select Begin section.</p><ul><li>Answers save automatically.</li><li>You can bookmark questions and review the section.</li><li>During review, you may edit up to 3 distinct questions.</li></ul>{error && <p className="mock-error">{error}</p>}<div className="mock-gate-actions">{canBreak && <button className="student-button student-button-secondary" disabled={busy} onClick={() => mutate('break',{action:'take'}, {refreshAfter:true})} type="button">Take 10-minute break</button>}<button className="student-button" disabled={busy} onClick={() => mutate('begin', {}, {refreshAfter:true})} type="button">Begin section</button></div></main>;
  }
  const warning = seconds !== null && seconds <= 300;
  const warningCopy = seconds !== null && seconds <= 60 ? '1 minute remaining' : warning ? '5 minutes remaining' : '';
  if (seconds === 0) return <main className="mock-gate"><BrandLogo variant="dark" className="mock-gate-logo"/><span className="student-eyebrow">Section complete</span><h1>Time is up</h1><p>Your saved answers are locked. Moving you to the next section.</p>{error && <p className="mock-error">{error}</p>}{!busy && <button className="student-button" onClick={() => mutate('timeout', {}, {refreshAfter:true})} type="button">Continue</button>}</main>;
  if (isReview && reviewOverview) return <div className={`mock-player mock-section-${state.activeSection.section}`}><header className="mock-player-header"><BrandLogo variant="light" className="mock-player-logo"/><div><span>{SECTION_LABELS[state.activeSection.section]}</span>{warningCopy && <span className="timer-warning-copy" role="status">{warningCopy}</span>}<strong className={warning ? 'timer-warning' : ''}>{seconds === null ? '--:--' : formatClock(seconds)}</strong></div></header>
    <div className="mock-progress" style={{'--mock-progress':'100%'} as React.CSSProperties}/>
    <main className="mock-review-screen"><span className="student-eyebrow">Section review</span><h1>Question Review &amp; Edit</h1><p>Review any question while time remains. You may edit answers for up to three questions.</p><strong>{Math.max(0, 3-state.activeSection.review_edit_count)} {3-state.activeSection.review_edit_count === 1 ? 'edit' : 'edits'} remaining</strong>
      <div aria-label="Questions in this section" className="mock-review-grid">{state.items.map((entry) => <button className={`${entry.bookmarked?'bookmarked ':''}${state.reviewEditedItemIds.includes(entry.id)?'edited':''}`} disabled={busy} key={entry.id} onClick={async () => { if (await navigateTo(entry)) setReviewOverview(false); }} type="button"><span>Question {entry.display_order}</span>{entry.bookmarked && <small>★ Bookmarked</small>}{state.reviewEditedItemIds.includes(entry.id) && <small>Edited</small>}</button>)}</div>
    </main>{error && <div className="mock-toast" role="alert">{error}</div>}<footer className="mock-player-footer mock-review-footer"><span>Review does not use an edit</span><button className="primary" disabled={busy} onClick={() => setConfirmSubmit(true)} type="button">Submit section</button></footer>
    {confirmSubmit && <div className="mock-modal-backdrop"><section className="mock-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-section-title"><h2 id="submit-section-title">Submit this section?</h2><p>You will not be able to return after submission. Your saved responses will be final for this section.</p><div className="mock-modal-actions"><button disabled={busy} onClick={() => setConfirmSubmit(false)} type="button">Return to review</button><button className="student-button" disabled={busy} onClick={async () => { if (await mutate('submit', {}, {refreshAfter:true})) setConfirmSubmit(false); }} type="button">Confirm submission</button></div></section></div>}
  </div>;
  return <div className={`mock-player mock-section-${state.activeSection.section}`}><header className="mock-player-header"><BrandLogo variant="light" className="mock-player-logo"/><div><span>{SECTION_LABELS[state.activeSection.section]}</span>{warningCopy && <span className="timer-warning-copy" role="status">{warningCopy}</span>}<strong className={warning ? 'timer-warning' : ''}>{seconds === null ? '--:--' : formatClock(seconds)}</strong></div></header>
    <div className="mock-progress" style={{'--mock-progress': `${((item?.display_order ?? 1) / Math.max(state.items.length,1))*100}%`} as React.CSSProperties}/>
    <main className="mock-player-body"><section className="mock-question-panel"><div className="mock-question-meta"><span>Question {item?.display_order} of {state.items.length}</span><button className={item?.bookmarked ? 'mock-bookmark active' : 'mock-bookmark'} disabled={!item || busy} onClick={() => item && mutate('bookmark',{attempt_item_id:item.id,bookmarked:!item.bookmarked}, {optimistic:(current) => ({...current, items:current.items.map((entry) => entry.id === item.id ? {...entry, bookmarked:!entry.bookmarked} : entry)})})} type="button">{item?.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button><span>{item?.question_snapshot.question_type}</span></div>
      <div className={[
        'mock-question-workspace',
        item?.stimulus_snapshot?.kind === 'passage' ? 'mock-passage-workspace' : '',
        state.activeSection.section === 'data_insights' ? 'mock-di-workspace' : '',
        state.activeSection.section === 'data_insights' && item?.stimulus_snapshot ? 'mock-di-split' : '',
      ].filter(Boolean).join(' ')}>
        {item?.stimulus_snapshot && <MockStimulus config={item.stimulus_snapshot.config} content={item.stimulus_snapshot.content} kind={item.stimulus_snapshot.kind} media={studentMedia(state.attempt.id, item.stimulus_snapshot.media)} title={item.stimulus_snapshot.title ?? 'Information'} />}
        {item && <div className="mock-question-response"><MockQuestionBody disabled={busy || (isReview && !canEditInReview)} interaction={item.response_config_snapshot.interaction} media={studentMedia(state.attempt.id, item.question_snapshot.media)} onChange={(next) => setDraftResponses((current) => ({...current,[item.id]:next}))} options={item.response_config_snapshot.options ?? []} response={draftResponse} responseType={item.response_config_snapshot.response_type} stem={item.question_snapshot.stem} /></div>}
      </div>
    </section></main>
    {error && <div className="mock-toast" role="alert">{error}</div>}<footer className="mock-player-footer">{isReview ? <button disabled={busy} onClick={() => setReviewOverview(true)} type="button">Back to review</button> : <span/>}<span aria-live="polite">{busy ? 'Saving…' : isReview ? `${Math.max(0,3-state.activeSection.review_edit_count)} edits remaining` : 'Answer is recorded after confirmation'}</span><button className="primary" disabled={busy || !answerComplete || (isReview && (!answerChanged || !canEditInReview))} onClick={() => setConfirmAnswer(true)} type="button">{isReview ? 'Confirm change' : 'Next'}</button></footer>
    {confirmAnswer && <div className="mock-modal-backdrop"><section className="mock-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-answer-title"><h2 id="confirm-answer-title">Confirm your answer?</h2><p>{isReview ? 'This will count as one of your three editable questions unless you already edited this question.' : 'Your response is counted only after you select Yes. You cannot return to this question until Question Review & Edit.'}</p><div className="mock-modal-actions"><button disabled={busy} onClick={() => setConfirmAnswer(false)} type="button">No, return</button><button className="student-button" disabled={busy} onClick={() => void confirmCurrentResponse()} type="button">Yes, confirm</button></div></section></div>}
  </div>;
}
