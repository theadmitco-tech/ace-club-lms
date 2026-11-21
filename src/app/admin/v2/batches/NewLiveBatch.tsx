'use client';

import { useRef, useState, type FormEvent } from 'react';
import { validCurriculumSources, type CurriculumSource } from '@/lib/v2CurriculumLinks';
import { curriculumLibraries, curriculumClasses } from '@/lib/v2BatchCurriculum';
import { courseReadmePosition } from '@/lib/v2CourseReadmes';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isLiveBatchSetup, type LiveBatchSetup, type LiveBatchSubject as Subject, type LiveBatchClassInput as ClassInput } from '@/lib/v2LiveBatchSetup';
import { isV2BatchDate, isV2BatchProposal, validateV2BatchInput, type V2BatchProposal, type V2BatchInput, type V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, validateV2TemplateSave, type V2TemplateDraft, type V2TemplateSaveInput } from '@/lib/v2Templates';
import { saveTemplateDraftAction } from '../templates/actions';
import { previewBatchDraftAction, saveBatchDraftAction } from './actions';
import { BatchDatePicker } from './BatchDatePicker';
import styles from './batchWorkspace.module.css';

type Prepared = { sources?: CurriculumSource[]; request: V2TemplateSaveInput; startDate: string; batchRequest?: V2BatchInput; proposal?: V2BatchProposal };
function isPrepared(value: unknown): value is Prepared {
  if (!value || typeof value !== 'object') return false;
  const item = value as Prepared;
  return (item.sources === undefined || validCurriculumSources(item.sources)) && typeof item.startDate === 'string' && isV2BatchDate(item.startDate)
    && validateV2TemplateSave(item.request) === null && item.request.expectedRevision === 0 && item.request.document.events.length > 0
    && (item.batchRequest === undefined || (validateV2BatchInput(item.batchRequest) === null && item.batchRequest.expectedRevision === 0
      && item.batchRequest.templateId === item.request.id && item.batchRequest.templateRevision === 1
      && item.batchRequest.startDate === item.startDate && item.batchRequest.title === item.request.document.title))
    && (item.proposal === undefined || (!!item.batchRequest && isV2BatchProposal(item.proposal) && item.proposal.draft.id === item.batchRequest.id
      && item.proposal.draft.templateId === item.request.id && item.proposal.draft.revision === 1));
}
const newClass = (subject: Subject): ClassInput => ({ key: crypto.randomUUID(), title: '', date: '', time: '19:00', duration: 60, section: subject === 'full_course' ? 'quant' : subject });
export default function NewLiveBatch({ drafts, ownerId, onSaved }: {
  templates: V2TemplateDraft[]; drafts: V2BatchDraft[]; ownerId: string; onSaved: (batch: V2BatchDraft) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LiveBatchSetup>(() => {
    const library = curriculumLibraries(drafts, 'quant')[0];
    return {subject:'quant', title:'', sourceId:library?.id ?? '', createFeedbackSessions:true, classes:library ? curriculumClasses([library]) : []};
  });
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [formChanged, setFormChanged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [removedClass, setRemovedClass] = useState<{ item: ClassInput; index: number } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const scheduleHistory = useRef<LiveBatchSetup[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [undoMessage, setUndoMessage] = useState('');
  const { subject, title, sourceId, classes } = form;
  const formRecovery = useDraftRecovery<LiveBatchSetup>(ownerId, 'v2-live-batch-form', isLiveBatchSetup);
  const recovery = useDraftRecovery<Prepared>(ownerId, 'v2-live-batch-setup', isPrepared);
  useAdminDraftGuard(formChanged || !!prepared || pending);
  const recoveryPending = !!recovery.recovered || !!formRecovery.recovered;
  const sources = curriculumLibraries(drafts, subject);
  const selectedSources = subject === 'full_course' ? ['quant','verbal','di'].flatMap(code => sources.find(item => item.productCode === code) ?? []) : sources.filter(item => item.id === sourceId);
  const datedClasses = classes.filter(item => isV2BatchDate(item.date)).length;
  const curriculumKeys = new Set(selectedSources.flatMap(item => (item.sessions ?? []).map(session => session.key)));
  function chooseSubject(next: Subject) {
    if (classes.some(item => item.date) && !window.confirm('Changing the subject replaces this class list and its dates. Continue?')) return;
    const available = curriculumLibraries(drafts, next);
    const selected = next === 'full_course' ? ['quant','verbal','di'].flatMap(code => available.find(item => item.productCode === code) ?? []) : available.slice(0,1);
    changeForm({subject:next,sourceId:selected[0]?.id ?? '',classes:curriculumClasses(selected)});setRemovedClass(null);
  }
  function changeForm(patch: Partial<LiveBatchSetup>, undoable = false) {
    if (recoveryPending || prepared || busy.current) return;
    if (undoable) scheduleHistory.current = [...scheduleHistory.current.slice(-29), structuredClone(form)];
    else scheduleHistory.current = [];
    setUndoCount(scheduleHistory.current.length); setUndoMessage('');
    const next = { ...form, ...patch };
    setFormChanged(true); setForm(next); formRecovery.remember(next); setError('');
  }
  function changeClass(key: string, patch: Partial<ClassInput>) {
    changeForm({ classes: classes.map(item => item.key === key ? { ...item, ...patch } : item) }, true);
  }
  function undoSchedule() {
    if (recoveryPending || prepared || busy.current) return;
    const previous = scheduleHistory.current.pop();
    if (!previous) return;
    setForm(previous); setFormChanged(true); formRecovery.remember(previous);
    setUndoCount(scheduleHistory.current.length); setError(''); setUndoMessage('Last scheduling change undone.');
  }
  async function persist(value: Prepared) {
    if (busy.current) return;
    const next: Prepared = { ...value, batchRequest: value.batchRequest ?? {
      id: crypto.randomUUID(), templateId: value.request.id, templateRevision: 1, expectedRevision: 0,
      requestId: crypto.randomUUID(), title: value.request.document.title, startDate: value.startDate, timeZone: 'Asia/Kolkata', events: null,
    } };
    busy.current = true; setPending(true); setError(''); setPrepared(next); recovery.remember(next);
    try {
      const template = await saveTemplateDraftAction(next.request);
      if (template.status === 'error') { setError(template.message); return; }
      let proposal = next.proposal;
      if (!proposal) {
        const preview = await previewBatchDraftAction(next.batchRequest!);
        if (preview.status === 'error') { setError(preview.message); return; }
        if (!isV2BatchProposal(preview.proposal)) { setError('The batch preview could not be checked. Retry saving this batch.'); return; }
        proposal = preview.proposal;
        const reviewed = { ...next, proposal };
        setPrepared(reviewed); recovery.remember(reviewed);
      }
      if (!proposal) { setError('The batch preview could not be checked. Retry saving this batch.'); return; }
      const result = await saveBatchDraftAction(next.batchRequest!, proposal.fingerprint, next.sources);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget(); formRecovery.forget(); onSaved(result.draft); router.refresh();
    } catch { setError('The save was interrupted. Retry to recover the same batch without creating a duplicate.'); }
    finally { busy.current = false; setPending(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || recoveryPending) return;
    if (prepared) { void persist(prepared); return; }
    if (!classes.length || classes.some(item => !isV2BatchDate(item.date))) { setError('Add at least one class with a valid date.'); return; }
    if (!selectedSources.length || (subject === 'full_course' && selectedSources.length !== 3)) { setError('Add the missing subject curriculum in Course content before creating this batch.'); return; }
    const expected = curriculumClasses(selectedSources);
    if (classes.some(item => { const original=expected.find(session=>session.key===item.key); return original && (item.title!==original.title || item.section!==original.section); })) { setError('The course sessions changed. Reload this page to schedule the latest curriculum.'); return; }
    const startDate = classes.map(item => item.date).sort()[0];
    const events = classes.map(item => ({ key: crypto.randomUUID(), title: item.title.trim(), section: subject === 'full_course' ? item.section ?? 'quant' : subject, kind: 'live' as const,
      dayOffset: (Date.parse(item.date) - Date.parse(startDate)) / 86400000, localStartTime: item.time, durationMinutes: item.duration, instructor: '', capacity: 8 }));
    const endDay = Math.max(...events.map(item => item.dayOffset + Math.ceil((Number(item.localStartTime.slice(0, 2)) * 60 + Number(item.localStartTime.slice(3)) + item.durationMinutes) / 1440)));
    const request: V2TemplateSaveInput = { id: crypto.randomUUID(), requestId: crypto.randomUUID(), expectedRevision: 0, productCode: subject,
      document: { title: title.trim(), summary: '', durationDays: endDay, sessions: [...structuredClone(selectedSources.flatMap(source => (source.sessions ?? []).filter(session => !courseReadmePosition(session.key) && classes.some(item => item.key === session.key)))), ...classes.filter(item => !curriculumKeys.has(item.key)).map(item => ({key:item.key,title:item.title,section:item.section ?? 'quant',content:{preSessionReads:[],recordings:[],postSessionReads:[],materials:[]}}))], events } };
    const invalid = validateV2TemplateSave(request);
    if (invalid) { setError(invalid); return; }
    const linkedSources = selectedSources.map(source => ({batchId:source.id,revision:source.curriculumPublicationRevision ?? source.revision,sessionKeys:(source.sessions ?? []).filter(session=>!courseReadmePosition(session.key) && classes.some(item=>item.key===session.key)).map(session=>session.key)})).filter(source=>source.sessionKeys.length>0);
    if (!validCurriculumSources(linkedSources)) {setError('Keep at least one course session in this batch.');return;}
    void persist({ request, startDate, sources:linkedSources });
  }
  return <section className={styles.setup} aria-label="New live batch setup">
    {!recovery.recovered && <DraftRecoveryNotice available={!!formRecovery.recovered} unavailable={formRecovery.unavailable} onRestore={() => { if(formRecovery.recovered){setFormChanged(true);setForm(formRecovery.recovered);formRecovery.acknowledge();} }} onDiscard={formRecovery.forget} />}
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => { if(recovery.recovered){setPrepared(recovery.recovered);formRecovery.acknowledge();recovery.acknowledge();} }} onDiscard={() => { recovery.forget();formRecovery.forget(); }} />
    {recoveryPending ? null : prepared ? <div className={styles.form} aria-busy={pending}>
      <h2>{pending ? 'Saving batch…' : 'Finish saving this batch'}</h2><p className={styles.help}>{prepared.request.document.title} · {prepared.request.document.events.length} live classes</p>
      <p className={styles.help}>The batch stays private. Retrying resumes the same save.</p>
      {!pending && <button type="button" className="btn btn-primary" onClick={() => void persist(prepared)}>Retry saving batch</button>}
    </div> : <form className={`${styles.form} ${styles.creationForm}`} onSubmit={save}>
      <fieldset disabled={recoveryPending || pending} className={styles.setupFields}>
        <div className={styles.creationSection}><span aria-hidden="true">01</span><div><h2>Batch details</h2><p>Name the group and choose what it will study.</p></div></div>
        <div className={`${styles.fields} ${styles.batchDetails}`}>
          <label>Batch name<input required maxLength={120} value={title} placeholder="e.g. August weekend batch" onChange={event => changeForm({title:event.target.value})} /></label>
          <label>Subject<select aria-label="Subject" value={subject} onChange={event => chooseSubject(event.target.value as Subject)}>{(['quant','verbal','di','full_course'] as const).map(code => <option key={code} value={code}>{code === 'full_course' ? 'All subjects' : V2_TEMPLATE_PRODUCTS[code].label}</option>)}</select></label>
        </div>
        {sources.length > 1 && subject !== 'full_course' && <label>Course<select value={sourceId} onChange={event => { if(classes.some(item=>item.date)&&!window.confirm('Changing the course replaces the class dates. Continue?'))return; const library=sources.find(item=>item.id===event.target.value); changeForm({sourceId:event.target.value,classes:library?curriculumClasses([library]):[]});setRemovedClass(null); }}>{sources.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        <div className={styles.scheduleIntro}>
          <div className={styles.creationSection}><span aria-hidden="true">02</span><div><h2>Schedule the classes</h2><p>Class names are filled from Course content. Choose their dates and times.</p></div></div>
          <div className={styles.scheduleTools}><span className={styles.timeZone}>All times IST</span><button type="button" className={styles.undoSchedule} disabled={!undoCount} onClick={undoSchedule}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m9 5-5 5 5 5M4 10h10a6 6 0 0 1 0 12"/></svg>Undo last change</button></div>
        </div>
        {classes.length > 0 && <div className={styles.scheduleProgress} role="status"><span><strong>{datedClasses} of {classes.length}</strong> classes dated</span><span>{datedClasses === classes.length ? 'All dates set' : `${classes.length - datedClasses} still to schedule`}</span><progress aria-label="Classes with dates" value={datedClasses} max={classes.length} /></div>}
        <p className={styles.undoMessage} role="status">{undoMessage}</p>
        <p className={styles.linkedMaterials}>Reading pages and recordings stay linked to the course. No scheduling needed.</p>
        {!selectedSources.length && <p role="status">No course sessions are available for this subject. <a href="/admin/v2/content">Add them in Course content</a> first.</p>}
        {classes.map((item,index) => <fieldset className={`${styles.classRow} ${styles.scheduleRow}`} key={item.key}>
          <legend>Class {index + 1}</legend>
          <span className={styles.classNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div className={styles.classIdentity}>
            {subject === 'full_course' && !curriculumKeys.has(item.key) && <label>Subject<select aria-label={`Subject for class ${index + 1}`} value={item.section ?? 'quant'} onChange={event => changeClass(item.key,{section:event.target.value as ClassInput['section']})}>{(['quant','verbal','di'] as const).map(code => <option key={code} value={code}>{V2_TEMPLATE_PRODUCTS[code].label}</option>)}</select></label>}
            {curriculumKeys.has(item.key) ? <h3 id={`new-class-${item.key}`} tabIndex={-1} className={styles.curriculumTitle}>{item.title}</h3> : <label>Class name<input id={`new-class-${item.key}`} required maxLength={120} value={item.title} placeholder="e.g. QA1 — Fractions and percentages" onChange={event => changeClass(item.key,{title:event.target.value})} /></label>}
          </div>
          <div className={styles.classFields}>
            <BatchDatePicker id={`new-${item.key}`} label="Date" required value={item.date} time={item.time} onChange={date => changeClass(item.key,{date})} onDateTimeChange={(date,time) => changeClass(item.key,{date,time})} events={classes.filter(entry => entry.date).map(entry => ({date:entry.date,time:entry.time,title:entry.title||'Live class'}))} />
            <label>Start time (IST)<input type="time" required value={item.time} onChange={event => changeClass(item.key,{time:event.target.value})} /></label>
            <label>Duration (minutes)<input type="number" required min={15} max={720} step={1} value={item.duration||''} onChange={event => changeClass(item.key,{duration:Number(event.target.value)})} /></label>
          </div>
          {<button type="button" className={`${styles.remove} ${styles.removeClassIcon}`} title="Remove class" aria-label={`Remove class ${index+1}`} onClick={() => { setRemovedClass({item:structuredClone(item),index}); changeForm({classes:classes.filter(entry => entry.key !== item.key)}); requestAnimationFrame(() => addButton.current?.focus({preventScroll:true})); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6"/></svg></button>}
        </fieldset>)}
        {removedClass && <div className={styles.removedClass} role="status"><span>{removedClass.item.title || 'Class'} removed.</span><button type="button" disabled={classes.length >= 100} onClick={() => {
          const restored = {...removedClass.item, section: subject === 'full_course' ? removedClass.item.section : subject};
          const next = [...classes]; next.splice(Math.min(removedClass.index, next.length), 0, restored);
          changeForm({classes:next}); setRemovedClass(null); requestAnimationFrame(() => document.getElementById(`new-class-${restored.key}`)?.focus());
        }}>Undo</button></div>}
        <button ref={addButton} className={`btn btn-secondary ${styles.addClass}`} type="button" disabled={classes.length>=100 || !selectedSources.length} onClick={() => {
          const item = newClass(subject); changeForm({classes:[...classes,item]});
          requestAnimationFrame(() => document.getElementById(`new-class-${item.key}`)?.focus());
        }}>+ Add extra class</button>
        <div className={styles.footer}><p className={styles.help}>Next: review the saved schedule, then publish.</p><button className="btn btn-primary" type="submit" disabled={!selectedSources.length || (subject==='full_course' && selectedSources.length!==3) || !classes.length}>Save batch draft</button></div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="workflow-error">{error}</p>}
  </section>;
}
