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
    const results = {
      success: 0, failed: 0, errors: [] as string[],
      failures: [] as { input: number; stage: string }[],
    };
    const fail = (input: number, stage: string, message: string) => {
      results.failed++;
      results.errors.push(`Entry ${input}: ${message}`);
      results.failures.push({ input, stage });
    };

    for (const [index, untrustedEmail] of emails.entries()) {
      const input = index + 1;
      const email = typeof untrustedEmail === 'string'
        ? untrustedEmail.trim().toLowerCase()
        : '';

      if (!email || !email.includes('@')) {
        fail(input, 'input_validation', 'One email address was invalid.');
        continue;
      }

      let userId: string | undefined;
      const { data: existingProfile, error: lookupError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .eq('email', email)
        .maybeSingle();
      if (lookupError) {
        fail(input, 'profile_lookup', 'Could not read the account profile. No account or enrollment writes were attempted for this entry.');
        continue;
      }
      if (existingProfile && existingProfile.role !== 'student') {
        fail(input, 'profile_role', 'Only Student accounts can be enrolled. The existing account role was not changed.');
        continue;
      }
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
          fail(input, 'account_creation', 'Could not create the account. Check whether it already exists and whether the server can manage accounts.');
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
        fail(input, 'profile_activation', 'Could not activate the Student profile. Enrollment was not attempted for this entry.');
        continue;
      }

      const { error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .upsert(
          { user_id: userId, course_id: courseId },
          { onConflict: 'user_id,course_id', ignoreDuplicates: true },
        );

      if (enrollmentError) {
        fail(input, 'enrollment_write', 'Could not save the enrollment. The account profile may already have been activated.');
        continue;
      }

      results.success++;
    }

    return NextResponse.json(results);
  } catch {
    console.error('Student provisioning failed.');
    return NextResponse.json({ error: 'Unable to provision students.' }, { status: 500 });
  }
}
