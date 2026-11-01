import { notFound } from 'next/navigation';
import { isPhase1VerificationEnabled } from '@/lib/server/v2Phase1Verification';
import { VerificationRunner } from './VerificationRunner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Phase 1 staging verification', robots: { index: false, follow: false } };

export default function Phase1VerificationPage() {
  if (!isPhase1VerificationEnabled()) notFound();
  return <main style={{ maxWidth: 900, margin: '3rem auto', padding: '1.5rem' }}>
    <h1>Phase 1 staging verification</h1>
    <p>Use only the designated staging accounts. Run once signed out, once as Student and once as Admin. Your current LMS session is used automatically.</p>
    <p>This diagnostic reads access and permission boundaries. Its grant-permission probe uses only null inputs, which the reviewed function rejects before writes. No account, purchase, enrollment or content is created or changed.</p>
    <p>The report contains roles, safe counts and outcomes, never account identifiers, tokens or purchase details. An inconclusive result must not be recorded as a pass.</p>
    <VerificationRunner />
    <p>These checks do not complete the legacy worksheet/material tests, real-payment verification or full Phase 1 acceptance.</p>
  </main>;
}
