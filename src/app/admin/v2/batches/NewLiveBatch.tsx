'use client';

import { useRef, useState, type FormEvent } from 'react';
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

type Prepared = { request: V2TemplateSaveInput; startDate: string; batchRequest?: V2BatchInput; proposal?: V2BatchProposal };
function isPrepared(value: unknown): value is Prepared {
  if (!value || typeof value !== 'object') return false;
  const item = value as Prepared;
  return typeof item.startDate === 'string' && isV2BatchDate(item.startDate)
    && validateV2TemplateSave(item.request) === null && item.request.expectedRevision === 0 && item.request.document.events.length > 0
    && (item.batchRequest === undefined || (validateV2BatchInput(item.batchRequest) === null && item.batchRequest.expectedRevision === 0
      && item.batchRequest.templateId === item.request.id && item.batchRequest.templateRevision === 1
      && item.batchRequest.startDate === item.startDate && item.batchRequest.title === item.request.document.title))
    && (item.proposal === undefined || (!!item.batchRequest && isV2BatchProposal(item.proposal) && item.proposal.draft.id === item.batchRequest.id
      && item.proposal.draft.templateId === item.request.id && item.proposal.draft.revision === 1));
}
const newClass = (subject: Subject): ClassInput => ({ key: crypto.randomUUID(), title: '', date: '', time: '19:00', duration: 60, section: subject === 'full_course' ? 'quant' : subject });
export default function NewLiveBatch({ templates, ownerId, onSaved }: {
  templates: V2TemplateDraft[]; drafts: V2BatchDraft[]; ownerId: string; onSaved: (batch: V2BatchDraft) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LiveBatchSetup>({ subject: 'quant', title: '', sourceId: '', createFeedbackSessions: true,
    classes: [{ key: 'first', title: '', date: '', time: '19:00', duration: 60, section: 'quant' }] });
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [removedClass, setRemovedClass] = useState<{ item: ClassInput; index: number } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const { subject, title, sourceId, classes } = form;
  const formRecovery = useDraftRecovery<LiveBatchSetup>(ownerId, 'v2-live-batch-form', isLiveBatchSetup);
  const recovery = useDraftRecovery<Prepared>(ownerId, 'v2-live-batch-setup', isPrepared);
  useAdminDraftGuard(!!title || classes.some(item => item.title || item.date) || !!prepared || pending);
  const recoveryPending = !!recovery.recovered || !!formRecovery.recovered;
  const sources = templates.filter(item => item.productCode === subject && item.document.sessions?.length);
  function changeForm(patch: Partial<LiveBatchSetup>) {
    if (recoveryPending || prepared || busy.current) return;
    const next = { ...form, ...patch };
    setForm(next); formRecovery.remember(next); setError('');
  }
  function changeClass(key: string, patch: Partial<ClassInput>) {
    changeForm({ classes: classes.map(item => item.key === key ? { ...item, ...patch } : item) });
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
      const result = await saveBatchDraftAction(next.batchRequest!, proposal.fingerprint);
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
    const source = sources.find(item => item.id === sourceId);
    if (sourceId && !source) { setError('The selected course sessions are no longer available. Choose another course or start with new sessions.'); return; }
    const startDate = classes.map(item => item.date).sort()[0];
    const events = classes.map(item => ({ key: crypto.randomUUID(), title: item.title.trim(), section: subject === 'full_course' ? item.section ?? 'quant' : subject, kind: 'live' as const,
      dayOffset: (Date.parse(item.date) - Date.parse(startDate)) / 86400000, localStartTime: item.time, durationMinutes: item.duration, instructor: '', capacity: 8 }));
    const endDay = Math.max(...events.map(item => item.dayOffset + Math.ceil((Number(item.localStartTime.slice(0, 2)) * 60 + Number(item.localStartTime.slice(3)) + item.durationMinutes) / 1440)));
    const request: V2TemplateSaveInput = { id: crypto.randomUUID(), requestId: crypto.randomUUID(), expectedRevision: 0, productCode: subject,
      document: { title: title.trim(), summary: '', durationDays: endDay, sessions: source ? structuredClone(source.document.sessions ?? []) : events.map(item => ({ key: crypto.randomUUID(), title: item.title, section: item.section, content: { preSessionReads: [], recordings: [], postSessionReads: [], materials: [] } })), events } };
    const invalid = validateV2TemplateSave(request);
    if (invalid) { setError(invalid); return; }
    void persist({ request, startDate });
  }
  return <section className={styles.setup} aria-label="New live batch setup">
    {!recovery.recovered && <DraftRecoveryNotice available={!!formRecovery.recovered} unavailable={formRecovery.unavailable} onRestore={() => { if(formRecovery.recovered){setForm(formRecovery.recovered);formRecovery.acknowledge();} }} onDiscard={formRecovery.forget} />}
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => { if(recovery.recovered){setPrepared(recovery.recovered);formRecovery.acknowledge();recovery.acknowledge();} }} onDiscard={() => { recovery.forget();formRecovery.forget(); }} />
    {prepared ? <div className={styles.form} aria-busy={pending}>
      <h2>{pending ? 'Saving batch…' : 'Finish saving this batch'}</h2><p className={styles.help}>{prepared.request.document.title} · {prepared.request.document.events.length} live classes</p>
      <p className={styles.help}>The batch stays private. Retrying resumes the same save.</p>
      {!pending && <button type="button" className="btn btn-primary" onClick={() => void persist(prepared)}>Retry saving batch</button>}
    </div> : <form className={styles.form} onSubmit={save}>
      <fieldset disabled={recoveryPending || pending} className={styles.setupFields}>
        <h2>Batch details</h2>
        <div className={`${styles.fields} ${styles.batchDetails}`}>
          <label>Batch name<input required maxLength={120} value={title} placeholder="e.g. August weekend batch" onChange={event => changeForm({title:event.target.value})} /></label>
          <label>Subject<select aria-label="Subject" value={subject} onChange={event => { const next = event.target.value as Subject; changeForm({subject:next,sourceId:'',classes:classes.map(item => ({...item,section:next === 'full_course' ? item.section ?? 'quant' : next}))}); }}>{(['quant','verbal','di','full_course'] as const).map(code => <option key={code} value={code}>{code === 'full_course' ? 'All subjects' : V2_TEMPLATE_PRODUCTS[code].label}</option>)}</select></label>
        </div>
        <div className={styles.sectionTitle}><h2>Live classes</h2><span>All times IST</span></div>
        {classes.map((item,index) => <fieldset className={styles.classRow} key={item.key}>
          <legend>Class {index + 1}</legend>
          <div className={styles.classIdentity}>
            {subject === 'full_course' && <label>Subject<select aria-label={`Subject for class ${index + 1}`} value={item.section ?? 'quant'} onChange={event => changeClass(item.key,{section:event.target.value as ClassInput['section']})}>{(['quant','verbal','di'] as const).map(code => <option key={code} value={code}>{V2_TEMPLATE_PRODUCTS[code].label}</option>)}</select></label>}
            <label>Class name<input id={`new-class-${item.key}`} required maxLength={120} value={item.title} placeholder="e.g. QA1 — Fractions and percentages" onChange={event => changeClass(item.key,{title:event.target.value})} /></label>
          </div>
          <div className={styles.classFields}>
            <BatchDatePicker id={`new-${item.key}`} label="Date" required value={item.date} time={item.time} onChange={date => changeClass(item.key,{date})} onDateTimeChange={(date,time) => changeClass(item.key,{date,time})} events={classes.filter(entry => entry.date).map(entry => ({date:entry.date,time:entry.time,title:entry.title||'Live class'}))} />
            <label>Start time (IST)<input type="time" required value={item.time} onChange={event => changeClass(item.key,{time:event.target.value})} /></label>
            <label>Duration (minutes)<input type="number" required min={15} max={720} step={1} value={item.duration||''} onChange={event => changeClass(item.key,{duration:Number(event.target.value)})} /></label>
          </div>
          {classes.length > 1 && <button type="button" className={styles.remove} aria-label={`Remove class ${index+1}`} onClick={() => { setRemovedClass({item:structuredClone(item),index}); changeForm({classes:classes.filter(entry => entry.key !== item.key)}); requestAnimationFrame(() => addButton.current?.focus({preventScroll:true})); }}>Remove class</button>}
        </fieldset>)}
        {removedClass && <div className={styles.removedClass} role="status"><span>{removedClass.item.title || 'Class'} removed.</span><button type="button" disabled={classes.length >= 100} onClick={() => {
          const restored = {...removedClass.item, section: subject === 'full_course' ? removedClass.item.section : subject};
          const next = [...classes]; next.splice(Math.min(removedClass.index, next.length), 0, restored);
          changeForm({classes:next}); setRemovedClass(null); requestAnimationFrame(() => document.getElementById(`new-class-${restored.key}`)?.focus());
        }}>Undo</button></div>}
        <button ref={addButton} className={`btn btn-secondary ${styles.addClass}`} type="button" disabled={classes.length>=100} onClick={() => {
          const item = newClass(subject); changeForm({classes:[...classes,item]});
          requestAnimationFrame(() => document.getElementById(`new-class-${item.key}`)?.focus());
        }}>+ Add class</button>
        {!!sources.length && <details className={styles.publishDetails}><summary>Use existing course sessions</summary><label>Course sessions<select aria-label="Include saved course sessions" value={sourceId} onChange={event => changeForm({sourceId:event.target.value})}><option value="">New sessions for these classes</option>{sources.map(item => <option value={item.id} key={item.id}>{item.document.title}</option>)}</select></label><p className={styles.help}>Copies the selected sessions into this batch. Otherwise, each class starts with an empty course session for its resources.</p></details>}
        <div className={styles.footer}><p className={styles.help}>Save privately first. Publish when ready.</p><button className="btn btn-primary" type="submit">Save batch draft</button></div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="workflow-error">{error}</p>}
  </section>;
}
