import { NextRequest, NextResponse } from 'next/server';
import {
  enrollPaidRegistration,
  getSupabaseAdmin,
  verifyWebhookSignature,
} from '@/lib/registration';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  try {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const paymentEntity = event?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: paymentId || payment.razorpay_payment_id,
          status: 'paid',
          raw_payload: event,
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('registrations')
        .update({
          status: 'paid',
          reserved_until: null,
        })
        .eq('id', payment.registration_id);

      await enrollPaidRegistration(payment.registration_id);
    }

    if (event.event === 'payment.failed') {
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: paymentId || payment.razorpay_payment_id,
          status: 'failed',
          raw_payload: event,
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('registrations')
        .update({
          status: 'failed',
          reserved_until: null,
        })
        .eq('id', payment.registration_id)
        .eq('status', 'pending_payment');
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Razorpay webhook failed:', error);
    return NextResponse.json({ error: error.message || 'Webhook failed.' }, { status: 500 });
  }
}
