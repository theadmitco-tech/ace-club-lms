'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '../../public.css';

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <main className="public-page">
      <div className="public-shell">
        <section className="payment-state-card">
          <span className="public-eyebrow">Payment not completed</span>
          <h1>We could not confirm this payment.</h1>
          <p className="batch-meta">
            {reason || 'No seat has been enrolled yet. You can try checkout again from the registration page.'}
          </p>
          <div className="public-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => router.push('/')}>Choose a batch</button>
            <button className="btn btn-secondary" onClick={() => router.push('/login')}>Student login</button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="public-loading"><div className="spinner spinner-lg" /></div>}>
      <FailedContent />
    </Suspense>
  );
}
