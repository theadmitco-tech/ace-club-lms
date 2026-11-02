'use client';
import { useRef, useState } from 'react';
import { CONTENT_PLACEMENTS, validContentDocument, type ContentDocument, type ContentItem, type ContentPlacement, type ContentScope, type ContentTarget, type ContentWorkspace } from '@/lib/v2ContentPublishing';
import { V2_SESSION_CONTENT_LABELS } from '@/lib/v2Templates';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { createClient } from '@/utils/supabase/client';
import { CONTENT_BUCKET, CONTENT_UPLOAD_LIMIT, CONTENT_MIME, contentAssetExtension } from '@/lib/v2ContentAssets';
import styles from './content.module.css';
const empty=():ContentDocument=>({title:'',kind:'preSessionReads',url:'',targets:[]});
async function operation(action:string,input:Record<string,unknown>) {
  const response=await fetch('/api/admin/v2/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input})});
  const value=await response.json();if(!response.ok)throw new Error(value.error||'The action could not be confirmed.');return value;
}
export default function ContentEditor({initial}:{initial:ContentWorkspace}) {
  const [workspace,setWorkspace]=useState(initial),[selected,setSelected]=useState<ContentItem|null>(null),[document,setDocument]=useState<ContentDocument>(empty);
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[scope,setScope]=useState<ContentScope|null>(null);
  const [placement,setPlacement]=useState<ContentPlacement>('session'),[order,setOrder]=useState(100),[subject,setSubject]=useState('all');
  const pending=useRef<{id:string;requestId:string}|null>(null),confirmation=useRef<string|null>(null);
  useAdminDraftGuard(dirty || busy);
  function edit(value:ContentDocument){setDocument(value);setDirty(true);setScope(null);pending.current=null;confirmation.current=null;}
  function choose(item:ContentItem|null){if(busy || dirty&&!window.confirm('Discard unsaved content changes?'))return;setSelected(item);setDocument(item?structuredClone(item.document):empty());setDirty(false);setScope(null);setMessage('');setPlacement('session');pending.current=null;confirmation.current=null;}
  const rows=workspace.courses.flatMap(course=>course.sessions.map(session=>({course,session}))).filter(row=>subject==='all'||row.session.section===subject);
  function target(batchId:string,sessionKey:string):ContentTarget {
    const row=rows.find(r=>r.course.batchId===batchId&&r.session.key===sessionKey)!;
    return {batchId,sessionKey,publicationRevision:row.course.publicationRevision,placement,anchorKey:placement.includes('video')?row.course.anchors.find(s=>s.key===sessionKey)?.content.recordings[0]?.key??null:null,replaceKey:null,order};
  }
  async function run(task:()=>Promise<void>){setBusy(true);setMessage('');try{await task();}catch(e){setMessage(e instanceof Error?e.message:'The action could not be confirmed.');}finally{setBusy(false);}}
  async function upload(file:File){
    const extension=contentAssetExtension(file.name);
    if(!extension||file.size<1||file.size>CONTENT_UPLOAD_LIMIT){setMessage('An MP4, WebM or PDF up to 50 MiB is required.');return;}
    await run(async()=>{
      const prepared=await operation('upload',{extension,type:CONTENT_MIME[extension],size:file.size});
      const {error}=await createClient().storage.from(CONTENT_BUCKET).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:CONTENT_MIME[extension],upsert:false});
      if(error)throw new Error('The upload failed. A fresh upload can be attempted; published content is unchanged.');
      edit({...document,url:prepared.reference});setMessage('Private upload complete. Save the draft and review publication to make it available.');
    });
  }
  async function save(){if(!validContentDocument(document)){setMessage('A title, valid source and complete target selection are required. Video placements need a recording anchor.');return;}
    await run(async()=>{pending.current??={id:selected?.id??crypto.randomUUID(),requestId:crypto.randomUUID()};const result=await operation('save',{...pending.current,revision:selected?.draft_revision??0,document});
      const current=await operation('workspace',{}) as ContentWorkspace;setWorkspace(current);const saved=current.items.find(i=>i.id===result.id)!;setSelected(saved);setDocument(saved.document);setDirty(false);pending.current=null;setMessage('Draft saved. Student content is unchanged until publication is confirmed.');});}
  async function review(action:ContentScope['action']){if(!selected||dirty)return;await run(async()=>{setScope(await operation('scope',{id:selected.id,revision:selected.draft_revision,action}));confirmation.current=crypto.randomUUID();});}
  async function confirm(){if(!scope)return;await run(async()=>{await operation('confirm',{...scope,requestId:confirmation.current});const current=await operation('workspace',{}) as ContentWorkspace;setWorkspace(current);const item=current.items.find(i=>i.id===scope.id)!;setSelected(item.deleted?null:item);setDocument(item.deleted?empty():item.document);setScope(null);setDirty(false);setMessage('The reviewed content action is confirmed.');});}
  function manageOriginal(batchId:string,sessionKey:string,kind:ContentDocument['kind'],key:string|null){
    if(busy || dirty&&!window.confirm('Discard unsaved content changes?'))return;
    const course=workspace.courses.find(c=>c.batchId===batchId)!,session=course.sessions.find(s=>s.key===sessionKey)!;
    const item=kind==='heading'?null:session.content[kind].find(i=>i.key===key)!;
    const existing=workspace.items.find(i=>i.document.kind===kind&&i.document.targets.some(t=>t.batchId===batchId&&t.sessionKey===sessionKey&&(kind==='heading'||t.replaceKey===key)));
    if(existing){setDirty(false);setSelected(existing);setDocument(structuredClone(existing.document));setScope(null);setMessage('');pending.current=null;confirmation.current=null;return;}
    setSelected(null);setDocument({title:item?.title??session.title,kind,url:item?.url??null,targets:[{batchId,sessionKey,publicationRevision:course.publicationRevision,placement:'session',anchorKey:null,replaceKey:key,order:100}]});setDirty(true);setScope(null);pending.current=null;
  }
  return <div className={styles.layout}>
    <aside className={styles.library}><div className={styles.row}><h2>Content library</h2><button type="button" onClick={()=>choose(null)} disabled={busy}>New item</button></div>
      <p>Published originals remain intact. Managed items provide independently reviewed changes.</p>
      <ul>{workspace.items.filter(i=>!i.deleted).map(item=><li key={item.id}><button type="button" onClick={()=>choose(item)} aria-current={selected?.id===item.id?'true':undefined}>{item.document.title}<small>{item.visible?'Published':'Unpublished'} · Draft {item.draft_revision}{item.published_revision!==item.draft_revision?' · Unpublished changes':''}</small></button></li>)}</ul>
      <details><summary>Manage an existing session or resource</summary>{workspace.courses.map(c=><details key={c.batchId}><summary>{c.title}</summary>{c.sessions.map(s=><details key={s.key}><summary>{s.title}</summary><button type="button" onClick={()=>manageOriginal(c.batchId,s.key,'heading',null)}>Edit session heading</button>{Object.entries(s.content).flatMap(([kind,items])=>items.map(i=><button key={i.key} type="button" onClick={()=>manageOriginal(c.batchId,s.key,kind as ContentDocument['kind'],i.key)}>{V2_SESSION_CONTENT_LABELS[kind as keyof typeof V2_SESSION_CONTENT_LABELS]}: {i.title}</button>))}</details>)}</details>)}</details>
    </aside>
    <section className={styles.editor} aria-label="Independent content editor"><h2>{selected?'Edit content':'New content'}</h2>
      <form onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy||selected?.deleted}><legend>Student-facing content</legend>
        <label>Content type<select value={document.kind} onChange={e=>{const kind=e.target.value as ContentDocument['kind'];edit({...document,kind,url:kind==='heading'?null:document.url??'',targets:[]});setPlacement('session');}}><option value="heading">Session heading</option>{Object.entries(V2_SESSION_CONTENT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label>Title<input required maxLength={120} value={document.title} onChange={e=>edit({...document,title:e.target.value})}/></label>
        {document.kind!=='heading'&&<label>Resource URL<input required value={document.url??''} onChange={e=>edit({...document,url:e.target.value})} placeholder="https://…"/><small>Existing Notion, recording and protected PDF references remain supported.</small></label>}
        {document.kind!=='heading'&&<label>Upload a private file<input type="file" accept={document.kind==='recordings'?'.mp4,.webm':'.pdf'} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/><small>MP4 / WebM recordings or PDF resources, up to 50 MiB. Larger recordings can use an existing hosted source.</small></label>}
        <div className={styles.row}><label>Placement for new targets<select value={placement} onChange={e=>setPlacement(e.target.value as ContentPlacement)}>{Object.entries(CONTENT_PLACEMENTS).filter(([k])=>['preSessionReads','postSessionReads'].includes(document.kind)||k==='session').map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Display order<input type="number" min={0} max={9999} value={order} onChange={e=>setOrder(Number(e.target.value))}/><small>Lower values appear first. Existing items use 100, 200, 300…</small></label></div>
        <label>Subject filter<select value={subject} onChange={e=>setSubject(e.target.value)}><option value="all">All subjects</option><option value="quant">Quant</option><option value="verbal">Verbal</option><option value="di">DI</option><option value="programme">Programme</option></select></label>
        <div className={styles.row}><button type="button" onClick={()=>edit({...document,targets:document.targets.map(t=>({...t,publicationRevision:workspace.courses.find(c=>c.batchId===t.batchId)?.publicationRevision??t.publicationRevision}))})}>Use current course revisions</button><button type="button" onClick={()=>{const targets=rows.filter(r=>!placement.includes('video')||r.course.anchors.find(s=>s.key===r.session.key)?.content.recordings.length).map(r=>target(r.course.batchId,r.session.key));edit({...document,targets});}}>Select all matching sessions</button><button type="button" onClick={()=>edit({...document,targets:[]})}>Clear scope</button></div>
        <div className={styles.targets}>{rows.map(({course,session})=>{const t=document.targets.find(t=>t.batchId===course.batchId&&t.sessionKey===session.key);return <div key={`${course.batchId}:${session.key}`} className={styles.target}><label><input type="checkbox" checked={!!t} onChange={()=>edit({...document,targets:t?document.targets.filter(x=>x!==t):[...document.targets,target(course.batchId,session.key)]})}/><span>{course.title} · {session.title}</span></label>{t&&<><label>Placement<select value={t.placement} onChange={e=>{const placement=e.target.value as ContentPlacement;edit({...document,targets:document.targets.map(x=>x===t?{...x,placement,anchorKey:placement.includes('video')?course.anchors.find(s=>s.key===session.key)?.content.recordings[0]?.key??null:null}:x)});}}>{Object.entries(CONTENT_PLACEMENTS).filter(([k])=>['preSessionReads','postSessionReads'].includes(document.kind)||k==='session').map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><small>{CONTENT_PLACEMENTS[t.placement]}{t.replaceKey?' · Replaces an original item':''}</small><label>Item order<input type="number" min={0} max={9999} value={t.order} onChange={e=>edit({...document,targets:document.targets.map(x=>x===t?{...x,order:Number(e.target.value)}:x)})}/></label>{t.placement.includes('video')&&<label>Recording anchor<select value={t.anchorKey??''} onChange={e=>edit({...document,targets:document.targets.map(x=>x===t?{...x,anchorKey:e.target.value||null}:x)})}><option value="">Choose recording</option>{(course.anchors.find(s=>s.key===session.key)?.content.recordings??[]).map(r=><option key={r.key} value={r.key}>{r.title}</option>)}</select></label>}</>}</div>;})}</div>
        <p>{document.targets.length} session placements selected. Content is tied to the reviewed course publication. A later batch publication requires another scope review.</p><button type="submit">{busy?'Saving…':'Save draft'}</button>
      </fieldset></form>
      {message&&<p role="status" className={styles.notice}>{message}</p>}
      {selected&&!selected.deleted&&<section aria-label="Content publication"><h3>Preview & publish</h3>{dirty?<p>Unsaved changes must be saved before preview or publication.</p>:<><div className={styles.row}>{Array.from(new Set(document.targets.map(t=>t.batchId))).map(id=><a key={id} href={`/admin/v2/content/preview/${id}?item=${selected.id}&revision=${selected.draft_revision}`} target="_blank" rel="noreferrer">Student preview: {workspace.courses.find(c=>c.batchId===id)?.title}</a>)}</div><div className={styles.row}><button disabled={busy} onClick={()=>void review('publish')}>Review publication</button><button disabled={busy||!selected.visible} onClick={()=>void review('unpublish')}>Review unpublish</button><button disabled={busy} onClick={()=>void review('delete')}>Review deletion</button></div></>}
      {scope&&<section className={styles.confirm} aria-label="Confirm content scope"><h3>Confirm {scope.action}</h3><p>The following current and previous placements are affected. Original course records remain preserved. Unpublishing or deleting a previously published replacement hides its original target too. Deleting a draft that has never been published leaves the original unchanged.</p><ul>{scope.targets.map((t,i)=><li key={i}>{t.courseTitle??'Unavailable course'} → {t.sessionTitle??'Unavailable session'} · {CONTENT_PLACEMENTS[t.placement]}</li>)}</ul><button disabled={busy} onClick={()=>void confirm()}>Confirm {scope.action} now</button><button disabled={busy} onClick={()=>setScope(null)}>Cancel</button></section>}</section>}
    </section>
  </div>;
}
