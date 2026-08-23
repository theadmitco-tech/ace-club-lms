import { StudentHeader } from '@/components/student/StudentHeader';
import { listStudentMocks } from '@/lib/server/mockAttempts';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { MocksList } from './MocksList';

export default async function MocksPage() {
  const identity = await requirePortalRole('student');
  const result = await listStudentMocks(identity.id);
  return <div className="student-page"><StudentHeader studentName={result.studentName} />
    <main className="student-main"><div className="student-container mock-library">
      <header className="student-intro"><div><span className="student-eyebrow">Timed assessments</span><h1>Your mocks</h1><p>Choose a released mock, select one of six section orders, and continue from any saved attempt.</p></div></header>
      <MocksList mocks={result.mocks as never} />
    </div></main>
  </div>;
}
