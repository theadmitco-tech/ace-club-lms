import { NextRequest, NextResponse } from 'next/server';
import {
  createRazorpayOrder,
  getSeatCounts,
  getSupabaseAdmin,
  validateRegistrationInput,
} from '@/lib/registration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateRegistrationInput({
      courseId: body.courseId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      targetGmatDate: body.targetGmatDate,
      consent: Boolean(body.consent),
    });

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, name, capacity, price_amount, currency, registration_open, registration_closes_at, is_active')
      .eq('id', parsed.value.courseId)
      .single();

    if (courseError || !course || !course.is_active || !course.registration_open) {
      return NextResponse.json({ error: 'This batch is not open for registration.' }, { status: 400 });
    }

    if (course.registration_closes_at && new Date(course.registration_closes_at) <= new Date()) {
      return NextResponse.json({ error: 'Registration for this batch has closed.' }, { status: 400 });
    }

    const { seatsTaken, seatsReserved } = await getSeatCounts(supabaseAdmin, course.id);
    const capacity = course.capacity || 8;
    if (capacity - seatsTaken - seatsReserved <= 0) {
      return NextResponse.json({ error: 'This batch is full.' }, { status: 409 });
    }

    const amount = course.price_amount || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: 'Payment amount is not configured for this batch.' }, { status: 400 });
    }

    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('registrations')
      .insert({
        course_id: course.id,
        full_name: parsed.value.fullName,
        email: parsed.value.email,
        phone: parsed.value.phone,
        target_gmat_date: parsed.value.targetGmatDate,
        consent: parsed.value.consent,
        status: 'pending_payment',
        reserved_until: reservedUntil,
      })
      .select()
      .single();

    if (registrationError || !registration) {
      throw registrationError || new Error('Failed to create registration.');
    }

    const razorpayOrder = await createRazorpayOrder(amount, course.currency || 'INR', registration.id, {
      registration_id: registration.id,
      course_id: course.id,
      email: parsed.value.email,
    });

    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      registration_id: registration.id,
      razorpay_order_id: razorpayOrder.id,
      amount,
      currency: course.currency || 'INR',
      status: 'created',
      raw_payload: razorpayOrder,
    });

    if (paymentError) throw paymentError;

    return NextResponse.json({
      registrationId: registration.id,
      order: {
        id: razorpayOrder.id,
        amount,
        currency: course.currency || 'INR',
      },
      checkout: {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        name: 'Ace Club',
        description: course.name,
        prefill: {
          name: parsed.value.fullName,
          email: parsed.value.email,
          contact: parsed.value.phone,
        },
      },
    });
  } catch (error: any) {
    console.error('Create Razorpay order failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment order.' }, { status: 500 });
  }
}
