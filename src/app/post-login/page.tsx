import { redirect } from 'next/navigation';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';

export default async function PostLoginPage() {
  const identity = await getPortalIdentity();

  if (!identity) {
    redirect('/login');
  }

  if (identity.role === 'admin') {
    redirect('/admin');
  }

  redirect(identity.courseCount > 1 ? '/courses' : '/dashboard');
}
