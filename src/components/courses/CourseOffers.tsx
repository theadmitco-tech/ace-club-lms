'use client';

import { useState } from 'react';
import { courseMoney, type CourseIdentity } from '@/lib/v2CoursePresentation';
import styles from './catalogue.module.css';

type Subject = { identity: CourseIdentity; name: string };
type Tier = { count: number; amountPaise: number | null };

const perSubject = (tier: Tier | undefined) => tier?.amountPaise != null && tier.count > 0 ? `${courseMoney(Math.round(tier.amountPaise / tier.count / 100) * 100)} per subject` : '';
const price = (amountPaise: number | null | undefined) => amountPaise == null ? 'Price unavailable' : courseMoney(amountPaise);

/**
 * The four ways to study: Full Course, or one, two or all three subjects. Every card has the same
 * five rows (name, description, price, choices or highlights, action) so they line up side by side.
 * Each card submits its own selection to the course detail page; nothing here creates a purchase.
 */
export function CourseOffers({ subjects, tiers, fullCoursePaise, preselected }: {
  subjects: Subject[]; tiers: Tier[]; fullCoursePaise: number | null | undefined; preselected?: CourseIdentity;
}) {
  const one = tiers.find(tier => tier.count === 1), two = tiers.find(tier => tier.count === 2), three = tiers.find(tier => tier.count === 3);
  const [single, setSingle] = useState<CourseIdentity | null>(preselected ?? null);
  const [pair, setPair] = useState<CourseIdentity[]>([]);
  const togglePair = (identity: CourseIdentity) => setPair(current => current.includes(identity) ? current.filter(item => item !== identity) : current.length < 2 ? [...current, identity] : current);

  return <div className={styles.offers}>
    {fullCoursePaise !== undefined && <form action="/courses/v2/review" method="get" className={styles.offer} data-featured aria-labelledby="offer-full">
      <span className={styles.ribbon}>Most complete</span>
      <h2 id="offer-full">Full Course</h2>
      <p className={styles.offerLead}>Quant, Verbal and DI taught together as one programme.</p>
      <p className={styles.offerPrice}>{price(fullCoursePaise)}<small>All three subjects included</small></p>
      <ul className={styles.points}><li>Classes spread out, usually over about eight weeks</li><li>One course and one schedule to follow</li></ul>
      <input type="hidden" name="course" value="full_course" />
      <button className={styles.primary} type="submit" disabled={fullCoursePaise === null}>Choose Full Course</button>
    </form>}

    {one && <form action="/courses/v2/review" method="get" className={styles.offer} aria-labelledby="offer-one">
      <h2 id="offer-one">One subject</h2>
      <p className={styles.offerLead}>Focus on the subject you need most.</p>
      <p className={styles.offerPrice}>{price(one.amountPaise)}<small>Any one subject</small></p>
      <fieldset className={styles.pick}><legend>Pick one subject</legend><div className={styles.pickRow}>
        {subjects.map(subject => <label key={subject.identity}><input type="radio" name="course" value={subject.identity} checked={single === subject.identity} onChange={() => setSingle(subject.identity)} /><span>{subject.name}</span></label>)}
      </div></fieldset>
      <button className={styles.secondary} type="submit" disabled={!single || one.amountPaise === null}>Choose one subject</button>
    </form>}

    {two && subjects.length >= 2 && <form action="/courses/v2/review" method="get" className={styles.offer} aria-labelledby="offer-two">
      <h2 id="offer-two">Two subjects</h2>
      <p className={styles.offerLead}>Strengthen two areas together.</p>
      <p className={styles.offerPrice}>{price(two.amountPaise)}<small>{perSubject(two)}</small></p>
      <fieldset className={styles.pick}><legend>Pick two subjects</legend><div className={styles.pickRow}>
        {subjects.map(subject => <label key={subject.identity}><input type="checkbox" name="course" value={subject.identity} checked={pair.includes(subject.identity)} disabled={!pair.includes(subject.identity) && pair.length >= 2} onChange={() => togglePair(subject.identity)} /><span>{subject.name}</span></label>)}
      </div></fieldset>
      <button className={styles.secondary} type="submit" disabled={pair.length !== 2 || two.amountPaise === null}>Choose two subjects</button>
    </form>}

    {three && subjects.length >= 3 && <form action="/courses/v2/review" method="get" className={styles.offer} aria-labelledby="offer-three">
      <h2 id="offer-three">All three subjects</h2>
      <p className={styles.offerLead}>Quant, Verbal and DI as three separate courses.</p>
      <p className={styles.offerPrice}>{price(three.amountPaise)}<small>{perSubject(three)}</small></p>
      <ul className={styles.points}><li>Each subject is its own short, intensive course</li><li>Take them in the order you like</li></ul>
      {subjects.map(subject => <input key={subject.identity} type="hidden" name="course" value={subject.identity} />)}
      <button className={styles.secondary} type="submit" disabled={three.amountPaise === null}>Choose all three</button>
    </form>}
  </div>;
}
