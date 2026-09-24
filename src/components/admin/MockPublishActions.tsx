'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function publishRevision(revisionId: string) {
  const response = await fetch('/api/admin/mock-questions/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId, action: 'publish' }) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || 'Unable to publish question.');
}

export function MockInlinePublish({ revisionId, status }: { revisionId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (status !== 'draft') return null;
  async function publish() {
    setBusy(true); setError('');
    try { await publishRevision(revisionId); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish question.'); }
    finally { setBusy(false); }
  }
  return <span className="mock-inline-publish"><button className="btn btn-primary btn-sm" disabled={busy} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void publish(); }}>{busy ? 'Publishing…' : 'Publish'}</button>{error && <small role="alert">{error}</small>}</span>;
}

export function MockPublishAll({ revisionIds }: { revisionIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!revisionIds.length) return null;
  async function publishAll() {
    if (!window.confirm(`Publish all ${revisionIds.length} Draft questions?`)) return;
    setBusy(true); setMessage('');
    let published = 0;
    for (const revisionId of revisionIds) {
      try { await publishRevision(revisionId); published += 1; } catch (reason) { setMessage(`${published} published. ${reason instanceof Error ? reason.message : 'One or more questions could not be published.'}`); break; }
    }
    if (published === revisionIds.length) setMessage(`${published} Draft questions published.`);
    setBusy(false); router.refresh();
  }
  return <div className="mock-publish-all"><button className="btn btn-primary" disabled={busy} onClick={() => void publishAll()}>{busy ? 'Publishing…' : `Publish all Drafts (${revisionIds.length})`}</button>{message && <p className="mock-status" role="status">{message}</p>}</div>;
}
