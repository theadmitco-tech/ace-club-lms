'use client';

import { useState } from 'react';
import { courseMoney, type CourseIdentity } from '@/lib/v2CoursePresentation';
import styles from './catalogue.module.css';

type Subject = { identity: CourseIdentity; name: string };
type Tier = { count: number; amountPaise: number | null };

/** Tick any one to three subjects; the package price follows the number ticked. */
export function CoursePackagePicker({ subjects, tiers, initialSelection }: {
  subjects: Subject[]; tiers: Tier[]; initialSelection: CourseIdentity[];
}) {
  const [selected, setSelected] = useState(initialSelection);
  const tier = tiers.find((item) => item.count === selected.length);
  const toggle = (identity: CourseIdentity, on: boolean) =>
    setSelected((previous) => on ? [...previous, identity] : previous.filter((item) => item !== identity));
  return <section aria-labelledby="package-heading" className={styles.option}>
    <h2 id="package-heading">Individual subjects</h2>
    <p>Pick the subjects you need. The more you add, the less each one costs.</p>
    <form action="/courses/v2#quote" method="get" className={styles.pickForm}>
      <fieldset className={styles.subjects}>
        <legend className={styles.visuallyHidden}>Subjects</legend>
        {subjects.map((subject) => <label key={subject.identity}>
          <input type="checkbox" name="course" value={subject.identity} checked={selected.includes(subject.identity)} onChange={(event) => toggle(subject.identity, event.target.checked)} />
          <span>{subject.name}</span>
        </label>)}
      </fieldset>
      <ul className={styles.tierList} aria-label="Package prices">{tiers.map((item) => <li key={item.count} data-active={item.count === selected.length || undefined}>
        <span>{item.count} {item.count === 1 ? 'subject' : 'subjects'}{item.count > 1 && item.amountPaise !== null && <small> · {courseMoney(Math.round(item.amountPaise / item.count / 100) * 100)} each</small>}</span>
        <strong>{item.amountPaise === null ? 'Price unavailable' : courseMoney(item.amountPaise)}</strong>
      </li>)}</ul>
      <div className={styles.pickFooter} aria-live="polite">
        <span>{selected.length ? <>Total <strong>{tier?.amountPaise == null ? 'Price unavailable' : courseMoney(tier.amountPaise)}</strong></> : 'Tick at least one subject'}</span>
        <button className={styles.primary} type="submit" disabled={!selected.length || tier?.amountPaise == null}>Continue</button>
      </div>
    </form>
  </section>;
}
