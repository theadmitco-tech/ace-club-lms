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
  if (contentEnabled) {
    // Breadcrumbs follow the sidebar section; top-level pages are identified by the sidebar and page title.
    const sections = [['/admin/v2/content', 'Course content'], ['/admin/v2/batches', 'Batches'], ['/admin/v2/students', 'Students']] as const;
    const section = sections.find(([href]) => pathname.startsWith(href + '/'));
    if (!section) return null;
    const page = pathname.endsWith('/students') ? 'Students' : pathname.endsWith('/meeting') ? 'Meeting links' : pathname.endsWith('/live') ? 'Live classes'
      : pathname.includes('/preview/') ? 'Student preview' : pathname.includes('/course/') ? 'Course review' : section[0] === '/admin/v2/students' ? 'Student' : section[1];
    return <nav className={styles.navigation} aria-label="Breadcrumb"><AdminDraftLink href={section[0]} prefetch={false}>{section[1]}</AdminDraftLink><span aria-hidden="true">/</span><span aria-current="page">{page}</span></nav>;
  }
  return <nav className={styles.navigation} aria-label="Course workspace">
    {destinations.filter(([href]) => href !== '/admin/v2/content' || contentEnabled).map(([href, label]) => <AdminDraftLink key={href} href={href} prefetch={false}
      aria-current={(href === '/admin/v2' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined}>
      {label}
    </AdminDraftLink>)}
  </nav>;
}
