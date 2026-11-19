'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox } from 'react-aria-components';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { courseReadmePosition } from '@/lib/v2CourseReadmes';
import { v2SessionStages } from '@/lib/v2SessionPresentation';
import { resourceOrderChoices } from '@/lib/adminResourceOrder';
import { CONTENT_PLACEMENTS, type ContentDocument, type ContentTarget, type ContentWorkspace } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';
const targetKey = (target: Pick<ContentTarget, 'batchId' | 'sessionKey'>) => `${target.batchId}:${target.sessionKey}`;
export default function PlacementEditor({document: savedDocument,workspace,onChange,itemId,onRemoveResource}:{itemId?:string;document:ContentDocument;workspace:ContentWorkspace;onChange:(value:ContentDocument)=>void;onRemoveResource?:()=>void}) {
  const [search,setSearch]=useState(''), [open,setOpen]=useState(false);
  const [document,setDocument]=useState(savedDocument);
  const remembered=useRef(new Map<string,ContentTarget>());
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const titleId=useId(), helpId=useId(), emptyId=useId();
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
  const stage=v2SessionStages(first?.sessionKey).find(item=>item.kind===savedDocument.kind)?.title??'Session name';
  const update=(target:ContentTarget,patch:Partial<ContentTarget>)=>setDocument(current=>({...current,targets:current.targets.map(item=>targetKey(item)===targetKey(target)?{...item,...patch}:item)}));
  const destinations=workspace.courses.flatMap(course=>course.sessions.filter(session=>
    (course.productCode!=='full_course'&&(!courseReadmePosition(session.key)||document.kind==='preSessionReads'))
    || savedDocument.targets.some(target=>target.batchId===course.batchId&&target.sessionKey===session.key)
  ).map(session=>({batchId:course.batchId,sessionKey:session.key,courseTitle:course.title,sessionTitle:session.title,publicationRevision:course.publicationRevision})));
  for(const target of savedDocument.targets) {
    if(destinations.some(item=>targetKey(item)===targetKey(target)))continue;
    const course=workspace.courses.find(item=>item.batchId===target.batchId);
    destinations.push({batchId:target.batchId,sessionKey:target.sessionKey,courseTitle:course?.title??'Unavailable course',sessionTitle:course?.anchors.find(item=>item.key===target.sessionKey)?.title??'Unavailable session',publicationRevision:target.publicationRevision});
  }
  const matches=destinations.filter(item=>`${item.courseTitle} ${item.sessionTitle}`.toLowerCase().includes(search.trim().toLowerCase()));
  const groups=Array.from(new Set(matches.map(item=>item.batchId)));
  function toggle(destination:typeof destinations[number],selected:boolean) {
    setDocument(current=>{
      const key=targetKey(destination),existing=current.targets.find(item=>targetKey(item)===key);
      if(!selected){if(existing)remembered.current.set(key,existing);return {...current,targets:current.targets.filter(item=>targetKey(item)!==key)};}
      if(existing)return current;
      const restored=remembered.current.get(key)??{batchId:destination.batchId,sessionKey:destination.sessionKey,publicationRevision:destination.publicationRevision,placement:'session' as const,anchorKey:null,replaceKey:null,order:100};
      return {...current,targets:[...current.targets,restored]};
    });
  }
  return <>
    <div className={styles.locationSummary} role="group" aria-label="Resource location">
      <div><span className={styles.locationCaption}>Appears in</span>{first?<><strong>{course?.title??'Unavailable course'}</strong><p>{session?.title??'Unavailable session'}</p><small>{stage}{first.placement!=='session'?` · ${CONTENT_PLACEMENTS[first.placement]}`:''}{savedDocument.targets.length>1?` · +${savedDocument.targets.length-1} more locations`:''}</small></>:<p>No location selected</p>}</div>
      <button ref={trigger} type="button" className={styles.textButton} aria-label="Change resource locations" onClick={()=>{const copy=structuredClone(savedDocument);setDocument(copy);remembered.current=new Map(copy.targets.map(target=>[targetKey(target),target]));setSearch('');setOpen(true);}}>{first?'Change':'Choose location'}</button>
    </div>
    {open&&createPortal(<dialog ref={dialog} className={`${styles.workspace} ${styles.locationDialog} ${styles.pickerDialog}`} aria-labelledby={titleId} aria-describedby={helpId} onCancel={event=>{event.preventDefault();setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);}}}>
      <header className={styles.locationDialogHeading}><div><h2 id={titleId}>Resource locations</h2><p id={helpId}>Check to add a session. Uncheck to remove it. Changes stay in the draft.</p></div><button type="button" aria-label="Close location editor" onClick={()=>setOpen(false)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>
      <div className={styles.pickerSearch}><label htmlFor={`${titleId}-search`}>Find a session</label><div><input id={`${titleId}-search`} type="search" autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses or sessions"/>{search&&<button type="button" className={styles.textButton} onClick={()=>setSearch('')}>Clear search</button>}</div></div>
      <div className={styles.pickerBody}>
        {groups.map(batchId=><fieldset key={batchId} className={styles.destinationGroup}><legend>{matches.find(item=>item.batchId===batchId)?.courseTitle}</legend>{matches.filter(item=>item.batchId===batchId).map(destination=>{
          const target=document.targets.find(item=>targetKey(item)===targetKey(destination));
          const course=workspace.courses.find(item=>item.batchId===batchId);
          const ordering=target?resourceOrderChoices(document,target,workspace,itemId):null;
          return <div key={targetKey(destination)} className={styles.destinationRow} data-selected={!!target}>
            <Checkbox className={styles.destinationCheck} isSelected={!!target} onChange={selected=>toggle(destination,selected)}><span className={styles.checkBoxMark} aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6"/></svg></span><span>{destination.sessionTitle}</span></Checkbox>
            {target&&<details className={styles.destinationOptions}><summary aria-label={`Options for ${destination.sessionTitle}`}>Options</summary><div>
              {document.kind!=='heading'&&ordering&&<><label>Position in this location<select aria-label="Position in this location" value={target.order} onChange={e=>update(target,{order:Number(e.target.value)})}>{ordering.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{ordering.peers.length>0&&<ol className={styles.orderPreview} aria-label="Draft resource order">{[...ordering.peers.map(item=>({...item,current:false})),{title:document.title||'This resource',order:target.order,current:true}].sort((a,b)=>a.order-b.order).map((item,index)=><li key={index} aria-current={item.current?'true':undefined}>{item.title}{item.current?' · this resource':''}</li>)}</ol>}</>}
              {!courseReadmePosition(target.sessionKey)&&['preSessionReads','postSessionReads'].includes(document.kind)&&<label>Location<select aria-label="Location" value={target.placement} onChange={e=>{const placement=e.target.value as ContentTarget['placement'];update(target,{placement,anchorKey:placement.includes('video')?course?.anchors.find(s=>s.key===target.sessionKey)?.content.recordings[0]?.key??null:null});}}>{Object.entries(CONTENT_PLACEMENTS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
              {target.placement.includes('video')&&<label>Recording<select aria-label="Recording" value={target.anchorKey??''} onChange={e=>update(target,{anchorKey:e.target.value||null})}><option value="">Choose a recording</option>{(course?.anchors.find(s=>s.key===target.sessionKey)?.content.recordings??[]).map(item=><option key={item.key} value={item.key}>{item.title}</option>)}</select></label>}
            </div></details>}
          </div>;
        })}</fieldset>)}
        {!matches.length&&<p className={styles.pickerEmpty}>No matching sessions. Try a different search.</p>}
      </div>
      <footer className={styles.pickerFooter}>
        {!document.targets.length&&<div id={emptyId} className={styles.pickerEmpty}><p>Choose at least one session to keep this resource.</p>{onRemoveResource?<button type="button" className={styles.textButton} onClick={()=>{setOpen(false);onRemoveResource();}}>Review removal everywhere</button>:<p>{itemId?'To remove it everywhere, cancel, save other edits, then choose More actions → Delete resource.':savedDocument.targets.some(target=>target.replaceKey)?'To remove it everywhere, cancel and use Delete beside the resource in its session.':'Cancel to discard these location changes.'}</p>}</div>}
        <div><span role="status">{document.targets.length} selected</span><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="button" className={styles.primary} disabled={!document.targets.length} aria-describedby={!document.targets.length?emptyId:undefined} onClick={()=>{if(changed)onChange({...savedDocument,targets:document.targets});setOpen(false);}}>Apply locations</button></div>
      </footer>
    </dialog>,globalThis.document.body)}
  </>;
}
