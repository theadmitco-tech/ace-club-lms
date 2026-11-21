'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, SearchField, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { resourceRows } from '@/lib/adminResourceRows';
import { COURSE_README_TITLES, courseReadmeKey, courseReadmePosition, withCourseReadmes, type CourseReadmePosition } from '@/lib/v2CourseReadmes';
import ResourceList from './ResourceList';
import AddSession from './AddSession';
import DeleteSession from './DeleteSession';
import SessionName from './SessionName';
import ReorderSessions from './ReorderSessions';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { v2SessionStages } from '@/lib/v2SessionPresentation';
import type { ContentDocument, ContentItem, ContentWorkspace, CourseDraftSessions } from '@/lib/v2ContentPublishing';
import type { V2CourseSession } from '@/lib/v2Templates';
import styles from './content.module.css';

type Location = { courseId: string; sessionId: string; subject: string };
type Props = {
  workspace: ContentWorkspace; drafts: CourseDraftSessions; busy: boolean; location: Location; onLocation: (value: Location) => void;
  onChoose: (item: ContentItem | null) => void;
  onUpdated: (workspace: ContentWorkspace) => void;
  onResource: (batch: string, session: string, kind: ContentDocument['kind'], key: string | null) => void;
  onAdd: (batch: string, session: string, kind: ContentDocument['kind']) => void;
};
const subjects = [{ key: 'quant', title: 'Quant' }, { key: 'verbal', title: 'Verbal' }, { key: 'di', title: 'DI' }];

