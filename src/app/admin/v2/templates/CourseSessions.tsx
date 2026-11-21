'use client';
import { courseReadmePosition, pinCourseReadmes } from '@/lib/v2CourseReadmes';
import { useState } from 'react';
import { ReadingPreview } from './ReadingPreview';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import { v2SessionStages } from '@/lib/v2SessionPresentation';
import type { V2Section } from '@/lib/v2Products';
import { emptyV2SessionContent, V2_TEMPLATE_PRODUCTS, type V2CourseSession, type V2CourseSessionSection } from '@/lib/v2Templates';
import styles from './templates.module.css';
import ui from './courseSessions.module.css';

const sectionLabel = (section: string) => section === 'programme' ? 'Programme · Full Course only' : V2_TEMPLATE_PRODUCTS[section as V2Section]?.label ?? section;

/** `compact` hides the editor's own heading when a surrounding panel already introduces it. */
export function CourseSessionsEditor({ sessions, sections, onChange, initialSessionKey = '', compact = false }: {
  initialSessionKey?: string; sessions: V2CourseSession[]; sections: V2Section[]; onChange: (sessions: V2CourseSession[]) => void; compact?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState(initialSessionKey);
  const selected = sessions.find(session => session.key === selectedKey) ?? sessions[0];
  const index = selected ? sessions.indexOf(selected) : -1;
  const update = (key: string, patch: Partial<V2CourseSession>) => onChange(sessions.map((session) => session.key === key ? { ...session, ...patch } : session));
  const fixed = !!selected && !!courseReadmePosition(selected.key);
  const addSession = () => { const key = crypto.randomUUID(); onChange(pinCourseReadmes([...sessions, { key, title: '', section: sections[0], content: emptyV2SessionContent() }])); setSelectedKey(key); };

  return <section className={`${styles.sessions} ${ui.editor}`} aria-label="Course sessions and content">
    {!compact && <div className={ui.head}><div><h3>Course sessions and content</h3><p>Each session holds its readings, recording and worksheet. None of them need a date.</p></div><span className={ui.count}>{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span></div>}
    {sessions.length === 0 ? <div className={ui.empty}><strong>No sessions yet</strong><p>Add a session, then attach its readings, recording and worksheet.</p>
      <button type="button" className="btn btn-primary" onClick={addSession}>Add course session</button></div> : <>
      <div className={ui.toolbar}>
        <label className={ui.picker}><span>Choose a session</span><select value={selected?.key ?? ''} onChange={event => setSelectedKey(event.target.value)}>{sessions.map((session, position) => <option key={session.key} value={session.key}>{position + 1}. {session.title || 'Untitled session'}</option>)}</select></label>
        <div className={ui.toolbarActions}>
          {selected && !fixed && <>
            <button type="button" className={ui.ghost} aria-label={`Move course session ${index + 1} up`} disabled={index === 0 || !!courseReadmePosition(sessions[index - 1]?.key ?? '')} onClick={() => {
              const next = [...sessions]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next);
            }}>↑ Move up</button>
            <button type="button" className={ui.danger} aria-label={`Remove course session ${index + 1}`} onClick={() => onChange(sessions.filter(v => v.key !== selected.key))}>Remove</button>
          </>}
          <button type="button" className={ui.add} disabled={sessions.length >= 100} onClick={addSession}>Add course session</button>
        </div>
      </div>
      {selected && <fieldset className={ui.session} key={selected.key}>
        <legend>Course session {index + 1}</legend>
        <div className={ui.identity}>
          <label htmlFor={`${selected.key}-title`}>Session title
            <input id={`${selected.key}-title`} required maxLength={120} readOnly={fixed} value={selected.title} placeholder="e.g. Ratios and proportions" onChange={(e) => update(selected.key, { title: e.target.value })} />
          </label>
          {sections.length > 1 && <label htmlFor={`${selected.key}-section`}>Subject
            <select id={`${selected.key}-section`} disabled={fixed} value={selected.section} onChange={(e) => update(selected.key, { section: e.target.value as V2CourseSessionSection })}>
              {sections.map((section) => <option key={section} value={section}>{sectionLabel(section)}</option>)}
              {sections.length === 3 && <option value="programme">{sectionLabel('programme')}</option>}
            </select>
          </label>}
        </div>
        <div className={ui.stages}>{v2SessionStages(selected.key).map(({ kind, title: label }) => {
          const items = selected.content[kind];
          const setItems = (next: typeof items) => update(selected.key, { content: { ...selected.content, [kind]: next } });
          return <details key={kind} className={ui.stage} role="group" aria-label={`${label} (${items.length})`}>
            <summary><span>{label} <span className={ui.stageCount}>({items.length})</span></span></summary>
            {items.map((item, itemIndex) => <div className={ui.item} key={item.key}>
              <label htmlFor={`${item.key}-title`}>Title
                <input id={`${item.key}-title`} required maxLength={120} value={item.title} onChange={(e) => setItems(items.map(v => v.key === item.key ? { ...v, title: e.target.value } : v))} />
              </label>
              <label htmlFor={`${item.key}-url`}>HTTPS link or stored PDF
                <input id={`${item.key}-url`} type="text" inputMode="url" required maxLength={2048} placeholder="https://…" value={item.url} onChange={(e) => setItems(items.map(v => v.key === item.key ? { ...v, url: e.target.value } : v))} />
              </label>
              <div className={ui.itemActions}>
                <button type="button" className={ui.icon} title="Move up" aria-label={`Move ${label.toLowerCase()} item ${itemIndex + 1} up`} disabled={itemIndex === 0} onClick={() => {
                  const next = [...items]; [next[itemIndex - 1], next[itemIndex]] = [next[itemIndex], next[itemIndex - 1]]; setItems(next);
                }}>↑</button>
                <button type="button" className={ui.icon} title="Remove" aria-label={`Remove ${label.toLowerCase()} item ${itemIndex + 1}`} onClick={() => setItems(items.filter(v => v.key !== item.key))}>✕</button>
              </div>
              {(kind === 'preSessionReads' || kind === 'postSessionReads') && <div className={ui.preview}><ReadingPreview item={item} sessionTitle={selected.title} kind={kind} position={itemIndex} /></div>}
            </div>)}
            <button type="button" className={ui.addItem} aria-label={`Add ${label.toLowerCase()} item`} disabled={items.length >= 50} onClick={() => setItems([...items, { key: crypto.randomUUID(), title: '', url: '' }])}>+ Add {label.toLowerCase()}</button>
          </details>;
        })}</div>
      </fieldset>}
    </>}
  </section>;
}

export function CourseSessionsPreview({ sessions }: { sessions: V2CourseSession[] }) {
  return <section aria-label="Course content preview"><h4>Course content preview</h4>
    {sessions.length===0 ? <p>No course sessions in this revision.</p> : <ol className={styles.list}>{sessions.map((session) => <li key={session.key}>
      <V2CourseSessionView session={session} mode="admin-preview" />
    </li>)}</ol>}
  </section>;
}
