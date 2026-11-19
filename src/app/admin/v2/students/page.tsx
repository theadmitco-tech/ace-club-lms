import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { createClient } from '@/utils/supabase/server';
import { historyPage } from '@/lib/server/v2CourseWorkspace';
import styles from './students.module.css';

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!isV2ContentPublishingEnabled()) notFound();
  await requirePortalRole('admin');
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').slice(0, 100).trim();
  const page = historyPage(params.page);
  const client = await createClient();
  let query = client.from('profiles').select('id,full_name,email,is_active').eq('role', 'student');
  if (q) query = query.ilike('full_name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  const { data, error } = await query.order('full_name').order('id').range((page - 1) * 25, page * 25);
  const rows = data?.slice(0, 25) ?? [];
  const href = (number: number) => `/admin/v2/students?q=${encodeURIComponent(q)}&page=${number}`;

  return <div className={styles.workspace}>
    <header className={styles.header}>
      <h1 className="admin-page-title">Students</h1>
      <p className="admin-page-subtitle">Find a student, check their course access and manage enrollment.</p>
    </header>
    <form className={styles.searchForm} action="/admin/v2/students" role="search" aria-label="Find students">
      <label htmlFor="student-search">Search student name</label>
      <div className={styles.searchControls}>
        <div className={styles.searchInput}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <input id="student-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Enter a student’s name" />
        </div>
        <button className="btn btn-primary" type="submit">Search</button>
        {q && <Link className={styles.clear} href="/admin/v2/students">Clear search</Link>}
      </div>
    </form>
    {error ? <div className={styles.error} role="alert"><h2>Students could not be loaded</h2><p>The list is unavailable right now.</p><Link href={href(page)}>Try again</Link></div> : <>
      <div className={styles.resultSummary}><p>{q ? `Results for “${q}”` : 'Student directory'}</p><span>Page {page} · {rows.length} {rows.length === 1 ? 'student' : 'students'} shown</span></div>
      {rows.length ? <section className={styles.tableWrap} aria-label="Student directory">
        <table className={styles.table}>
          <thead><tr><th scope="col">Student</th><th scope="col">Account status</th><th scope="col"><span className={styles.srOnly}>Student details</span></th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td><strong>{row.full_name || 'Student'}</strong><span className={styles.email}>{row.email}</span></td>
            <td><span className={styles.status} data-active={row.is_active}>{row.is_active ? 'Active account' : 'Inactive account'}</span></td>
            <td><Link className={styles.openStudent} href={`/admin/v2/students/${row.id}`} aria-label={`View access: ${row.full_name || row.email || 'Student'}`}>View access <span aria-hidden="true">→</span></Link></td>
          </tr>)}</tbody>
        </table>
      </section> : <section className={styles.empty} aria-labelledby="empty-students-title"><h2 id="empty-students-title">{q ? 'No students found' : page > 1 ? 'No students on this page' : 'No students yet'}</h2><p>{q ? 'Try a different name or clear the search to see the directory.' : page > 1 ? 'Return to the first page to see the current directory.' : 'Student accounts will appear here when they are created.'}</p>{page > 1 && <Link href={href(1)}>Go to the first page</Link>}</section>}
      {(page > 1 || (data?.length ?? 0) > 25) && <nav className={styles.pagination} aria-label="Student pages">
        {page > 1 && <Link href={href(page - 1)}>Previous page</Link>}
        <span>Page {page}</span>
        {(data?.length ?? 0) > 25 && <Link href={href(page + 1)}>Next page</Link>}
      </nav>}
      <p className={styles.note}>Account status shows whether the account is enabled. Open a student to check course access and expiry.</p>
    </>}
    <details className={styles.moreTools}><summary>More student tools</summary><nav aria-label="More student tools"><Link href="/admin/users">Manage accounts</Link><Link href="/admin/progress">Existing batch progress</Link><Link href="/admin/v2/access">Purchase history</Link></nav></details>
  </div>;
}
