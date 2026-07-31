import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/server/requireAdmin';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing server-side Supabase configuration.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return authorization.response;
  }

  try {
    const { emails, courseId, fullName } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0 || !courseId) {
      return NextResponse.json({ error: 'Emails and course are required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const untrustedEmail of emails) {
      const email = typeof untrustedEmail === 'string'
        ? untrustedEmail.trim().toLowerCase()
        : '';

      if (!email || !email.includes('@')) {
        results.failed++;
        results.errors.push('One email address was invalid.');
        continue;
      }

      let userId: string | undefined;
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .maybeSingle();
      const studentName = emails.length === 1 && typeof fullName === 'string' && fullName.trim()
        ? fullName.trim()
        : existingProfile?.full_name || email.split('@')[0];

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: studentName },
        });

        if (createError || !createdUser.user) {
          results.failed++;
          results.errors.push(`Could not provision ${email}.`);
          continue;
        }

        userId = createdUser.user.id;
      }

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email,
        full_name: studentName,
        role: 'student',
        is_active: true,
        invited_at: new Date().toISOString(),
      });

      if (profileError) {
        results.failed++;
        results.errors.push(`Could not activate ${email}.`);
        continue;
      }

      const { error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .upsert(
          { user_id: userId, course_id: courseId },
          { onConflict: 'user_id,course_id', ignoreDuplicates: true },
        );

      if (enrollmentError) {
        results.failed++;
        results.errors.push(`Could not enroll ${email}.`);
        continue;
      }

      results.success++;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Student provisioning failed:', error);
    return NextResponse.json({ error: 'Unable to provision students.' }, { status: 500 });
  }
}
