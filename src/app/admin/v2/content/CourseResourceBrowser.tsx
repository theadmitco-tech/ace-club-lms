'use client';

import { useRef, useState } from 'react';
import AddSession from './AddSession';
import SessionName from './SessionName';
import ReorderSessions from './ReorderSessions';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import type { ContentDocument, ContentItem, ContentWorkspace } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';

type Location = { courseId: string; sessionId: string; subject: string };
type Props = {
  workspace: ContentWorkspace; busy: boolean; location: Location; onLocation: (value: Location) => void;
  onChoose: (item: ContentItem | null) => void;
  onUpdated: (workspace: ContentWorkspace) => void;
  onResource: (batch: string, session: string, kind: ContentDocument['kind'], key: string | null) => void;
  onAdd: (batch: string, session: string, kind: ContentDocument['kind']) => void;
};
const subjects = [{ key: 'quant', title: 'Quant' }, { key: 'verbal', title: 'Verbal' }, { key: 'di', title: 'DI' }];

export default function CourseResourceBrowser({ workspace, busy, location, onLocation, onChoose, onResource, onAdd, onUpdated }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null), [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false), [savedDrafts, setSavedDrafts] = useState<string[]>([]);
  const addButton = useRef<HTMLButtonElement>(null), reorderButton = useRef<HTMLButtonElement>(null), renameButton = useRef<HTMLButtonElement>(null);
  const locked = busy || renaming !== null || adding || reordering;
  function closeTask(task: 'add' | 'rename' | 'reorder') {
    if (task === 'add') setAdding(false); else if (task === 'rename') setRenaming(null); else setReordering(false);
    requestAnimationFrame(() => (task === 'add' ? addButton : task === 'rename' ? renameButton : reorderButton).current?.focus({ preventScroll: true }));
  }
  const subject = subjects.find(item => item.key === location.subject) ?? subjects[0];
  const courses = workspace.courses.filter(item => item.productCode === subject.key);
  const course = courses.find(item => item.batchId === location.courseId) ?? courses[0];
  const sessions = course?.sessions.filter(item => item.section === subject.key) ?? [];
  const session = sessions.find(item => item.key === location.sessionId) ?? sessions[0];
  const [sessionSearch, setSessionSearch] = useState('');
  const matchingSessions = sessions.filter(item => (course?.anchors.find(anchor => anchor.key === item.key)?.title ?? item.title).toLowerCase().includes(sessionSearch.trim().toLowerCase()));
  const sessionTitle = (key: string, fallback: string) => course?.anchors.find(item => item.key === key)?.title ?? fallback;
  function chooseSubject(key: string) {
    onLocation({ courseId: '', sessionId: '', subject: key });
    setSessionSearch('');
  }
  return <section aria-label="Course resources">
      <div className={styles.subjectToolbar}>
        <div className={styles.subjects} role="group" aria-label="Subjects">{subjects.map(item => <button key={item.key} disabled={locked} aria-pressed={subject.key === item.key} onClick={() => chooseSubject(item.key)}>{item.title}</button>)}</div>
        {course && <a href={`/admin/v2/content/preview/${course.batchId}`} target="_blank" rel="noreferrer">Preview as student ↗</a>}
      </div>
      {courses.length > 1 && <label className={styles.coursePicker}>Published library<select disabled={locked} value={course.batchId} onChange={e => { onLocation({ subject: subject.key, courseId: e.target.value, sessionId: '' }); setSessionSearch(''); }}>{courses.map(item => <option key={item.batchId} value={item.batchId}>{item.title}</option>)}</select></label>}
      {course ? <div className={styles.sessionLayout}><aside className={styles.outline} aria-label="Session outline">
        <div className={styles.outlineTitle}><h2>{subject.title}</h2><span>{sessions.length} sessions</span></div>
        <div className={styles.outlineActions}><button ref={addButton} className={styles.addSession} disabled={locked} onClick={() => setAdding(true)}>+ Add session</button><button ref={reorderButton} className={styles.reorderTrigger} disabled={locked || sessions.length < 2} onClick={() => setReordering(true)} aria-label="Reorder sessions">↕ Reorder</button></div>
        {reordering ? <ReorderSessions key={course.batchId} batchId={course.batchId} sessions={course.sessions.map(item => ({ key: item.key, title: sessionTitle(item.key, item.title) }))} selectedKey={session?.key} onSelect={key => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: key })} onSaved={() => setSavedDrafts(previous => [...new Set([...previous, course.batchId])])} onClose={() => closeTask('reorder')} /> : <>
        <label className={styles.sessionSearch}><span className={styles.visuallyHidden}>Find a session</span><input type="search" disabled={locked} value={sessionSearch} onChange={e => setSessionSearch(e.target.value)} placeholder="Find a session" /></label>
        <label className={styles.mobileSession}>Choose a session<select disabled={locked} aria-label="Choose a session" value={session?.key ?? ''} onChange={e => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: e.target.value })}>{sessions.map(item => <option key={item.key} value={item.key}>{sessionTitle(item.key, item.title)}</option>)}</select></label>
        <div className={styles.sessionButtons}>{matchingSessions.map(item => <button key={item.key} disabled={locked} onDoubleClick={() => setRenaming(item.key)} aria-current={item.key === session?.key ? 'true' : undefined} onClick={() => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: item.key })}><span className={styles.sessionIndex}>{String(sessions.indexOf(item) + 1).padStart(2, '0')}</span><span>{sessionTitle(item.key, item.title)}</span></button>)}{!matchingSessions.length && <p className={styles.muted}>No sessions match.</p>}</div></>}

      </aside><section className={styles.sessionContent} data-reordering={reordering || undefined} aria-label={session ? `Session resources: ${session.title}` : 'Session resources'}>{!adding && !reordering && savedDrafts.includes(course.batchId) && <div className={styles.draftNotice} role="status"><span>Session changes saved as a draft</span><Link href={`/admin/v2/batches?batch=${course.batchId}&review=1`}>Review & publish →</Link></div>}{adding && <AddSession batchId={course.batchId} onSaved={() => setSavedDrafts(previous => [...new Set([...previous, course.batchId])])} onClose={() => closeTask('add')} />}
      {!adding && (session ? <>
        <header className={styles.sessionHeading}><span className={styles.sessionCount}>{reordering ? 'Published session content' : `Session ${sessions.indexOf(session) + 1} of ${sessions.length}`}</span>{renaming === session.key ? <SessionName key={session.key} batchId={course.batchId} sessionKey={session.key} title={sessionTitle(session.key, session.title)} workspace={workspace} onClose={() => closeTask('rename')} onUpdated={onUpdated} /> : <><div className={styles.nameRow}><h2><button type="button" className={styles.sessionName} disabled={locked} title="Double-click to rename; keyboard: Enter or F2" onDoubleClick={() => setRenaming(session.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === 'F2' || event.key === ' ') { event.preventDefault(); setRenaming(session.key); } }}>{sessionTitle(session.key, session.title)}</button></h2><button type="button" ref={renameButton} className={styles.renameButton} disabled={locked} aria-label="Rename session" onClick={() => setRenaming(session.key)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 16 12-12 4 4-12 12H4zM14 6l4 4"/></svg></button></div>{!reordering && <small>Double-click the name to rename.</small>}{workspace.items.some(item => !item.deleted && item.document.kind === 'heading' && item.draft_revision !== item.published_revision && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key)) && <button className={styles.draftChip} disabled={locked} onClick={() => setRenaming(session.key)}>Name draft · Continue editing →</button>}</>}</header>
        {V2_SESSION_STAGES.map(({ kind, title }, index) => <section key={kind} className={styles.resourceGroup}>
          <div className={styles.row}><h3><span className={styles.number}>{index + 1}</span>{title}</h3><button className={styles.textButton} disabled={locked} onClick={() => onAdd(course.batchId, session.key, kind)} aria-label={`Add ${title.toLowerCase()}`}>+ Add</button></div>
          {session.content[kind].map(item => {
            const managed = workspace.items.find(resource => !resource.deleted && resource.document.kind === kind && resource.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === item.key));
            return <div className={styles.resourceRow} key={item.key}><span>{managed?.document.title ?? item.title}<small>{managed ? `${managed.visible ? 'Published' : 'Not published'}${managed.published_revision !== managed.draft_revision ? ' · draft changes' : ''}` : 'Published'}</small></span><button className={styles.textButton} disabled={locked} onClick={() => onResource(course.batchId, session.key, kind, item.key)}>Edit<span className={styles.visuallyHidden}> {item.title}</span></button></div>;
          })}
          {workspace.items.filter(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === null)).map(item => <div key={item.id} className={styles.resourceRow}><span>{item.document.title}<small>{item.visible ? 'Published resource' : 'Saved draft'}{item.published_revision !== item.draft_revision ? ' · unpublished changes' : ''}</small></span><button className={styles.textButton} onClick={() => onChoose(item)} disabled={locked}>Edit<span className={styles.visuallyHidden}> {item.document.title}</span></button></div>)}
          {!session.content[kind].length && !workspace.items.some(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key)) && <p className={styles.muted}>No {title.toLowerCase()} added yet.</p>}
        </section>)}

      </> : <p className={styles.empty}>No sessions are available for this subject.</p>)}</section></div> : <div className={styles.empty}><h2>No published {subject.title} sessions yet</h2><p>The programme team must publish this subject course before sessions can be added here.</p></div>}
  </section>;
}
