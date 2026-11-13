'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { courseMoney, courseNames } from '@/lib/v2CoursePresentation';
import type { V2ProductCode } from '@/lib/v2Products';
import styles from '@/components/courses/courses.module.css';
type Exception = { id: string; state: string; amountPaise: number; products: V2ProductCode[]; issue: string | null };
export default function PaymentRecovery({ exceptions }: { exceptions: Exception[] }) {
  const [orderIds, setOrderIds] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const router = useRouter();
  async function recover(item: Exception) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/v2/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action: item.state === 'creating' ? 'admin-recover' : 'admin-reconcile', orderId: orderIds[item.id] }) });
      const result = await response.json();
      setMessage(response.ok ? result.state === 'fulfilled' ? 'Verified payment fulfilled successfully.' : result.state === 'review' ? 'Fulfillment remains blocked. Review eligibility, publication and capacity before retrying. Any refund requires a separate provider action.' : 'No captured payment is confirmed.' : result.error || 'Recovery unavailable.');
      router.refresh();
    } catch { setMessage('Recovery could not complete. The current record remains available for review.'); }
    finally { setBusy(false); }
  }
  return <><p role="status">{message}</p>{!exceptions.length && <p>No payment exceptions require review.</p>}
    <ul className={styles.history}>{exceptions.map(item => <li key={item.id}><h2>{courseNames(item.products)} · {courseMoney(item.amountPaise)}</h2><p>Reference: {item.id}</p><p>{item.state === 'creating' ? 'Provider order creation was interrupted. Locate the existing Test Mode order by its receipt, which matches this checkout reference.' : 'The checkout is awaiting verified payment or fulfillment recovery.'}</p>
      {item.state === 'creating' && <label>Existing Razorpay Test Mode order ID<input value={orderIds[item.id] ?? ''} onChange={e => setOrderIds(current => ({ ...current, [item.id]: e.target.value }))} placeholder="order_…" disabled={busy} /></label>}
      <button className={styles.button} type="button" disabled={busy || item.state === 'creating' && !/^order_[A-Za-z0-9]+$/.test(orderIds[item.id] ?? '')} onClick={() => recover(item)}>{busy ? 'Verifying…' : 'Verify and reconcile'}</button>
    </li>)}</ul></>;
}
