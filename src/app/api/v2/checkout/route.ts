import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkoutUuid } from '@/lib/v2Checkout';
import { isV2ProductSelection } from '@/lib/v2Products';
import { isV2CheckoutEnabled, serviceRpc, startProviderOrder, reconcileV2Payment } from '@/lib/server/v2Checkout';
import { validPaymentSignature, testPaymentConfiguration, razorpayRequest } from '@/lib/server/v2Razorpay';
import { CheckoutRequestError, readCheckoutRequestText, parseCheckoutRequestJson } from '@/lib/server/v2CheckoutRequest';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!isV2CheckoutEnabled()) return NextResponse.json({ error: 'Checkout unavailable.' }, { status: 404 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Same-site request required.' }, { status: 403 });
  try {
    const parsed = parseCheckoutRequestJson(await readCheckoutRequestText(request, 10000));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Invalid checkout.' }, { status: 400 });
    const body = parsed as Record<string, unknown>;
    if (!checkoutUuid(body.id)) return NextResponse.json({ error: 'Invalid checkout.' }, { status: 400 });
    if (typeof body.action !== 'string' || !['prepare', 'resume', 'verify', 'reconcile', 'admin-reconcile', 'admin-recover'].includes(body.action)) return NextResponse.json({ error: 'Unknown checkout action.' }, { status: 400 });
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user || !user.email_confirmed_at || (body.action !== 'admin-reconcile' && body.action !== 'admin-recover' && user.app_metadata.provider !== 'google')) return NextResponse.json({ error: 'Verified Google sign-in required.' }, { status: 401 });
    const adminAction = body.action === 'admin-reconcile' || body.action === 'admin-recover';
    if (adminAction) {
      const { data: profile } = await client.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin' || !profile.is_active) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }
    if (body.action === 'prepare') {
      if (!isV2ProductSelection(body.products) || !Array.isArray(body.batchIds) || !body.batchIds.every(checkoutUuid)
        || !Array.isArray(body.liveIds) || !body.liveIds.every(checkoutUuid) || typeof body.name !== 'string'
        || typeof body.whatsapp !== 'string' || typeof body.upgrade !== 'boolean' || body.acceptTerms !== true) return NextResponse.json({ error: 'Review the course selection and registration details.' }, { status: 400 });
      testPaymentConfiguration(process.env);
      const prepared = await client.rpc('prepare_v2_checkout', { p_id: body.id, p_products: body.products, p_batch_ids: body.batchIds,
        p_live_ids: body.liveIds, p_name: body.name, p_whatsapp: body.whatsapp, p_upgrade: body.upgrade });
      if (prepared.error) return NextResponse.json({ error: 'Checkout could not be prepared. Check eligibility, live availability and any unfinished checkout.' }, { status: 409 });
      return NextResponse.json(await startProviderOrder(body.id, user.id), { headers: { 'Cache-Control': 'no-store' } });
    }
    const intent = await serviceRpc('read_v2_checkout_service', { p_id: body.id });
    if (!intent) return NextResponse.json({ error: 'Checkout unavailable.' }, { status: 404 });
    if (adminAction) {
      if (body.action === 'admin-recover') {
        if (intent.state !== 'creating' || typeof body.orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(body.orderId)) throw new Error('Invalid recovery');
        const order = await razorpayRequest(`/orders/${body.orderId}`);
        if (order.entity !== 'order' || order.id !== body.orderId || order.receipt !== body.id || order.amount !== intent.amount_paise || order.currency !== 'INR') throw new Error('Order mismatch');
        await serviceRpc('attach_v2_checkout_order', { p_id: body.id, p_order: body.orderId });
      }
      return NextResponse.json(await reconcileV2Payment(body.id));
    }
    if (intent.student_id !== user.id) return NextResponse.json({ error: 'Checkout unavailable.' }, { status: 404 });
    if (body.action === 'resume') return NextResponse.json(await startProviderOrder(body.id, user.id));
    if (body.action === 'verify') {
      if (body.orderId !== intent.provider_order_id || typeof body.paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(body.paymentId)
        || !validPaymentSignature(testPaymentConfiguration(process.env).secret, `${intent.provider_order_id}|${body.paymentId}`, body.signature)) return NextResponse.json({ error: 'Payment signature could not be verified.' }, { status: 400 });
      return NextResponse.json(await reconcileV2Payment(body.id, body.paymentId));
    }
    if (body.action === 'reconcile') return NextResponse.json(await reconcileV2Payment(body.id));
    return NextResponse.json({ error: 'Unknown checkout action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof CheckoutRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Payment confirmation is unavailable. Check the checkout history before retrying; no access has been assumed.' }, { status: 503 });
  }
}
