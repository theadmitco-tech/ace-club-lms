import { StudentHeader } from '@/components/student/StudentHeader';
import { listParticipantMocks } from '@/lib/server/mockAttempts';
import { requireMockParticipant } from '@/lib/server/portalAuthorization';
import { MocksList } from './MocksList';

export default async function MocksPage() {
  const identity = await requireMockParticipant();
  const result = await listParticipantMocks(identity.id, identity);
  const testerMode = identity.role === 'admin';
  return <div className="student-page"><StudentHeader studentName={result.participantName} testerMode={testerMode} />
    <main className="student-main"><div className="student-container mock-library">
      <header className="student-intro"><div><span className="student-eyebrow">Timed assessments</span><h1>Your mocks</h1><p>{testerMode ? 'Use assignment-scoped tester access to verify this mock before its batch release.' : 'Choose a released mock, select one of six section orders, and continue from any saved attempt.'}</p></div></header>
      <MocksList allowTestReset={process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'} mocks={result.mocks as never} />
    </div></main>
  </div>;
}
