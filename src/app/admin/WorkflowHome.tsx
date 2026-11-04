import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { readContentWorkspace } from '@/lib/server/v2ContentPublishing';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2BatchPublications } from '@/lib/server/v2Publications';

export default async function WorkflowHome() {
  const [content, batches, publications] = await Promise.all([readContentWorkspace(), listV2BatchDrafts(), listV2BatchPublications()]);
  const drafts = content?.items.filter(item => !item.deleted && item.draft_revision !== item.published_revision) ?? [];
  const upcoming = publications.publications.filter(item => item.state === 'published').flatMap(batch => batch.events.filter(event => event.startsAt && Date.parse(event.startsAt) > Date.now()).map(event => ({ batch, event }))).sort((a,b) => Date.parse(a.event.startsAt!) - Date.parse(b.event.startsAt!)).slice(0,3);
  return <div><p className="workflow-kicker">Admin workspace</p><div className="admin-page-header"><div><h1 className="admin-page-title">A clear place to start</h1><p className="admin-page-subtitle">Update a resource, prepare a batch or help a student.</p></div><Link className="btn btn-primary" href="/admin/v2/content">Open course content</Link></div>
    {(!content || batches.status !== 'ready' || publications.status !== 'ready') && <p role="alert" className="workflow-error">Some workspace information could not be loaded. Reload to retry; the task links remain available.</p>}
    <div className="workflow-grid">
      <section className="admin-card"><p className="workflow-kicker">Content</p><h2>Continue editing</h2>{drafts.length ? <ul className="workflow-list">{drafts.slice(0,3).map(item => <li key={item.id}><Link href={`/admin/v2/content?item=${item.id}`}>{item.document.title}</Link><small>Saved draft · changes awaiting publication</small></li>)}</ul> : <p>{content ? 'No saved resource changes are waiting for publication.' : 'Saved changes are currently unavailable.'}</p>}<Link href="/admin/v2/content">Browse courses →</Link></section>
      <section className="admin-card"><p className="workflow-kicker">Batches</p><h2>Upcoming live classes</h2>{upcoming.length ? <ul className="workflow-list">{upcoming.map(({batch,event}) => <li key={`${batch.batchId}:${event.key}`}><Link href={`/admin/v2/batches/${batch.batchId}/live`}>{event.title}</Link><small>{batch.title} · {new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(event.startsAt!))} IST</small></li>)}</ul> : <p>{publications.status === 'ready' ? 'No upcoming published live classes.' : 'Published classes are currently unavailable.'}</p>}<Link href="/admin/v2/batches">Manage batches →</Link></section>
      <section className="admin-card"><p className="workflow-kicker">People</p><h2>Help a student</h2><p>Check course access and expiry, then open the relevant batch to manage enrollment or live registration.</p><Link href="/admin/v2/students">Find a student →</Link></section>
      <section className="admin-card"><p className="workflow-kicker">Prepare</p><h2>Build the next course</h2><p>Arrange the reusable curriculum before creating a batch. Template changes do not change existing published courses.</p><Link href="/admin/v2/templates">Open course templates →</Link></section>
    </div><p className="workflow-muted">Drafts stay private until publication is reviewed and confirmed. Existing workspaces, imports and pricing are available under More tools.</p>
  </div>;
}
