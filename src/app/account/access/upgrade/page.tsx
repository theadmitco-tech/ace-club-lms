import Link from 'next/link';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { notFound, redirect } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { loadIndividualUpgrade } from '@/lib/server/v2UpgradeQuotes';
import { courseDate, courseDay, courseIdentity, courseMoney, courseNames, parseCourseSelection } from '@/lib/v2CoursePresentation';
import { v2ProductDisplayName } from '@/lib/v2Products';
import { StudentHeader } from '@/components/student/StudentHeader';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import styles from './upgrade.module.css';
import '../../../dashboard/dashboard.css';

export const dynamic = 'force-dynamic';
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  await requirePortalRole('student');
  if (isV2CheckoutEnabled()) redirect('/courses/v2/checkout?upgrade=1');
  const { course } = await searchParams;
  const target = course === undefined ? undefined : parseCourseSelection(course);
  const [review, studentName] = await Promise.all([loadIndividualUpgrade(target), getMyDisplayName()]);
  const selection = review.status === 'ready' ? review.quote?.targetProducts ?? review.currentProducts : [];
  const reasons = {
    no_active_package: 'There is no active individual package to upgrade.',
    multiple_packages: 'Your account has multiple active purchases. The programme team needs to review upgrade eligibility.',
    full_course: 'Full Course is a separate offering and is not part of individual-package upgrades.',
    all_subjects: 'Your individual package already includes Quant, Verbal and DI.',
  };
  return <div className="student-page"><StudentHeader studentName={studentName} /><main className={styles.main}>
    <Link className={styles.back} href="/account/access">← My access</Link>
    <h1>Add subjects</h1>
    <p className={styles.lead}>Pay only the difference. Your access end date stays the same.</p>
    {review.status === 'policy_pending' ? <section className={styles.panel}><h2>Upgrades aren’t open yet</h2><p>Upgrade pricing is still being confirmed. Your current access is unchanged.</p></section>
      : review.status === 'unauthorized' ? <section className={styles.panel}><h2>Sign in with an active Student account</h2><Link className={styles.secondary} href="/login">Sign in</Link></section>
        : review.status === 'unavailable' ? <section className={styles.panel} role="alert"><h2>We couldn’t check this upgrade</h2><p>No price or eligibility has been confirmed. Please try again.</p><Link className={styles.secondary} href="/account/access/upgrade">Retry</Link></section>
          : review.status === 'ineligible' ? <section className={styles.panel}><h2>No upgrade available</h2><p>{reasons[review.reason]}</p><Link className={styles.secondary} href="/account/access">Back to My access</Link></section>
            : <>
              <section className={styles.panel} aria-labelledby="pick-heading">
                <div className={styles.current}><span>You have</span><strong>{courseNames(review.currentProducts)}</strong><span>until {courseDay(review.expiresAt)}</span></div>
                <form method="get" key={selection.join(',')}>
                  <fieldset><legend id="pick-heading">Choose subjects to add</legend><div className={styles.subjects}>
                    {(['quant_crash', 'verbal_crash', 'di_crash'] as const).map((code) => {
                      const owned = review.currentProducts.includes(code);
                      return <label key={code} data-owned={owned || undefined}>
                        {owned ? <><input type="hidden" name="course" value={courseIdentity(code)} /><input type="checkbox" checked disabled readOnly /></> : <input type="checkbox" name="course" value={courseIdentity(code)} defaultChecked={selection.includes(code)} />}
                        <span>{v2ProductDisplayName(code)}</span>{owned && <small>Already yours</small>}
                      </label>;
                    })}
                  </div></fieldset>
                  <button type="submit">See price difference</button>
                </form>
                {review.invalidSelection && <p role="alert">Add at least one new subject. Full Course can’t be added here.</p>}
              </section>
              {review.quote && <section className={styles.panel} aria-labelledby="quote-heading">
                <h2 id="quote-heading">Your upgrade estimate</h2>
                <p className={styles.target}>{courseNames(review.quote.targetProducts)}</p>
                <dl>
                  <div><dt>New package</dt><dd>{courseMoney(review.quote.targetPricePaise)}</dd></div>
                  <div><dt>What you already have</dt><dd>− {courseMoney(review.quote.currentPricePaise)}</dd></div>
                  <div className={styles.total}><dt>You pay</dt><dd>{courseMoney(review.quote.differencePaise)}</dd></div>
                </dl>
                <p>Expiry stays {courseDate(review.quote.expiresAt)}.</p>
                <p className={styles.muted}>This is an estimate based on today’s prices. Online upgrades open soon; nothing is charged here.</p>
              </section>}
            </>}
  </main></div>;
}
