import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isV2CheckoutEnabled, serviceRpc, reconcileV2Payment } from '@/lib/server/v2Checkout';
import { validPaymentSignature } from '@/lib/server/v2Razorpay';
import { CheckoutRequestError, readCheckoutRequestText, parseCheckoutRequestJson } from '@/lib/server/v2CheckoutRequest';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.V2_RAZORPAY_TEST_WEBHOOK_SECRET;
  if (!isV2CheckoutEnabled() || !secret || secret.length < 24) return NextResponse.json({ error: 'Unavailable' }, { status: 404 });
  try {
    const raw = await readCheckoutRequestText(request, 100000);
    if (!validPaymentSignature(secret, raw, request.headers.get('x-razorpay-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    const parsed = parseCheckoutRequestJson(raw), eventId = request.headers.get('x-razorpay-event-id');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    const event = parsed as { event?: string; payload?: { payment?: { entity?: { order_id?: unknown } }; order?: { entity?: { id?: unknown } } } };
    if (!eventId || eventId.length > 200) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    if (!event.event || !['payment.captured', 'order.paid', 'payment.failed'].includes(event.event)) return NextResponse.json({ received: true });
    const orderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
    if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
    const id = await serviceRpc('find_v2_checkout_order', { p_order: orderId });
    if (!id) return NextResponse.json({ received: true });
    await serviceRpc('record_v2_payment_event', { p_event: eventId, p_hash: createHash('sha256').update(raw).digest('hex'), p_id: id });
    // Failed or out-of-order events cannot regress a paid order; current provider state controls access.
    await reconcileV2Payment(id);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Verification pending' }, { status: 503 });
  }
}