export default function CourseResourceBrowser({ workspace, drafts, busy, location, onLocation, onChoose, onResource, onAdd, onUpdated }: Props) {
  const router = useRouter();
  const [readmeEditing, setReadmeEditing] = useState<CourseReadmePosition | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const [renaming, setRenaming] = useState<string | null>(null), [adding, setAdding] = useState(false);
  const [orderReset, setOrderReset] = useState(0);
  const [reordering, setReordering] = useState(false), [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const addButton = useRef<HTMLButtonElement>(null), renameButton = useRef<HTMLButtonElement>(null);
  const [resourceTask, setResourceTask] = useState<string | null>(null);
  const locked = readmeEditing !== null || resourceTask !== null || busy || renaming !== null || adding || reordering || deleting;
  function closeTask(task: 'add' | 'rename' | 'reorder' | 'delete') {
    if (task === 'add') setAdding(false); else if (task === 'rename') setRenaming(null); else if (task === 'delete') setDeleting(false); else { setReordering(false); setOrderReset(value => value + 1); }
    requestAnimationFrame(() => (task === 'add' ? addButton : task === 'rename' ? renameButton : task === 'delete' ? deleteButton : addButton).current?.focus({ preventScroll: true }));
  }
  function draftSaved(batchId: string) {
    setSavedDrafts(previous => [...new Set([...previous, batchId])]);
    router.refresh();
  }
  const subject = subjects.find(item => item.key === location.subject) ?? subjects[0];
  const courses = workspace.courses.filter(item => item.productCode === subject.key);
  const course = courses.find(item => item.batchId === location.courseId) ?? courses[0];
  // The saved draft is the working copy: it lists unpublished sessions and the draft order.
  const draft = course ? drafts[course.batchId] : undefined;
  const publishedKeys = new Set(course?.sessions.map(item => item.key) ?? []);
  const workingSessions: V2CourseSession[] = !course ? [] : draft ? draft.sessions.map(item => course.sessions.find(published => published.key === item.key) ?? item) : course.sessions;
  const isDraftOnly = (key: string) => !!draft && !publishedKeys.has(key) && draft.sessions.some(item => item.key === key);
  const courseSessions = course ? withCourseReadmes(course.batchId, subject.key as 'quant' | 'verbal' | 'di', workingSessions).filter(item => item.section === subject.key) : [];
  const sessions = courseSessions.filter(item => !courseReadmePosition(item.key));
  const session = courseSessions.find(item => item.key === location.sessionId) ?? sessions[0] ?? courseSessions[0];
  const readmePosition = session ? courseReadmePosition(session.key) : null;
  const missingReadme = readmePosition && !workingSessions.some(item => item.key === session.key);
  const draftOnly = !!session && isDraftOnly(session.key);
  const pendingChanges = !!course && (savedDrafts.includes(course.batchId) || !!draft?.unpublished);
  const [sessionSearch, setSessionSearch] = useState('');

  const sessionTitle = (key: string, fallback: string) => course?.anchors.find(item => item.key === key)?.title ?? fallback;
  function chooseSubject(key: string) {
    onLocation({ courseId: '', sessionId: '', subject: key });
    setSessionSearch('');
  }
  function readmeEntry(position: CourseReadmePosition) {
    if (!course) return null;
    const key = courseSessions.find(item => courseReadmePosition(item.key) === position)?.key ?? courseReadmeKey(course.batchId, position);
    return <button type="button" className={styles.readmeEntry} disabled={locked} aria-current={session?.key === key ? 'true' : undefined} aria-label={`Open ${COURSE_README_TITLES[position]}`}
      onClick={() => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: key })}>
      <svg aria-hidden="true" width="17" height="19" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 2h8l4 4v14H4zM12 2v5h4M7 11h6M7 15h6"/></svg>
      <span><strong>{COURSE_README_TITLES[position]}</strong><small>Reading material · Fixed</small></span>
    </button>;
  }
  return <section className={styles.courseBrowser} aria-label="Course resources">
      <div className={styles.subjectToolbar}>
        <ToggleButtonGroup className={styles.subjects} aria-label="Subjects" selectionMode="single" disallowEmptySelection isDisabled={locked}
          selectedKeys={new Set([subject.key])} onSelectionChange={keys => { const key = [...keys][0]; if (typeof key === 'string' && key !== subject.key) chooseSubject(key); }}>
          {subjects.map(item => <ToggleButton key={item.key} id={item.key}>{item.title}</ToggleButton>)}
        </ToggleButtonGroup>
        {course && <a href={`/admin/v2/content/preview/${course.batchId}`} target="_blank" rel="noreferrer">Preview as student ↗</a>}
      </div>
      {pendingChanges && !reordering && <div className={styles.draftNotice} role="status"><span><strong>{savedDrafts.includes(course!.batchId) ? 'Session changes saved as a draft' : 'This course has unpublished changes'}</strong><small> · Students still see the published version.</small></span><Link href={`/admin/v2/content/course/${course!.batchId}`}>Review & publish →</Link></div>}
      {courses.length > 1 && <label className={styles.coursePicker}>Published library<select disabled={locked} value={course.batchId} onChange={e => { onLocation({ subject: subject.key, courseId: e.target.value, sessionId: '' }); setSessionSearch(''); }}>{courses.map(item => <option key={item.batchId} value={item.batchId}>{item.title}</option>)}</select></label>}
      {course ? <div className={styles.sessionLayout}><aside className={styles.outline} aria-label="Session outline">
        <div className={styles.outlineTitle}><h2>{subject.title}</h2><span>{sessions.length} sessions</span></div>
        <div className={styles.outlineActions}><button ref={addButton} className={styles.addSession} disabled={locked} onClick={() => setAdding(true)}>+ Add session</button></div>
        <SearchField className={styles.outlineSearch} aria-label="Find a session" isDisabled={locked} value={sessionSearch} onChange={setSessionSearch}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <Input placeholder="Find a session" />
          <Button aria-label="Clear session search"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M6 18 18 6"/></svg></Button>
        </SearchField>
        {sessionSearch.trim() && <p className={styles.searchResult} role="status">{sessions.filter(item => sessionTitle(item.key, item.title).toLowerCase().includes(sessionSearch.trim().toLowerCase())).length} matching sessions</p>}
        <label className={styles.mobileSession}>Choose a session<select disabled={locked} aria-label="Choose a session" value={session?.key ?? ''} onChange={e => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: e.target.value })}>{courseSessions.map(item => <option key={item.key} value={item.key}>{sessionTitle(item.key, item.title)}</option>)}</select></label>
        {readmeEntry('before')}
        <ReorderSessions key={`${course.batchId}:${orderReset}`} batchId={course.batchId} inline search={sessionSearch.trim()}
          disabled={busy || readmeEditing !== null || renaming !== null || adding || deleting || resourceTask !== null}
          sessions={sessions.map(item => ({ key: item.key, title: sessionTitle(item.key, item.title) + (isDraftOnly(item.key) ? ' · Draft' : '') }))} selectedKey={session?.key}
          onDirty={() => setReordering(true)} onRename={key => { onLocation({ subject: subject.key, courseId: course.batchId, sessionId: key }); setRenaming(key); }}
          onSelect={key => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: key })}
          onSaved={() => draftSaved(course.batchId)} onClose={() => closeTask('reorder')} />
        {readmeEntry('after')}

      </aside><section className={styles.sessionContent} data-reordering={reordering || undefined} aria-label={session ? `Session resources: ${session.title}` : 'Session resources'}>{adding && <AddSession batchId={course.batchId} onSaved={() => draftSaved(course.batchId)} onClose={() => closeTask('add')} />}
      {deleting && session && <DeleteSession batchId={course.batchId} sessionKey={session.key} title={sessionTitle(session.key, session.title)} sessionKeys={workingSessions.map(item => item.key)} onClose={() => closeTask('delete')} onSaved={() => draftSaved(course.batchId)} />}
      {readmeEditing && <AddSession key={readmeEditing} batchId={course.batchId} readme={readmeEditing} onSaved={() => draftSaved(course.batchId)} onClose={() => setReadmeEditing(null)} />}
      {!adding && !readmeEditing && session && draftOnly && !deleting && <DraftSessionPanel batchId={course.batchId} session={workingSessions.find(item => item.key === session.key)!} locked={locked} onDelete={courseReadmePosition(session.key) ? undefined : () => setDeleting(true)} />}
      {!adding && !readmeEditing && !draftOnly && (session ? <>
        <header className={styles.sessionHeading}><span className={styles.sessionCount}>{readmePosition ? 'Course README · Fixed page' : reordering ? 'Published session content' : `Session ${sessions.indexOf(session) + 1} of ${sessions.length}`}</span>{readmePosition ? <><h2>{COURSE_README_TITLES[readmePosition]}</h2><small>{readmePosition === 'before' ? 'Preparation and guidance before the first session.' : 'Next steps and resources after the last session.'}</small></> : renaming === session.key ? <SessionName key={session.key} batchId={course.batchId} sessionKey={session.key} title={sessionTitle(session.key, session.title)} workspace={workspace} onClose={() => closeTask('rename')} onUpdated={onUpdated} /> : <><div className={styles.nameRow}><h2><button type="button" className={styles.sessionName} disabled={locked} title="Double-click to rename; keyboard: Enter or F2" onDoubleClick={() => setRenaming(session.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === 'F2' || event.key === ' ') { event.preventDefault(); setRenaming(session.key); } }}>{sessionTitle(session.key, session.title)}</button></h2><button type="button" ref={renameButton} className={styles.renameButton} disabled={locked} aria-label="Rename session" onClick={() => setRenaming(session.key)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 16 12-12 4 4-12 12H4zM14 6l4 4"/></svg></button><button type="button" ref={deleteButton} className={styles.deleteTrigger} disabled={locked} onClick={() => setDeleting(true)} aria-label="Delete session"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg><span>Delete</span></button></div>{!reordering && <small>Double-click the name to rename.</small>}{workspace.items.some(item => !item.deleted && item.document.kind === 'heading' && item.draft_revision !== item.published_revision && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key)) && <button className={styles.draftChip} disabled={locked} onClick={() => setRenaming(session.key)}>Name draft · Continue editing →</button>}</>}</header>
        {v2SessionStages(session.key).map(({ kind, title }) => {
          const count = resourceRows(workspace, course, session, kind).length;
          return <section key={kind} className={styles.resourceGroup}>
          <div className={styles.row}><h3><svg className={styles.resourceKindIcon} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{kind === 'recordings' ? <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></> : kind === 'materials' ? <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></> : <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 1 5 5 0 0 0-4-1H3z"/></>}</svg>{title}<span className={styles.resourceCount} aria-label={`${count} resources`}>{count}</span></h3><button className={styles.textButton} disabled={locked} onClick={() => missingReadme ? setReadmeEditing(readmePosition) : onAdd(course.batchId, session.key, kind)} aria-label={`Add ${title.toLowerCase()}`}>+ Add</button></div>
          <ResourceList key={`${course.batchId}:${session.key}:${kind}`} workspace={workspace} course={course} session={session} kind={kind} title={title}
            disabled={locked} onActive={active => setResourceTask(active ? kind : null)} onUpdated={onUpdated} onEdit={onChoose}
            onOriginal={key => onResource(course.batchId, session.key, kind, key)}
            onDraftSaved={() => draftSaved(course.batchId)} />
        </section>; })}

      </> : <p className={styles.empty}>No sessions are available for this subject.</p>)}</section></div> : <div className={styles.empty}><h2>No published {subject.title} sessions yet</h2><p>The programme team must publish this subject course before sessions can be added here.</p></div>}
  </section>;
}

