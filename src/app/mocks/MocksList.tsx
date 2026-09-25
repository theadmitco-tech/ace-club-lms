'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { allowsSectionOrderSelection, mockUnitLabel, publishedSectionOrder, sectionOrders, type MockUnit } from '@/lib/mockAttempt';

type MockRow = { id: string; release_at: string; due_at: string | null; tester_access?: boolean; mock_assessment_versions: { version_number: number; snapshot: { sections: Array<{ section: MockUnit; category_key?: MockUnit; question_count: number; time_limit_seconds: number }> }; mock_assessments: { name: string; purpose: string } }; attempt: { id: string; status: string; current_section_index: number } | null };

const dueDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function MocksList({ mocks, allowTestReset = false }: { mocks: MockRow[]; allowTestReset?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<MockRow | null>(null);
  const [resetTarget, setResetTarget] = useState<MockRow | null>(null);
  const [order, setOrder] = useState<MockUnit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ordersFor = (mock: MockRow) => sectionOrders(publishedSectionOrder(mock.mock_assessment_versions.snapshot.sections));
  const selectedOrders = selected ? ordersFor(selected) : [];
  async function start(mock: MockRow, sectionOrder: MockUnit[]) {
    if (!sectionOrder.length) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/student/mock-attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assignmentId: mock.id, sectionOrder, clientMutationId: crypto.randomUUID() }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json().catch(() => ({})) as { attempt_id?: string; error?: string };
      if (!response.ok || !result.attempt_id) {
        setError(result.error ?? 'Could not start this mock. Please try again.');
        return;
      }
      router.push(`/mocks/${result.attempt_id}`);
    } catch {
      setError('The request did not complete. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  async function resetAttempt() {
    if (!resetTarget?.attempt) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/student/mock-attempts/${resetTarget.attempt.id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json().catch(() => ({})) as { reset?: boolean; error?: string };
      if (!response.ok || result.reset !== true) {
        setError(result.error ?? 'Could not reset this test attempt. Please try again.');
        return;
      }
      setResetTarget(null);
      router.refresh();
    } catch {
      setError('The reset did not complete. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!mocks.length) return <section className="student-state"><h2>No mocks available</h2><p>Released batch mocks and active tester assignments will appear here.</p></section>;
  return <>
    {error && !selected && !resetTarget && <p className="mock-error" role="alert">{error}</p>}
    <section className="mock-card-grid" aria-label="Released mocks">{mocks.map((mock) => {
      const details = mock.mock_assessment_versions.mock_assessments;
      const sections = mock.mock_assessment_versions.snapshot.sections;
      return <article className="mock-card" key={mock.id}><div><span className="mock-pill">{mock.tester_access ? 'Tester access' : details.purpose}</span><h2>{details.name}</h2><p>{sections.length} section{sections.length === 1 ? '' : 's'} · {sections.reduce((total, section) => total + section.time_limit_seconds, 0) / 60} minutes total · Version {mock.mock_assessment_versions.version_number}</p>{mock.due_at && <small>Due {dueDateFormatter.format(new Date(mock.due_at))}</small>}</div>
        {mock.attempt ? <div className="mock-card-actions"><Link className="student-button" href={mock.attempt.status === 'completed' ? `/mocks/${mock.attempt.id}/results` : `/mocks/${mock.attempt.id}`}>{mock.attempt.status === 'completed' ? 'View results' : 'Resume mock'}</Link>{(mock.tester_access || allowTestReset) && <button className="mock-reset-button" onClick={() => { setError(''); setResetTarget(mock); }} type="button">Reset test attempt</button>}</div> : allowsSectionOrderSelection(sections) ? <button className="student-button" disabled={busy} onClick={() => { setError(''); setSelected(mock); setOrder(ordersFor(mock)[0] ?? []); }} type="button">Choose section order</button> : <button className="student-button" disabled={busy} onClick={() => void start(mock, publishedSectionOrder(sections))} type="button">{busy ? 'Starting…' : 'Start mock'}</button>}
      </article>;
    })}</section>
    {selected && <div className="mock-modal-backdrop" role="presentation"><section className="mock-modal" role="dialog" aria-modal="true" aria-labelledby="section-order-title"><button className="mock-modal-close" onClick={() => setSelected(null)} aria-label="Close" type="button">×</button><span className="student-eyebrow">Set your test flow</span><h2 id="section-order-title">Choose a section order</h2><p>This choice is permanent for this attempt. Only the sections included in this mock are shown.</p>
      <div className="section-order-grid">{selectedOrders.map((candidate, index) => <label className={order.join('|') === candidate.join('|') ? 'selected' : ''} key={candidate.join('-')}><input checked={order.join('|') === candidate.join('|')} name="section-order" onChange={() => setOrder(candidate)} type="radio"/><strong>Option {index + 1}</strong><span>{candidate.map(mockUnitLabel).join(' → ')}</span></label>)}</div>
      {error && <p className="mock-error" role="alert">{error}</p>}<div className="mock-modal-actions"><button className="student-button student-button-secondary" onClick={() => setSelected(null)} type="button">Cancel</button><button className="student-button" disabled={busy} onClick={() => { if (selected) void start(selected, order); }} type="button">{busy ? 'Starting…' : 'Confirm and continue'}</button></div>
    </section></div>}
    {resetTarget && <div className="mock-modal-backdrop" role="presentation"><section className="mock-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-attempt-title"><h2 id="reset-attempt-title">Reset this test attempt?</h2><p>This clears only your responses, timing, bookmarks and section progress for this mock. You can then start it again.</p>{error && <p className="mock-error" role="alert">{error}</p>}<div className="mock-modal-actions"><button disabled={busy} onClick={() => setResetTarget(null)} type="button">Cancel</button><button className="student-button" disabled={busy} onClick={resetAttempt} type="button">{busy ? 'Resetting…' : 'Reset attempt'}</button></div></section></div>}
  </>;
}
