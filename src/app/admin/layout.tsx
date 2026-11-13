import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import AdminShell from './AdminShell';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole('admin');
  return <AdminShell paymentsEnabled={isV2CheckoutEnabled()} workflowEnabled={isV2ContentPublishingEnabled()} showCoursePublishing={process.env.VERCEL_ENV !== 'production'}>{children}</AdminShell>;
}
