'use client';
import { useMemo, useState } from 'react';
import { MockRichContent } from './MockRichContent';

type Question = { id:string; section:string; question_type:string; difficulty:string; content_json?:unknown; mock_questions?:{ source_external_id:string } };
type Assessment = { id:string; name:string; purpose:string; status:string; draft_version:number; mock_assessment_versions?:Array<{id:string;version_number:number}> };
type Item = { section:string; question_revision_id:string; display_order:number; stimulus_group_key?:string|null };
type Reference = { questions:Question[]; courses:Array<{id:string;name:string}> };

function excerpt(value:unknown, max=130):string {
  const read=(input:unknown):string => {
    if (typeof input === 'string' || typeof input === 'number') return String(input);
    if (Array.isArray(input)) return input.map(read).join(' ');
    if (!input || typeof input !== 'object') return '';
    const node=input as Record<string,unknown>;
    return read(node.blocks ?? node.children ?? node.content ?? node.text ?? node.value ?? '');
  };
  const text=read(value).replace(/\s+/g,' ').trim();
  return text.length > max ? `${text.slice(0,max-1)}…` : text;
}
const label=(section:string) => section === 'data_insights' ? 'Data Insights' : section[0].toUpperCase()+section.slice(1);
const required=(section:string) => section === 'quant' ? 21 : section === 'verbal' ? 23 : 20;

