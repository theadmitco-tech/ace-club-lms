import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StudentHeader } from '@/components/student/StudentHeader';
import { MockResultView } from '@/components/mock/MockResultView';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadMockResult } from '@/lib/server/mockResults';

export default async function MockResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await requirePortalRole('student');
  let result;
  try { result = await loadMockResult((await params).attemptId, { studentId: identity.id }); }
  catch (error) { console.error('Student mock result failed:', error); notFound(); }
  return <div className="student-page"><StudentHeader studentName={result.student.full_name ?? 'Student'}/><main className="student-main"><div className="student-container"><div className="mock-results-back"><Link href="/mocks">← Back to mocks</Link></div><MockResultView result={result}/></div></main></div>;
}
