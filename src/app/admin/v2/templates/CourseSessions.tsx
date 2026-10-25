import type { V2Section } from '@/lib/v2Products';
import { V2_SESSION_CONTENT_LABELS, emptyV2SessionContent, type V2CourseSession, type V2SessionContentKind } from '@/lib/v2Templates';
import styles from './templates.module.css';

export function CourseSessionsEditor({ sessions, sections, onChange }: {
  sessions: V2CourseSession[]; sections: V2Section[]; onChange: (sessions: V2CourseSession[]) => void;
}) {
  const update = (key: string, patch: Partial<V2CourseSession>) => onChange(sessions.map((session) => session.key === key ? { ...session, ...patch } : session));
  return <section aria-label="Course sessions and content">
    <h3>Course sessions and content</h3>
    <p>Keep the complete curriculum here. Materials, recordings and readings do not require a live event or date.</p>
    {sessions.map((session, index) => <fieldset className={styles.event} key={session.key}>
      <legend>Course session {index + 1}</legend>
      <label htmlFor={`${session.key}-title`}>Session title
        <input id={`${session.key}-title`} className="form-input" required maxLength={120} value={session.title} onChange={(e) => update(session.key,{title:e.target.value})} />
      </label>
      <label htmlFor={`${session.key}-section`}>Section
        <select id={`${session.key}-section`} className="form-input" value={session.section} onChange={(e) => update(session.key,{section:e.target.value as V2Section})}>
          {sections.map((section) => <option key={section} value={section}>{section}</option>)}
        </select>
      </label>
      {(Object.entries(V2_SESSION_CONTENT_LABELS) as [V2SessionContentKind,string][]).map(([kind,label]) => <fieldset key={kind} className={styles.event}>
        <legend>{label} ({session.content[kind].length})</legend>
        {session.content[kind].map((item,itemIndex) => <div className={styles.fields} key={item.key}>
          <label htmlFor={`${item.key}-title`}>Title
            <input id={`${item.key}-title`} className="form-input" required maxLength={120} value={item.title} onChange={(e) => update(session.key,{content:{...session.content,[kind]:session.content[kind].map((v) => v.key===item.key ? {...v,title:e.target.value} : v)}})} />
          </label>
          <label htmlFor={`${item.key}-url`}>HTTPS link
            <input id={`${item.key}-url`} className="form-input" type="url" required maxLength={2048} value={item.url} onChange={(e) => update(session.key,{content:{...session.content,[kind]:session.content[kind].map((v) => v.key===item.key ? {...v,url:e.target.value} : v)}})} />
          </label>
          <div className={styles.buttons}>
            <button type="button" className="btn btn-secondary" disabled={itemIndex===0} onClick={() => {
              const items=[...session.content[kind]]; [items[itemIndex-1],items[itemIndex]]=[items[itemIndex],items[itemIndex-1]];
              update(session.key,{content:{...session.content,[kind]:items}});
            }}>Move {label.toLowerCase()} item {itemIndex+1} up</button>
            <button type="button" className="btn btn-secondary" onClick={() => update(session.key,{content:{...session.content,[kind]:session.content[kind].filter((v) => v.key!==item.key)}})}>Remove {label.toLowerCase()} item {itemIndex+1}</button>
          </div>
        </div>)}
        <button type="button" className="btn btn-secondary" disabled={session.content[kind].length>=50} onClick={() => update(session.key,{content:{...session.content,[kind]:[...session.content[kind],{key:crypto.randomUUID(),title:'',url:''}]}})}>Add {label.toLowerCase()} item</button>
      </fieldset>)}
      <div className={styles.buttons}>
        <button type="button" className="btn btn-secondary" disabled={index===0} onClick={() => {
          const next=[...sessions]; [next[index-1],next[index]]=[next[index],next[index-1]]; onChange(next);
        }}>Move course session {index+1} up</button>
        <button type="button" className="btn btn-secondary" onClick={() => onChange(sessions.filter((v) => v.key!==session.key))}>Remove course session {index+1}</button>
      </div>
    </fieldset>)}
    <button type="button" className="btn btn-secondary" disabled={sessions.length>=100} onClick={() => onChange([...sessions,{key:crypto.randomUUID(),title:'',section:sections[0],content:emptyV2SessionContent()}])}>Add course session</button>
  </section>;
}

export function CourseSessionsPreview({ sessions }: { sessions: V2CourseSession[] }) {
  return <section aria-label="Course content preview"><h4>Course content preview</h4>
    {sessions.length===0 ? <p>No course sessions in this revision.</p> : <ol className={styles.list}>{sessions.map((session) => <li key={session.key}>
      <strong>{session.title} · {session.section}</strong><p>Undated course content</p>
      {(Object.entries(V2_SESSION_CONTENT_LABELS) as [V2SessionContentKind,string][]).map(([kind,label]) => <div key={kind}>
        <p>{label}: {session.content[kind].length}</p>
        <ul>{session.content[kind].map((item) => <li key={item.key}>{item.title} — <span style={{overflowWrap:'anywhere'}}>{item.url}</span></li>)}</ul>
      </div>)}
    </li>)}</ol>}
  </section>;
}
