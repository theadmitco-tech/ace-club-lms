import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

type ProviderEntity = Record<string, unknown>;
export function validPaymentSignature(secret: string, message: string, signature: unknown): boolean {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(message).digest(), Buffer.from(signature, 'hex'));
}
export function testPaymentConfiguration(env: Record<string, string | undefined>) {
  const key = env.V2_RAZORPAY_TEST_KEY_ID, secret = env.V2_RAZORPAY_TEST_KEY_SECRET;
  if (!key || !/^rzp_test_[A-Za-z0-9]+$/.test(key) || !secret || secret.length < 8) throw new Error('Test payment configuration unavailable');
  return { key, secret };
}
export function capturedPaymentMatches(payment: ProviderEntity, order: ProviderEntity,
  expected: { order: string; amount: number; receipt: string }): boolean {
  return payment.entity === 'payment' && typeof payment.id === 'string' && /^pay_[A-Za-z0-9]+$/.test(payment.id)
    && payment.order_id === expected.order && payment.status === 'captured' && payment.captured === true
    && payment.amount === expected.amount && payment.currency === 'INR' && payment.amount_refunded === 0
    && order.entity === 'order' && order.id === expected.order && order.receipt === expected.receipt
    && order.status === 'paid' && order.amount === expected.amount && order.amount_paid === expected.amount
    && order.amount_due === 0 && order.currency === 'INR';
}
export async function razorpayRequest(path: string, body?: Record<string, unknown>): Promise<ProviderEntity> {
  const { key, secret } = testPaymentConfiguration(process.env);
  if (!/^\/(orders|payments)(\/[A-Za-z0-9_]+)?(\/payments)?$/.test(path)) throw new Error('Invalid provider operation');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error('Payment provider unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid provider response');
  return data as ProviderEntity;
}
