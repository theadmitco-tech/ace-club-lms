import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2TemplateDrafts } from '@/lib/server/v2Templates';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';
import { listV2BatchPublications } from '@/lib/server/v2Publications';

export default async function V2BatchesPage() {
  if (!isV2BatchAuthoringEnabled()) notFound();
  await requirePortalRole('admin');
  const [batches, templates, publications] = await Promise.all([listV2BatchDrafts(), listV2TemplateDrafts(), listV2BatchPublications()]);
  return <div>
    <h1 className="admin-page-title">V2 batch drafts</h1>
    <p className="admin-page-subtitle">Review an independent schedule before saving. Draft batches remain private to Admins.</p>
    <Link href="/admin/v2/templates" prefetch={false}>Manage course templates</Link>
    {batches.status === 'ready' && templates.status === 'ready'
      ? <>
        <BatchDraftEditor drafts={batches.drafts} templates={templates.templates} />
        {publications.status === 'ready' ? <PublicationPanel drafts={batches.drafts} publications={publications.publications} />
          : <div className="admin-card" role="alert">Publication history could not be loaded. Check the reviewed staging setup and reload before publishing.</div>}
      </>
      : <div className="admin-card" role="alert">
        <p>Batch drafts could not be loaded. Check staging setup and Admin access before retrying.</p>
        <Link href="/admin/v2/batches" prefetch={false}>Retry loading drafts</Link>
      </div>}
  </div>;
}
