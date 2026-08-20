'use client';

import { useEffect } from 'react';

export function StudentRouteError({
  error,
  unstable_retry,
  destination,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
  destination: string;
}) {
  useEffect(() => {
    console.error(`Student ${destination} failed:`, error);
  }, [destination, error]);

  return (
    <main className="student-main">
      <section className="student-state student-state-error" role="alert">
        <span className="state-kicker">{destination} unavailable</span>
        <h1>Something went wrong</h1>
        <p>Retry {destination}. If the problem continues, contact the programme team.</p>
        <button className="student-button" type="button" onClick={unstable_retry}>Retry {destination}</button>
      </section>
    </main>
  );
}
