'use client';
import { useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftNavigation } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, type V2TemplateDraft } from '@/lib/v2Templates';
import type { V2Publication } from '@/lib/v2Publications';
import BatchDraftEditor from './BatchDraftEditor';
import PublicationPanel from './PublicationPanel';
import PublicationScopePanel from './PublicationScopePanel';
export default function BatchWorkspace({drafts,templates,publications,ownerId}:{drafts:V2BatchDraft[];templates:V2TemplateDraft[];publications:V2Publication[];ownerId:string}) {
  const [active,setActive]=useState<V2BatchDraft|null|undefined>(undefined),[tab,setTab]=useState<'edit'|'publish'>('edit'),[search,setSearch]=useState('');
  const {confirmLeave}=useAdminDraftNavigation();
  function open(batch:typeof active){if(confirmLeave()){setActive(batch);setTab('edit');}}
  const current=active ? drafts.find(batch=>batch.id===active.id&&batch.revision>active.revision)??active : null;
  return <div><p className="workflow-kicker">Schedule & delivery</p><div className="admin-page-header"><div><h1 className="admin-page-title">{active===undefined?'Batches':current?.title??'Create a batch'}</h1><p className="admin-page-subtitle">Course content and live schedules stay separate. Dates use India Standard Time.</p></div>{active===undefined&&<button className="btn btn-primary" onClick={()=>open(null)}>Create batch</button>}</div>
    {active===undefined?<><label className="workflow-search">Find a batch<input type="search" placeholder="Search batch title" value={search} onChange={e=>setSearch(e.target.value)}/></label><section className="admin-card">{drafts.filter(batch=>batch.title.toLowerCase().includes(search.toLowerCase())).map(batch=>{const published=publications.find(item=>item.batchId===batch.id);return <article key={batch.id} className="workflow-batch-row"><div><h2>{batch.title}</h2><p className="workflow-muted">{V2_TEMPLATE_PRODUCTS[batch.productCode].label} · {batch.events.some(event=>event.kind!=='outline')?'Live classes & recordings':'Recording library'}</p><span className="workflow-pill">{published?.state==='published'?(published.batchRevision===batch.revision?'Published':'Published · draft changes'):published?'Unpublished':'Draft'}</span></div><button className="btn btn-secondary" onClick={()=>open(batch)}>Open batch</button></article>;})}{!drafts.length&&<p>No batches yet. A saved course template is required before a batch can be prepared.</p>}{!!drafts.length&&!drafts.some(batch=>batch.title.toLowerCase().includes(search.toLowerCase()))&&<p>No batches match this search.</p>}</section>
      <div className="workflow-actions"><Link href="/admin/v2/templates">Prepare course templates</Link><Link href="/admin/courses">Existing batches</Link></div><details className="workflow-secondary"><summary>Publish across several offerings</summary><p>This advanced workflow reviews the complete impact across named courses.</p><PublicationScopePanel ownerId={ownerId}/></details></>
      : <><button className="btn btn-secondary" onClick={()=>open(undefined)}>← All batches</button>{current&&<><div className="workflow-tabs" aria-label="Batch task"><button aria-pressed={tab==='edit'} onClick={()=>{if(confirmLeave())setTab('edit');}}>Course & schedule</button><button aria-pressed={tab==='publish'} onClick={()=>{if(confirmLeave())setTab('publish');}}>Review & publish</button></div><div className="workflow-actions"><Link href={`/admin/v2/batches/${current.id}/students`}>Students & enrollment</Link>{current.events.some(event=>event.kind!=='outline')&&<><Link href={`/admin/v2/batches/${current.id}/live`}>Live registration & completion</Link><Link href={`/admin/v2/batches/${current.id}/meeting`}>Private meeting details</Link></>}</div></>}
        {tab==='edit'?<BatchDraftEditor key={current?.id??'new'} focused initialDraft={current} drafts={drafts} templates={templates} ownerId={ownerId} onSaved={setActive}/>:current&&<PublicationPanel key={current.id} drafts={[current]} publications={publications} ownerId={ownerId}/>}
      </>}
  </div>;
}
