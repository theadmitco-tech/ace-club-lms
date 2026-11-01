'use client';

import { useState } from 'react';
import type { Phase1VerificationReport } from '@/lib/server/v2Phase1Verification';

export function VerificationRunner() {
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<Phase1VerificationReport | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  async function run() {
    setPending(true); setReport(null); setError(''); setCopied(false);
    try {
      const response = await fetch('/api/v2/phase1-verification', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (!response.ok || data.check !== 'phase1_caller_session_verification' || !Array.isArray(data.checks)) throw new Error('Unavailable');
      setReport(data);
    } catch { setError('Verification could not finish. Check that this is the current staging Preview, then retry.'); }
    finally { setPending(false); }
  }
  async function copy() {
    if (!report) return;
    try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setCopied(true); }
    catch { setError('Clipboard unavailable. You can select and copy the report below.'); }
  }
  return <section aria-label="Staging checks">
    <button type="button" className="btn btn-primary" disabled={pending} onClick={run}>{pending ? 'Checking current session…' : 'Run read-only staging checks'}</button>
    {error && <p role="alert">{error}</p>}
    {report && <>
      <p role="status">Result: {report.overall}. Role: {report.role}. Full phase acceptance remains separate.</p>
      <ul>{report.checks.map(check => <li key={check.id}><strong>{check.status.toUpperCase()}</strong> — {check.observation}</li>)}</ul>
      <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied sanitized report' : 'Copy sanitized report'}</button>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '1rem', background: '#f3f5f2' }}>{JSON.stringify(report, null, 2)}</pre>
    </>}
  </section>;
}
