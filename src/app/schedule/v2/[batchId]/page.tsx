import { readMyContentPlacements } from '@/lib/server/v2ContentPublishing';
import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyV2LearningState } from '@/lib/server/v2Learning';
import { V2LearningWorkspace } from '@/components/student/V2LearningWorkspace';
import { notFound, redirect } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { StudentHeader } from '@/components/student/StudentHeader';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import { getMyV2BatchSchedules } from '@/lib/server/v2StudentSchedules';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import '../../../dashboard/dashboard.css';
import styles from '@/components/student/v2Learning.module.css';

export default async function PublishedCoursePage({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{view?:string|string[];subject?:string|string[];session?:string|string[]}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const {batchId} = await params;
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => typeof value === 'string' ? value : undefined;
  const view = one(query.view), session = one(query.session);
  const subject = (['quant', 'verbal', 'di'] as const).find(item => item === one(query.subject));
  const learningEnabled = isV2LearningEnabled();
  const [course, learning, placements, studentName, enrolled] = await Promise.all([getMyV2PublishedCourse(batchId), learningEnabled ? getMyV2LearningState(batchId) : Promise.resolve(null), readMyContentPlacements(batchId), getMyDisplayName(), learningEnabled ? getMyV2BatchSchedules().catch(() => null) : Promise.resolve(null)]);
  const otherCourses = enrolled?.status === 'ready' ? enrolled.schedules : [];
  if (!course) {
    if (!learningEnabled) notFound();
    return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className="student-container"><section className="student-state"><h1>Course access is unavailable</h1><p>Access may have expired, the batch may be unpublished, or enrollment may be missing. Purchase history and access dates remain available in My access.</p><Link className="student-button" href="/account/access">Review access and expiry</Link></section></div></main></div>;
  }
  // Subjects outside this course: link to another enrolled course, or show as locked with an upgrade option.
  const ownSections = V2_TEMPLATE_PRODUCTS[course.productCode].sections;
  const otherSubjects = (['quant', 'verbal', 'di'] as const).filter(section => !ownSections.includes(section)).map(section => {
    const other = otherCourses.find(item => item.batchId !== batchId && V2_TEMPLATE_PRODUCTS[item.productCode].sections.includes(section));
    return { section, href: other ? `/schedule/v2/${other.batchId}` : null };
  });
  if (learningEnabled && learning && view !== 'live') {
    // The header highlights the open subject, so a course page always names one in its URL.
    if (!subject) {
      const last = learning.sessions.find(item => item.key === learning.lastSessionKey && !item.locked && (ownSections as readonly string[]).includes(item.section));
      const first = ownSections.find(section => learning.sessions.some(item => item.section === section && !item.locked))
        ?? ownSections.find(section => learning.sessions.some(item => item.section === section)) ?? ownSections[0];
      redirect(`/schedule/v2/${batchId}?subject=${last?.section ?? first}`);
    }
    // A subject owned through another enrolled course opens that course; one not bought opens Explore courses.
    const elsewhere = otherSubjects.find(item => item.section === subject && item.href);
    if (elsewhere) redirect(`${elsewhere.href}?subject=${subject}`);
    if (enrolled && !(ownSections as readonly string[]).includes(subject)) redirect(`/courses/v2?add=${subject}`);
  }
  const filteredCourse = learning ? { ...course, sessions: course.sessions.filter(session => learning.sessions.some(outline =>
    outline.key === session.key && outline.section === session.section && !outline.locked)) } : course;
  return <div className="student-page"><StudentHeader studentName={studentName} />
    <main className="student-main"><div className="student-container">
      {!learningEnabled && <Link className={styles.backLink} href="/schedule/v2">← My learning</Link>}
      {/* Students study by subject from the header; batch names stay out of their way. */}
      {learningEnabled ? <h1 className={styles.visuallyHidden}>My course</h1> : <header className={styles.courseHeader}><h1>{course.title}</h1>
        <p>Readings, recordings and worksheets for each session. Take them in any order. All times IST.</p></header>}
      {learningEnabled ? learning && placements && learning.publicationRevision === course.publicationRevision ? <V2LearningWorkspace key={`${view ?? ''}:${subject ?? ''}:${session ?? ''}`} navigation="header" initialSubject={subject} initialSession={session} placements={placements} course={filteredCourse} learning={learning} initialView={view === 'live' ? 'live' : 'recordings'} otherSubjects={enrolled ? otherSubjects : []} /> : <section className="student-state student-state-error" role="alert"><h2>Learning status could not be verified</h2><p>Reload the course to check feedback and resource access before continuing.</p><Link className="student-button" href={`/schedule/v2/${batchId}`}>Retry</Link></section> : course.sessions.length ? course.sessions.map((session) => <V2CourseSessionView key={session.key} session={session} mode="student" batchId={batchId} readingEndpoint={`/api/v2/course-reading?batchId=${batchId}`} />)
        : <section className="student-state"><h2>No sessions published yet</h2><p>Course materials appear after the programme team publishes them.</p></section>}
    </div></main></div>;
}
