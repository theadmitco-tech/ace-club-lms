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
import styles from '@/components/courses/courses.module.css';

export const dynamic = 'force-dynamic';
export default async function CourseCataloguePage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const params = await searchParams;
  const checkoutEnabled = isV2CheckoutEnabled();
  const sales = checkoutEnabled ? await loadV2Sales().catch(() => null) : null;
  const products = await loadCourseCatalogue();
  const selection = parseCourseSelection(params.course);
  const individualProducts = (products ?? []).filter((product) => product.code !== 'full_batch');
  const fullCourse = products?.find((product) => product.code === 'full_batch');
  const tiers = await Promise.all([1, 2, 3].filter((count) => count <= individualProducts.length).map(async (count) => {
    try { return { count, amountPaise: (await quoteV2Products(individualProducts.slice(0, count).map((product) => product.code))).amount_paise }; }
    catch { return { count, amountPaise: null }; }
  }));
  let quote = null;
  let quoteError = '';
  if (params.course !== undefined) {
    if (!selection) quoteError = 'Choose Full Course on its own, or one to three different individual courses.';
    else if (!products || selection.some((code) => !products.some((product) => product.code === code))) quoteError = 'One or more selected courses are unavailable. Please choose again.';
    else {
      try { quote = await quoteV2Products(selection); }
      catch { quoteError = 'The current price could not be loaded. Please retry your selection.'; }
    }
  }
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand} aria-label="Ace Club home"><BrandLogo variant="light" className={styles.logo} /></Link><nav aria-label="Course navigation"><Link href="/dashboard" prefetch={false}>My learning</Link><Link href="/account/access" prefetch={false}>My access</Link></nav></header>
    <main className={styles.main}>
      <div className={styles.intro}><span className={styles.eyebrow}>FIND YOUR COURSE</span><h1>A complete curriculum. A package that fits you.</h1><p>Build your foundation in Quant, Verbal and DI. Choose individual subjects or study all three together with Full Course.</p></div>
      <div className={styles.notice}><strong>{checkoutEnabled ? 'Test checkout available' : 'Preview catalogue'}</strong><p>{checkoutEnabled ? 'Browse published outlines and register with a simulated payment. No real money is charged.' : 'Explore current course prices and your access. Online purchasing is not available here yet.'}</p></div>
      {checkoutEnabled && (sales ? <SalesOutlines {...sales} /> : <section className={styles.panel}><h2>Published outlines are temporarily unavailable</h2><p>Registration requires verified published course details. Please retry shortly.</p></section>)}
      {products === null ? <section className={styles.panel} role="alert"><h2>Courses are temporarily unavailable</h2><p>We couldn’t load the catalogue. No sample prices or courses have been substituted.</p><Link href="/courses/v2" prefetch={false}>Retry catalogue</Link></section> : products.length === 0 ? <section className={styles.panel}><h2>No courses are available for selection</h2><p>Your existing purchases remain listed in My access.</p></section> : <>
        {individualProducts.length > 0 && <CoursePackagePicker key={selection?.join(',') ?? 'empty'} subjects={individualProducts.map((product) => ({ identity: courseIdentity(product.code), name: product.name }))} tiers={tiers} initialSelection={(selection ?? []).filter((code) => individualProducts.some((product) => product.code === code)).map(courseIdentity)} />}
        {fullCourse && <section className={styles.fullCourse} aria-labelledby="full-course-heading"><div><span className={styles.eyebrow}>ONE DISTINCT OFFERING</span><h2 id="full-course-heading">Full Course</h2><p>Quant + Verbal + DI together in one complete course.</p><small>Three individual subjects remain an individual package; they do not become Full Course.</small></div><div><strong className={styles.price}>{fullCourse.amountPaise === null ? 'Price unavailable' : courseMoney(fullCourse.amountPaise)}</strong><small>Six months from confirmed payment</small></div><Link className={styles.button} href="/courses/v2?course=full_course#quote" prefetch={false}>Review Full Course</Link></section>}
        <section id="quote" className={styles.panel} aria-labelledby="quote-heading"><h2 id="quote-heading">Your selection</h2>
          {quoteError ? <p role="alert">{quoteError}</p> : quote ? <><h3>{courseNames(quote.product_codes)}</h3><strong className={styles.price}>{courseMoney(quote.amount_paise)}</strong><p>Current total in INR. This price review does not create a purchase or grant access.</p>{!quote.product_codes.includes('full_batch') && <p>Individual courses grant only their selected subjects. Selecting all three does not create a Full Course purchase.</p>}<p>Access starts at verified payment and ends six calendar months later. The stored expiry is shown in My access.</p>{checkoutEnabled && <Link className={styles.button} href="/courses/v2/checkout">Choose batches and register</Link>}</> : <p>Select a course or a subject package to review its current price.</p>}
        </section>
      </>}
    </main>
  </div>;
}
