import { readMyContentPlacements } from '@/lib/server/v2ContentPublishing';
import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyV2LearningState } from '@/lib/server/v2Learning';
import { V2LearningWorkspace } from '@/components/student/V2LearningWorkspace';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { StudentHeader } from '@/components/student/StudentHeader';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import '../../../dashboard/dashboard.css';

export default async function PublishedCoursePage({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{view?:string}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const {batchId} = await params;
  const {view} = await searchParams;
  const learningEnabled = isV2LearningEnabled();
  const [course, learning, placements] = await Promise.all([getMyV2PublishedCourse(batchId), learningEnabled ? getMyV2LearningState(batchId) : Promise.resolve(null), readMyContentPlacements(batchId)]);
  if (!course) {
    if (!learningEnabled) notFound();
    return <div className="student-page"><StudentHeader studentName="Student" /><main className="student-main"><div className="student-container"><section className="student-state"><h1>Course access is unavailable</h1><p>Access may have expired, the batch may be unpublished, or enrollment may be missing. Purchase history and access dates remain available in My access.</p><Link className="student-button" href="/account/access">Review access and expiry</Link></section></div></main></div>;
  }
  const filteredCourse = learning ? { ...course, sessions: course.sessions.filter(session => learning.sessions.some(outline =>
    outline.key === session.key && outline.section === session.section && !outline.locked)) } : course;
  return <div className="student-page"><StudentHeader studentName="Student" />
    <main className="student-main"><div className="student-container">
      <Link className="student-button" href="/schedule/v2">← My learning</Link>
      <header className="student-intro"><div><h1>{course.title}</h1>
        <p>Recordings, readings and worksheets. Choose sessions in any order.</p></div></header>
      {learningEnabled ? learning && placements && learning.publicationRevision === course.publicationRevision ? <V2LearningWorkspace placements={placements} course={filteredCourse} learning={learning} initialView={view === 'live' ? 'live' : 'recordings'} /> : <section className="student-state student-state-error" role="alert"><h2>Learning status could not be verified</h2><p>Reload the course to check feedback and resource access before continuing.</p><Link className="student-button" href={`/schedule/v2/${batchId}`}>Retry</Link></section> : course.sessions.length ? course.sessions.map((session) => <V2CourseSessionView key={session.key} session={session} mode="student" batchId={batchId} readingEndpoint={`/api/v2/course-reading?batchId=${batchId}`} />)
        : <section className="student-state"><h2>No sessions published yet</h2><p>Course materials appear after the programme team publishes them.</p></section>}
    </div></main></div>;
}
