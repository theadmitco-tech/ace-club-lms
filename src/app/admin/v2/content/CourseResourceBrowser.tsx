'use client';

import { useState } from 'react';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import type { ContentDocument, ContentItem, ContentWorkspace } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';

type Location = { courseId: string; sessionId: string; subject: string };
type Props = {
  view: 'courses' | 'library'; onView: (value: 'courses' | 'library') => void;
  workspace: ContentWorkspace; busy: boolean; location: Location; onLocation: (value: Location) => void;
  onChoose: (item: ContentItem | null) => void;
  onResource: (batch: string, session: string, kind: ContentDocument['kind'], key: string | null) => void;
  onAdd: (batch: string, session: string, kind: ContentDocument['kind']) => void;
};
const subjects = [{ key: 'quant', title: 'Quant' }, { key: 'verbal', title: 'Verbal' }, { key: 'di', title: 'DI' }];

export default function CourseResourceBrowser({ view, onView, workspace, busy, location, onLocation, onChoose, onResource, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const subject = subjects.find(item => item.key === location.subject) ?? subjects[0];
  const courses = workspace.courses.filter(item => item.productCode === subject.key);
  const course = courses.find(item => item.batchId === location.courseId) ?? courses[0];
  const sessions = course?.sessions.filter(item => item.section === subject.key) ?? [];
  const session = sessions.find(item => item.key === location.sessionId) ?? sessions[0];
  const [sessionSearch, setSessionSearch] = useState('');
  const matchingSessions = sessions.filter(item => item.title.toLowerCase().includes(sessionSearch.trim().toLowerCase()));
  const libraryItems = workspace.items.filter(item => !item.deleted && item.document.title.toLowerCase().includes(search.trim().toLowerCase()));
  function chooseSubject(key: string) {
    onLocation({ courseId: '', sessionId: '', subject: key });
    setSessionSearch('');
  }
  return <section aria-label="Course resources">
    <div className={styles.browserToolbar}>
      <div className={styles.viewButtons} role="group" aria-label="Content views"><button aria-pressed={view === 'courses'} onClick={() => onView('courses')}>Sessions</button><button aria-pressed={view === 'library'} onClick={() => onView('library')}>Shared library</button></div>
      <Link href="/admin/v2/templates">Course templates</Link>
    </div>
    {view === 'library' ? <section className={styles.library}>
      <div className={styles.row}><label className={styles.search}>Find a resource<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources" /></label><button className={styles.primary} disabled={busy} onClick={() => onChoose(null)}>Create a resource</button></div>
      <ul className={styles.itemList}>{libraryItems.map(item => <li key={item.id}><button disabled={busy} onClick={() => onChoose(item)}><strong>{item.document.title}</strong><small>{item.visible ? 'Published' : 'Not published'} · {item.document.targets.length} session placements{item.published_revision !== item.draft_revision ? ' · Draft changes' : ''}</small></button></li>)}</ul>
      {!libraryItems.length && <p className={styles.empty}>No resources match this search. Original course materials are listed under Sessions.</p>}
      <Link href="/admin/v2/imports">Manage imported materials →</Link>
    </section> : <>
      <div className={styles.subjectToolbar}>
        <div className={styles.subjects} role="group" aria-label="Subjects">{subjects.map(item => <button key={item.key} disabled={busy} aria-pressed={subject.key === item.key} onClick={() => chooseSubject(item.key)}>{item.title}</button>)}</div>
        {course && <a href={`/admin/v2/content/preview/${course.batchId}`} target="_blank" rel="noreferrer">Preview as student ↗</a>}
      </div>
      {courses.length > 1 && <label className={styles.coursePicker}>Published library<select value={course.batchId} onChange={e => { onLocation({ subject: subject.key, courseId: e.target.value, sessionId: '' }); setSessionSearch(''); }}>{courses.map(item => <option key={item.batchId} value={item.batchId}>{item.title}</option>)}</select></label>}
      {course ? <div className={styles.sessionLayout}><aside className={styles.outline} aria-label="Session outline">
        <div className={styles.outlineTitle}><h2>{subject.title}</h2><span>{sessions.length} sessions</span></div>
        <label className={styles.sessionSearch}><span className={styles.visuallyHidden}>Find a session</span><input type="search" value={sessionSearch} onChange={e => setSessionSearch(e.target.value)} placeholder="Find a session" /></label>
        <label className={styles.mobileSession}>Choose a session<select aria-label="Choose a session" value={session?.key ?? ''} onChange={e => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: e.target.value })}>{sessions.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
        <div className={styles.sessionButtons}>{matchingSessions.map(item => <button key={item.key} aria-current={item.key === session?.key ? 'true' : undefined} onClick={() => onLocation({ subject: subject.key, courseId: course.batchId, sessionId: item.key })}><span className={styles.sessionIndex}>{String(sessions.indexOf(item) + 1).padStart(2, '0')}</span><span>{item.title}</span></button>)}{!matchingSessions.length && <p className={styles.muted}>No sessions match.</p>}</div>
      </aside><section className={styles.sessionContent} aria-label={session ? `Session resources: ${session.title}` : 'Session resources'}>{session ? <>
        <header className={styles.sessionHeading}><span className={styles.sessionCount}>Session {sessions.indexOf(session) + 1} of {sessions.length}</span><h2>{session.title}</h2></header>
        {V2_SESSION_STAGES.map(({ kind, title }, index) => <section key={kind} className={styles.resourceGroup}>
          <div className={styles.row}><h3><span className={styles.number}>{index + 1}</span>{title}</h3><button className={styles.textButton} disabled={busy} onClick={() => onAdd(course.batchId, session.key, kind)} aria-label={`Add ${title.toLowerCase()}`}>+ Add</button></div>
          {session.content[kind].map(item => {
            const managed = workspace.items.find(resource => !resource.deleted && resource.document.kind === kind && resource.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === item.key));
            return <div className={styles.resourceRow} key={item.key}><span>{managed?.document.title ?? item.title}<small>{managed ? `${managed.visible ? 'Published' : 'Not published'}${managed.published_revision !== managed.draft_revision ? ' · draft changes' : ''}` : 'Published'}</small></span><button className={styles.textButton} disabled={busy} onClick={() => onResource(course.batchId, session.key, kind, item.key)}>Edit<span className={styles.visuallyHidden}> {item.title}</span></button></div>;
          })}
          {workspace.items.filter(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === null)).map(item => <div key={item.id} className={styles.resourceRow}><span>{item.document.title}<small>{item.visible ? 'Published resource' : 'Saved draft'}{item.published_revision !== item.draft_revision ? ' · unpublished changes' : ''}</small></span><button className={styles.textButton} onClick={() => onChoose(item)} disabled={busy}>Edit<span className={styles.visuallyHidden}> {item.document.title}</span></button></div>)}
          {!session.content[kind].length && !workspace.items.some(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key)) && <p className={styles.muted}>No {title.toLowerCase()} added yet.</p>}
        </section>)}
        <details className={styles.disclosure}><summary>Session options</summary><button disabled={busy} onClick={() => onResource(course.batchId, session.key, 'heading', null)}>Rename session</button><p>Saved resources can be unpublished or deleted from their editor. Original course resources can be removed from the course outline, then reviewed and republished.</p><Link href={`/admin/v2/batches?batch=${course.batchId}&outline=1&session=${session.key}`}>Edit or remove original session content →</Link></details>
      </> : <p className={styles.empty}>No sessions are available for this subject.</p>}</section></div> : <div className={styles.empty}><h2>No published {subject.title} sessions yet</h2><p>A subject template can be prepared before its library is published.</p><Link href="/admin/v2/templates">Open course templates →</Link></div>}
    </>}
  </section>;
}
