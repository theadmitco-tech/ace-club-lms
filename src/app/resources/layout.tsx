import { requirePortalRole } from '@/lib/server/portalAuthorization';

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole('student');
  return children;
}
