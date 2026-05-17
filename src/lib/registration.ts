import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const RESERVATION_MINUTES = 15;

export interface PublicBatch {
  id: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  capacity: number;
  seats_taken: number;
  seats_reserved: number;
  seats_available: number;
  registration_closes_at: string | null;
  public_note: string | null;
  starts_at: string | null;
}

export interface RegistrationInput {
  courseId: string;
  fullName: string;
  email: string;
  phone: string;
  targetGmatDate?: string | null;
  consent: boolean;
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toSafePhone(phone: string) {
  return phone.trim().replace(/[^\d+ -]/g, '');
}

export function validateRegistrationInput(input: RegistrationInput) {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = toSafePhone(input.phone);

  if (!input.courseId) return { error: 'Choose a batch.' };
  if (fullName.length < 2) return { error: 'Enter your full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (phone.length < 8) return { error: 'Enter a valid phone or WhatsApp number.' };
  if (!input.consent) return { error: 'Please accept the registration consent.' };

  return {
    value: {
      courseId: input.courseId,
      fullName,
      email,
      phone,
      targetGmatDate: input.targetGmatDate || null,
      consent: input.consent,
    },
  };
}

export async function getSeatCounts(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, courseId: string) {
  const nowIso = new Date().toISOString();

  const [{ count: enrolledCount }, { count: reservedCount }] = await Promise.all([
    supabaseAdmin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId),
    supabaseAdmin
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'pending_payment')
      .gt('reserved_until', nowIso),
  ]);

  return {
    seatsTaken: enrolledCount || 0,
    seatsReserved: reservedCount || 0,
  };
}

export async function getPublicBatches(limit = 3): Promise<PublicBatch[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select('id, name, description, capacity, price_amount, currency, registration_open, registration_closes_at, public_note, sessions(session_number, session_date)')
    .eq('is_active', true)
    .eq('registration_open', true)
    .or(`registration_closes_at.is.null,registration_closes_at.gt.${nowIso}`);

  if (error) throw error;

  const mapped = await Promise.all((courses || []).map(async (course: any) => {
    const sessions = (course.sessions || []) as { session_number: number; session_date: string }[];
    const firstSession = sessions
      .slice()
      .sort((a, b) => a.session_number - b.session_number || new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];
    const { seatsTaken, seatsReserved } = await getSeatCounts(supabaseAdmin, course.id);
    const capacity = course.capacity || 8;

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      price_amount: course.price_amount || 0,
      currency: course.currency || 'INR',
      capacity,
      seats_taken: seatsTaken,
      seats_reserved: seatsReserved,
      seats_available: Math.max(capacity - seatsTaken - seatsReserved, 0),
      registration_closes_at: course.registration_closes_at,
      public_note: course.public_note,
      starts_at: firstSession?.session_date || null,
    };
  }));

  return mapped
    .filter((course) => course.starts_at)
    .sort((a, b) => new Date(a.starts_at || 0).getTime() - new Date(b.starts_at || 0).getTime())
    .slice(0, limit);
}

export async function createRazorpayOrder(amount: number, currency: string, receipt: string, notes: Record<string, string>) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay server credentials.');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.description || 'Failed to create Razorpay order.');
  }

  return payload as { id: string; amount: number; currency: string; status: string };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('Missing Razorpay server credentials.');

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing Razorpay webhook secret.');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function enrollPaidRegistration(registrationId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: registration, error } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (error || !registration) {
    throw new Error('Registration not found.');
  }

  let userId: string | undefined;
  const email = normalizeEmail(registration.email);
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  userId = existingProfile?.id;

  if (!userId) {
    const randomPassword = crypto.randomBytes(24).toString('base64url');
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: registration.full_name },
    });

    if (createError || !createdUser.user) {
      throw new Error(createError?.message || 'Failed to create student account.');
    }

    userId = createdUser.user.id;
  }

  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email,
    full_name: registration.full_name,
    role: 'student',
  });

  await supabaseAdmin.from('enrollments').upsert({
    user_id: userId,
    course_id: registration.course_id,
  }, { onConflict: 'user_id,course_id' });

  return { userId, email };
}

export function formatMoney(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}
