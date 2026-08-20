import { ResourceManager } from '@/app/admin/resources/ResourceManager';
import { listFlexibleResourceManagerData } from '@/lib/server/flexibleResources';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export default async function AdminResourcesPage() {
  await requirePortalRole('admin');
  const data = await listFlexibleResourceManagerData();

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Resources</h1>
          <p className="admin-page-subtitle">
            Add batch, Section, event or standalone resources without fake sessions. Released resources stay available, and recordings and Session materials remain event-owned within one batch.
          </p>
        </div>
      </div>
      <ResourceManager {...data} />
    </div>
  );
}
