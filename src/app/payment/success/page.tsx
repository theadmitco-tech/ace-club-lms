'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '../../public.css';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <main className="public-page">
      <div className="public-shell">
        <section className="payment-state-card">
          <span className="public-eyebrow">Payment confirmed</span>
          <h1>Your Ace Club seat is reserved.</h1>
          <p className="batch-meta">
            {email ? `We have enrolled ${email}. ` : ''}
            Use magic link login to access your student dashboard.
          </p>
          <div className="public-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => router.push('/login')}>Go to login</button>
            <button className="btn btn-secondary" onClick={() => router.push('/')}>Back to course page</button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="public-loading"><div className="spinner spinner-lg" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
