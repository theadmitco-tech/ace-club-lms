import { requirePortalRole } from '@/lib/server/portalAuthorization';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole('student');
  return children;
}
