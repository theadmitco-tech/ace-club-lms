import Link from 'next/link';
import { isV2CheckoutEnabled, loadV2Sales } from '@/lib/server/v2Checkout';
import { SalesOutlines } from '@/components/courses/SalesOutlines';
import { notFound } from 'next/navigation';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { loadCourseCatalogue } from '@/lib/server/v2CourseWorkspace';
import { quoteV2Products } from '@/lib/server/v2Products';
import { courseIdentity, courseMoney, courseNames, parseCourseSelection } from '@/lib/v2CoursePresentation';
import { CoursePackagePicker } from '@/components/courses/CoursePackagePicker';
import { BrandLogo } from '@/components/BrandLogo';
import styles from '@/components/courses/catalogue.module.css';

export const dynamic = 'force-dynamic';
export default async function CourseCataloguePage({ searchParams }: { searchParams: Promise<{ course?: string | string[]; add?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const params = await searchParams;
  const checkoutEnabled = isV2CheckoutEnabled();
  const sales = checkoutEnabled ? await loadV2Sales().catch(() => null) : null;
  const products = await loadCourseCatalogue();
  const selection = parseCourseSelection(params.course);
  // Arriving from a subject the student hasn't bought: explain why, and pre-select that subject.
  const addable = { quant: { code: 'quant_crash', name: 'Quant' }, verbal: { code: 'verbal_crash', name: 'Verbal' }, di: { code: 'di_crash', name: 'DI' } } as const;
  const addSubject = typeof params.add === 'string' && Object.hasOwn(addable, params.add) ? addable[params.add as keyof typeof addable] : null;
  const individualProducts = (products ?? []).filter((product) => product.code !== 'full_batch');
  const fullCourse = products?.find((product) => product.code === 'full_batch');
  const tiers = await Promise.all([1, 2, 3].filter((count) => count <= individualProducts.length).map(async (count) => {
    try { return { count, amountPaise: (await quoteV2Products(individualProducts.slice(0, count).map((product) => product.code))).amount_paise }; }
    catch { return { count, amountPaise: null }; }
  }));
  let quote = null;
  let quoteError = '';
  if (params.course !== undefined) {
    if (!selection) quoteError = 'Choose Full Course on its own, or one to three different subjects.';
    else if (!products || selection.some((code) => !products.some((product) => product.code === code))) quoteError = 'One or more of those courses isn’t available. Please choose again.';
    else {
      try { quote = await quoteV2Products(selection); }
      catch { quoteError = 'The price couldn’t be loaded just now. Please try again.'; }
    }
  }
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Ace Club home"><BrandLogo variant="light" className={styles.logo} /></Link>
      <nav aria-label="Course navigation"><Link href="/dashboard" prefetch={false}>My learning</Link><Link href="/account/access" prefetch={false}>My access</Link></nav>
    </header>
    <main className={styles.main}>
      <div className={styles.intro}>
        <h1>Explore courses</h1>
        <p>GMAT preparation in Quant, Verbal and DI. Every course includes six months of access to sessions, recordings and materials, plus live classes while seats last.</p>
      </div>
      {addSubject && <section className={styles.addNotice} aria-labelledby="add-subject-heading">
        <div><h2 id="add-subject-heading">Want to study {addSubject.name} too?</h2>
          <p>{addSubject.name} isn’t part of your package yet. It’s ticked below so you can see the price. If you already have a course, adding a subject costs only the difference and keeps your end date.</p></div>
        <div className={styles.addActions}><Link className={styles.secondary} href="/account/access/upgrade" prefetch={false}>See upgrade price</Link><Link className={styles.textLink} href="/schedule/v2" prefetch={false}>← Back to my course</Link></div>
      </section>}
      {!checkoutEnabled && <p className={styles.notice}><strong>Preview</strong> Prices are live, but online purchase isn’t open yet.</p>}

      {products === null ? <section className={styles.panel} role="alert"><h2>Courses couldn’t be loaded</h2><p>No sample prices or courses are shown instead.</p><Link className={styles.secondary} href="/courses/v2" prefetch={false}>Retry catalogue</Link></section>
        : products.length === 0 ? <section className={styles.panel}><h2>No courses are open right now</h2><p>Your existing purchases are still listed in My access.</p></section>
          : <>
            <div className={styles.options}>
              {individualProducts.length > 0 && <CoursePackagePicker key={selection?.join(',') ?? addSubject?.code ?? 'empty'} subjects={individualProducts.map((product) => ({ identity: courseIdentity(product.code), name: product.name }))} tiers={tiers} initialSelection={(selection ?? (addSubject ? [addSubject.code] : [])).filter((code) => individualProducts.some((product) => product.code === code)).map(courseIdentity)} />}
              {fullCourse && <section className={styles.option} data-featured aria-labelledby="full-course-heading">
                <h2 id="full-course-heading">Full Course</h2>
                <p>Quant, Verbal and DI together as one complete programme.</p>
                <ul className={styles.points}><li>All three subjects in one course</li><li>Six months of access</li><li>Live classes while seats last</li></ul>
                <div className={styles.pickFooter}>
                  <strong className={styles.price}>{fullCourse.amountPaise === null ? 'Price unavailable' : courseMoney(fullCourse.amountPaise)}</strong>
                  <Link className={styles.primary} href="/courses/v2?course=full_course#quote" prefetch={false}>Review Full Course</Link>
                </div>
              </section>}
            </div>
            {fullCourse && individualProducts.length === 3 && <aside className={styles.callout} aria-labelledby="compare-heading">
              <h2 id="compare-heading">All three subjects or Full Course?</h2>
              <p>Both include Quant, Verbal and DI for six months. <strong>Three subjects</strong> run as separate courses, each on its own schedule. <strong>Full Course</strong> is one programme with all three subjects together, and its live classes are spaced out over a longer period.</p>
              {checkoutEnabled && sales?.batches.length ? <a href="#published-courses">See the published schedule for class dates</a> : <p className={styles.muted}>Class dates for each batch appear here once registration opens.</p>}
            </aside>}

            {(quote || quoteError) && <section id="quote" className={styles.panel} aria-labelledby="quote-heading">
              <h2 id="quote-heading">Your selection</h2>
              {quoteError ? <p role="alert">{quoteError}</p> : quote && <>
                <div className={styles.quoteLine}><strong>{courseNames(quote.product_codes)}</strong><strong className={styles.price}>{courseMoney(quote.amount_paise)}</strong></div>
                <p>Six months of access from the day your payment is confirmed.{!quote.product_codes.includes('full_batch') && ' You get the subjects you picked. Selecting all three does not create a Full Course purchase.'}</p>
                {checkoutEnabled ? <Link className={styles.primary} href="/courses/v2/checkout">Choose a batch and register</Link> : <p className={styles.muted}>Online purchase opens soon.</p>}
              </>}
            </section>}
          </>}

      {checkoutEnabled && (sales ? <SalesOutlines {...sales} /> : <section className={styles.panel}><h2>Batch details are unavailable</h2><p>Registration needs the published course details. Please try again shortly.</p></section>)}
    </main>
  </div>;
}
