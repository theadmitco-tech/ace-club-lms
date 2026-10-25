import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/lib/registration';
import { getErrorMessage } from '@/lib/errorMessage';

const MIN_AMOUNT_PAISE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || 'INR').toUpperCase();
    const receipt = String(body.receipt || `receipt_${Date.now()}`);

    if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) {
      return NextResponse.json({ error: 'Amount must be at least 100 paise.' }, { status: 400 });
    }

    const order = await createRazorpayOrder(amount, currency, receipt, {
      source: 'standard_checkout',
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount || amount,
      currency: order.currency || currency,
    });
  } catch (error) {
    console.error('Standard Razorpay order creation failed:', error);
    const message = getErrorMessage(error, 'Failed to create Razorpay order.');
    const status = message.toLowerCase().includes('authentication') || message.toLowerCase().includes('auth')
      ? 401
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
