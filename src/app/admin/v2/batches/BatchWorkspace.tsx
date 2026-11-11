'use client';
import { useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, type V2TemplateDraft } from '@/lib/v2Templates';
import type { V2Publication } from '@/lib/v2Publications';
import NewLiveBatch from './NewLiveBatch';
import styles from './batchWorkspace.module.css';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';
import PublicationScopePanel from './PublicationScopePanel';

type Props = { drafts: V2BatchDraft[]; templates: V2TemplateDraft[]; publications: V2Publication[]; ownerId: string; initialBatchId?: string; outlineOpen?: boolean; initialSessionKey?: string; reviewOpen?: boolean };
export default function BatchWorkspace({ drafts, templates, publications, ownerId, initialBatchId, outlineOpen = false, initialSessionKey, reviewOpen = false }: Props) {
  const [active, setActive] = useState<V2BatchDraft | null | undefined>(() => drafts.find(batch => batch.id === initialBatchId));
  const [tab, setTab] = useState<'edit' | 'publish'>(reviewOpen ? 'publish' : 'edit');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
  const { confirmLeave } = useAdminDraftNavigation();
  function open(batch: typeof active) { if (confirmLeave()) { setActive(batch); setTab('edit'); } }
  const current = active ? drafts.find(batch => batch.id === active.id && batch.revision > active.revision) ?? active : null;
  const matches = drafts.filter(batch => batch.productCode !== 'full_course' && batch.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (publications.some(item => item.batchId === batch.id && item.state === 'published') ? filter === 'published' : filter === 'draft')));
  function rows(batches: V2BatchDraft[]) {
    return batches.map(batch => {
      const published = publications.find(item => item.batchId === batch.id);
      return <article key={batch.id} className="workflow-batch-row"><div><h2>{batch.title}</h2><p className="workflow-muted">{V2_TEMPLATE_PRODUCTS[batch.productCode].label} · {batch.events.filter(event => event.kind !== 'outline').length} live classes</p><span className="workflow-pill">{published?.state === 'published' ? (published.batchRevision === batch.revision ? 'Published' : 'Published · draft changes') : published ? 'Unpublished' : 'Draft'}</span></div><button className="btn btn-secondary" onClick={() => open(batch)}>Open batch</button></article>;
    });
  }
  return <div className={styles.workspace}><div className="admin-page-header"><div><h1 className="admin-page-title">{active === undefined ? 'Batches' : current?.title ?? 'Create a live batch'}</h1><p className="admin-page-subtitle">Schedule every live class, then review the batch before publishing. All times are IST.</p></div>{active === undefined && <button className="btn btn-primary" onClick={() => open(null)}>Create batch</button>}</div>
    {active === undefined ? <>
      <div className={styles.toolbar}><div className="workflow-tabs" role="group" aria-label="Batch status">{(['all', 'draft', 'published'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'draft' ? 'Draft' : 'Published'}</button>)}</div>
      <label className="workflow-search">Find a batch<input type="search" placeholder="Search batch title" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      <section className={`admin-card ${styles.batchList}`} aria-label="Live batches">{rows(matches.filter(batch => batch.events.some(event => event.kind !== 'outline')))}{!matches.some(batch => batch.events.some(event => event.kind !== 'outline')) && <div className={styles.empty}><span aria-hidden="true">▦</span><h2>{search || filter !== 'all' ? 'No matching batches' : 'Plan the next live batch'}</h2><p>{search || filter !== 'all' ? 'Try another name or choose All.' : 'Choose a subject, set class dates and review before publishing.'}</p>{(search || filter !== 'all') && <button type="button" className="btn btn-secondary" onClick={() => {setSearch('');setFilter('all');}}>Clear filters</button>}</div>}</section>
      <p className="workflow-muted">Recordings and readings are managed in <Link href="/admin/v2/content">Course content</Link>; an additional live batch is not required.</p>
      <details className="workflow-secondary"><summary>Existing recording libraries</summary><p>Previously published libraries remain available for maintenance. Their content can be edited from Course content.</p>{rows(matches.filter(batch => !batch.events.some(event => event.kind !== 'outline')))}</details>
      <details className="workflow-secondary"><summary>Other batch tools</summary><div className="workflow-actions"><Link href="/admin/v2/templates">Course templates</Link><Link href="/admin/courses">Legacy batches</Link></div><details><summary>Publish across several offerings</summary><p>The complete impact across named courses is reviewed before confirmation.</p><PublicationScopePanel subjectsOnly ownerId={ownerId} /></details></details>
    </> : <>
      <button className="btn btn-secondary" onClick={() => open(undefined)}>← All batches</button>
      {current && <><div className="workflow-tabs" aria-label="Batch task"><button aria-pressed={tab === 'edit'} onClick={() => { if (confirmLeave()) setTab('edit'); }}>Course & schedule</button><button aria-pressed={tab === 'publish'} onClick={() => { if (confirmLeave()) setTab('publish'); }}>Review & publish</button></div>
        <details className="workflow-secondary"><summary>Students & class management</summary><div className="workflow-actions"><Link href={`/admin/v2/batches/${current.id}/students`}>Students & enrollment</Link>{current.events.some(event => event.kind !== 'outline') && <><Link href={`/admin/v2/batches/${current.id}/live`}>Mark classes complete & manage registration</Link><Link href={`/admin/v2/batches/${current.id}/meeting`}>Private meeting details</Link></>}</div></details></>}
      {!current ? <NewLiveBatch templates={templates} drafts={drafts} ownerId={ownerId} onSaved={setActive} /> : tab === 'edit' ? <BatchDraftEditor key={current?.id ?? 'new'} focused outlineOpen={outlineOpen} initialSessionKey={initialSessionKey} initialDraft={current} drafts={drafts} templates={templates} ownerId={ownerId} onSaved={setActive} /> : current && <PublicationPanel key={current.id} drafts={[current]} publications={publications} ownerId={ownerId} />}
    </>}
  </div>;
}
