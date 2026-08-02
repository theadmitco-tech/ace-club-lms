'use client';

import { useState, type ReactNode } from 'react';

export function WeekDisclosure({
  weekNumber,
  itemCount,
  initiallyOpen,
  children,
}: {
  weekNumber: number;
  itemCount: number;
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const panelId = `week-${weekNumber}-timeline`;

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
        <span>Week {weekNumber}</span>
        <small>{itemCount} item{itemCount === 1 ? '' : 's'}</small>
      </button>
      {isOpen && <div id={panelId}>{children}</div>}
    </section>
  );
}
