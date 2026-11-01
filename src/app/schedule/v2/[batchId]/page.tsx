import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { StudentHeader } from '@/components/student/StudentHeader';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import '../../../dashboard/dashboard.css';

export default async function PublishedCoursePage({params}:{params:Promise<{batchId:string}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const {batchId} = await params;
  const course = await getMyV2PublishedCourse(batchId);
  if (!course) notFound();
  return <div className="student-page"><StudentHeader studentName="Student" />
    <main className="student-main"><div className="student-container">
      <Link className="student-button" href="/schedule/v2">Back to enrolled batches</Link>
      <header className="student-intro"><div><span className="student-eyebrow">Course sessions</span><h1>{course.title}</h1>
        <p>Each session follows pre-class read, recording, post-class read and worksheet.</p></div></header>
      {course.sessions.length ? course.sessions.map((session) => <V2CourseSessionView key={session.key} session={session} mode="student" batchId={batchId} readingEndpoint={`/api/v2/course-reading?batchId=${batchId}`} />)
        : <section className="student-state"><h2>No sessions published yet</h2><p>Course materials appear after the programme team publishes them.</p></section>}
    </div></main></div>;
}
