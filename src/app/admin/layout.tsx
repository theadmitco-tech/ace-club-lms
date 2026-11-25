import { isV2CheckoutEnabled } from '@/lib/server/v2Checkout';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import AdminShell from './AdminShell';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ProductionBlocked } from '@/lib/v2Environment';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole('admin');
  return <AdminShell paymentsEnabled={isV2CheckoutEnabled()} workflowEnabled={isV2ContentPublishingEnabled()} showCoursePublishing={!isV2ProductionBlocked(process.env)}>{children}</AdminShell>;
}
