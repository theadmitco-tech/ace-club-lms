import 'server-only';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { checkoutPreviewEnabled, type SalesBatch, type CheckoutSummary, type PurchasePackage } from '@/lib/v2Checkout';
import { capturedPaymentMatches, razorpayRequest, testPaymentConfiguration } from './v2Razorpay';

export function isV2CheckoutEnabled() { return checkoutPreviewEnabled(process.env); }
export function checkoutService() {
  if (!isV2CheckoutEnabled()) throw new Error('Checkout unavailable');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Checkout service unavailable');
  // Legacy JWT service credentials must belong to the verified staging project.
  if (key.split('.').length === 3) {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if (claims.ref !== 'eyphkkginlgoaxflauog' || claims.role !== 'service_role') throw new Error('Staging service configuration mismatch');
  }
  return createServiceClient('https://eyphkkginlgoaxflauog.supabase.co', key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function serviceRpc(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await checkoutService().rpc(name, args);
  if (error) throw new Error('Checkout transition unavailable');
  return data;
}
export async function loadV2Sales() {
  if (!isV2CheckoutEnabled()) return null;
  const client = await createClient();
  const [catalogue, availability] = await Promise.all([client.rpc('list_v2_sales_catalogue'), client.rpc('list_v2_live_availability')]);
  if (catalogue.error || availability.error || !Array.isArray(catalogue.data) || !Array.isArray(availability.data)) throw new Error('Catalogue unavailable');
  return { renderedAt: Date.now(), batches: catalogue.data as SalesBatch[], availability: availability.data as { batchId: string; placesRemaining: number; capacity: number }[] };
}
export async function loadV2CheckoutAccount() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { email: null, checkouts: [] as CheckoutSummary[], packages: [] as PurchasePackage[] };
  const [orders, packages] = await Promise.all([client.rpc('get_my_v2_checkouts'), client.rpc('get_my_v2_purchase_packages')]);
  if (orders.error || packages.error || !Array.isArray(orders.data) || !Array.isArray(packages.data)) throw new Error('Account unavailable');
  return { email: user.email ?? null, checkouts: orders.data as CheckoutSummary[], packages: packages.data as PurchasePackage[] };
}
export async function startProviderOrder(id: string, studentId: string) {
  let intent = await serviceRpc('read_v2_checkout_service', { p_id: id });
  if (!intent || intent.student_id !== studentId) throw new Error('Checkout unavailable');
  const { key } = testPaymentConfiguration(process.env);
  if (intent.state === 'prepared' && await serviceRpc('claim_v2_checkout_order', { p_id: id })) {
    // An ambiguous provider response leaves the claim in place for Admin recovery; no blind POST retry.
    const order = await razorpayRequest('/orders', { amount: intent.amount_paise, currency: 'INR', receipt: id, partial_payment: false });
    if (order.entity !== 'order' || typeof order.id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(order.id)
      || order.receipt !== id || order.amount !== intent.amount_paise || order.currency !== 'INR') throw new Error('Order requires review');
    await serviceRpc('attach_v2_checkout_order', { p_id: id, p_order: order.id });
    intent = await serviceRpc('read_v2_checkout_service', { p_id: id });
  }
  if (intent.state !== 'ready' || Date.parse(intent.hold_until) <= Date.now()) throw new Error('Checkout expired or requires review');
  return { id, key, orderId: intent.provider_order_id, amountPaise: intent.amount_paise, currency: 'INR',
    name: intent.full_name, email: intent.email, contact: intent.whatsapp };
}
export async function reconcileV2Payment(id: string, paymentId?: string) {
  const intent = await serviceRpc('read_v2_checkout_service', { p_id: id });
  if (!intent?.provider_order_id) throw new Error('Order unavailable');
  const order = await razorpayRequest(`/orders/${intent.provider_order_id}`);
  let payment: Record<string, unknown>;
  if (paymentId) payment = await razorpayRequest(`/payments/${paymentId}`);
  else {
    const collection = await razorpayRequest(`/orders/${intent.provider_order_id}/payments`);
    if (!Array.isArray(collection.items)) throw new Error('Payment status unavailable');
    const captured = collection.items.filter(p => p && typeof p === 'object' && p.status === 'captured');
    if (!captured.length) return { state: 'pending' };
    if (captured.length !== 1) throw new Error('Multiple captured payments require review');
    payment = captured[0];
  }
  if (!capturedPaymentMatches(payment, order, { order: intent.provider_order_id, amount: intent.amount_paise, receipt: id })) {
    if (payment.order_id === intent.provider_order_id && ['created', 'authorized', 'failed'].includes(String(payment.status))) return { state: 'pending' };
    throw new Error('Captured payment validation failed');
  }
  return serviceRpc('fulfill_v2_checkout', { p_id: id, p_order: intent.provider_order_id, p_payment: payment.id,
    p_amount: intent.amount_paise, p_currency: 'INR' });
}
