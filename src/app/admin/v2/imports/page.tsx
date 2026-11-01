import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { listContentImportWorkspace } from '@/lib/server/v2ContentImports';
import ImportWorkspace from './ImportWorkspace';
export default async function ContentImportsPage() {
  if (!isV2TemplateAuthoringEnabled() && process.env.VERCEL_ENV !== 'preview') notFound();
  await requirePortalRole('admin');
  const workspace = await listContentImportWorkspace();
  return <div>
    <Link href="/admin/v2/templates">← Course content</Link>
    <h1 className="admin-page-title">Existing material & shared recordings</h1>
    <p className="admin-page-subtitle">Reviewed material transfers create private course drafts. Shared asset replacements apply only to selected courses.</p>
    {workspace ? <ImportWorkspace workspace={workspace} /> : <div className="admin-card" role="status">Content transfer is awaiting staging setup. Existing material remains available through its current course.</div>}
  </div>;
}
