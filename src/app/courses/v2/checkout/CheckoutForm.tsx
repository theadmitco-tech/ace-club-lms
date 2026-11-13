'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { SalesBatch, CheckoutSummary, PurchasePackage } from '@/lib/v2Checkout';
import type { V2ProductCode } from '@/lib/v2Products';
import type { RazorpayCheckoutConstructor } from '@/lib/razorpayCheckout';
import { courseNames, courseMoney } from '@/lib/v2CoursePresentation';
import styles from '@/components/courses/courses.module.css';
import form from './checkout.module.css';
const subjects: V2ProductCode[] = ['quant_crash', 'verbal_crash', 'di_crash'];
const date = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
async function post(body: Record<string, unknown>) {
  const response = await fetch('/api/v2/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Checkout unavailable.');
  return result;
}
export default function CheckoutForm({ batches, availability, email, checkouts, packages, prices, upgradeRequested, renderedAt }: {
  batches: SalesBatch[]; availability: { batchId: string; placesRemaining: number }[]; email: string | null;
  checkouts: CheckoutSummary[]; packages: PurchasePackage[]; prices: Record<string, number | null>; upgradeRequested: boolean; renderedAt: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<V2ProductCode[]>([]), [chosen, setChosen] = useState<Record<string, string>>({});
  const [live, setLive] = useState<string[]>([]), [upgrade, setUpgrade] = useState(upgradeRequested);
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false), [scriptReady, setScriptReady] = useState(false), [message, setMessage] = useState('');
  const requestId = useRef<string | null>(null);
  const base = packages.length === 1 && !packages[0].products.includes('full_batch') ? packages[0] : null;
  const selectedBatches = selected.map(code => batches.find(b => b.batchId === chosen[code] && b.entitlementProductCode === code) ?? batches.find(b => b.entitlementProductCode === code)).filter((b): b is SalesBatch => !!b);
  const total = prices[[...selected].sort().join(',')];
  const prior = base ? prices[[...base.products].sort().join(',')] : null;
  const estimate = total == null || (upgrade && prior == null) ? null : total - (upgrade ? prior! : 0);
  const validUpgrade = !upgrade || !!base && base.products.every(code => selected.includes(code)) && selected.length > base.products.length && !selected.includes('full_batch');
  const reset = () => { requestId.current = null; setMessage(''); };
  function changeProducts(code: V2ProductCode) {
    reset(); setLive([]);
    setSelected(current => code === 'full_batch' ? ['full_batch'] : current.includes(code) ? current.filter(c => c !== code) : [...current.filter(c => c !== 'full_batch'), code]);
  }
  async function signIn() {
    setBusy(true); setMessage('');
    try {
      const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/v2/callback` } });
      if (error) throw error;
    } catch { setMessage('Google sign-in could not start. Please retry.'); setBusy(false); }
  }
  async function openPayment(order: { id: string; key: string; orderId: string; amountPaise: number; currency: string; name: string; email: string; contact: string }) {
    const Razorpay = (window as unknown as { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
    if (!Razorpay) throw new Error('The payment form could not load. Resume this checkout from its history.');
    const checkout = new Razorpay({ key: order.key, amount: order.amountPaise, currency: order.currency, name: 'Ace Club', description: 'Course registration · Test Mode', order_id: order.orderId,
      prefill: { name: order.name, email: order.email, contact: order.contact }, theme: { color: '#205848' },
      handler: async result => {
        try {
          const verified = await post({ action: 'verify', id: order.id, orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature });
          if (verified.state === 'fulfilled') { location.assign('/courses/v2/checkout#history'); return; }
          setMessage(verified.state === 'review' ? 'Payment was received and needs programme-team review. Please do not pay again.' : 'Payment confirmation is pending. Use Check payment in the checkout history.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Confirmation pending.'); }
        finally { setBusy(false); router.refresh(); }
      }, modal: { ondismiss: () => { setBusy(false); setMessage('Checkout closed. Its payment status can be checked in the history below.'); router.refresh(); } },
    });
    checkout.on('payment.failed', () => { setMessage('The payment attempt failed. Access is granted only after a captured payment is verified.'); setBusy(false); router.refresh(); });
    checkout.open();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      requestId.current ??= crypto.randomUUID();
      const order = await post({ action: 'prepare', id: requestId.current, products: selected,
        batchIds: selectedBatches.map(b => b.batchId), liveIds: live.filter(id => selectedBatches.some(b => b.batchId === id)),
        name, whatsapp: phone, upgrade, acceptTerms: terms });
      router.refresh(); await openPayment(order);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout unavailable.'); setBusy(false); router.refresh(); }
  }
  async function historyAction(id: string, action: 'resume' | 'reconcile') {
    setBusy(true); setMessage('');
    try {
      const result = await post({ id, action });
      if (action === 'resume') { await openPayment(result); return; }
      if (result.state === 'fulfilled') { location.assign('/courses/v2/checkout#history'); return; }
      setMessage(result.state === 'review' ? 'Payment requires programme-team review. Please do not pay again.' : 'No captured payment has been confirmed yet.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status unavailable.'); }
    setBusy(false); router.refresh();
  }
  return <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} onError={() => setMessage('The payment form failed to load. Please retry this page.')} />
    {!email ? <section className={styles.panel}><h2>Continue with Google</h2><p>The verified Google email becomes the learning account. Course outlines and prices remain available before sign-in.</p><button type="button" className={styles.button} disabled={busy} onClick={signIn}>Continue with Google</button></section> : <p className={styles.notice}>Signed in as {email}</p>}
    <form onSubmit={submit} className={form.grid}>
      <section className={styles.panel}><h2>1. Choose the curriculum</h2>
        <fieldset disabled={busy} className={styles.choices}><legend>Full Course or individual subjects</legend>
          {(['full_batch', ...subjects] as V2ProductCode[]).map(code => <label key={code}><input type="checkbox" checked={selected.includes(code)} disabled={!batches.some(b => b.entitlementProductCode === code)} onChange={() => changeProducts(code)} />{courseNames([code])}</label>)}
        </fieldset>
        <p>Individual package prices: {['quant_crash', 'quant_crash,verbal_crash', 'di_crash,quant_crash,verbal_crash'].map(key => prices[key] == null ? 'Price unavailable' : courseMoney(prices[key]!)).join(' / ')} for one, two or three subjects. Full Course is a separate offering.</p>
        {base && base.products.length < 3 && <label className={form.check}><input type="checkbox" checked={upgrade} disabled={busy} onChange={e => { reset(); setUpgrade(e.target.checked); }} />Upgrade the existing individual package; retain its expiry of {date(base.expiresAt)} IST.</label>}
        {selectedBatches.map(batch => <div className={form.batch} key={batch.entitlementProductCode}>
          <label htmlFor={`batch-${batch.entitlementProductCode}`}>{courseNames([batch.entitlementProductCode])} batch</label>
          <select id={`batch-${batch.entitlementProductCode}`} value={batch.batchId} disabled={busy} onChange={e => { reset(); setLive(current => current.filter(id => id !== batch.batchId)); setChosen(current => ({ ...current, [batch.entitlementProductCode]: e.target.value })); }}>
            {batches.filter(b => b.entitlementProductCode === batch.entitlementProductCode).map(b => <option value={b.batchId} key={b.batchId}>{b.title}</option>)}
          </select>
          <p>{batch.sessions.length} published sessions</p>
          {batch.events.some(e => Date.parse(e.endsAt) > renderedAt) ? <label className={form.check}><input type="checkbox" disabled={busy || !availability.find(a => a.batchId === batch.batchId)?.placesRemaining} checked={live.includes(batch.batchId)} onChange={e => { reset(); setLive(current => e.target.checked ? [...current, batch.batchId] : current.filter(id => id !== batch.batchId)); }} />Include live classes · {availability.find(a => a.batchId === batch.batchId)?.placesRemaining ?? 0} of 8 places available · no extra fee</label> : <p>Recording library; no upcoming live classes.</p>}
        </div>)}
      </section>
      <section className={styles.panel}><h2>2. Review and register</h2>
        <label className={form.field}>Full name<input required autoComplete="name" maxLength={120} value={name} disabled={busy} onChange={e => { reset(); setName(e.target.value); }} /></label>
        <label className={form.field}>WhatsApp number<input required type="tel" autoComplete="tel" placeholder="+91…" pattern="\+[1-9][0-9]{7,14}" value={phone} disabled={busy} onChange={e => { reset(); setPhone(e.target.value); }} /><small>Include the country code. No automated messages are sent.</small></label>
        <strong className={styles.price}>{estimate !== null && estimate > 0 ? courseMoney(estimate) : 'Select an eligible package'}</strong>
        {upgrade && <p>The upgrade estimate uses the current configured tier difference. The original expiry stays unchanged.</p>}
        {!validUpgrade && <p role="alert">An upgrade must include every current subject and at least one additional subject.</p>}
        <label className={form.check}><input type="checkbox" required checked={terms} disabled={busy} onChange={e => setTerms(e.target.checked)} />The selection and price have been reviewed. New purchases provide six calendar months of access from verified payment; upgrades retain the existing expiry. Live places are confirmed only after payment verification.</label>
        <p>A checkout holds selected live places for 15 minutes. There are no per-session bookings or waitlists.</p>
        <button className={styles.button} disabled={busy || !email || !scriptReady || !terms || !selected.length || selectedBatches.length !== selected.length || estimate == null || estimate <= 0 || !validUpgrade}>{busy ? 'Checking…' : 'Continue to test payment'}</button>
      </section>
    </form>
    <p role="status" aria-live="polite" className={styles.notice}>{message || 'Payment status is verified securely before course access is granted.'}</p>
    {email && <section id="history" className={styles.panel}><h2>Registration and payment history</h2>
      {!checkouts.length && <p>No checkouts yet.</p>}
      <ul className={styles.history}>{checkouts.map(c => <li key={c.id}>
        <h3>{courseNames(c.products)}{c.upgrade ? ' · Upgrade' : ''}</h3><p>{courseMoney(c.amountPaise)} · {c.state === 'fulfilled' ? 'Confirmed' : c.state === 'review' ? 'Programme-team review required' : 'Payment not yet confirmed'}</p>
        <small>Reference: {c.id}</small>
        {c.state === 'fulfilled' ? <><p>Access expires {c.expiresAt ? `${date(c.expiresAt)} IST` : 'as shown in My access'}. Sign in with the same Google account to continue learning. {c.liveBatches.length ? 'Selected live registrations are confirmed; schedules are shown in My learning.' : 'No live place was requested with this purchase.'}</p><div className={styles.row}><Link href="/account/access">My access</Link><Link href="/schedule/v2">Open learning schedule</Link></div></> : <><p>{c.state === 'review' ? 'A captured payment needs review before access can be granted. Contact the programme team with this reference; do not pay again.' : 'If a payment was attempted, check its status before starting another checkout.'}</p><div className={styles.row}>
          {['prepared', 'ready'].includes(c.state) && Date.parse(c.holdUntil) > renderedAt && <button type="button" className={styles.button} disabled={busy || !scriptReady} onClick={() => historyAction(c.id, 'resume')}>Resume checkout</button>}
          {['ready', 'review'].includes(c.state) && <button type="button" className={styles.button} disabled={busy} onClick={() => historyAction(c.id, 'reconcile')}>Check payment</button>}
          {c.state === 'creating' && <p>Order creation needs programme-team recovery. Provide the reference above.</p>}
        </div></>}
      </li>)}</ul>
    </section>}
  </>;
}