export function MockBuilder({initialAssessments,reference}:{initialAssessments:Assessment[];reference:Reference}) {
  const [assessments,setAssessments]=useState(initialAssessments);
  const [selected,setSelected]=useState<Assessment|null>(null);
  const [selectedId,setSelectedId]=useState('');
  const [items,setItems]=useState<Item[]>([]);
  const [name,setName]=useState(''); const [purpose,setPurpose]=useState('standard');
  const [query,setQuery]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const [courseId,setCourseId]=useState(''); const [releaseAt,setReleaseAt]=useState(''); const [dueAt,setDueAt]=useState('');
  const [draggedId,setDraggedId]=useState<string|null>(null); const [activeTab,setActiveTab]=useState<'build'|'review'>('build');
  const sections=useMemo(()=>['quant','verbal','data_insights'],[]);

  async function call(body:Record<string,unknown>) {
    const response=await fetch('/api/admin/mock-builder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json(); if (!response.ok) throw new Error(data.error ?? 'Request failed.'); return data;
  }
  async function create() {
    setBusy(true); try { const data=await call({action:'create',name,purpose}); setAssessments(current=>[{id:data.id,name,purpose,status:'draft',draft_version:1},...current]); setName(''); setMessage('Draft mock created.'); }
    catch(error){setMessage(error instanceof Error?error.message:'Unable to create mock.');} finally{setBusy(false);}
  }
  async function choose(id:string) {
    const next=assessments.find(row=>row.id===id)??null; setSelectedId(id); setSelected(next); setActiveTab('build'); setMessage('');
    if(!next){setItems([]);return;} try { const response=await fetch(`/api/admin/mock-builder?assessmentId=${id}`); const data=await response.json(); if(!response.ok)throw new Error(data.error); setSelected(current=>current?{...current,...data.assessment}:current); setItems(data.items??[]); }
    catch(error){setMessage(error instanceof Error?error.message:'Unable to load composition.');}
  }
  function toggleQuestion(question:Question) {
    if(!selected)return; setItems(current=>{ const exists=current.some(item=>item.question_revision_id===question.id); if(exists)return current.filter(item=>item.question_revision_id!==question.id).map((item,index)=>({...item,display_order:index+1})); const sectionItems=current.filter(item=>item.section===question.section); return [...current,{section:question.section,question_revision_id:question.id,display_order:sectionItems.length+1}]; });
  }
  function reorder(item:Item,direction:-1|1) {
    setItems(current=>{ const rows=current.filter(row=>row.section===item.section).sort((a,b)=>a.display_order-b.display_order); const index=rows.findIndex(row=>row.question_revision_id===item.question_revision_id); const target=index+direction; if(target<0||target>=rows.length)return current; [rows[index],rows[target]]=[rows[target],rows[index]]; const order=new Map(rows.map((row,position)=>[row.question_revision_id,position+1])); return current.map(row=>order.has(row.question_revision_id)?{...row,display_order:order.get(row.question_revision_id)!}:row); });
  }
  function dropOn(item:Item) {
    if(!draggedId||draggedId===item.question_revision_id)return; setItems(current=>{ const rows=current.filter(row=>row.section===item.section).sort((a,b)=>a.display_order-b.display_order); const from=rows.findIndex(row=>row.question_revision_id===draggedId); const to=rows.findIndex(row=>row.question_revision_id===item.question_revision_id); if(from<0||to<0)return current; const [moved]=rows.splice(from,1); rows.splice(to,0,moved); const order=new Map(rows.map((row,position)=>[row.question_revision_id,position+1])); return current.map(row=>order.has(row.question_revision_id)?{...row,display_order:order.get(row.question_revision_id)!}:row); }); setDraggedId(null);
  }
  function setGroup(item:Item,value:string){setItems(current=>current.map(row=>row.question_revision_id===item.question_revision_id?{...row,stimulus_group_key:value||null}:row));}
  async function save(){if(!selected)return;setBusy(true);try{await call({action:'items',assessmentId:selected.id,items});setMessage(`Draft saved — ${items.length} question${items.length===1?'':'s'} selected. You can continue adding questions.`);}catch(error){setMessage(error instanceof Error?error.message:'Unable to save composition.');}finally{setBusy(false);}}
  async function publish(){if(!selected)return;setBusy(true);try{await call({action:'items',assessmentId:selected.id,items});const data=await call({action:'publish',assessmentId:selected.id});setSelected(current=>current?{...current,status:'published',mock_assessment_versions:[...(current.mock_assessment_versions??[]),data.version]}:current);setMessage(`Published immutable version ${data.version.version_number}.`);}catch(error){setMessage(error instanceof Error?error.message:'Publish failed.');}finally{setBusy(false);}}
  async function assign(){const assessmentId=selected?.id??selectedId;let version=selected?.mock_assessment_versions?.at(-1);if(!version&&assessmentId){try{const response=await fetch(`/api/admin/mock-builder?assessmentId=${assessmentId}`);const data=await response.json();version=data.assessment?.mock_assessment_versions?.at(-1);}catch{/* server resolves latest version */}}const targetCourseId=courseId||reference.courses.find(course=>course.name==='Full Batch Test')?.id||'';const targetReleaseAt=releaseAt||new Date(Date.now()+10*60*1000).toISOString().slice(0,16);if((!version&&!assessmentId)||!targetCourseId){setMessage('Select a published version and batch.');return;}setBusy(true);try{await call({...(version?{versionId:version.id}:{assessmentId}),courseId:targetCourseId,releaseAt:new Date(targetReleaseAt).toISOString(),dueAt:dueAt?new Date(dueAt).toISOString():null,action:'assign'});setMessage('Mock assigned. Students remain gated until release time.');}catch(error){setMessage(error instanceof Error?error.message:'Assignment failed.');}finally{setBusy(false);}}
  const arrows=(item:Item,index:number,count:number)=><><button aria-label={`Move question ${index+1} up`} className="btn btn-secondary btn-sm" disabled={index===0} onClick={()=>reorder(item,-1)} type="button">↑</button><button aria-label={`Move question ${index+1} down`} className="btn btn-secondary btn-sm" disabled={index===count-1} onClick={()=>reorder(item,1)} type="button">↓</button></>;

  return <div className="mock-question-bank">
    <section className="admin-card mock-workspace-card"><div className="admin-card-header"><div><h2 className="admin-card-title">Create a mock</h2><p className="admin-page-subtitle">Build a curated Quant, Verbal and Data Insights assessment. Save partial drafts as you go; publishing snapshots the exact composition.</p></div></div><div className="mock-form-grid"><label className="mock-field"><span>Name</span><input value={name} onChange={event=>setName(event.target.value)} placeholder="April Diagnostic" /></label><label className="mock-field"><span>Purpose</span><select value={purpose} onChange={event=>setPurpose(event.target.value)}><option value="standard">Standard</option><option value="diagnostic">Diagnostic</option></select></label><button className="btn btn-primary" disabled={busy||!name.trim()} onClick={()=>void create()}>Create Draft</button></div></section>
    <section className="admin-card mock-workspace-card"><div className="admin-card-header"><div><h2 className="admin-card-title">Mock Builder</h2><p className="admin-page-subtitle">Add and reorder questions in Build, then save, review or publish from Review.</p></div><select value={selected?.id??''} onChange={event=>void choose(event.target.value)}><option value="">Select a Draft mock</option>{assessments.map(assessment=><option key={assessment.id} value={assessment.id}>{assessment.name} · {assessment.purpose} · {assessment.status}</option>)}</select></div>
      {selected?<><div className="mock-action-row" role="tablist" aria-label="Mock workflow"><button className={`btn ${activeTab==='build'?'btn-primary':'btn-secondary'}`} role="tab" aria-selected={activeTab==='build'} onClick={()=>setActiveTab('build')}>Build</button><button className={`btn ${activeTab==='review'?'btn-primary':'btn-secondary'}`} role="tab" aria-selected={activeTab==='review'} onClick={()=>setActiveTab('review')}>Review</button></div>
      {activeTab==='build'?<><label className="mock-field"><span>Search published questions</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Question text, type or difficulty" /></label>
        {sections.map(section=>{const chosen=items.filter(item=>item.section===section).sort((a,b)=>a.display_order-b.display_order);const available=reference.questions.filter(question=>question.section===section&&`${excerpt(question.content_json)} ${question.question_type} ${question.difficulty} ${question.mock_questions?.source_external_id??''}`.toLowerCase().includes(query.toLowerCase()));return <div key={section} className="mock-preview-stack"><div className="admin-card-header"><h3 className="admin-card-title">{label(section)}</h3><div className="mock-action-row"><span className="badge badge-available">{available.length} published available</span><span className="badge badge-upcoming">{chosen.length} / {required(section)} · 45 min</span></div></div><div className="mock-question-list">{available.map(question=><label className="mock-question-row" key={question.id}><input type="checkbox" checked={chosen.some(item=>item.question_revision_id===question.id)} onChange={()=>toggleQuestion(question)} /><span><strong>{excerpt(question.content_json)}</strong><small>{question.question_type} · {question.difficulty}</small></span></label>)}</div><h4>Selected order (drag to rearrange)</h4>{chosen.map((item,index)=>{const question=reference.questions.find(row=>row.id===item.question_revision_id);return <div className="mock-question-row" key={item.question_revision_id} draggable onDragStart={()=>setDraggedId(item.question_revision_id)} onDragOver={event=>event.preventDefault()} onDrop={()=>dropOn(item)}><span>☷ {index+1}. {excerpt(question?.content_json??'')}</span><input aria-label="Stimulus group key" placeholder="Stimulus group (optional)" value={item.stimulus_group_key??''} onChange={event=>setGroup(item,event.target.value)} />{arrows(item,index,chosen.length)}<MockRichContent value={question?.content_json??null} /></div>;})}</div>;})}
        <div className="mock-action-row"><button className="btn btn-primary" onClick={()=>setActiveTab('review')}>Continue to Review</button></div></>
      :<><div className="mock-review-summary"><h3>Review mock</h3><p>Review the selected questions and reorder them here using drag and drop or the arrow buttons. Save the partial draft at any time; publishing remains gated until the required section counts and question rules are met.</p>{sections.map(section=><span key={section} className="badge badge-upcoming">{label(section)}: {items.filter(item=>item.section===section).length} / {required(section)}</span>)}</div>
        {sections.map(section=>{const chosen=items.filter(item=>item.section===section).sort((a,b)=>a.display_order-b.display_order);if(!chosen.length)return null;return <div key={section} className="mock-preview-stack"><div className="admin-card-header"><h3 className="admin-card-title">{label(section)}</h3></div>{chosen.map((item,index)=>{const question=reference.questions.find(row=>row.id===item.question_revision_id);return <div className="mock-question-row" key={item.question_revision_id} draggable onDragStart={()=>setDraggedId(item.question_revision_id)} onDragOver={event=>event.preventDefault()} onDrop={()=>dropOn(item)}><span><strong>☷ {index+1}. {excerpt(question?.content_json??'')}</strong><small>{question?.question_type??'Question'} · {question?.difficulty??''}</small><MockRichContent value={question?.content_json??null} /></span>{arrows(item,index,chosen.length)}</div>;})}</div>;})}
        <div className="mock-action-row"><button className="btn btn-secondary" title="Save the current partial selection and order as the editable Draft." disabled={busy} onClick={()=>void save()}>Save draft</button><button className="btn btn-primary" title="Save and freeze this exact question set as an immutable published version." disabled={busy} onClick={()=>void publish()}>Publish mock</button></div><div className="mock-form-grid"><label className="mock-field"><span>Assign to active batch</span><select value={courseId} onChange={event=>setCourseId(event.target.value)}><option value="">Choose batch</option>{reference.courses.map(course=><option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label className="mock-field"><span>Release at</span><input type="datetime-local" value={releaseAt} onChange={event=>setReleaseAt(event.target.value)} /></label><label className="mock-field"><span>Due at (optional)</span><input type="datetime-local" value={dueAt} onChange={event=>setDueAt(event.target.value)} /></label><button className="btn btn-secondary" disabled={busy} onClick={()=>void assign()}>Assign published version</button></div></>}
      </>:<p className="mock-empty-state">Create or select a Draft mock to begin.</p>}{message&&<p className="mock-status" role="status">{message}</p>}</section>
  </div>;
}
