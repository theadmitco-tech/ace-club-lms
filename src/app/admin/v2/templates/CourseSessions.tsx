'use client';
import { useState } from 'react';
import { ReadingPreview } from './ReadingPreview';
import { V2CourseSessionView } from '@/components/student/V2CourseSessionView';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import type { V2Section } from '@/lib/v2Products';
import { emptyV2SessionContent, type V2CourseSession, type V2CourseSessionSection } from '@/lib/v2Templates';
import styles from './templates.module.css';

export function CourseSessionsEditor({ sessions, sections, onChange }: {
  sessions: V2CourseSession[]; sections: V2Section[]; onChange: (sessions: V2CourseSession[]) => void;
}) {
  const [selectedKey,setSelectedKey]=useState('');
  const selected=sessions.find(session=>session.key===selectedKey)??sessions[0];
  const update = (key: string, patch: Partial<V2CourseSession>) => onChange(sessions.map((session) => session.key === key ? { ...session, ...patch } : session));
  return <section className={styles.sessions} aria-label="Course sessions and content">
    <div className={styles.sectionHeading}><h3>Course sessions and content</h3><span className={styles.badge}>{sessions.length} sessions · undated</span></div>
    <p>Keep the complete curriculum here. Materials, recordings and readings do not require a live event or date.</p>
    {sessions.length === 0 && <div className={styles.emptyState}><strong>Start with a session</strong><p>Add its materials, recordings and readings. You can arrange the curriculum before setting any live dates.</p></div>}
    {!!sessions.length && <label>Choose a session<select className="form-input" value={selected?.key??''} onChange={event=>setSelectedKey(event.target.value)}>{sessions.map((session,index)=><option key={session.key} value={session.key}>{index+1}. {session.title||'Untitled session'}</option>)}</select></label>}
    {sessions.map((session, index) => session.key===selected?.key && <fieldset className={styles.event} key={session.key}>
      <legend>Course session {index + 1}</legend>
      <div className={styles.grid}><label htmlFor={`${session.key}-title`}>Session title
        <input id={`${session.key}-title`} className="form-input" required maxLength={120} value={session.title} onChange={(e) => update(session.key,{title:e.target.value})} />
      </label>
      <label htmlFor={`${session.key}-section`}>Section
        <select id={`${session.key}-section`} className="form-input" value={session.section} onChange={(e) => update(session.key,{section:e.target.value as V2CourseSessionSection})}>
          {sections.map((section) => <option key={section} value={section}>{section}</option>)}
          {sections.length === 3 && <option value="programme">Programme · Full Course only</option>}
        </select>
      </label>
      </div><div className={styles.resources}>{V2_SESSION_STAGES.map(({kind,title:label}) => <details key={kind} className={styles.event} role="group" aria-label={`${label} (${session.content[kind].length})`}><summary>{label} ({session.content[kind].length})</summary>
        {session.content[kind].map((item,itemIndex) => <div className={styles.fields} key={item.key}>
          <label htmlFor={`${item.key}-title`}>Title
            <input id={`${item.key}-title`} className="form-input" required maxLength={120} value={item.title} onChange={(e) => update(session.key,{content:{...session.content,[kind]:session.content[kind].map((v) => v.key===item.key ? {...v,title:e.target.value} : v)}})} />
          </label>
          <label htmlFor={`${item.key}-url`}>HTTPS link or stored PDF
            <input id={`${item.key}-url`} className="form-input" type="text" inputMode="url" required maxLength={2048} value={item.url} onChange={(e) => update(session.key,{content:{...session.content,[kind]:session.content[kind].map((v) => v.key===item.key ? {...v,url:e.target.value} : v)}})} />
          </label>
          {(kind === 'preSessionReads' || kind === 'postSessionReads') && <ReadingPreview item={item} sessionTitle={session.title} kind={kind} position={itemIndex} />}
          <div className={styles.buttons}>
            <button type="button" className="btn btn-secondary" disabled={itemIndex===0} onClick={() => {
              const items=[...session.content[kind]]; [items[itemIndex-1],items[itemIndex]]=[items[itemIndex],items[itemIndex-1]];
              update(session.key,{content:{...session.content,[kind]:items}});
            }}>Move {label.toLowerCase()} item {itemIndex+1} up</button>
            <button type="button" className="btn btn-secondary" onClick={() => update(session.key,{content:{...session.content,[kind]:session.content[kind].filter((v) => v.key!==item.key)}})}>Remove {label.toLowerCase()} item {itemIndex+1}</button>
          </div>
        </div>)}
        <button type="button" className="btn btn-secondary" disabled={session.content[kind].length>=50} onClick={() => update(session.key,{content:{...session.content,[kind]:[...session.content[kind],{key:crypto.randomUUID(),title:'',url:''}]}})}>Add {label.toLowerCase()} item</button>
      </details>)}</div>
      <div className={styles.buttons}>
        <button type="button" className="btn btn-secondary" disabled={index===0} onClick={() => {
          const next=[...sessions]; [next[index-1],next[index]]=[next[index],next[index-1]]; onChange(next);
        }}>Move course session {index+1} up</button>
        <button type="button" className="btn btn-secondary" onClick={() => onChange(sessions.filter((v) => v.key!==session.key))}>Remove course session {index+1}</button>
      </div>
    </fieldset>)}
    <button type="button" className="btn btn-secondary" disabled={sessions.length>=100} onClick={() => { const key=crypto.randomUUID();onChange([...sessions,{key,title:'',section:sections[0],content:emptyV2SessionContent()}]);setSelectedKey(key); }}>Add course session</button>
  </section>;
}

export function CourseSessionsPreview({ sessions }: { sessions: V2CourseSession[] }) {
  return <section aria-label="Course content preview"><h4>Course content preview</h4>
    {sessions.length===0 ? <p>No course sessions in this revision.</p> : <ol className={styles.list}>{sessions.map((session) => <li key={session.key}>
      <V2CourseSessionView session={session} mode="admin-preview" />
    </li>)}</ol>}
  </section>;
}
