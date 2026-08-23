'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { MockQuestionBody, MockStimulus, type MockMediaAsset } from '@/components/mock/MockQuestionContent';
import { formatClock, remainingSeconds, SECTION_LABELS, type MockSection } from '@/lib/mockAttempt';
import type { AttemptMedia, MockAttemptItem } from '@/lib/server/mockAttempts';

type SectionState = { id: string; section: MockSection; sequence_index: number; status: 'pending'|'active'|'review'|'submitted'|'timed_out'; deadline_at: string|null; review_edit_count: number };
type PlayerState = { attempt: { id:string; status:string; section_order:MockSection[]; current_section_index:number; current_item_id:string|null; break_status:string; break_deadline_at:string|null; lock_version:number; mock_attempt_sections:SectionState[] }; activeSection: SectionState|null; items: MockAttemptItem[]; serverNow: string };
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

export function MockPlayer({ initialState }: { initialState: PlayerState }) {
  const [state, setState] = useState(initialState);
  const [itemId, setItemId] = useState(initialState.attempt.current_item_id ?? initialState.items[0]?.id ?? '');
  const [seconds, setSeconds] = useState(() => remainingSeconds(initialState.activeSection?.deadline_at ?? null, Date.parse(initialState.serverNow)));
  const [breakSeconds, setBreakSeconds] = useState(() => remainingSeconds(initialState.attempt.break_deadline_at, Date.parse(initialState.serverNow)));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const item = useMemo(() => state.items.find((entry) => entry.id === itemId) ?? state.items[0], [state.items, itemId]);
  const responseRow = item?.mock_responses?.[0];
  const savedResponse = responseBySlot(item, responseRow?.response);

  const refresh = useCallback(async () => { const response = await fetch(`/api/student/mock-attempts/${state.attempt.id}`, { cache: 'no-store' }); if (response.ok) { const next = await response.json(); setState(next); setItemId(next.attempt.current_item_id ?? next.items[0]?.id ?? ''); setSeconds(remainingSeconds(next.activeSection?.deadline_at ?? null)); setBreakSeconds(remainingSeconds(next.attempt.break_deadline_at)); } }, [state.attempt.id]);
  async function mutate(operation: string, payload: unknown = {}, options: { optimistic?: OptimisticUpdate; refreshAfter?: boolean; rollback?: () => void } = {}) {
    const previousState = state;
    const expectedLockVersion = state.attempt.lock_version;
    setBusy(true); setError('');
    if (options.optimistic) setState(options.optimistic);
    try {
      const response = await fetch(`/api/student/mock-attempts/${state.attempt.id}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ operation, payload, expectedLockVersion, clientMutationId:crypto.randomUUID() }) });
      const result = await response.json() as MutationResult & { error?: string };
      if (!response.ok) {
        setError(mutationErrorMessage(result.error ?? ''));
        options.rollback?.();
        if (response.status === 409) await refresh(); else setState(previousState);
        return false;
      }
      if (options.refreshAfter) await refresh();
      else setState((current) => ({ ...current, attempt: { ...current.attempt,
        lock_version: Math.max(result.lock_version ?? current.attempt.lock_version, current.attempt.lock_version),
        status: result.status ?? current.attempt.status,
        current_section_index: Math.max(result.current_section_index ?? current.attempt.current_section_index, current.attempt.current_section_index),
        break_status: result.break_status ?? current.attempt.break_status,
      } }));
      return true;
    } catch {
      options.rollback?.(); setState(previousState);
      setError('The connection was interrupted. Your last confirmed save is still safe; retry this action.');
      return false;
    } finally { setBusy(false); }
  }
  function navigateTo(target: MockAttemptItem) {
    const previousItemId = itemId;
    setItemId(target.id);
    void mutate('navigate', { attempt_item_id:target.id }, {
      optimistic: (current) => ({ ...current, attempt: { ...current.attempt, current_item_id:target.id } }),
      rollback: () => setItemId(previousItemId),
    });
  }
  function saveResponse(target: MockAttemptItem, next: Record<string, string>) {
    const targetResponse = target.mock_responses[0];
    void mutate('response', { attempt_item_id:target.id, response:next, expected_response_version:targetResponse?.response_version ?? 1 }, {
      optimistic: (current) => ({ ...current, items: current.items.map((entry) => entry.id !== target.id ? entry : {
        ...entry,
        mock_responses: [{ ...entry.mock_responses[0], response:next, response_version:(entry.mock_responses[0]?.response_version ?? 1) + 1, answered_at:new Date().toISOString() }],
      }) }),
    });
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
  return <div className="mock-player"><header className="mock-player-header"><BrandLogo variant="light" className="mock-player-logo"/><div><span>{SECTION_LABELS[state.activeSection.section]}</span>{warningCopy && <span className="timer-warning-copy" role="status">{warningCopy}</span>}<strong className={warning ? 'timer-warning' : ''}>{seconds === null ? '--:--' : formatClock(seconds)}</strong></div></header>
    <div className="mock-progress" style={{'--mock-progress': `${((item?.display_order ?? 1) / Math.max(state.items.length,1))*100}%`} as React.CSSProperties}/>
    <main className="mock-player-body"><section className="mock-question-panel"><div className="mock-question-meta"><span>Question {item?.display_order} of {state.items.length}</span><button className={item?.bookmarked ? 'mock-bookmark active' : 'mock-bookmark'} disabled={!item || busy} onClick={() => item && mutate('bookmark',{attempt_item_id:item.id,bookmarked:!item.bookmarked}, {optimistic:(current) => ({...current, items:current.items.map((entry) => entry.id === item.id ? {...entry, bookmarked:!entry.bookmarked} : entry)})})} type="button">{item?.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button><span>{item?.question_snapshot.question_type}</span></div>
      <div className={item?.stimulus_snapshot?.kind === 'passage' ? 'mock-question-workspace mock-passage-workspace' : 'mock-question-workspace'}>
        {item?.stimulus_snapshot && <MockStimulus config={item.stimulus_snapshot.config} content={item.stimulus_snapshot.content} kind={item.stimulus_snapshot.kind} media={studentMedia(state.attempt.id, item.stimulus_snapshot.media)} title={item.stimulus_snapshot.title ?? 'Information'} />}
        {item && <div className="mock-question-response"><MockQuestionBody disabled={busy} interaction={item.response_config_snapshot.interaction} media={studentMedia(state.attempt.id, item.question_snapshot.media)} onChange={(next) => saveResponse(item, next)} options={item.response_config_snapshot.options ?? []} response={savedResponse} responseType={item.response_config_snapshot.response_type} stem={item.question_snapshot.stem} /></div>}
      </div>
    </section></main>
    {error && <div className="mock-toast" role="alert">{error}</div>}<footer className="mock-player-footer"><button disabled={busy || !item || item.display_order===1} onClick={() => { const previous=state.items[(item?.display_order??1)-2]; if(previous) navigateTo(previous); }} type="button">Previous</button><span aria-live="polite">{busy ? 'Saving…' : 'Saved automatically'}</span>{state.activeSection.status === 'review' ? <button className="primary" disabled={busy} onClick={() => setConfirmSubmit(true)} type="button">Submit section</button> : item?.display_order === state.items.length ? <button className="primary" disabled={busy} onClick={() => mutate('review', {}, {refreshAfter:true})} type="button">Review section</button> : <button className="primary" disabled={busy} onClick={() => { const next=state.items[item.display_order]; if(next) navigateTo(next); }} type="button">Next</button>}</footer>
    {confirmSubmit && <div className="mock-modal-backdrop"><section className="mock-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-section-title"><h2 id="submit-section-title">Submit this section?</h2><p>You will not be able to return after submission. Your saved responses will be final for this section.</p><div className="mock-modal-actions"><button disabled={busy} onClick={() => setConfirmSubmit(false)} type="button">Return to review</button><button className="student-button" disabled={busy} onClick={async () => { if (await mutate('submit', {}, {refreshAfter:true})) setConfirmSubmit(false); }} type="button">Confirm submission</button></div></section></div>}
  </div>;
}
