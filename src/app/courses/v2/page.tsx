import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { loadCourseCatalogue } from '@/lib/server/v2CourseWorkspace';
import { quoteV2Products } from '@/lib/server/v2Products';
import { courseIdentity, courseMoney, courseNames, parseCourseSelection } from '@/lib/v2CoursePresentation';
import { BrandLogo } from '@/components/BrandLogo';
import styles from '@/components/courses/courses.module.css';

export const dynamic = 'force-dynamic';
export default async function CourseCataloguePage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const params = await searchParams;
  const products = await loadCourseCatalogue();
  const selection = parseCourseSelection(params.course);
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
    <header className={styles.header}><Link href="/" aria-label="Ace Club home"><BrandLogo variant="light" className={styles.logo} /></Link><nav aria-label="Course navigation"><Link href="/dashboard" prefetch={false}>My learning</Link><Link href="/account/access" prefetch={false}>My access</Link></nav></header>
    <main className={styles.main}>
      <div className={styles.intro}><span className={styles.eyebrow}>FIND YOUR COURSE</span><h1>A complete course. Your way to learn.</h1><p>Build your foundation in Quant, Verbal and DI. Study all three together or choose complete individual courses.</p></div>
      <div className={styles.notice}><strong>Preview catalogue</strong><p>Explore current course prices and your access. Online purchasing is not available here yet.</p></div>
      {products === null ? <section className={styles.panel} role="alert"><h2>Courses are temporarily unavailable</h2><p>We couldn’t load the catalogue. No sample prices or courses have been substituted.</p><Link href="/courses/v2" prefetch={false}>Retry catalogue</Link></section> : products.length === 0 ? <section className={styles.panel}><h2>No courses are available for selection</h2><p>Your existing purchases remain listed in My access.</p></section> : <>
        <section className={styles.offerings} aria-label="Available courses">{[...products].sort((a, b) => Number(b.code === 'full_batch') - Number(a.code === 'full_batch')).map((product) => <article key={product.code} className={styles.offering}>
          <span className={styles.eyebrow}>{product.sections.length === 3 ? 'ALL THREE SUBJECTS' : 'INDIVIDUAL COURSE'}</span><h2>{product.name}</h2><p>{product.sections.map((section) => section === 'di' ? 'DI' : section[0].toUpperCase() + section.slice(1)).join(' + ')}</p><p>A complete curriculum of sessions, materials, recordings and readings.</p>
          <strong className={styles.price}>{product.amountPaise === null ? 'Price unavailable' : courseMoney(product.amountPaise)}</strong><small>Six calendar months from confirmed payment</small>
          <Link className={styles.button} href={`/courses/v2?course=${courseIdentity(product.code)}#quote`} prefetch={false}>Review {product.name}</Link>
        </article>)}</section>
        <section className={styles.panel}><h2>Choose individual subjects</h2><p>Combine Quant, Verbal and DI. Your package price comes from the current catalogue.</p>
          <form key={selection?.join(',') ?? 'empty'} action="/courses/v2#quote" method="get"><fieldset className={styles.choices}><legend>Select one, two or three subjects</legend>{products.filter((product) => product.code !== 'full_batch').map((product) => <label key={product.code}><input type="checkbox" name="course" value={courseIdentity(product.code)} defaultChecked={selection?.includes(product.code)} />{product.name}</label>)}</fieldset><button className={styles.button} type="submit">Review package price</button></form>
        </section>
        <section id="quote" className={styles.panel} aria-labelledby="quote-heading"><h2 id="quote-heading">Your selection</h2>
          {quoteError ? <p role="alert">{quoteError}</p> : quote ? <><h3>{courseNames(quote.product_codes)}</h3><strong className={styles.price}>{courseMoney(quote.amount_paise)}</strong><p>Current total in INR. This price review does not create a purchase or grant access.</p>{!quote.product_codes.includes('full_batch') && <p>Individual courses grant only their selected subjects. Selecting all three does not create a Full Course purchase.</p>}<p>Access starts at verified payment and ends six calendar months later. The stored expiry is shown in My access.</p></> : <p>Select a course or a subject package to review its current price.</p>}
        </section>
      </>}
    </main>
  </div>;
}
