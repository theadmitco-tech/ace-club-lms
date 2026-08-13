'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function WorksheetLogRetry() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="student-button"
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {isPending ? 'Retrying log…' : 'Retry log'}
    </button>
  );
}
