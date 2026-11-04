'use client';

import { useState } from 'react';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import type { ContentDocument, ContentItem, ContentWorkspace } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';

type Location = { courseId: string; sessionId: string; subject: string };
type Props = {
  workspace: ContentWorkspace; busy: boolean; location: Location; onLocation: (value: Location) => void;
  onChoose: (item: ContentItem | null) => void;
  onResource: (batch: string, session: string, kind: ContentDocument['kind'], key: string | null) => void;
  onAdd: (batch: string, session: string, kind: ContentDocument['kind']) => void;
};
const subjects = [{ key: 'quant', title: 'Quant' }, { key: 'verbal', title: 'Verbal' }, { key: 'di', title: 'DI' }];

export default function CourseResourceBrowser({ workspace, busy, location, onLocation, onChoose, onResource, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'courses' | 'library'>('courses');
  const course = workspace.courses.find(item => item.batchId === location.courseId);
  const sessions = course?.sessions.filter(item => !location.subject || item.section === location.subject) ?? [];
  const session = sessions.find(item => item.key === location.sessionId) ?? sessions[0];
  const matches = workspace.courses.filter(item => item.title.toLowerCase().includes(search.toLowerCase()) &&
    (!location.subject || item.sessions.some(s => s.section === location.subject)));
  const openCourse = (courseId: string) => onLocation({ ...location, courseId, sessionId: '' });
  function courseList(courses: typeof matches) {
    return <div className={styles.courseList}>{courses.map(item => <button key={item.batchId} className={styles.courseCard} disabled={busy} onClick={() => openCourse(item.batchId)}>
      <span><strong>{item.title}</strong><small>{item.sessions.filter(s => !location.subject || s.section === location.subject).length} sessions · published library</small></span><span aria-hidden="true">→</span>
    </button>)}</div>;
  }
  return <section aria-label="Course resources">
    <div className={styles.row} role="group" aria-label="Content views">
      <div className={styles.viewButtons}><button aria-pressed={view === 'courses'} onClick={() => setView('courses')}>Sessions</button><button aria-pressed={view === 'library'} onClick={() => setView('library')}>Shared library</button></div>
      <Link href="/admin/v2/templates">Prepare course templates →</Link>
    </div>
    {view === 'library' ? <section className={styles.card}>
      <h2>Shared library</h2><p>Saved resources and their course placements are managed here. Each publication requires a review.</p>
      <label className={styles.search}>Find a resource<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Resource title" /></label>
      <ul className={styles.itemList}>{workspace.items.filter(item => !item.deleted && item.document.title.toLowerCase().includes(search.toLowerCase())).map(item => <li key={item.id}><button disabled={busy} onClick={() => onChoose(item)}><strong>{item.document.title}</strong><small>{item.visible ? 'Published' : 'Not published'} · {item.document.targets.length} session placements{item.published_revision !== item.draft_revision ? ' · Draft changes' : ''}</small></button></li>)}</ul>
      {!workspace.items.some(item => !item.deleted && item.document.title.toLowerCase().includes(search.toLowerCase())) && <p>No saved resources match. Original readings and recordings can be edited from Sessions.</p>}
      <div className={styles.row}><button disabled={busy} onClick={() => onChoose(null)}>Create a resource</button><Link href="/admin/v2/imports">Imported materials & replacements →</Link></div>
    </section> : !course ? <>
      <h2>Choose a subject</h2><p className={styles.muted}>Open a subject, then choose the library and session to update.</p>
      <div className={styles.subjects} role="group" aria-label="Subjects">{subjects.map(subject => <button key={subject.key} aria-pressed={location.subject === subject.key} onClick={() => { onLocation({ courseId: '', sessionId: '', subject: subject.key }); setSearch(''); }}><strong>{subject.title}</strong><small>Readings, recordings & worksheets</small></button>)}</div>
      {location.subject && <><label className={styles.search}>Find a course<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search library title" /></label>
        {courseList(matches.filter(item => item.productCode !== 'full_course'))}
        {!matches.some(item => item.productCode !== 'full_course') && <p>No subject-only library matches. Existing combined libraries remain available below.</p>}
        <details className={styles.disclosure}><summary>Existing combined libraries</summary><p>Full Course retains its own published copy. Changes affect only the placements selected in the publication review.</p>{courseList(matches.filter(item => item.productCode === 'full_course'))}</details>
      </>}
      {!workspace.courses.length && <div className={styles.empty}><h2>No published content yet</h2><Link href="/admin/v2/templates">Prepare course content</Link></div>}
    </> : <>
      <button className={styles.textButton} onClick={() => openCourse('')}>← All courses</button>
      <div className={styles.row}><div><h2>{course.title}</h2><p>{subjects.find(s => s.key === location.subject)?.title} sessions · changes are reviewed before publication.</p></div><a href={`/admin/v2/content/preview/${course.batchId}`} target="_blank" rel="noreferrer">Preview as student ↗</a></div>
      <div className={styles.sessionLayout}><aside className={styles.outline}><h3>Session outline</h3>
        {course.productCode==='full_course'&&<label>Subject<select value={location.subject} onChange={event=>onLocation({...location,subject:event.target.value,sessionId:''})}><option value="">All subjects & programme</option>{subjects.map(subject=><option key={subject.key} value={subject.key}>{subject.title}</option>)}</select></label>}
        <label>Choose a session<select value={session?.key ?? ''} onChange={e => onLocation({ ...location, sessionId: e.target.value })}>{sessions.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
        <div className={styles.sessionButtons}>{sessions.map(item => <button key={item.key} aria-current={item.key === session?.key ? 'true' : undefined} onClick={() => onLocation({ ...location, sessionId: item.key })}>{item.title}</button>)}</div>
      </aside><section className={styles.card}>{session ? <>
        <h3>{session.title}</h3><p className={styles.muted}>Several resources can be added to each group. Their order is set inside the resource editor.</p>
        {V2_SESSION_STAGES.map(({ kind, title }, index) => <section key={kind} className={styles.resourceGroup}>
          <div className={styles.row}><h4><span className={styles.number}>{index + 1}</span>{title}</h4><button className={styles.textButton} disabled={busy} onClick={() => onAdd(course.batchId, session.key, kind)}>Add {title.toLowerCase()}</button></div>
          {session.content[kind].map(item => {
            const managed = workspace.items.find(resource => !resource.deleted && resource.document.kind === kind && resource.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === item.key));
            return <div className={styles.resourceRow} key={item.key}><span>{managed?.document.title ?? item.title}<small>{managed ? `${managed.visible ? 'Published' : 'Not published'} · latest saved draft` : 'Original course resource'}</small></span><button className={styles.textButton} disabled={busy} onClick={() => onResource(course.batchId, session.key, kind, item.key)}>Edit<span className="sr-only"> {item.title}</span></button></div>;
          })}
          {workspace.items.filter(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key && target.replaceKey === null)).map(item => <div key={item.id} className={styles.resourceRow}><span>{item.document.title}<small>{item.visible ? 'Published resource' : 'Saved draft'}{item.published_revision !== item.draft_revision ? ' · unpublished changes' : ''}</small></span><button className={styles.textButton} onClick={() => onChoose(item)} disabled={busy}>Edit<span className="sr-only"> {item.document.title}</span></button></div>)}
          {!session.content[kind].length && !workspace.items.some(item => !item.deleted && item.document.kind === kind && item.document.targets.some(target => target.batchId === course.batchId && target.sessionKey === session.key)) && <p className={styles.muted}>No {title.toLowerCase()} added yet.</p>}
        </section>)}
        <details className={styles.disclosure}><summary>Session options</summary><button disabled={busy} onClick={() => onResource(course.batchId, session.key, 'heading', null)}>Rename session</button><p>Saved resources can be unpublished or deleted from their editor. Original course resources can be removed from the course outline, then reviewed and republished.</p><Link href={`/admin/v2/batches?batch=${course.batchId}&outline=1&session=${session.key}`}>Edit or remove original session content →</Link></details>
      </> : <p>No sessions are available for this subject.</p>}</section></div>
    </>}
  </section>;
}
