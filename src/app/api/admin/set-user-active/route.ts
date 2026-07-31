import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return authorization.response;
  }

  const { userId, isActive } = await request.json();
  if (!userId || typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'User ID and active state are required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .eq('role', 'student')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Student access update failed:', error);
    return NextResponse.json({ error: 'Unable to update student access.' }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Student was not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
