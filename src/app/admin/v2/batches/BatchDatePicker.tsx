'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker, TZDate } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './batchCalendar.module.css';

type CalendarEvent = { date: string; title: string; time?: string | null };
const zone = 'Asia/Kolkata';
const validDate = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const asDate = (value: string) => { const [year,month,day] = value.split('-').map(Number);return new TZDate(year,month-1,day,zone); };
const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const fullDate = (date: Date) => new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
function CalendarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m3 0h3"/></svg>; }

export function BatchDatePicker({ id, label, value, onChange, required = false, events = [], time, onDateTimeChange }: {
  id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; events?: CalendarEvent[]; time?: string; onDateTimeChange?: (date: string, time: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const heading = useId(), help = useId();
  const [isOpen,setOpen] = useState(false);
  const [selection,setSelection] = useState('');
  const [selectedTime,setSelectedTime] = useState('');
  const [month,setMonth] = useState<Date>(() => asDate('2026-01-01'));
  const [today,setToday] = useState<Date>(() => asDate('2026-01-01'));
  useEffect(() => {
    if (!isOpen) return;
    const element=dialog.current, opener=trigger.current, previousOverflow=document.body.style.overflow;
    element?.showModal();element?.querySelector<HTMLButtonElement>('.rdp-day_button[tabindex="0"]')?.focus();document.body.style.overflow='hidden';
    return () => {element?.close();document.body.style.overflow=previousOverflow;opener?.focus();};
  },[isOpen]);
  function open() {
    const current = TZDate.tz(zone);
    setToday(current);setMonth(validDate(value)?asDate(value):current);
    setSelection(validDate(value)?value:'');setSelectedTime(time??'');setOpen(true);
  }
  function pick(date: Date) { setSelection(dateKey(date));setMonth(date); }
  const datedEvents = events.filter(event => validDate(event.date));
  const agenda = datedEvents.filter(event => event.date===selection).slice().sort((a,b)=>(a.time??'').localeCompare(b.time??''));
  const selected = validDate(selection)?asDate(selection):undefined;
  const canApply = !!selected && (!onDateTimeChange || /^([01]\d|2[0-3]):[0-5]\d$/.test(selectedTime));
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputRow}>
      <input id={id} type="date" required={required} min="2000-01-01" max="2099-12-31" value={value} onChange={event => onChange(event.target.value)} />
      <button ref={trigger} type="button" aria-label={`Open calendar for ${label}`} aria-haspopup="dialog" aria-expanded={isOpen} onClick={open}><CalendarIcon /></button>
    </div>
    {isOpen && createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={heading} aria-describedby={help}
      onCancel={event => {event.preventDefault();setOpen(false);}}>
      <header className={styles.header}><div><h3 id={heading}>Choose a class date</h3><p id={help}>India Standard Time · Changes apply after confirmation.</p></div><button type="button" className={styles.close} aria-label="Close calendar" onClick={()=>setOpen(false)}>×</button></header>
      <div className={styles.body}>
        <div className={styles.calendarPane}>
          <DayPicker mode="single" required timeZone={zone} weekStartsOn={1} selected={selected} onSelect={date=>{if(date)pick(date);}}
            month={month} onMonthChange={setMonth} today={today} startMonth={asDate('2000-01-01')} endMonth={asDate('2099-12-01')}
            disabled={{before:asDate('2000-01-01'),after:asDate('2099-12-31')}} captionLayout="dropdown" navLayout="around" showOutsideDays fixedWeeks autoFocus animate
            className={styles.calendar} modifiers={{scheduled:datedEvents.map(event=>asDate(event.date))}} modifiersClassNames={{scheduled:styles.scheduled}}
            labels={{labelDayButton:(date,modifiers)=>`${fullDate(date)}${modifiers.today?', today':''}${modifiers.scheduled?', classes scheduled':''}`}} />
          <div className={styles.shortcuts}><button type="button" onClick={()=>pick(today)}>Today</button><button type="button" onClick={()=>{const next=asDate(dateKey(today));next.setDate(next.getDate()+1);pick(next);}}>Tomorrow</button><span><i aria-hidden="true"/> Classes scheduled</span></div>
        </div>
        <aside className={styles.details} aria-label="Selected date details">
          <p className={styles.caption}>Selected date</p><p className={styles.selectedDate} role="status" aria-live="polite">{selected?new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(selected):'Choose a day'}</p>
          {onDateTimeChange && <div className={styles.timeField}><label htmlFor={`${id}-calendar-time`}>Start time (IST)</label><input id={`${id}-calendar-time`} type="time" value={selectedTime} onChange={event=>setSelectedTime(event.target.value)}/><div className={styles.times} aria-label="Suggested start times">{['09:00','14:00','19:00','20:00'].map(value=><button key={value} type="button" aria-pressed={selectedTime===value} onClick={()=>setSelectedTime(value)}>{value}</button>)}</div></div>}
          <section className={styles.agenda} aria-label="Classes on selected date"><h4>On this day</h4>{!selected?<p>Select a date to see scheduled classes.</p>:agenda.length?<ul>{agenda.map((event,index)=><li key={`${event.date}:${index}`}><time dateTime={`${event.date}${event.time?`T${event.time}:00+05:30`:''}`}>{event.time?`${event.time} IST`:'Time pending'}</time><span>{event.title}</span></li>)}</ul>:<p>No classes scheduled.</p>}</section>
        </aside>
      </div>
      <footer className={styles.footer}><span>Use arrow keys to move between days.</span><div><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button type="button" className={styles.apply} disabled={!canApply} onClick={()=>{if(!canApply)return;if(onDateTimeChange)onDateTimeChange(selection,selectedTime);else onChange(selection);setOpen(false);}}>{onDateTimeChange?'Use date & time':'Use this date'}</button></div></footer>
    </dialog>,document.body)}
  </div>;
}
