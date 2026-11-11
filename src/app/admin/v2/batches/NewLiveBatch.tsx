'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isV2BatchDate, type V2BatchDraft } from '@/lib/v2Batches';
import { V2_TEMPLATE_PRODUCTS, validateV2TemplateSave, type V2TemplateDraft, type V2TemplateSaveInput } from '@/lib/v2Templates';
import { saveTemplateDraftAction } from '../templates/actions';
import BatchDraftEditor from './BatchDraftEditor';
import { BatchDatePicker } from './BatchDatePicker';
import styles from './batchWorkspace.module.css';

type Subject = 'quant' | 'verbal' | 'di';
type ClassInput = { key: string; title: string; date: string; time: string; duration: number };
type Prepared = { request: V2TemplateSaveInput; startDate: string };
function isPrepared(value: unknown): value is Prepared {
  if (!value || typeof value !== 'object') return false;
  const item = value as Prepared;
  return typeof item.startDate === 'string' && isV2BatchDate(item.startDate)
    && validateV2TemplateSave(item.request) === null && item.request.expectedRevision === 0
    && item.request.productCode !== 'full_course' && item.request.document.events.length > 0;
}
const newClass = (): ClassInput => ({ key: crypto.randomUUID(), title: '', date: '', time: '19:00', duration: 60 });
export default function NewLiveBatch({ templates, drafts, ownerId, onSaved }: {
  templates: V2TemplateDraft[]; drafts: V2BatchDraft[]; ownerId: string; onSaved: (batch: V2BatchDraft) => void;
}) {
  const [subject, setSubject] = useState<Subject>('quant');
  const [title, setTitle] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [classes, setClasses] = useState<ClassInput[]>([{ key: 'first', title: '', date: '', time: '19:00', duration: 60 }]);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [saved, setSaved] = useState<V2TemplateDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (prepared && !saved) heading.current?.focus(); }, [prepared, saved]);
  const recovery = useDraftRecovery<Prepared>(ownerId, 'v2-live-batch-setup', isPrepared);
  useAdminDraftGuard(!saved && (!!title || classes.some(item => item.title || item.date) || attempted || pending));
  const sources = templates.filter(item => item.productCode === subject && item.document.sessions?.length);
  function changeClass(key: string, patch: Partial<ClassInput>) {
    setClasses(items => items.map(item => item.key === key ? { ...item, ...patch } : item));
    setError('');
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!classes.length || classes.some(item => !isV2BatchDate(item.date))) { setError('Add at least one class with a valid date.'); return; }
    const startDate = classes.map(item => item.date).sort()[0];
    const events = classes.map(item => ({ key: crypto.randomUUID(), title: item.title.trim(), section: subject, kind: 'live' as const,
      dayOffset: (Date.parse(item.date) - Date.parse(startDate)) / 86400000,
      localStartTime: item.time, durationMinutes: item.duration, instructor: '', capacity: 8 }));
    const endDay = Math.max(...events.map(item => item.dayOffset + Math.ceil((Number(item.localStartTime.slice(0, 2)) * 60 + Number(item.localStartTime.slice(3)) + item.durationMinutes) / 1440)));
    const request: V2TemplateSaveInput = { id: crypto.randomUUID(), requestId: crypto.randomUUID(), expectedRevision: 0, productCode: subject,
      document: { title: title.trim(), summary: '', durationDays: endDay,
        sessions: structuredClone(sources.find(item => item.id === sourceId)?.document.sessions ?? []), events } };
    const invalid = validateV2TemplateSave(request);
    if (invalid) { setError(invalid); return; }
    const next = { request, startDate };setPrepared(next);setError('');recovery.remember(next);
  }
  async function saveSchedule() {
    if (!prepared || busy.current) return;
    busy.current = true;setPending(true);setAttempted(true);setError('');recovery.remember(prepared);
    try {
      const result = await saveTemplateDraftAction(prepared.request);
      if (result.status === 'error') { setError(result.message); return; }
      setSaved(result.template);
    } catch { setError('The save was interrupted. Retry to recover the same schedule without creating a duplicate.'); }
    finally { busy.current = false;setPending(false); }
  }
  if (saved && prepared) return <>
    <p className={styles.notice} role="status">Schedule saved privately. Review the batch below, then confirm its draft. Nothing is published yet.</p>
    <BatchDraftEditor focused templates={[saved]} drafts={drafts} ownerId={ownerId}
      initialTitle={saved.document.title} initialStartDate={prepared.startDate}
      onSaved={batch => { recovery.forget();onSaved(batch); }} />
  </>;
  return <section className={styles.setup} aria-label="New live batch setup">
    <ol className={styles.steps} aria-label="Batch creation steps"><li aria-current="step">1. Schedule</li><li>2. Review batch</li><li>3. Publish</li></ol>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => { if(recovery.recovered){setPrepared(recovery.recovered);setAttempted(true);recovery.acknowledge();} }} onDiscard={recovery.forget} />
    {prepared ? <div className={styles.form}>
      <h2 ref={heading} tabIndex={-1}>Review the schedule</h2>
      <p><strong>{prepared.request.document.title}</strong> · {V2_TEMPLATE_PRODUCTS[prepared.request.productCode].label}</p>
      <p className={styles.help}>{prepared.request.document.sessions?.length ?? 0} course sessions included. All class times are IST.</p>
      <ul className={styles.review}>{prepared.request.document.events.map(item => <li key={item.key}><strong>{item.title}</strong><span>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(Date.parse(prepared.startDate) + item.dayOffset! * 86400000))} · {item.localStartTime} · {item.durationMinutes} min</span></li>)}</ul>
      <p className={styles.help}>Continue saves a private schedule. The next step reviews and saves the batch; students receive access only after publication and enrollment.</p>
      <div className={styles.actions}>
        {!attempted && <button type="button" className="btn btn-secondary" onClick={() => {setPrepared(null);recovery.forget();}}>Edit schedule</button>}
        <button type="button" className="btn btn-primary" disabled={pending} onClick={saveSchedule}>{pending ? 'Saving schedule…' : attempted ? 'Retry saving schedule' : 'Save schedule & continue'}</button>
      </div>
    </div> : <form className={styles.form} onSubmit={review}>
      <h2>Batch details</h2><p className={styles.help}>Choose a subject and add the live classes. Each class can have its own date and time.</p>
      <div className={styles.fields}>
        <label>Subject<select aria-label="Subject" value={subject} onChange={event => {setSubject(event.target.value as Subject);setSourceId('');}}>{(['quant','verbal','di'] as const).map(code => <option key={code} value={code}>{V2_TEMPLATE_PRODUCTS[code].label}</option>)}</select></label>
        <label>Batch name<input required maxLength={120} value={title} placeholder="e.g. Quant · Weekend batch" onChange={event => setTitle(event.target.value)} /></label>
      </div>
      <label className={styles.source}>Include saved course sessions<select aria-label="Include saved course sessions" value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Live classes only</option>{sources.map(item => <option value={item.id} key={item.id}>{item.document.title} · {item.document.sessions!.length} sessions</option>)}</select><span className={styles.help}>Optional. Sessions are copied into this draft; the original course stays unchanged.</span></label>
      <div className={styles.sectionTitle}><h2>Live classes</h2><span>India Standard Time</span></div>
      {classes.map((item,index) => <fieldset className={styles.classCard} key={item.key}>
        <legend>Class {index + 1}</legend>
        <label>Class name<input required maxLength={120} value={item.title} onChange={event => changeClass(item.key,{title:event.target.value})} /></label>
        <div className={styles.classFields}>
          <BatchDatePicker id={`new-${item.key}`} label="Date" required value={item.date} time={item.time} onChange={date => changeClass(item.key,{date})} onDateTimeChange={(date,time) => changeClass(item.key,{date,time})} events={classes.filter(entry => entry.date).map(entry => ({date:entry.date,time:entry.time,title:entry.title||'Live class'}))} />
          <label>Start time (IST)<input type="time" required value={item.time} onChange={event => changeClass(item.key,{time:event.target.value})} /></label>
          <label>Duration (minutes)<input type="number" required min={15} max={720} step={1} value={item.duration||''} onChange={event => changeClass(item.key,{duration:Number(event.target.value)})} /></label>
        </div>
        {classes.length > 1 && <button type="button" className={styles.remove} aria-label={`Remove class ${index+1}`} onClick={() => setClasses(items => items.filter(entry => entry.key !== item.key))}>Remove class</button>}
      </fieldset>)}
      <button className="btn btn-secondary" type="button" disabled={classes.length>=100} onClick={() => setClasses(items => [...items,newClass()])}>+ Add class</button>
      <div className={styles.footer}><p className={styles.help}>Review first. Changes remain private until published.</p><button className="btn btn-primary" type="submit">Review schedule</button></div>
    </form>}
    {error && <p role="alert" className="workflow-error">{error}</p>}
  </section>;
}
