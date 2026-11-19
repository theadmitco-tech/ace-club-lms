'use client';
import { useRef, useState } from 'react';
import { archiveBatch } from './archive-actions';
import { Button, Input, SearchField } from 'react-aria-components';
import { AdminDraftLink as Link, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, type V2TemplateDraft } from '@/lib/v2Templates';
import type { V2Publication } from '@/lib/v2Publications';
import NewLiveBatch from './NewLiveBatch';
import styles from './batchWorkspace.module.css';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';

type Props = { archives?: {batchId:string;revision:number;archived:boolean}[]|null; drafts: V2BatchDraft[]; templates: V2TemplateDraft[]; publications: V2Publication[]; ownerId: string; initialBatchId?: string; outlineOpen?: boolean; initialSessionKey?: string; reviewOpen?: boolean };
type Task = 'schedule' | 'edit' | 'publish';
function subjectLabel(batch: V2BatchDraft) {
  return batch.productCode === 'full_course' ? 'Quant · Verbal · DI' : V2_TEMPLATE_PRODUCTS[batch.productCode].label;
}
function statusLabel(batch: V2BatchDraft, publication?: V2Publication) {
  return publication?.state === 'published'
    ? publication.batchRevision === batch.revision ? 'Published' : 'Published · draft changes'
    : publication ? 'Unpublished' : 'Draft';
}
function dateLabel(value: string | null, options: Intl.DateTimeFormatOptions) {
  return value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value)) : 'Date to be set';
}
export default function BatchWorkspace({ archives = [], drafts, templates, publications, ownerId, initialBatchId, outlineOpen = false, initialSessionKey, reviewOpen = false }: Props) {
  const [active, setActive] = useState<V2BatchDraft | null | undefined>(() => drafts.find(batch => batch.id === initialBatchId));
  const [tab, setTab] = useState<Task>(reviewOpen ? 'publish' : outlineOpen || initialSessionKey ? 'edit' : 'schedule');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [archiveBusy,setArchiveBusy]=useState(false);
  const [archiveError,setArchiveError]=useState('');
  const archiveRequests=useRef(new Map<string,string>());
  async function changeArchive(batch:V2BatchDraft, archived:boolean) {
    if(archiveBusy||!archives)return;
    if(!window.confirm(archived?`Archive “${batch.title}”? It will be hidden from students. Enrollment and payment history will be kept. It can be restored later.`:`Restore “${batch.title}”? It will return as a private batch. Publishing is a separate step.`))return;
    const key=batch.id+':'+archived;
    if(!archiveRequests.current.has(key))archiveRequests.current.set(key,crypto.randomUUID());
    setArchiveBusy(true);setArchiveError('');
    try {
      const result=await archiveBatch({batchId:batch.id,archived,revision:archives.find(a=>a.batchId===batch.id)?.revision??0,draft:batch.revision,publication:publications.find(p=>p.batchId===batch.id)?.revision??0,requestId:archiveRequests.current.get(key)!});
      if(result.error)setArchiveError(result.error);else window.location.reload();
    } catch {setArchiveError('The change could not be confirmed. Retry the same action.');}
    finally {setArchiveBusy(false);}
  }
  const heading = useRef<HTMLHeadingElement>(null);
  const { confirmLeave } = useAdminDraftNavigation();
  function open(batch: typeof active) {
    if (!confirmLeave()) return;
    setActive(batch); setTab('schedule'); setNotice('');
    requestAnimationFrame(() => heading.current?.focus());
  }
  function saved(batch: V2BatchDraft) { setActive(batch); setNotice('Draft saved. Review & publish when ready.'); if (!outlineOpen && !initialSessionKey) setTab('schedule'); }
  function task(next: Task) { if (confirmLeave()) { setTab(next); setNotice(''); } }
  const current = active ? drafts.find(batch => batch.id === active.id && batch.revision > active.revision) ?? active : null;
  const publication = current ? publications.find(item => item.batchId === current.id) : undefined;
  const liveBatches = drafts.filter(batch => batch.events.some(event => event.kind !== 'outline'));
  const archivedIds=new Set(archives?.filter(a=>a.archived).map(a=>a.batchId));
  const activeBatches=liveBatches.filter(batch=>!archivedIds.has(batch.id));
  const publishedCount = activeBatches.filter(batch => publications.some(item => item.batchId === batch.id && item.state === 'published')).length;
  const matches = liveBatches.filter(batch => {
    const published = publications.find(item => item.batchId === batch.id)?.state === 'published';
    return (filter==='archived'?archivedIds.has(batch.id):!archivedIds.has(batch.id)) && `${batch.title} ${subjectLabel(batch)}`.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === 'all' || filter==='archived' || (filter === 'published' ? published : !published));
  });
  const classes = current?.events.filter(event => event.kind !== 'outline').toSorted((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '')) ?? [];
  return <div className={styles.workspace}>
    {active !== undefined && <button className={styles.back} onClick={() => open(undefined)}>← All batches</button>}
    <header className={styles.pageHeader}>
      <div><h1 ref={heading} tabIndex={-1} className="admin-page-title">{active === undefined ? 'Batches' : current?.title ?? 'Create a live batch'}</h1>
        <p className="admin-page-subtitle">{active === undefined ? 'Manage live classes and the students attending them.' : current ? `${subjectLabel(current)} · ${classes.length} live ${classes.length === 1 ? 'class' : 'classes'} · All times IST` : 'Name the batch and add its live classes. Save privately before publishing.'}</p>
      </div>
      {active === undefined ? <button className="btn btn-primary" onClick={() => open(null)}>Create batch</button> : current && <span className={styles.status} data-published={publication?.state === 'published'} data-changed={publication?.state === 'published' && publication.batchRevision !== current.revision}>{statusLabel(current, publication)}</span>}
    </header>
    {archiveError&&<p role="alert">{archiveError}</p>}{archives===null&&<p role="status">Batch archiving needs the staging database update before it can be used.</p>}
    {notice && <p role="status" className={styles.savedNotice}>{notice}</p>}
    {active === undefined ? <>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Batch status">{(['all', 'draft', 'published', 'archived'] as const).map(value => {
          const label = value === 'all' ? 'All batches' : value === 'draft' ? 'Not published' : value==='archived'?'Archived':'Published';
          return <button key={value} aria-label={label} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span className={styles.filterCount} aria-hidden="true">{value === 'archived'?liveBatches.length-activeBatches.length:value === 'all' ? activeBatches.length : value === 'published' ? publishedCount : activeBatches.length - publishedCount}</span></button>;
        })}</div>
        <SearchField className={styles.batchSearch} aria-label="Find a batch" value={search} onChange={setSearch}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <Input placeholder="Find a batch…" />
          <Button aria-label="Clear batch search"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m6 6 12 12M6 18 18 6"/></svg></Button>
        </SearchField>
      </div>
      <p className={styles.resultCount} role="status">{matches.length} {matches.length === 1 ? 'batch' : 'batches'}{search.trim() ? ` matching “${search.trim()}”` : filter === 'published' ? ' published' : filter === 'draft' ? ' not published' : ''}</p>
      <section className={styles.batchList} aria-label="Live batches">
        {matches.map(batch => {
          const savedPublication = publications.find(item => item.batchId === batch.id);
          const events = batch.events.filter(event => event.kind !== 'outline');
          const dates = events.flatMap(event => event.startsAt ? [event.startsAt] : []).sort();
          return <article key={batch.id} className={styles.batchRow}>
            <div className={styles.batchInfo}><h2>{batch.title}</h2><p>{subjectLabel(batch)} <span aria-hidden="true">·</span> {events.length} live {events.length === 1 ? 'class' : 'classes'}</p>
              <p className={styles.dates}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>{dates.length ? `${dateLabel(dates[0], { day: 'numeric', month: 'short', year: 'numeric' })}${dates.length > 1 ? ` – ${dateLabel(dates.at(-1)!, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : 'Dates to be set'}</p>
            </div>
            <span className={styles.status} data-published={savedPublication?.state === 'published'} data-changed={savedPublication?.state === 'published' && savedPublication.batchRevision !== batch.revision}>{archivedIds.has(batch.id)?'Archived':statusLabel(batch, savedPublication)}</span>
            <div className={styles.rowActions}><button className="btn btn-secondary" aria-label={`Open batch: ${batch.title}`} onClick={() => open(batch)}>Open batch <span aria-hidden="true">→</span></button><button type="button" disabled={archiveBusy||archives===null} className={styles.archiveButton} aria-label={`${archivedIds.has(batch.id)?'Restore':'Archive'} batch: ${batch.title}`} onClick={()=>void changeArchive(batch,!archivedIds.has(batch.id))}>{archivedIds.has(batch.id)?'Restore':'Archive batch'}</button></div>
          </article>;
        })}
        {!matches.length && <div className={styles.empty}><h2>{search || filter !== 'all' ? 'No matching batches' : 'Plan the next live batch'}</h2><p>{search || filter !== 'all' ? 'Try another name or clear the filters.' : 'Start with a batch name and the live classes to schedule.'}</p>{(search || filter !== 'all') && <button type="button" className="btn btn-secondary" onClick={() => {setSearch('');setFilter('all');}}>Clear filters</button>}</div>}
      </section>
      <p className={styles.contentLink}>Looking for readings or recordings? <Link href="/admin/v2/content">Open course content →</Link></p>
    </> : !current ? <NewLiveBatch templates={templates} drafts={drafts} ownerId={ownerId} onSaved={saved} /> : <>
      <div className={styles.batchNav}>
        <div className={styles.filters} role="group" aria-label="Batch task">
          <button aria-pressed={tab === 'schedule' || tab === 'edit'} onClick={() => task('schedule')}>Live schedule</button>
          <button aria-pressed={tab === 'publish'} onClick={() => task('publish')}>Review & publish</button>
        </div>
        <nav className={styles.management} aria-label="Manage this batch">
          <Link href={`/admin/v2/batches/${current.id}/students`}>Students</Link>
          {!!classes.length && <><Link href={`/admin/v2/batches/${current.id}/meeting`}>Meeting links</Link><Link href={`/admin/v2/batches/${current.id}/live`}>Class completion</Link></>}
        </nav>
      </div>
      {tab === 'schedule' ? <section className={styles.schedule} aria-labelledby="live-schedule-title">
        <div className={styles.scheduleHeader}><div><h2 id="live-schedule-title">Live classes</h2><p>{publication?.state === 'published' && publication.batchRevision !== current.revision ? 'Saved draft shown below. Review and publish to update the student schedule.' : publication?.state === 'published' ? 'The published schedule for this batch.' : 'This schedule is private until published.'}</p></div><button className="btn btn-secondary" onClick={() => task('edit')}>Edit schedule</button></div>
        {classes.length ? <ol className={styles.timetable}>{classes.map(event => <li key={event.key}>
          <div className={styles.classDate}><strong>{dateLabel(event.startsAt, { day: 'numeric', month: 'short' })}</strong><span>{dateLabel(event.startsAt, { weekday: 'short', year: 'numeric' })}</span></div>
          <div className={styles.classInfo}><h3>{event.title}</h3><span>{V2_TEMPLATE_PRODUCTS[event.section].label}{event.instructor ? ` · ${event.instructor}` : ''}</span></div>
          <div className={styles.classTime}><strong><time dateTime={event.startsAt ?? undefined}>{event.startsAt ? dateLabel(event.startsAt, { hour: 'numeric', minute: '2-digit' }) : 'Time to be set'}</time></strong><span>{event.durationMinutes ? `${event.durationMinutes} min` : ''}</span></div>
        </li>)}</ol> : <p className={styles.help}>No live classes have been added.</p>}
      </section> : tab === 'edit' ? <BatchDraftEditor key={current.id} focused outlineOpen={outlineOpen} initialSessionKey={initialSessionKey} initialDraft={current} drafts={drafts} templates={templates} ownerId={ownerId} onSaved={saved} /> : <PublicationPanel key={current.id} focused onBack={() => setTab('schedule')} drafts={[current]} publications={publications} ownerId={ownerId} />}
    </>}
  </div>;
}
