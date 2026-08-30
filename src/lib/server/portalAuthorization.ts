import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';

type PortalIdentity = {
  id: string;
  role: UserRole;
  fullName: string;
  testerAccess: boolean;
  courseCount: number;
  selectedCourseId: string | null;
};

export type MockParticipantIdentity = PortalIdentity;

export const getPortalIdentity = cache(async (): Promise<PortalIdentity | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_portal_identity');
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return null;

  const identity = data as Record<string, unknown>;
  if (
    typeof identity.id !== 'string'
    || (identity.role !== 'admin' && identity.role !== 'student')
  ) return null;

  return {
    id: identity.id,
    role: identity.role,
    fullName: typeof identity.full_name === 'string' && identity.full_name.trim()
      ? identity.full_name.trim()
      : identity.role === 'admin' ? 'Admin' : 'Student',
    testerAccess: identity.tester_access === true,
    courseCount: typeof identity.course_count === 'number' ? identity.course_count : 0,
    selectedCourseId: typeof identity.selected_course_id === 'string' ? identity.selected_course_id : null,
  };
});

export async function requirePortalRole(role: UserRole, options: { allowCourseSelection?: boolean } = {}) {
  const identity = await getPortalIdentity();

  if (!identity) {
    redirect('/login');
  }

  if (identity.role !== role) {
    redirect(identity.role === 'admin' ? '/admin' : '/dashboard');
  }

  if (
    role === 'student'
    && !options.allowCourseSelection
    && identity.courseCount > 1
    && !identity.selectedCourseId
  ) {
    redirect('/courses');
  }

  return identity;
}

export async function getMockParticipantIdentity(): Promise<MockParticipantIdentity | null> {
  const identity = await getPortalIdentity();
  if (!identity) return null;
  return identity.role === 'student' || identity.testerAccess ? identity : null;
}

export async function requireMockParticipant() {
  const identity = await getMockParticipantIdentity();
  if (!identity) {
    const portalIdentity = await getPortalIdentity();
    if (!portalIdentity) redirect('/login');
    redirect(portalIdentity.role === 'admin' ? '/admin' : '/dashboard');
  }
  if (identity.role === 'student' && identity.courseCount > 1 && !identity.selectedCourseId) {
    redirect('/courses');
  }
  return identity;
}
