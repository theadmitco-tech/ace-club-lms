'use client';
import { useRef, useState } from 'react';
import { archiveBatch } from './archive-actions';
import { Button, Input, SearchField } from 'react-aria-components';
import { AdminDraftLink as Link, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, type V2TemplateDraft } from '@/lib/v2Templates';
import type { V2Publication } from '@/lib/v2Publications';
import NewLiveBatch from './NewLiveBatch';
import BatchSetupSteps, { batchSteps } from './BatchSetupSteps';
import styles from './batchWorkspace.module.css';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';

/** Live-course registration closes at eight students (approved decision C1). */
export const LIVE_SEAT_LIMIT = 8;
export type BatchRoster = { enrolled: number | null; liveSeats: number | null; meetLinks?: string[] | null; completed?: string[] | null };
type Props = { rosters?: Record<string, BatchRoster>; archives?: {batchId:string;revision:number;archived:boolean}[]|null; drafts: V2BatchDraft[]; templates: V2TemplateDraft[]; publications: V2Publication[]; ownerId: string; initialBatchId?: string; outlineOpen?: boolean; initialSessionKey?: string; reviewOpen?: boolean };
type Task = 'schedule' | 'edit' | 'publish';
function subjectLabel(batch: V2BatchDraft) {
  return batch.productCode === 'full_course' ? 'Full Course · Quant, Verbal, DI' : V2_TEMPLATE_PRODUCTS[batch.productCode].label;
}
function RosterSummary({ roster }: { roster?: BatchRoster }) {
  if (!roster) return null;
  const full = roster.liveSeats !== null && roster.liveSeats >= LIVE_SEAT_LIMIT;
  return <p className={styles.roster}>
    <span>{roster.enrolled === null ? 'Enrollment unavailable' : `${roster.enrolled} enrolled`}</span>
    <span aria-hidden="true">·</span>
    <span data-full={full || undefined}>{roster.liveSeats === null ? 'Live seats unavailable' : `${roster.liveSeats} / ${LIVE_SEAT_LIMIT} live seats${full ? ' · Full' : ''}`}</span>
  </p>;
}
/** Per-class readiness: a private Meet link and, once the class has ended, completion. */
function ClassStatus({ batchId, eventKey, title, startsAt, durationMinutes, published, roster, now }: { batchId: string; eventKey: string; title: string; startsAt: string | null; durationMinutes: number | null; published: boolean; roster?: BatchRoster; now: number }) {
  const ended = !!startsAt && Date.parse(startsAt) + (durationMinutes ?? 0) * 60000 < now;
  const completed = roster?.completed?.includes(eventKey);
  const linked = roster?.meetLinks?.includes(eventKey);
  return <div className={styles.classStatus}>
    {completed ? <span data-tone="ok">Completed</span>
      : ended && published ? <Link className={styles.rowAction} data-primary href={`/admin/v2/batches/${batchId}/live`} prefetch={false} aria-label={`Mark complete: ${title}`}>Mark complete</Link>
      : ended ? <span data-tone="muted">Ended</span>
      : roster?.meetLinks && !linked ? <Link className={styles.rowAction} href={`/admin/v2/batches/${batchId}/meeting`} prefetch={false} aria-label={`Add Meet link: ${title}`}>Add Meet link</Link>
      : roster?.meetLinks && linked ? <span data-tone="ok">Meet link ready</span>
      : <span data-tone="muted">Upcoming</span>}
  </div>;
}
function OverviewTiles({ classes, roster, now }: { classes: V2BatchDraft['events']; roster?: BatchRoster; now: number }) {
  const upcoming = classes.find(event => event.startsAt && Date.parse(event.startsAt) + (event.durationMinutes ?? 0) * 60000 >= now);
  const dated = classes.filter(event => event.startsAt).length;
  const seats = roster?.liveSeats ?? null;
  return <dl className={styles.tiles}>
    <div><dt>Next class</dt><dd>{upcoming?.startsAt ? <><strong>{dateLabel(upcoming.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{dateLabel(upcoming.startsAt, { hour: 'numeric', minute: '2-digit' })} · {upcoming.title}</span></> : <><strong>None scheduled</strong><span>{classes.length ? 'All classes have ended' : 'Add live classes'}</span></>}</dd></div>
    <div><dt>Live classes</dt><dd><strong>{classes.length}</strong><span>{dated === classes.length ? (classes.length ? 'All dated' : 'None yet') : `${classes.length - dated} without a date`}</span></dd></div>
    <div><dt>Students</dt><dd><strong>{roster?.enrolled ?? '—'}</strong><span>{roster?.enrolled == null ? 'Unavailable' : 'enrolled'}</span></dd></div>
    <div><dt>Live seats</dt><dd><strong>{seats ?? '—'}<small> / {LIVE_SEAT_LIMIT}</small></strong>{seats === null ? <span>Unavailable</span> : <><span>{seats >= LIVE_SEAT_LIMIT ? 'Full' : `${LIVE_SEAT_LIMIT - seats} open`}</span><meter min={0} max={LIVE_SEAT_LIMIT} value={seats} aria-label="Live seats taken" /></>}</dd></div>
  </dl>;
}
function statusLabel(batch: V2BatchDraft, publication?: V2Publication) {
  return publication?.state === 'published'
    ? publication.batchRevision === batch.revision ? 'Published' : 'Published · draft changes'
    : publication ? 'Unpublished' : 'Draft';
}
function dateLabel(value: string | null, options: Intl.DateTimeFormatOptions) {
  return value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value)) : 'Date to be set';
}
export default function BatchWorkspace({ rosters = {}, archives = [], drafts, templates, publications, ownerId, initialBatchId, outlineOpen = false, initialSessionKey, reviewOpen = false }: Props) {
  const [active, setActive] = useState<V2BatchDraft | null | undefined>(() => drafts.find(batch => batch.id === initialBatchId));
  const [tab, setTab] = useState<Task>(reviewOpen ? 'publish' : outlineOpen || initialSessionKey ? 'edit' : 'schedule');
  const [search, setSearch] = useState('');
  const [now] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [archiveBusy,setArchiveBusy]=useState(false);
  const [archiveError,setArchiveError]=useState('');
  const archiveRequests=useRef(new Map<string,string>());
  const [archivePrompt,setArchivePrompt]=useState<{batch:V2BatchDraft;archived:boolean}|null>(null);
  async function changeArchive(batch:V2BatchDraft, archived:boolean) {
    if(archiveBusy||!archives)return;
    setArchivePrompt(null);
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
  function saved(batch: V2BatchDraft) { setActive(batch); setNotice('Draft saved. Follow the steps below to get this batch ready for students.'); if (!outlineOpen && !initialSessionKey) setTab('schedule'); }
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
        <p className="admin-page-subtitle">{active === undefined ? 'Manage live classes and the students attending them.' : current ? `${subjectLabel(current)} · All times IST` : 'Choose a subject and schedule its course sessions. Save privately before publishing.'}</p>
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
            <div className={styles.batchInfo}><h2>{batch.title}</h2><p>{subjectLabel(batch)} <span aria-hidden="true">·</span> {events.length} live {events.length === 1 ? 'class' : 'classes'}</p><RosterSummary roster={rosters[batch.id]} />
              <p className={styles.dates}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>{dates.length ? `${dateLabel(dates[0], { day: 'numeric', month: 'short', year: 'numeric' })}${dates.length > 1 ? ` – ${dateLabel(dates.at(-1)!, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` : 'Dates to be set'}</p>
            </div>
            <span className={styles.status} data-published={savedPublication?.state === 'published'} data-changed={savedPublication?.state === 'published' && savedPublication.batchRevision !== batch.revision}>{archivedIds.has(batch.id)?'Archived':statusLabel(batch, savedPublication)}</span>
            <div className={styles.rowActions}><button className="btn btn-secondary" aria-label={`Open batch: ${batch.title}`} onClick={() => open(batch)}>Open batch <span aria-hidden="true">→</span></button><button type="button" disabled={archiveBusy||archives===null} className={styles.archiveButton} aria-label={`${archivedIds.has(batch.id)?'Restore':'Archive'} batch: ${batch.title}`} onClick={()=>setArchivePrompt({batch,archived:!archivedIds.has(batch.id)})}>{archivedIds.has(batch.id)?'Restore':'Archive batch'}</button></div>
            {archivePrompt?.batch.id===batch.id && <div className={styles.archivePrompt} role="alertdialog" aria-label={`${archivePrompt.archived?'Archive':'Restore'} ${batch.title}`}>
              <p>{archivePrompt.archived?'Archiving hides this batch from students. Enrollment and payment history are kept, and it can be restored later.':'Restoring returns this batch as a private draft. Publishing is a separate step.'}</p>
              <button type="button" className="btn btn-primary" disabled={archiveBusy} onClick={()=>void changeArchive(batch,archivePrompt.archived)}>{archivePrompt.archived?'Archive batch':'Restore batch'}</button>
              <button type="button" className="btn btn-secondary" disabled={archiveBusy} onClick={()=>setArchivePrompt(null)}>Cancel</button>
            </div>}
          </article>;
        })}
        {!matches.length && <div className={styles.empty}><h2>{search || filter !== 'all' ? 'No matching batches' : 'Plan the next live batch'}</h2><p>{search || filter !== 'all' ? 'Try another name or clear the filters.' : 'Start with a batch name and the live classes to schedule.'}</p>{(search || filter !== 'all') && <button type="button" className="btn btn-secondary" onClick={() => {setSearch('');setFilter('all');}}>Clear filters</button>}</div>}
      </section>
      <p className={styles.contentLink}>Looking for readings or recordings? <Link href="/admin/v2/content">Open course content →</Link></p>
    </> : !current ? <NewLiveBatch templates={templates} drafts={drafts} ownerId={ownerId} onSaved={saved} /> : <>
      <nav className={styles.batchTabs} aria-label="Manage this batch">
        <button type="button" aria-current={tab === 'schedule' ? 'page' : undefined} onClick={() => task('schedule')}>Overview</button>
        <button type="button" aria-current={tab === 'edit' ? 'page' : undefined} onClick={() => task('edit')}>Edit schedule</button>
        <button type="button" aria-current={tab === 'publish' ? 'page' : undefined} onClick={() => task('publish')}>Review &amp; publish</button>
        <span className={styles.tabDivider} aria-hidden="true" />
        <Link href={`/admin/v2/batches/${current.id}/students`}>Students</Link>
        <Link href={`/admin/v2/batches/${current.id}/mocks`}>Mocks</Link>
        {!!classes.length && <><Link href={`/admin/v2/batches/${current.id}/meeting`}>Meeting links</Link><Link href={`/admin/v2/batches/${current.id}/live`}>Live seats &amp; completion</Link></>}
      </nav>
      {tab === 'schedule' && <OverviewTiles classes={classes} roster={rosters[current.id]} now={now} />}
      {tab === 'schedule' && <BatchSetupSteps steps={batchSteps(current, publication, rosters[current.id], LIVE_SEAT_LIMIT, () => task('edit'), () => task('publish'))} />}
      {tab === 'schedule' ? <section className={styles.schedule} aria-labelledby="live-schedule-title">
        <div className={styles.scheduleHeader}><div><h2 id="live-schedule-title">Live classes</h2><p>{publication?.state === 'published' && publication.batchRevision !== current.revision ? 'Showing saved changes that students do not see yet.' : publication?.state === 'published' ? 'Students with access see this schedule.' : 'Private until published.'}</p></div></div>
        {classes.length ? <ol className={styles.timetable}>{classes.map(event => <li key={event.key}>
          <div className={styles.classDate}><strong>{dateLabel(event.startsAt, { day: 'numeric', month: 'short' })}</strong><span>{event.startsAt ? dateLabel(event.startsAt, { weekday: 'short' }) : ''}</span></div>
          <div className={styles.classInfo}><h3>{event.title}</h3><span>{V2_TEMPLATE_PRODUCTS[event.section].label}<span aria-hidden="true"> · </span><time dateTime={event.startsAt ?? undefined}>{event.startsAt ? dateLabel(event.startsAt, { hour: 'numeric', minute: '2-digit' }) : 'Time to be set'}</time>{event.durationMinutes ? ` · ${event.durationMinutes} min` : ''}{event.instructor ? ` · ${event.instructor}` : ''}</span></div>
          <ClassStatus batchId={current.id} eventKey={event.key} title={event.title} startsAt={event.startsAt} durationMinutes={event.durationMinutes} published={publication?.state === 'published'} roster={rosters[current.id]} now={now} />
        </li>)}</ol> : <p className={styles.help}>No live classes yet. Use Edit schedule to add them.</p>}
      </section> : tab === 'edit' ? <BatchDraftEditor key={current.id} focused outlineOpen={outlineOpen} initialSessionKey={initialSessionKey} initialDraft={current} drafts={drafts} templates={templates} ownerId={ownerId} onSaved={saved} /> : <PublicationPanel key={current.id} focused onBack={() => setTab('schedule')} drafts={[current]} publications={publications} ownerId={ownerId} meetLinks={rosters[current.id]?.meetLinks ?? null} enrolled={rosters[current.id]?.enrolled ?? null} />}
    </>}
  </div>;
}
