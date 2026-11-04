'use client';

import { usePathname } from 'next/navigation';
import { AdminDraftLink } from '@/components/AdminDraftNavigation';
import styles from './workspace.module.css';

const destinations = [
  ['/admin/v2', 'Overview'],
  ['/admin/v2/access', 'Products & access'],
  ['/admin/v2/templates', 'Course content'],
  ['/admin/v2/content', 'Content publishing'],
  ['/admin/v2/batches', 'Batches & publishing'],
] as const;

export default function WorkspaceNavigation({ contentEnabled = false }: { contentEnabled?: boolean }) {
  const pathname = usePathname();
  if (contentEnabled) return <nav className={styles.navigation} aria-label="Workspace location"><AdminDraftLink href="/admin" prefetch={false}>Home</AdminDraftLink><span aria-hidden="true">/</span><span>{pathname.includes('/batches') ? 'Batches' : pathname.includes('/students') ? 'Students' : pathname.includes('/templates') ? 'Course templates' : pathname.includes('/imports') ? 'Shared library & imports' : pathname.includes('/access') ? 'Prices & access' : 'Course content'}</span></nav>;
  return <nav className={styles.navigation} aria-label="Course workspace">
    {destinations.filter(([href]) => href !== '/admin/v2/content' || contentEnabled).map(([href, label]) => <AdminDraftLink key={href} href={href} prefetch={false}
      aria-current={(href === '/admin/v2' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined}>
      {label}
    </AdminDraftLink>)}
  </nav>;
}
