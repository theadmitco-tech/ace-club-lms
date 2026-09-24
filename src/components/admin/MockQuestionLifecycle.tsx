'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MockQuestionLifecycle({ revisionId, status }: { revisionId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const actions = status === 'draft' ? ['publish'] as const : status === 'published' ? ['revise', 'retire'] as const : status === 'retired' ? ['revise'] as const : [] as const;
  if (!actions.length) return null;
  async function mutate(action: 'publish' | 'retire' | 'revise') {
    if (!window.confirm(`${action === 'publish' ? 'Publish' : action === 'retire' ? 'Retire' : 'Create a new Draft revision from'} this revision?`)) return;
    setBusy(true); setError('');
    const response = await fetch('/api/admin/mock-questions/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId, action }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error || 'Lifecycle update failed.'); else router.refresh();
    setBusy(false);
  }
  return <div className="mock-action-row">{actions.map((action) => <button key={action} className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void mutate(action)}>{busy ? 'Working…' : action === 'publish' ? 'Publish' : action === 'retire' ? 'Retire' : 'Create Draft revision'}</button>)}{error && <p className="mock-inline-error" role="alert">{error}</p>}</div>;
}
