'use client';

import { useState } from 'react';

export function MockNamespaceMembership({ namespaces }: { namespaces: Array<{ code: string; display_name: string }> }) {
  const [namespace, setNamespace] = useState(namespaces[0]?.code ?? '');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/mock-namespaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namespace, email, active: true }) });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? `${email} can now submit ${namespace} packages.` : result.error || 'Unable to save membership.');
    setBusy(false);
  }
  return <section className="admin-card mock-workspace-card"><div className="admin-card-header"><div><h2 className="admin-card-title">Contributor access</h2><p className="admin-page-subtitle">Workbook values never grant namespace authority. Membership is tied to an active Admin account.</p></div></div><div className="mock-inline-form"><label className="mock-field"><span>Namespace</span><select value={namespace} onChange={(event) => setNamespace(event.target.value)}>{namespaces.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.display_name}</option>)}</select></label><label className="mock-field"><span>Active Admin email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="btn btn-secondary" disabled={busy || !namespace || !email.includes('@')} onClick={() => void save()}>{busy ? 'Saving…' : 'Grant access'}</button></div>{message && <p className="mock-status" role="status">{message}</p>}</section>;
}
