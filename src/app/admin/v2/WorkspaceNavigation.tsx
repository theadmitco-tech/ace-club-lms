'use client';

import { usePathname } from 'next/navigation';
import { AdminDraftLink } from '@/components/AdminDraftNavigation';
import styles from './workspace.module.css';

const destinations = [
  ['/admin/v2', 'Overview'],
  ['/admin/v2/templates', 'Course content'],
  ['/admin/v2/batches', 'Batches & publishing'],
] as const;

export default function WorkspaceNavigation() {
  const pathname = usePathname();
  return <nav className={styles.navigation} aria-label="Course workspace">
    {destinations.map(([href, label]) => <AdminDraftLink key={href} href={href} prefetch={false}
      aria-current={(href === '/admin/v2' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined}>
      {label}
    </AdminDraftLink>)}
  </nav>;
}
