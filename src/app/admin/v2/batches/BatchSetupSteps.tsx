'use client';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import type { V2Publication } from '@/lib/v2Publications';
import type { BatchRoster } from './BatchWorkspace';
import styles from './batchWorkspace.module.css';

type Step = { key: string; label: string; done: boolean; optional?: boolean; next: { title: string; detail: string; action: string; href?: string; onClick?: () => void } };

/** Readiness in the approved order: schedule → private Meet links → publish → enroll → live seats. */
export function batchSteps(batch: V2BatchDraft, publication: V2Publication | undefined, roster: BatchRoster | undefined, seatLimit: number, onEditSchedule: () => void, onPublish: () => void): Step[] {
  const live = batch.events.filter(event => event.kind !== 'outline');
  const dated = live.filter(event => event.startsAt).length;
  const linked = roster?.meetLinks ? live.filter(event => roster.meetLinks!.includes(event.key)).length : null;
  const published = publication?.state === 'published';
  const current = published && publication.batchRevision === batch.revision;
  const access = batch.productCode === 'full_course' ? 'Full Course' : 'course';
  return [
    { key: 'schedule', label: 'Schedule', done: live.length > 0 && dated === live.length,
      next: { title: 'Set the class dates', detail: `${live.length - dated} of ${live.length} live ${live.length === 1 ? 'class needs' : 'classes need'} a date and time.`, action: 'Set dates', onClick: onEditSchedule } },
    { key: 'meet', label: 'Meet links', optional: true, done: linked !== null && live.length > 0 && linked === live.length,
      next: { title: 'Add Google Meet links', detail: linked === null ? 'Meeting links could not be loaded.' : `${linked} of ${live.length} ${live.length === 1 ? 'class has' : 'classes have'} a link. Only registered students can see them. You can publish without them and add links later.`, action: 'Add Meet links', href: `/admin/v2/batches/${batch.id}/meeting` } },
    { key: 'publish', label: 'Publish', done: current,
      next: { title: published ? 'Publish your changes' : 'Publish the schedule', detail: published ? 'Students still see the previous version until you publish the saved changes.' : 'The schedule stays private until you publish it. You will review everything first.', action: published ? 'Review changes' : 'Publish schedule', onClick: onPublish } },
    { key: 'enroll', label: 'Students', done: !!roster?.enrolled,
      next: { title: 'Enroll students', detail: `Add students who have active ${access} access. Enrolled students see this batch’s schedule.`, action: 'Enroll students', href: `/admin/v2/batches/${batch.id}/students` } },
    { key: 'seats', label: 'Live seats', done: !!roster?.liveSeats,
      next: { title: 'Register live attendees', detail: `Up to ${seatLimit} students can join the live classes. Attendance is optional; recordings stay available to everyone enrolled.`, action: 'Register attendees', href: `/admin/v2/batches/${batch.id}/live` } },
  ];
}

export default function BatchSetupSteps({ steps }: { steps: Step[] }) {
  const next = steps.find(step => !step.done && !step.optional) ?? steps.find(step => !step.done);
  const done = steps.filter(step => step.done).length;
  return <section className={styles.readiness} aria-labelledby="batch-readiness-title">
    <div className={styles.readinessHead}>
      <h2 id="batch-readiness-title">{next ? 'Getting ready' : 'Ready for students'}</h2>
      <span className={styles.stepCount}>{done} of {steps.length} steps</span>
    </div>
    <ol className={styles.stepper}>{steps.map((step, index) => <li key={step.key} data-state={step.done ? 'done' : step === next ? 'next' : 'todo'} aria-current={step === next ? 'step' : undefined}>
      <span className={styles.stepMarker} aria-hidden="true">{step.done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><path d="m5 12 5 5 9-10"/></svg> : index + 1}</span>
      <span className={styles.stepLabel}>{step.label}{step.optional && <small> (optional)</small>}<span className={styles.visuallyHiddenText}>{step.done ? ', done' : step === next ? ', next step' : ', to do'}</span></span>
    </li>)}</ol>
    {next ? <div className={styles.nextStep}>
      <div><p className={styles.nextEyebrow}>Next step</p><h3>{next.next.title}</h3><p>{next.next.detail}</p></div>
      {next.next.href ? <Link className="btn btn-primary" href={next.next.href} prefetch={false}>{next.next.action}</Link>
        : <button type="button" className="btn btn-primary" onClick={next.next.onClick}>{next.next.action}</button>}
    </div> : <p className={styles.readyNote}>Classes are scheduled and published, students are enrolled, and live seats are assigned. Changes to dates or links need another review before students see them.</p>}
  </section>;
}
