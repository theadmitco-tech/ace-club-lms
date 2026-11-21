'use client';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import type { V2Publication } from '@/lib/v2Publications';
import type { BatchRoster } from './BatchWorkspace';
import styles from './batchWorkspace.module.css';

type Step = { key: string; title: string; status: string; done: boolean; optional?: boolean; action: { label: string; href?: string; onClick?: () => void } };

/** The order follows the approved flow: schedule → private Meet links → publish → enroll → live seats. */
export default function BatchSetupSteps({ batch, publication, roster, seatLimit, onEditSchedule, onPublish }: {
  batch: V2BatchDraft; publication?: V2Publication; roster?: BatchRoster; seatLimit: number; onEditSchedule: () => void; onPublish: () => void;
}) {
  const live = batch.events.filter(event => event.kind !== 'outline');
  const dated = live.filter(event => event.startsAt).length;
  const linked = roster?.meetLinks ? live.filter(event => roster.meetLinks!.includes(event.key)).length : null;
  const published = publication?.state === 'published';
  const current = published && publication.batchRevision === batch.revision;
  const steps: Step[] = [
    { key: 'schedule', title: 'Schedule live classes', done: live.length > 0 && dated === live.length,
      status: live.length ? `${dated} of ${live.length} ${live.length === 1 ? 'class' : 'classes'} dated` : 'No live classes yet',
      action: { label: dated === live.length && live.length ? 'Adjust dates' : 'Set dates', onClick: onEditSchedule } },
    { key: 'meet', title: 'Add Google Meet links', optional: true, done: linked !== null && live.length > 0 && linked === live.length,
      status: linked === null ? 'Meeting links unavailable' : `${linked} of ${live.length} ${live.length === 1 ? 'class has' : 'classes have'} a link · visible only to registered students`,
      action: { label: linked ? 'Edit links' : 'Add links', href: `/admin/v2/batches/${batch.id}/meeting` } },
    { key: 'publish', title: 'Publish the schedule', done: current,
      status: current ? 'Published · students with access can see it' : published ? 'Saved changes are not published yet' : 'Private until published',
      action: { label: current ? 'View publication' : published ? 'Publish changes' : 'Publish now', onClick: onPublish } },
    { key: 'enroll', title: 'Enroll students', done: !!roster?.enrolled,
      status: roster?.enrolled == null ? 'Enrollment unavailable' : `${roster.enrolled} enrolled · each needs active ${batch.productCode === 'full_course' ? 'Full Course' : 'course'} access`,
      action: { label: 'Manage students', href: `/admin/v2/batches/${batch.id}/students` } },
    { key: 'seats', title: 'Register live attendees', done: !!roster?.liveSeats,
      status: roster?.liveSeats == null ? 'Live seats unavailable' : roster.liveSeats >= seatLimit ? `Full · ${roster.liveSeats} of ${seatLimit} seats` : `${roster.liveSeats} of ${seatLimit} seats taken · attendance is optional`,
      action: { label: 'Manage live seats', href: `/admin/v2/batches/${batch.id}/live` } },
  ];
  const next = steps.find(step => !step.done && !step.optional) ?? steps.find(step => !step.done);
  const completed = steps.filter(step => step.done).length;
  return <section className={styles.setupSteps} aria-labelledby="batch-setup-title">
    <header><div><h2 id="batch-setup-title">{next ? 'Get this batch ready' : 'This batch is ready'}</h2>
      <p>{next ? `Next: ${next.title.toLowerCase()}.` : 'Classes are scheduled and published, and students are enrolled.'}</p></div>
      <span className={styles.stepCount}>{completed} of {steps.length} done</span></header>
    <ol>{steps.map((step, index) => <li key={step.key} data-state={step.done ? 'done' : step === next ? 'next' : 'todo'} aria-current={step === next ? 'step' : undefined}>
      <span className={styles.stepMarker} aria-hidden="true">{step.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10"/></svg> : index + 1}</span>
      <div className={styles.stepText}><h3>{step.title}{step.optional && <small> · optional</small>}</h3><p>{step.status}</p></div>
      {step.action.href ? <Link className={step === next ? 'btn btn-primary' : styles.stepAction} href={step.action.href} prefetch={false}>{step.action.label}</Link>
        : <button type="button" className={step === next ? 'btn btn-primary' : styles.stepAction} onClick={step.action.onClick}>{step.action.label}</button>}
      <span className={styles.visuallyHiddenText}>{step.done ? 'Done' : step === next ? 'Next step' : 'To do'}</span>
    </li>)}</ol>
  </section>;
}
