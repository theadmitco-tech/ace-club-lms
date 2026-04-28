import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We MUST use the service role key to bypass RLS and create users in auth.users
// without logging out the current admin.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Note: NOT the public anon key
);

export async function POST(req: NextRequest) {
  try {
    const { emails, courseId } = await req.json();

    if (!emails || !Array.isArray(emails) || !courseId) {
      return NextResponse.json({ error: 'Missing emails or courseId' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const email of emails) {
      // 1. Try to invite the user via email (this automatically sends an invitation email)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: { full_name: email.split('@')[0] },
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` : 'http://localhost:3001/dashboard'
        }
      );

      let userId = authData?.user?.id;

      if (authError) {
        // If user already exists, we need to fetch their ID
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
          const { data: existingProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
          
          if (existingProfiles) {
            userId = existingProfiles.id;
          } else {
            results.failed++;
            results.errors.push(`Could not find existing profile for ${email}`);
            continue;
          }
        } 
        // Fallback for Supabase free tier email rate limits (typically 3-4 per hour)
        else if (authError.status === 429 || authError.message.includes('rate limit')) {
          console.warn(`Rate limit hit for ${email}, falling back to manual creation without email.`);
          const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: 'StudentPassword123!', // Provide a default password since they won't get the magic link
            email_confirm: true,
            user_metadata: { full_name: email.split('@')[0] }
          });
          
          if (createError) {
            results.failed++;
            results.errors.push(`${email}: ${createError.message}`);
            continue;
          }
          userId = createData.user?.id;
        } else {
          results.failed++;
          results.errors.push(`${email}: ${authError.message}`);
          continue;
        }
      }

      // 2. Ensure profile exists (manually upsert to be safe)
      if (userId) {
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: 'student'
        });

        // 3. Enroll the user in the course
        const { error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .insert({ user_id: userId, course_id: courseId });
        
        if (enrollError && !enrollError.message.includes('duplicate key value')) {
          results.failed++;
          results.errors.push(`${email}: Failed to enroll`);
        } else {
          results.success++;
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Bulk enroll error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
