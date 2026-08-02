'use client';

import { useEffect } from 'react';
import './dashboard.css';

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Student dashboard failed:', error);
  }, [error]);

  return (
    <main className="student-main">
      <section className="student-state student-state-error" role="alert">
        <span className="state-kicker">Course unavailable</span>
        <h1>Something went wrong</h1>
        <p>Retry the course. If the problem continues, contact the programme team.</p>
        <button className="student-button" type="button" onClick={unstable_retry}>Retry course</button>
      </section>
    </main>
  );
}
