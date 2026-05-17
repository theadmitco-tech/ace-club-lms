import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/registration';

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      order_id: alternateOrderId,
      payment_id: alternatePaymentId,
      signature: alternateSignature,
    } = await request.json();

    const finalOrderId = orderId || alternateOrderId;
    const finalPaymentId = paymentId || alternatePaymentId;
    const finalSignature = signature || alternateSignature;

    if (!finalOrderId || !finalPaymentId || !finalSignature) {
      return NextResponse.json({ error: 'Missing payment verification fields.' }, { status: 400 });
    }

    if (!verifyRazorpaySignature(finalOrderId, finalPaymentId, finalSignature)) {
      return NextResponse.json({ error: 'Payment signature mismatch.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order_id: finalOrderId,
      payment_id: finalPaymentId,
    });
  } catch (error: any) {
    console.error('Standard Razorpay verification failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify payment.' }, { status: 500 });
  }
}
