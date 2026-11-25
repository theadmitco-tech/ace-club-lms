'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const ITEMS = [
  { key: 'quant', label: 'Quant' },
  { key: 'verbal', label: 'Verbal' },
  { key: 'di', label: 'DI' },
  { key: 'live', label: 'Live classes' },
  { key: 'mocks', label: 'Mocks' },
] as const;
const COURSE_PATH = /^(\/schedule\/v2\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/live\/[^/]+)?$/i;

/**
 * The student's study navigation. On a course page the links stay within that course; elsewhere
 * they go through /schedule/v2, which opens the course that holds the chosen subject.
 */
export function StudentCourseNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const match = pathname.match(COURSE_PATH);
  const base = match ? match[1] : '/schedule/v2';
  const active = pathname === '/mocks' ? 'mocks'
    : match?.[2] || (match && params?.get('view') === 'live') ? 'live'
      : match ? params?.get('subject') ?? null : null;
  const href = (key: string) => key === 'mocks' ? '/mocks' : key === 'live' ? `${base}?view=live` : `${base}?subject=${key}`;
  return <nav className={className} aria-label="Student navigation">
    {ITEMS.map(item => <Link key={item.key} href={href(item.key)} aria-current={active === item.key ? 'page' : undefined} prefetch={false}>{item.label}</Link>)}
  </nav>;
}
