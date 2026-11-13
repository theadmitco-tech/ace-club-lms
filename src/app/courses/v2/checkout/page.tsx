import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isV2CheckoutEnabled, loadV2Sales, loadV2CheckoutAccount } from '@/lib/server/v2Checkout';
import { quoteV2Products } from '@/lib/server/v2Products';
import type { V2ProductCode } from '@/lib/v2Products';
import CheckoutForm from './CheckoutForm';
import styles from '@/components/courses/courses.module.css';
export const dynamic = 'force-dynamic';
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ upgrade?: string }> }) {
  if (!isV2CheckoutEnabled()) notFound();
  const upgradeRequested = (await searchParams).upgrade === '1';
  const loaded = await Promise.all([loadV2Sales(), loadV2CheckoutAccount()]).catch(() => null);
  if (!loaded || !loaded[0]) return <main className={styles.main}><h1>Registration is temporarily unavailable</h1><p>The catalogue or account could not be verified. Please retry shortly.</p><Link href="/courses/v2">Return to courses</Link></main>;
  const [sales, account] = loaded;
    const combinations: V2ProductCode[][] = [['full_batch'], ['quant_crash'], ['verbal_crash'], ['di_crash'], ['quant_crash', 'verbal_crash'], ['quant_crash', 'di_crash'], ['verbal_crash', 'di_crash'], ['quant_crash', 'verbal_crash', 'di_crash']];
    const prices = Object.fromEntries(await Promise.all(combinations.map(async codes => {
      try { return [codes.sort().join(','), (await quoteV2Products(codes)).amount_paise]; } catch { return [codes.sort().join(','), null]; }
    })));
    return <main className={`${styles.page} ${styles.main}`}><Link href="/courses/v2">← Course catalogue</Link>
      <div className={styles.intro}><span className={styles.eyebrow}>YOUR NEXT CHAPTER</span><h1>Choose your course. Start learning.</h1><p>One account for the curriculum, recordings and live classes.</p></div>
      <div className={styles.notice}><strong>Test checkout</strong><p>This Preview uses simulated payments. No real money is charged.</p></div>
      <CheckoutForm {...sales} {...account} prices={prices} upgradeRequested={upgradeRequested} />
    </main>;
}
