import Link from 'next/link';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { notFound, redirect } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { loadIndividualUpgrade } from '@/lib/server/v2UpgradeQuotes';
import { courseDate, courseIdentity, courseMoney, courseNames, parseCourseSelection } from '@/lib/v2CoursePresentation';
import { v2ProductDisplayName } from '@/lib/v2Products';
import styles from './upgrade.module.css';

export const dynamic = 'force-dynamic';
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  await requirePortalRole('student');
  if (isV2CheckoutEnabled()) redirect('/courses/v2/checkout?upgrade=1');
  const { course } = await searchParams;
  const target = course === undefined ? undefined : parseCourseSelection(course);
  const review = await loadIndividualUpgrade(target);
  const selection = review.status === 'ready' ? review.quote?.targetProducts ?? review.currentProducts : [];
  const reasons = {
    no_active_package: 'There is no active individual package to upgrade.',
    multiple_packages: 'Your account has multiple active purchases. The programme team needs to review upgrade eligibility.',
    full_course: 'Full Course is a separate offering and is not part of individual-package upgrades.',
    all_subjects: 'Your individual package already includes Quant, Verbal and DI.',
  };
  return <main className={styles.main}>
    <Link href="/account/access">← My access</Link>
    <p className={styles.eyebrow}>INDIVIDUAL COURSES</p><h1>Review an upgrade</h1>
    <p>Add subjects to an eligible individual package. Full Course remains a separate offering.</p>
    {review.status === 'policy_pending' ? <section className={styles.panel}><h2>Upgrade pricing is not available yet</h2><p>The upgrade rules are awaiting confirmation. Your current access is unchanged.</p></section>
      : review.status === 'unauthorized' ? <section className={styles.panel}><h2>Sign in with an active Student account</h2><Link href="/login">Sign in</Link></section>
        : review.status === 'unavailable' ? <section className={styles.panel} role="alert"><h2>We couldn’t verify this upgrade</h2><p>No price or eligibility has been confirmed. Please retry.</p><Link href="/account/access/upgrade">Retry</Link></section>
          : review.status === 'ineligible' ? <section className={styles.panel}><h2>Upgrade unavailable</h2><p>{reasons[review.reason]}</p></section>
            : <>
              <section className={styles.panel}><h2>Your current package</h2><p>{courseNames(review.currentProducts)}</p><p>Access ends {courseDate(review.expiresAt)}. An upgrade under this policy keeps that date.</p>
                <form method="get" key={selection.join(',')}><fieldset><legend>Choose your full upgraded package, including subjects you already own</legend><div className={styles.subjects}>
                  {(['quant_crash', 'verbal_crash', 'di_crash'] as const).map((code) => <label key={code}><input type="checkbox" name="course" value={courseIdentity(code)} defaultChecked={selection.includes(code)} />{v2ProductDisplayName(code)}{review.currentProducts.includes(code) ? ' · Included' : ''}</label>)}
                </div></fieldset><button type="submit">Review price difference</button></form>
                {review.invalidSelection && <p role="alert">Keep your existing subjects and add at least one new individual subject. Full Course cannot be selected here.</p>}
              </section>
              {review.quote && <section className={styles.panel} aria-labelledby="quote-heading"><h2 id="quote-heading">Your upgrade estimate</h2><p>{courseNames(review.quote.targetProducts)}</p><dl><div><dt>Current package at today’s configured price</dt><dd>{courseMoney(review.quote.currentPricePaise)}</dd></div><div><dt>New package at today’s configured price</dt><dd>{courseMoney(review.quote.targetPricePaise)}</dd></div><div className={styles.total}><dt>Difference</dt><dd>{courseMoney(review.quote.differencePaise)}</dd></div></dl><p>Expiry stays {courseDate(review.quote.expiresAt)}.</p><p>This is a non-binding price review. It does not take payment or grant subjects. Checkout is not available; eligibility and prices must be checked again before payment.</p></section>}
            </>}
  </main>;
}
