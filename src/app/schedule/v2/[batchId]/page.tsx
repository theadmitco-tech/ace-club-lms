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
import { getMyDisplayName, requestTime } from '@/lib/server/studentProfile';
import { getMyV2Access } from '@/lib/server/v2Products';
import { courseDay } from '@/lib/v2CoursePresentation';
import { tallyFeedbackConfig, feedbackLinkToken, tallyFormUrl } from '@/lib/server/v2TallyFeedback';
import { getMyV2BatchSchedules } from '@/lib/server/v2StudentSchedules';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import '../../../dashboard/dashboard.css';
import styles from '@/components/student/v2Learning.module.css';

export default async function PublishedCoursePage({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{view?:string|string[];subject?:string|string[];session?:string|string[]}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  const identity = await requirePortalRole('student');
  const {batchId} = await params;
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => typeof value === 'string' ? value : undefined;
  const view = one(query.view), session = one(query.session);
  const subject = (['quant', 'verbal', 'di'] as const).find(item => item === one(query.subject));
  const learningEnabled = isV2LearningEnabled();
  const [course, learning, placements, studentName, enrolled, access] = await Promise.all([getMyV2PublishedCourse(batchId), learningEnabled ? getMyV2LearningState(batchId) : Promise.resolve(null), readMyContentPlacements(batchId), getMyDisplayName(), learningEnabled ? getMyV2BatchSchedules().catch(() => null) : Promise.resolve(null), learningEnabled ? getMyV2Access().catch(() => null) : Promise.resolve(null)]);
  const otherCourses = enrolled?.status === 'ready' ? enrolled.schedules : [];
  if (!course) {
    if (!learningEnabled) notFound();
    return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className="student-container"><section className="student-state"><h1>Your course access isn’t active</h1><p>If you bought this course, its access may have ended or it may not be open yet. Your purchases and their dates are in <Link href="/account/access">My access</Link>.</p></section></div></main></div>;
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
  // With Tally configured, each owed feedback opens the Tally form through a link signed for this student.
  const tally = learning ? tallyFeedbackConfig() : null;
  const feedbackFormUrls = tally && learning ? Object.fromEntries(learning.obligations.map(item => [item.id, tallyFormUrl(tally, feedbackLinkToken(tally, identity.id, item.id), item.sessionTitle)])) : undefined;
  // In the last 30 days of access, say when it ends (the latest end among purchases covering this course).
  const coveringEnds = (access ?? []).filter(item => item.sections.some(section => (ownSections as readonly string[]).includes(section))).map(item => Date.parse(item.expires_at)).filter(Number.isFinite);
  const accessEnds = coveringEnds.length ? Math.max(...coveringEnds) : null;
  const daysLeft = accessEnds === null ? null : Math.ceil((accessEnds - requestTime()) / 86400000);
  const filteredCourse = learning ? { ...course, sessions: course.sessions.filter(session => learning.sessions.some(outline =>
    outline.key === session.key && outline.section === session.section && !outline.locked)) } : course;
  return <div className="student-page"><StudentHeader studentName={studentName} />
    <main className="student-main"><div className="student-container">
      {!learningEnabled && <Link className={styles.backLink} href="/schedule/v2">← My learning</Link>}
      {/* Students study by subject from the header; batch names stay out of their way. */}
      {learningEnabled ? <h1 className={styles.visuallyHidden}>My course</h1> : <header className={styles.courseHeader}><h1>{course.title}</h1>
        <p>Readings, recordings and worksheets for each session. Take them in any order. All times IST.</p></header>}
      {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && accessEnds !== null && <p className={styles.accessEnding}>Your access ends on <strong>{courseDay(new Date(accessEnds).toISOString())}</strong>, {daysLeft <= 1 ? 'tomorrow or sooner' : `in ${daysLeft} days`}. <Link href="/account/access" prefetch={false}>See your access and options</Link></p>}
      {learningEnabled ? learning && placements && learning.publicationRevision === course.publicationRevision ? <V2LearningWorkspace key={`${view ?? ''}:${subject ?? ''}:${session ?? ''}`} navigation="header" feedbackFormUrls={feedbackFormUrls} initialSubject={subject} initialSession={session} placements={placements} course={filteredCourse} learning={learning} initialView={view === 'live' ? 'live' : 'recordings'} otherSubjects={enrolled ? otherSubjects : []} /> : <section className="student-state student-state-error" role="alert"><h2>Learning status could not be verified</h2><p>Reload the course to check feedback and resource access before continuing.</p><Link className="student-button" href={`/schedule/v2/${batchId}`}>Retry</Link></section> : course.sessions.length ? course.sessions.map((session) => <V2CourseSessionView key={session.key} session={session} mode="student" batchId={batchId} readingEndpoint={`/api/v2/course-reading?batchId=${batchId}`} />)
        : <section className="student-state"><h2>No sessions published yet</h2><p>Course materials appear after the programme team publishes them.</p></section>}
    </div></main></div>;
}
