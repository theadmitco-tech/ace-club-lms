'use client';

import { useId, useRef, useState } from 'react';
import styles from './batchCalendar.module.css';

type CalendarEvent = { date: string; title: string; time?: string | null };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const monthName = (date: Date) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
const validDate = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && dateKey(new Date(value)) === value;

export function BatchDatePicker({ id, label, value, onChange, required = false, events = [] }: {
  id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; events?: CalendarEvent[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [selection,setSelection]=useState(value);
  const [month, setMonth] = useState('2026-01-01');
  const firstDay = new Date(`${month}T00:00:00Z`);
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0)).getUTCDate();
  const dates = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= days ? `${month.slice(0, 7)}-${String(day).padStart(2, '0')}` : null;
  });
  function open() {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    setMonth(`${(validDate(value) ? value : today).slice(0, 7)}-01`);
    setSelection(value);
    dialog.current?.showModal();
  }
  function moveMonth(delta: number) {
    setMonth(dateKey(new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + delta, 1))));
  }
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputRow}>
      <input id={id} className="form-input" type="date" required={required} min="2000-01-01" max="2099-12-31" value={value} onChange={(event) => onChange(event.target.value)} />
      <button className="btn btn-secondary" type="button" aria-haspopup="dialog" onClick={open}>Calendar</button>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={heading}>
      <div className={styles.top}><div><h3 id={heading}>Batch calendar</h3><p>{label} · India Standard Time</p></div>
        <button className="btn btn-secondary" type="button" onClick={() => dialog.current?.close()} aria-label="Close calendar">Close</button></div>
      <div className={styles.month}><button type="button" aria-label="Previous month" disabled={month === '2000-01-01'} onClick={() => moveMonth(-1)}>←</button>
        <strong aria-live="polite">{monthName(firstDay)}</strong>
        <button type="button" aria-label="Next month" disabled={month === '2099-12-01'} onClick={() => moveMonth(1)}>→</button></div>
      <table className={styles.calendar} aria-label={monthName(firstDay)}><thead><tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: dates.length / 7 }, (_, week) => <tr key={week}>{dates.slice(week * 7, week * 7 + 7).map((date, day) => <td key={day}>
          {date && <button type="button" aria-pressed={selection === date} aria-label={`${date}${events.some((event) => event.date === date) ? ', live classes scheduled' : ''}`}
            onClick={() => setSelection(date)}>
            {Number(date.slice(-2))}{events.some((event) => event.date === date) && <span className={styles.dot} aria-hidden="true" />}
          </button>}
        </td>)}</tr>)}</tbody>
      </table>
      <section className={styles.agenda} aria-label="Live classes this month"><h4>Live classes this month</h4>
        {events.some((event) => event.date.startsWith(month.slice(0, 7))) ? <ul>{events.filter((event) => event.date.startsWith(month.slice(0, 7)))
          .slice().sort((left, right) => `${left.date} ${left.time ?? ''}`.localeCompare(`${right.date} ${right.time ?? ''}`))
          .map((event, index) => <li key={`${event.date}:${index}`}><time dateTime={event.date}>{event.date}{event.time ? ` · ${event.time} IST` : ''}</time><span>{event.title}</span></li>)}</ul>
          : <p>No live classes scheduled in this month.</p>}
      </section>
      <div className={styles.top}><button type="button" className="btn btn-secondary" onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="btn btn-primary" disabled={!validDate(selection)} onClick={()=>{onChange(selection);dialog.current?.close();}}>Use this date</button></div>
    </dialog>
  </div>;
}
