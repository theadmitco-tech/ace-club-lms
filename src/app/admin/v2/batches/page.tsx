import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import BatchWorkspace from './BatchWorkspace';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2TemplateDrafts } from '@/lib/server/v2Templates';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';
import PublicationScopePanel from './PublicationScopePanel';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import styles from '../templates/templates.module.css';

export default async function V2BatchesPage({searchParams}:{searchParams:Promise<{batch?:string;outline?:string;session?:string;review?:string}>}) {
  const previewWorkspace = process.env.VERCEL_ENV === 'preview';
  if (!isV2BatchAuthoringEnabled() && !previewWorkspace) notFound();
  const identity = await requirePortalRole('admin');
  const query = await searchParams ?? {};
  const [batches, templates, publications] = await Promise.all([listV2BatchDrafts(), listV2TemplateDrafts(), listV2BatchPublications()]);
  if (isV2ContentPublishingEnabled() && batches.status === 'ready' && templates.status === 'ready' && publications.status === 'ready') return <BatchWorkspace reviewOpen={query.review==='1'} initialSessionKey={query.session} initialBatchId={query.batch} outlineOpen={query.outline==='1'} drafts={batches.drafts} templates={templates.templates} publications={publications.publications} ownerId={identity.id}/>;
  return <div>
    <h1 className="admin-page-title">V2 batch drafts</h1>
    <p className="admin-page-subtitle">Review course content and its optional independent live schedule before saving. Draft batches remain private to Admins.</p>
    <Link href="/admin/v2/templates" prefetch={false}>Manage course templates</Link>
    {(batches.status === 'ready' && templates.status === 'ready') || previewWorkspace
      ? <>
        <BatchDraftEditor key={identity.id} ownerId={identity.id} drafts={batches.drafts} templates={templates.templates} setupPending={batches.status !== 'ready' || templates.status !== 'ready'} />
        {isV2StudentScheduleEnabled() && <section className={styles.card}><h2>Batch students</h2>
          <ul className={styles.list}>{batches.drafts.map((batch) => <li key={batch.id}><Link href={`/admin/v2/batches/${batch.id}/students`} prefetch={false}>{batch.title} — Manage students</Link> · <Link href={`/admin/v2/batches/${batch.id}/live`} prefetch={false}>Live registrations and class completion</Link></li>)}</ul>
        </section>}
        {publications.status === 'ready' && <PublicationScopePanel ownerId={identity.id} />}
        {publications.status === 'ready' ? <PublicationPanel key={identity.id} ownerId={identity.id} drafts={batches.drafts} publications={publications.publications} />
          : <div className="admin-card" role="alert">Publishing and publication history will become available after staging setup is complete.</div>}
      </>
      : <div className="admin-card" role="alert">
        <p>Batch drafts could not be loaded. Check staging setup and Admin access before retrying.</p>
        <Link href="/admin/v2/batches" prefetch={false}>Retry loading drafts</Link>
      </div>}
  </div>;
}
