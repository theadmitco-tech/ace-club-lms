import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Delete the user from Auth (this will cascade delete the profile if RLS/triggers are set up, 
  // but we should delete the profile manually too just in case or if cascade isn't configured)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Manually delete profile to be safe
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
  await supabaseAdmin.from('enrollments').delete().eq('user_id', userId);

  return NextResponse.json({ success: true });
}
