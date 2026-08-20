'use client';

import { useState, type ReactNode } from 'react';

export function ScheduleDisclosure({
  id,
  label,
  itemCount,
  initiallyOpen,
  children,
}: {
  id: string;
  label: string;
  itemCount: number;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const panelId = `schedule-${id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;

  return (
    <section className={`week-group${isOpen ? ' is-open' : ''}`}>
      <button
        className="week-group-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="week-toggle-icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
        <span>{label}</span>
        <small>{itemCount} event{itemCount === 1 ? '' : 's'}</small>
      </button>
      {isOpen && <div id={panelId}>{children}</div>}
    </section>
  );
}
