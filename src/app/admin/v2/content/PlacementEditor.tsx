'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import { resourceOrderChoices } from '@/lib/adminResourceOrder';
import { CONTENT_PLACEMENTS, type ContentDocument, type ContentTarget, type ContentWorkspace } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';
export default function PlacementEditor({document: savedDocument,workspace,onChange,itemId}:{itemId?:string;document:ContentDocument;workspace:ContentWorkspace;onChange:(value:ContentDocument)=>void}) {
  const [search,setSearch]=useState(''), [open,setOpen]=useState(false);
  const [document,setDocument]=useState(savedDocument);
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const titleId=useId(), helpId=useId();
  const changed=JSON.stringify(document.targets)!==JSON.stringify(savedDocument.targets);
  useAdminDraftGuard(open && changed);
  useEffect(()=>{
    if(!open)return;
    const current=dialog.current, opener=trigger.current;current?.showModal();
    return()=>{current?.close();opener?.focus();};
  },[open]);
  const first=savedDocument.targets[0];
  const course=workspace.courses.find(item=>item.batchId===first?.batchId);
  const session=course?.anchors.find(item=>item.key===first?.sessionKey)??course?.sessions.find(item=>item.key===first?.sessionKey);
  const stage=V2_SESSION_STAGES.find(item=>item.kind===savedDocument.kind)?.title??'Session name';
  const update=(target:ContentTarget,patch:Partial<ContentTarget>)=>setDocument({...document,targets:document.targets.map(item=>item===target?{...item,...patch}:item)});
  return <>
    <div className={styles.locationSummary} role="group" aria-label="Resource location">
      <div><span className={styles.locationCaption}>Appears in</span>{first?<><strong>{course?.title??'Unavailable course'}</strong><p>{session?.title??'Unavailable session'}</p><small>{stage}{first.placement!=='session'?` · ${CONTENT_PLACEMENTS[first.placement]}`:''}{savedDocument.targets.length>1?` · +${savedDocument.targets.length-1} more locations`:''}</small></>:<p>No location selected</p>}</div>
      <button ref={trigger} type="button" className={styles.textButton} aria-label="Change resource locations" onClick={()=>{setDocument(structuredClone(savedDocument));setSearch('');setOpen(true);}}>{first?'Change':'Choose location'}</button>
    </div>
    {open&&createPortal(<dialog ref={dialog} className={`${styles.workspace} ${styles.locationDialog}`} aria-labelledby={titleId} aria-describedby={helpId} onCancel={event=>{event.preventDefault();setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);}}}>
      <header className={styles.locationDialogHeading}><div><h2 id={titleId}>Resource locations</h2><p id={helpId}>Choose the sessions and position for this resource. Changes apply to the draft only.</p></div><button type="button" autoFocus aria-label="Close location editor" onClick={()=>setOpen(false)}>×</button></header>
      <div className={styles.locationDialogBody}>

    <ul className={styles.placementList}>{document.targets.map(target=>{const course=workspace.courses.find(item=>item.batchId===target.batchId),session=course?.sessions.find(item=>item.key===target.sessionKey);const ordering=resourceOrderChoices(document,target,workspace,itemId);return <li key={`${target.batchId}:${target.sessionKey}`}><strong>{course?.title??'Unavailable course'}</strong><p>{course?.anchors.find(item=>item.key===target.sessionKey)?.title??session?.title??'Unavailable session'}</p>
      {document.kind!=='heading'&&<><label>Position in this location<select aria-label="Position in this location" value={target.order} onChange={e=>update(target,{order:Number(e.target.value)})}>{ordering.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{ordering.peers.length>0&&<ol className={styles.orderPreview} aria-label="Draft resource order">{[...ordering.peers.map(item=>({...item,current:false})),{title:document.title||'This resource',order:target.order,current:true}].sort((a,b)=>a.order-b.order).map((item,index)=><li key={index} aria-current={item.current?'true':undefined}>{item.title}{item.current?' · this resource':''}</li>)}</ol>}</>}
      <details><summary>Placement settings</summary><label>Location<select value={target.placement} onChange={e=>{const placement=e.target.value as ContentTarget['placement'];update(target,{placement,anchorKey:placement.includes('video')?course?.anchors.find(s=>s.key===target.sessionKey)?.content.recordings[0]?.key??null:null});}}>{Object.entries(CONTENT_PLACEMENTS).filter(([key])=>['preSessionReads','postSessionReads'].includes(document.kind)||key==='session').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {target.placement.includes('video')&&<label>Recording<select value={target.anchorKey??''} onChange={e=>update(target,{anchorKey:e.target.value||null})}><option value="">Choose a recording</option>{(course?.anchors.find(s=>s.key===target.sessionKey)?.content.recordings??[]).map(item=><option key={item.key} value={item.key}>{item.title}</option>)}</select></label>}
        <button type="button" onClick={()=>setDocument({...document,targets:document.targets.filter(item=>item!==target)})}>Remove this placement</button>
      </details></li>;})}</ul>
    <details className={styles.disclosure}><summary>Add another course or session</summary><label>Find a destination<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Course or session title"/></label><div className={styles.targets}>{workspace.courses.filter(course=>course.productCode!=='full_course').map(course=><fieldset key={course.batchId}><legend>{course.title}</legend>{course.sessions.filter(session=>(course.title+' '+session.title).toLowerCase().includes(search.toLowerCase())).map(session=>{const selected=document.targets.some(item=>item.batchId===course.batchId&&item.sessionKey===session.key);return <label key={session.key} className={styles.checkbox}><input type="checkbox" checked={selected} disabled={selected} onChange={()=>setDocument({...document,targets:[...document.targets,{batchId:course.batchId,sessionKey:session.key,publicationRevision:course.publicationRevision,placement:'session',anchorKey:null,replaceKey:null,order:100}]})}/>{session.title}{selected?' · already selected':''}</label>;})}</fieldset>)}</div></details>
      </div><footer className={styles.locationDialogActions}><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="button" className={styles.primary} disabled={!document.targets.length} onClick={()=>{if(changed)onChange({...savedDocument,targets:document.targets});setOpen(false);}}>Apply locations</button></footer>
    </dialog>,globalThis.document.body)}
  </>;
}
