import { NextRequest, NextResponse } from 'next/server';
import {
  enrollPaidRegistration,
  getSupabaseAdmin,
  verifyRazorpaySignature,
} from '@/lib/registration';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = await request.json();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing payment verification details.' }, { status: 400 });
    }

    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingPayment, error: paymentFetchError } = await supabaseAdmin
      .from('payments')
      .select('*, registrations(id, status)')
      .eq('razorpay_order_id', orderId)
      .single();

    if (paymentFetchError || !existingPayment) {
      return NextResponse.json({ error: 'Payment order not found.' }, { status: 404 });
    }

    await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: 'paid',
        raw_payload: {
          ...(existingPayment.raw_payload || {}),
          verification: { orderId, paymentId },
        },
      })
      .eq('id', existingPayment.id);

    await supabaseAdmin
      .from('registrations')
      .update({
        status: 'paid',
        reserved_until: null,
      })
      .eq('id', existingPayment.registration_id);

    const enrollment = await enrollPaidRegistration(existingPayment.registration_id);

    return NextResponse.json({
      success: true,
      registrationId: existingPayment.registration_id,
      email: enrollment.email,
    });
  } catch (error: any) {
    console.error('Verify Razorpay payment failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify payment.' }, { status: 500 });
  }
}
