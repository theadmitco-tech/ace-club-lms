import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';

type PortalIdentity = {
  id: string;
  role: UserRole;
};

export type MockParticipantIdentity = PortalIdentity & { testerAccess: boolean };

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

export async function getMockParticipantIdentity(): Promise<MockParticipantIdentity | null> {
  const identity = await getPortalIdentity();
  if (!identity) return null;
  if (identity.role === 'student') return { ...identity, testerAccess: false };

  const supabase = await createClient();
  const { data } = await supabase
    .from('mock_assignment_testers')
    .select('assignment_id')
    .eq('user_id', identity.id)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle();
  return data ? { ...identity, testerAccess: true } : null;
}

export async function requireMockParticipant() {
  const identity = await getMockParticipantIdentity();
  if (!identity) {
    const portalIdentity = await getPortalIdentity();
    if (!portalIdentity) redirect('/login');
    redirect(portalIdentity.role === 'admin' ? '/admin' : '/dashboard');
  }
  return identity;
}
