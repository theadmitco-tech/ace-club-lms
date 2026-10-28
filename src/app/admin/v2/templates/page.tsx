import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { listV2TemplateDrafts } from '@/lib/server/v2Templates';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import TemplateEditor from './TemplateEditor';

export default async function V2TemplatesPage() {
  const previewWorkspace = process.env.VERCEL_ENV === 'preview';
  if (!isV2TemplateAuthoringEnabled() && !previewWorkspace) notFound();
  const identity = await requirePortalRole('admin');
  const result = await listV2TemplateDrafts();
  return (
    <div>
      <h1 className="admin-page-title">V2 course templates</h1>
      <p className="admin-page-subtitle">Draft teaching plans for Full Course and individual courses. Templates remain private to Admins.</p>
      {(isV2BatchAuthoringEnabled() || previewWorkspace) && <Link href="/admin/v2/batches" prefetch={false}>Manage batch drafts</Link>}
      {result.status === 'ready' || previewWorkspace ? <TemplateEditor key={identity.id} ownerId={identity.id} templates={result.templates} setupPending={result.status !== 'ready'} /> : (
        <div className="admin-card" role="alert">
          <p>Templates could not be loaded. Check staging setup and Admin access before retrying.</p>
          <Link href="/admin/v2/templates" prefetch={false}>Retry loading templates</Link>
        </div>
      )}
    </div>
  );
}
