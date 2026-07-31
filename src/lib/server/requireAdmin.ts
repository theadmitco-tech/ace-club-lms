import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type AdminAuthorization =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuthorization> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Admin authorization profile lookup failed:', profileError);
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unable to verify authorization' }, { status: 500 }),
    };
  }

  if (!profile || profile.role !== 'admin' || profile.is_active === false) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}
