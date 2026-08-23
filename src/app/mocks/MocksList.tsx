'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SECTION_LABELS, SECTION_ORDERS, type MockSection } from '@/lib/mockAttempt';

type MockRow = { id: string; release_at: string; due_at: string | null; mock_assessment_versions: { version_number: number; mock_assessments: { name: string; purpose: string } }; attempt: { id: string; status: string; current_section_index: number } | null };

const dueDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function MocksList({ mocks }: { mocks: MockRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<MockRow | null>(null);
  const [order, setOrder] = useState<MockSection[]>(SECTION_ORDERS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    if (!selected) return;
    setBusy(true); setError('');
    const response = await fetch('/api/student/mock-attempts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assignmentId: selected.id, sectionOrder: order, clientMutationId: crypto.randomUUID() }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Could not start this mock.'); setBusy(false); return; }
    router.push(`/mocks/${result.attempt_id}`);
  }
  if (!mocks.length) return <section className="student-state"><h2>No mocks released yet</h2><p>Your assigned mocks will appear here after they are released.</p></section>;
  return <>
    <section className="mock-card-grid" aria-label="Released mocks">{mocks.map((mock) => {
      const details = mock.mock_assessment_versions.mock_assessments;
      return <article className="mock-card" key={mock.id}><div><span className="mock-pill">{details.purpose}</span><h2>{details.name}</h2><p>3 sections · 45 minutes each · Version {mock.mock_assessment_versions.version_number}</p>{mock.due_at && <small>Due {dueDateFormatter.format(new Date(mock.due_at))}</small>}</div>
        {mock.attempt ? <Link className="student-button" href={`/mocks/${mock.attempt.id}`}>{mock.attempt.status === 'completed' ? 'View completion' : 'Resume mock'}</Link> : <button className="student-button" onClick={() => setSelected(mock)} type="button">Choose section order</button>}
      </article>;
    })}</section>
    {selected && <div className="mock-modal-backdrop" role="presentation"><section className="mock-modal" role="dialog" aria-modal="true" aria-labelledby="section-order-title"><button className="mock-modal-close" onClick={() => setSelected(null)} aria-label="Close" type="button">×</button><span className="student-eyebrow">Set your test flow</span><h2 id="section-order-title">Choose a section order</h2><p>This choice is permanent for this attempt. All six possible orders are available.</p>
      <div className="section-order-grid">{SECTION_ORDERS.map((candidate, index) => <label className={order === candidate ? 'selected' : ''} key={candidate.join('-')}><input checked={order === candidate} name="section-order" onChange={() => setOrder(candidate)} type="radio"/><strong>Option {index + 1}</strong><span>{candidate.map((section) => SECTION_LABELS[section]).join(' → ')}</span></label>)}</div>
      {error && <p className="mock-error" role="alert">{error}</p>}<div className="mock-modal-actions"><button className="student-button student-button-secondary" onClick={() => setSelected(null)} type="button">Cancel</button><button className="student-button" disabled={busy} onClick={start} type="button">{busy ? 'Starting…' : 'Confirm and continue'}</button></div>
    </section></div>}
  </>;
}
