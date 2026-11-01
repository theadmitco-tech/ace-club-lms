'use client';

import { useState } from 'react';
import { courseMoney, type CourseIdentity } from '@/lib/v2CoursePresentation';
import styles from './courses.module.css';

type Subject = { identity: CourseIdentity; name: string };
type Tier = { count: number; amountPaise: number | null };

export function CoursePackagePicker({ subjects, tiers, initialSelection }: {
  subjects: Subject[]; tiers: Tier[]; initialSelection: CourseIdentity[];
}) {
  const [selected, setSelected] = useState(initialSelection);
  const [count, setCount] = useState(initialSelection.length || 1);
  const chosenTier = tiers.find((tier) => tier.count === count);
  const complete = selected.length === count;
  function chooseTier(nextCount: number) {
    setCount(nextCount);
    setSelected((previous) => nextCount === subjects.length
      ? subjects.map((subject) => subject.identity)
      : previous.slice(0, nextCount));
  }
  return <section aria-labelledby="package-heading" className={styles.packageSection}>
    <div className={styles.sectionHeading}><span className={styles.eyebrow}>INDIVIDUAL SUBJECT PACKAGES</span><h2 id="package-heading">Choose your subjects</h2><p>One, two or all three complete individual courses. The package remains separate from Full Course.</p></div>
    <div className={styles.tiers}>{tiers.map((tier) => <button key={tier.count} type="button" className={`${styles.tier} ${count === tier.count ? styles.selectedTier : ''}`} aria-pressed={count === tier.count} onClick={() => chooseTier(tier.count)}>
      <span className={styles.eyebrow}>{tier.count === 1 ? 'ONE SUBJECT' : tier.count === 2 ? 'TWO SUBJECTS' : 'THREE SUBJECTS'}</span>
      <span className={styles.tierTitle}>{tier.count === 1 ? 'Build one strength' : tier.count === 2 ? 'Connect two subjects' : 'Cover all three subjects'}</span>
      <strong className={styles.price}>{tier.amountPaise === null ? 'Price unavailable' : courseMoney(tier.amountPaise)}</strong>
      <span className={styles.tierHint}>Total package price · six months of access</span>
    </button>)}</div>
    <div className={styles.panel}>
      <form action="/courses/v2#quote" method="get">
        <fieldset className={styles.choices}><legend>Select {count === 1 ? 'one subject' : `${count} subjects`}</legend>{subjects.map((subject) => <label key={subject.identity} className={selected.includes(subject.identity) ? styles.chosenSubject : undefined}><input type="checkbox" name="course" value={subject.identity} checked={selected.includes(subject.identity)} disabled={!selected.includes(subject.identity) && selected.length >= count} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, subject.identity] : previous.filter((identity) => identity !== subject.identity))} />{subject.name}</label>)}</fieldset>
        <div className={styles.selectionFooter}><div aria-live="polite"><strong>{selected.length} of {count} subjects selected</strong><p>{complete ? subjects.filter((subject) => selected.includes(subject.identity)).map((subject) => subject.name).join(' + ') : 'Choose your subjects to review the current price.'}</p></div><button className={styles.button} type="submit" disabled={!complete || chosenTier?.amountPaise == null}>Review package price</button></div>
      </form>
      <small>Six calendar months from successful payment. Reviewing a price does not create a purchase or grant access.</small>
    </div>
  </section>;
}
