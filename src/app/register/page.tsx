'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PublicBatch } from '@/lib/registration';
import '../public.css';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function formatMoney(amount: number, currency: string) {
  if (!amount) return 'Price TBA';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatBatchDate(value: string | null) {
  if (!value) return 'Dates coming soon';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourseId = searchParams.get('course') || '';
  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    targetGmatDate: '',
    consent: false,
  });

  useEffect(() => {
    fetch('/api/register/batches')
      .then((res) => res.json())
      .then((payload) => setBatches(payload.batches || []))
      .catch((err) => {
        console.error(err);
        setError('Failed to load open batches.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedBatch = useMemo(() => {
    return batches.find((batch) => batch.id === selectedCourseId) || batches[0] || null;
  }, [batches, selectedCourseId]);

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!selectedBatch) {
      setError('Choose an open batch.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderResponse = await fetch('/api/register/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedBatch.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          targetGmatDate: form.targetGmatDate || null,
          consent: form.consent,
        }),
      });

      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderPayload.error || 'Failed to start payment.');
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Could not load Razorpay checkout.');
      }

      const checkout = new window.Razorpay({
        key: orderPayload.checkout.key,
        amount: orderPayload.order.amount,
        currency: orderPayload.order.currency,
        name: orderPayload.checkout.name,
        description: orderPayload.checkout.description,
        order_id: orderPayload.order.id,
        prefill: orderPayload.checkout.prefill,
        theme: { color: '#003b30' },
        handler: async (response: any) => {
          const verifyResponse = await fetch('/api/register/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          const verifyPayload = await verifyResponse.json();
          if (!verifyResponse.ok) {
            router.push(`/payment/failed?reason=${encodeURIComponent(verifyPayload.error || 'Verification failed')}`);
            return;
          }
          router.push(`/payment/success?email=${encodeURIComponent(verifyPayload.email || form.email)}`);
        },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled before completion.');
            setIsSubmitting(false);
          },
        },
      });

      checkout.on('payment.failed', (response: any) => {
        const message = response?.error?.description || response?.error?.reason || 'Payment failed. Please try again.';
        setError(message);
        setIsSubmitting(false);
      });

      checkout.open();
    } catch (err: any) {
      setError(err.message || 'Payment could not be started.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="public-page">
      <div className="public-shell">
        <nav className="public-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/')}>Back to course</button>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/login')}>Student login</button>
        </nav>

        <div className="register-layout">
          <aside className="register-card">
            <span className="public-eyebrow">Ace Club registration</span>
            <h1>Reserve your cohort seat.</h1>
            {isLoading ? (
              <div className="spinner" />
            ) : selectedBatch ? (
              <div className="register-summary">
                <p><strong>{selectedBatch.name}</strong></p>
                <p>Starts {formatBatchDate(selectedBatch.starts_at)}</p>
                <p>{selectedBatch.seats_available} of {selectedBatch.capacity} seats available</p>
                <p><strong>{formatMoney(selectedBatch.price_amount, selectedBatch.currency)}</strong></p>
                {selectedBatch.public_note && <p>{selectedBatch.public_note}</p>}
              </div>
            ) : (
              <p className="batch-meta">No open batch is available right now.</p>
            )}
          </aside>

          <section className="register-card">
            <form className="register-form" onSubmit={handlePayment}>
              <div className="register-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">Full name</label>
                  <input id="fullName" className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              <div className="register-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone / WhatsApp</label>
                  <input id="phone" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="targetDate">Target GMAT date</label>
                  <input id="targetDate" type="date" className="form-input" value={form.targetGmatDate} onChange={(e) => setForm({ ...form, targetGmatDate: e.target.value })} />
                </div>
              </div>

              <label className="form-label" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.45 }}>
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                />
                I agree to be contacted by The Admit Co. about Ace Club registration and understand my LMS access starts after successful payment.
              </label>

              {error && <div className="public-error">{error}</div>}

              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={isSubmitting || !selectedBatch || selectedBatch.seats_available <= 0}
              >
                {isSubmitting ? 'Opening checkout...' : `Pay ${selectedBatch ? formatMoney(selectedBatch.price_amount, selectedBatch.currency) : ''}`}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="public-loading"><div className="spinner spinner-lg" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