/** A session saved in the course draft but not yet published: its resources are edited in the course draft. */
function DraftSessionPanel({ batchId, session, locked, onDelete }: { batchId: string; session: V2CourseSession; locked: boolean; onDelete?: () => void }) {
  const stages = v2SessionStages(session.key);
  return <section className={styles.draftSession} aria-label={`Draft session: ${session.title}`}>
    <header className={styles.sessionHeading}>
      <span className={styles.sessionCount}>Draft · not yet published</span>
      <h2>{session.title}</h2>
      <small>Students can’t see this session yet. Add its resources, then review and publish the course.</small>
    </header>
    <div className={styles.draftActions}>
      <Link className={styles.primary} href={`/admin/v2/content/course/${batchId}?edit=1&session=${session.key}`}>Edit session &amp; resources</Link>
      {onDelete && <button type="button" className={styles.textButton} disabled={locked} onClick={onDelete}>Delete draft session</button>}
    </div>
    {stages.map(({ kind, title }) => <section key={kind} className={styles.resourceGroup}>
      <div className={styles.row}><h3>{title}<span className={styles.resourceCount} aria-label={`${session.content[kind].length} resources`}>{session.content[kind].length}</span></h3></div>
      {session.content[kind].length ? <ul className={styles.draftResourceList}>{session.content[kind].map(item => <li key={item.key}><strong>{item.title}</strong><small>{item.url}</small></li>)}</ul> : <p className={styles.muted}>None yet.</p>}
    </section>)}
  </section>;
}
