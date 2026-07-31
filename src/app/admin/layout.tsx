import AdminShell from './AdminShell';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole('admin');
  return <AdminShell>{children}</AdminShell>;
}
