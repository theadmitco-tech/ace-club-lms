'use client';
import { useId } from 'react';
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, type Key } from 'react-aria-components';
import styles from './timeSelect.module.css';

/** Class start times in 30-minute steps from 6:00 am to 11:30 pm (IST). */
const STEPS = Array.from({ length: (24 - 6) * 2 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
export function formatClassTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${((hours + 11) % 12) + 1}:${match[2]} ${hours < 12 ? 'am' : 'pm'}`;
}

export function TimeSelect({ label, value, onChange, required = false, id }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; id?: string }) {
  // A saved time outside the 30-minute grid (for example 18:50) stays selectable.
  const options = value && !STEPS.includes(value) ? [...STEPS, value].sort() : STEPS;
  const listId = useId();
  // Opening shows the current time in the middle of the list, not 6:00 am.
  const reveal = (open: boolean) => { if (open) requestAnimationFrame(() => document.querySelector(`[data-time-list="${listId}"] [data-selected]`)?.scrollIntoView({ block: 'center' })); };
  return <Select id={id} className={styles.select} value={value || null} isRequired={required} placeholder="Choose a time"
    onOpenChange={reveal} onChange={(key: Key | null) => { if (typeof key === 'string') onChange(key); }}>
    <Label className={styles.label}>{label}</Label>
    <Button className={styles.trigger}>
      <SelectValue className={styles.value}>{({ isPlaceholder, defaultChildren }) => isPlaceholder ? defaultChildren : formatClassTime(value)}</SelectValue>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
    </Button>
    <Popover className={styles.popover} placement="bottom start" offset={6}>
      <ListBox className={styles.list} data-time-list={listId} items={options.map(time => ({ id: time }))}>
        {item => <ListBoxItem id={item.id} textValue={formatClassTime(item.id)} className={styles.option}>{formatClassTime(item.id)}</ListBoxItem>}
      </ListBox>
    </Popover>
  </Select>;
}
