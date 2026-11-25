import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { loadCourseCatalogue } from '@/lib/server/v2CourseWorkspace';
import { quoteV2Products } from '@/lib/server/v2Products';
import { loadCourseOutline, type OutlineSection } from '@/lib/server/v2CourseOutline';
import { courseMoney, courseNames, parseCourseSelection } from '@/lib/v2CoursePresentation';
import type { V2ProductCode } from '@/lib/v2Products';
import { BrandLogo } from '@/components/BrandLogo';
import styles from '@/components/courses/catalogue.module.css';

export const dynamic = 'force-dynamic';

const SECTION_OF: Record<string, OutlineSection> = { quant_crash: 'quant', verbal_crash: 'verbal', di_crash: 'di' };
const SECTION_NAME: Record<OutlineSection, string> = { quant: 'Quant', verbal: 'Verbal', di: 'DI' };
const STAGES = [
  { icon: '📖', name: 'Pre-class read', detail: 'A short reading to prepare the ideas before the session.' },
  { icon: '▶', name: 'Recording', detail: 'The full session, ready to watch whenever you like.' },
  { icon: '📝', name: 'Post-class read', detail: 'Key takeaways and further reading to lock it in.' },
  { icon: '✎', name: 'Worksheet', detail: 'Practice questions on the session’s topic.' },
];

/** One offer in detail: what you'll learn, a look inside a session, and the price. */
export default async function CourseReviewPage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const params = await searchParams;
  const selection = parseCourseSelection(params.course);
  const products = await loadCourseCatalogue();
  let quote: Awaited<ReturnType<typeof quoteV2Products>> | null = null;
  let error = '';
  if (!selection) error = 'Choose Full Course on its own, or one to three different subjects.';
  else if (!products || selection.some(code => !products.some(product => product.code === code))) error = 'One or more of those courses isn’t available. Please choose again.';
  else {
    try { quote = await quoteV2Products(selection); }
    catch { error = 'The price couldn’t be loaded just now. Please try again.'; }
  }
  const codes: V2ProductCode[] = quote?.product_codes ?? [];
  const full = codes.includes('full_batch');
  const sections: OutlineSection[] = full ? ['quant', 'verbal', 'di'] : codes.map(code => SECTION_OF[code]).filter(Boolean);
  const outline = quote ? await loadCourseOutline(codes) : null;
  const sample = sections.map(section => ({ section, title: outline?.[section][0] })).find(item => item.title);
  const checkoutEnabled = isV2CheckoutEnabled();
  const title = full ? 'Full Course' : courseNames(codes);
  const perSubject = quote && !full && codes.length > 1 ? courseMoney(Math.round(quote.amount_paise / codes.length / 100) * 100) : null;

  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Ace Club home"><BrandLogo variant="light" className={styles.logo} /></Link>
      <nav aria-label="Course navigation"><Link href="/dashboard" prefetch={false}>My learning</Link><Link href="/account/access" prefetch={false}>My access</Link></nav>
    </header>
    <main className={styles.main}>
      <Link className={styles.backLink} href="/courses/v2">← All courses</Link>
      {!quote ? <section id="quote" className={styles.panel}>
        <h1 className={styles.detailTitle}>This selection isn’t available</h1>
        <p role="alert">{error}</p>
        <Link className={styles.primary} href="/courses/v2">Back to all courses</Link>
      </section> : <>
        <header className={styles.detailHead}>
          <span className={styles.eyebrow}>{full ? 'All three subjects together' : codes.length === 1 ? 'One subject' : codes.length === 2 ? 'Two subjects' : 'All three subjects'}</span>
          <h1 className={styles.detailTitle}>{title}</h1>
          <p>{full ? 'Quant, Verbal and DI taught together as one programme, with classes spread out over a longer period.'
            : codes.length === 1 ? `The complete ${title} course: every session, recording and worksheet.`
              : `${codes.length === 3 ? 'Quant, Verbal and DI' : title} as separate subject courses, taken in any order.`}</p>
        </header>
        <div className={styles.detailGrid}>
          <div className={styles.detailMain}>
            <section className={styles.detailCard} aria-labelledby="learn-heading">
              <h2 id="learn-heading">What you’ll learn</h2>
              {outline && sections.some(section => outline[section].length) ? <div className={styles.outlineGrid}>
                {sections.map(section => <div key={section} className={styles.outlineSubject}>
                  <h3>{SECTION_NAME[section]} <small>{outline[section].length} {outline[section].length === 1 ? 'session' : 'sessions'}</small></h3>
                  {outline[section].length ? <ol>{outline[section].map(item => <li key={item}>{item}</li>)}</ol> : <p className={styles.muted}>Sessions are being prepared.</p>}
                </div>)}
              </div> : <p className={styles.muted}>The full session list appears here once the course is published.</p>}
            </section>

            <section className={styles.detailCard} aria-labelledby="sample-heading">
              <h2 id="sample-heading">A look inside a session</h2>
              <p className={styles.sampleIntro}>{sample ? <>For example, <strong>{SECTION_NAME[sample.section]} · {sample.title}</strong>. Every session has the same four parts, and you can take sessions in any order.</> : 'Every session has the same four parts, and you can take sessions in any order.'}</p>
              <ol className={styles.stageList}>{STAGES.map(stage => <li key={stage.name}>
                <span className={styles.stageIcon} aria-hidden="true">{stage.icon}</span>
                <div><strong>{stage.name}</strong><span>{stage.detail}</span></div>
                <span className={styles.lockTag}>🔒 After you join</span>
              </li>)}</ol>
            </section>
          </div>

          <aside id="quote" className={styles.priceCard} aria-labelledby="price-heading">
            <h2 id="price-heading" className={styles.visuallyHidden}>Price</h2>
            <p className={styles.priceFor}>{title}</p>
            <strong className={styles.bigPrice}>{courseMoney(quote.amount_paise)}</strong>
            {perSubject && <p className={styles.perSubject}>{perSubject} per subject</p>}
            <ul className={styles.points}>
              <li>Six months of access from the day you pay</li>
              <li>Every recording, reading and worksheet</li>
              <li>A seat in a live batch of eight, while seats last</li>
            </ul>
            {!full && <p className={styles.muted}>You get the subjects you picked. Selecting all three does not create a Full Course purchase.</p>}
            {checkoutEnabled ? <Link className={styles.primary} href="/courses/v2/checkout">Register</Link> : <p className={styles.soon}>Online purchase opens soon.</p>}
          </aside>
        </div>
      </>}
    </main>
  </div>;
}
