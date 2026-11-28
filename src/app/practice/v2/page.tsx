import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import { getMyV2BatchSchedules } from '@/lib/server/v2StudentSchedules';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { getMyV2WorksheetLog } from '@/lib/server/v2WorksheetLogs';
import { StudentHeader } from '@/components/student/StudentHeader';
import { v2ReadingPageId } from '@/lib/v2ReadingPreview';
import styles from './practice.module.css';
import { ReviewList, type ReviewWorksheet } from './ReviewList';
import { PracticeOverview, SheetLegend, type QuestionState } from './PracticeSummary';
import '../../dashboard/dashboard.css';

export const dynamic = 'force-dynamic';

const SUBJECTS = [['quant', 'Quant'], ['verbal', 'Verbal'], ['di', 'DI']] as const;

type Row = { lastActivity: string | null; cells: QuestionState[]; reviewSheet: ReviewWorksheet | null; href: string; title: string; sessionTitle: string; course: string; section: string; total: number; done: number; review: number; paused: boolean };

/** Every worksheet in the student's V2 courses, by subject, with how far their practice log has got. */
export default async function V2PracticeLogPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const reviewView = (await searchParams).view === 'review';
  if (!isV2LearningEnabled()) notFound();
  await requirePortalRole('student');
  const [studentName, enrolled] = await Promise.all([getMyDisplayName(), getMyV2BatchSchedules()]);
  const courses = (await Promise.all(enrolled.schedules.map(item => getMyV2PublishedCourse(item.batchId)))).filter(course => course !== null);
  const several = courses.length > 1;
  const rows: Row[] = await Promise.all(courses.flatMap(course => course.sessions.filter(session => session.section !== 'programme').flatMap(session =>
    session.content.materials.filter(item => v2ReadingPageId(item.url) === null).map(async (item): Promise<Row> => {
      const log = await getMyV2WorksheetLog(course.batchId, session.key, item.key);
      const questions = log?.questions ?? [];
      const href = `/schedule/v2/${course.batchId}/worksheet/${session.key}/${item.key}`;
      const toReview = questions.filter(q => q.status === 'review');
      const reviewSheet: ReviewWorksheet | null = toReview.length ? { key: `${course.batchId}:${session.key}:${item.key}`, href, title: item.title || 'Worksheet', sessionTitle: session.title,
        section: session.section, batchId: course.batchId, sessionKey: session.key, itemKey: item.key,
        questions: toReview.map(q => ({ id: q.id, number: q.question_number, comment: q.comment, seconds: q.time_taken_seconds, updatedAt: q.updated_at })) } : null;
      const stamps = questions.map(q => q.updated_at).filter((v): v is string => !!v).toSorted();
      return { lastActivity: stamps.at(-1) ?? null, cells: questions.toSorted((a, b) => a.question_number - b.question_number).map(q => q.status === 'done' || q.status === 'review' ? q.status : null), reviewSheet, href, title: item.title || 'Worksheet', sessionTitle: session.title,
        course: course.title, section: session.section, total: questions.length, paused: !log,
        done: questions.filter(q => q.status === 'done').length, review: questions.filter(q => q.status === 'review').length };
    }))));
  const groups = SUBJECTS.map(([key, label]) => ({ key, label, rows: rows.filter(row => row.section === key) })).filter(group => group.rows.length);
  const totals = { review: rows.reduce((n, r) => n + r.review, 0) };

  return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className={`student-container ${styles.page}`}>
    <header className={styles.titleRow}>
      <h1>Practice log</h1>
      {rows.length > 0 && !reviewView && <SheetLegend />}
      {rows.length > 0 && <nav className={styles.viewTabs} aria-label="Practice log views">
        <Link href="/practice/v2" aria-current={!reviewView ? 'page' : undefined} prefetch={false}>Worksheets</Link>
        <Link href="/practice/v2?view=review" aria-current={reviewView ? 'page' : undefined} prefetch={false}>To review{totals.review > 0 && <span>{totals.review}</span>}</Link>
      </nav>}
    </header>
    {enrolled.status !== 'ready' ? <section className={styles.empty} role="alert"><h2>Your worksheets couldn’t be loaded</h2><p>Reload the page to try again. Your logged answers are safe.</p><Link className={styles.secondary} href="/practice/v2">Reload</Link></section>
      : !groups.length ? <section className={styles.empty}><h2>No worksheets yet</h2><p>Worksheets show up here once they’re added to your sessions. Each one opens beside a log where you mark questions done or to review.</p></section>
      : reviewView ? <ReviewList worksheets={rows.flatMap(row => row.reviewSheet ? [row.reviewSheet] : [])} />
      : <PracticeOverview groups={groups} several={several} />}
  </div></main></div>;
}
