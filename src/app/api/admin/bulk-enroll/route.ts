import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { emails, courseId, sendMagicLink } = await req.json();

    if (!emails || !Array.isArray(emails) || !courseId) {
      return NextResponse.json({ error: 'Missing emails or courseId' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const email of emails) {
      let userId: string | undefined;

      // 1. Try to create user in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: email.split('@')[0] }
      });

      if (authError) {
        // User already exists — look them up by email in profiles
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
          const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (existing) {
            userId = existing.id;
          } else {
            // Profile not found — list users and find their ID
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = usersData?.users.find(u => u.email === email);
            if (existingUser) {
              userId = existingUser.id;
              // Try inserting profile if it doesn't exist
              await supabaseAdmin.from('profiles').upsert({
                id: existingUser.id,
                email,
                full_name: email.split('@')[0],
                role: 'student',
              }, { onConflict: 'id' });
            }
          }
        } else {
          results.failed++;
          results.errors.push(`${email}: ${authError.message}`);
          continue;
        }
      } else {
        userId = authData?.user?.id;
        // Wait briefly for the profile trigger to fire
        await new Promise(r => setTimeout(r, 500));
      }

      if (!userId) {
        results.failed++;
        results.errors.push(`${email}: Could not determine user ID`);
        continue;
      }

      // 2. Enroll user in the course (ignore duplicate enrollment error)
      const { error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .insert({ user_id: userId, course_id: courseId });

      if (enrollError && !enrollError.message.includes('duplicate key value')) {
        results.failed++;
        results.errors.push(`${email}: Failed to enroll — ${enrollError.message}`);
        continue;
      }

      results.success++;

      // 3. Send magic link email if requested (used when adding students to existing batch)
      if (sendMagicLink) {
        const { error: otpError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard`,
          }
        });

        if (otpError) {
          // Don't fail the enrollment if email fails, just log it
          console.warn(`Magic link failed for ${email}:`, otpError.message);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Bulk enroll error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
