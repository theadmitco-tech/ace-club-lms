import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';

type PortalIdentity = {
  id: string;
  role: UserRole;
};

export const getPortalIdentity = cache(async (): Promise<PortalIdentity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !profile?.is_active ||
    (profile.role !== 'admin' && profile.role !== 'student')
  ) {
    return null;
  }

  return { id: user.id, role: profile.role };
});

export async function requirePortalRole(role: UserRole) {
  const identity = await getPortalIdentity();

  if (!identity) {
    redirect('/login');
  }

  if (identity.role !== role) {
    redirect(identity.role === 'admin' ? '/admin' : '/dashboard');
  }

  return identity;
}
