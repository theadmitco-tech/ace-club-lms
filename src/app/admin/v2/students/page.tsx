import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { historyPage } from '@/lib/server/v2CourseWorkspace';
import { readStudentDirectory, type DirectoryAccess } from '@/lib/server/adminStudentDirectory';
import styles from './students.module.css';

const date = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value));
function AccessCell({ access }: { access: DirectoryAccess | null }) {
  if (!access) return <span className={styles.muted}>Unavailable</span>;
  if (access.status === 'none') return <span className={styles.muted}>No purchase</span>;
  return <span className={styles.access}><strong>{access.products.join(' + ') || 'Course'}</strong>
    <span className={styles.accessStatus} data-state={access.status}>{access.status === 'active' ? `Active · until ${date(access.expiresAt!)}` : access.status === 'revoked' ? 'Revoked' : `Expired ${date(access.expiresAt!)}`}</span></span>;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!isV2ContentPublishingEnabled()) notFound();
  await requirePortalRole('admin');
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').slice(0, 100).trim();
  const page = historyPage(params.page);
  const { rows, hasNext, error } = await readStudentDirectory(q, page);
  const href = (number: number) => `/admin/v2/students?q=${encodeURIComponent(q)}&page=${number}`;

  return <div className={styles.workspace}>
    <header className={styles.header}>
      <h1 className="admin-page-title">Students</h1>
      <p className="admin-page-subtitle">Find a student to see what they bought, when it expires and which batches they are in.</p>
    </header>
    <form className={styles.searchForm} action="/admin/v2/students" role="search" aria-label="Find students">
      <label htmlFor="student-search" className={styles.srOnly}>Search by name or email</label>
      <div className={styles.searchControls}>
        <div className={styles.searchInput}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
          <input id="student-search" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search by name or email" />
        </div>
        <button className="btn btn-primary" type="submit">Search</button>
        {q && <Link className={styles.clear} href="/admin/v2/students">Clear search</Link>}
      </div>
    </form>
    {error ? <div className={styles.error} role="alert"><h2>Students could not be loaded</h2><p>The list is unavailable right now.</p><Link href={href(page)}>Try again</Link></div> : <>
      <p className={styles.resultSummary}>{q ? `Results for “${q}” · ` : ''}Page {page} · {rows.length} {rows.length === 1 ? 'student' : 'students'} shown</p>
      {rows.length ? <section className={styles.tableWrap} aria-label="Student directory">
        <table className={styles.table}>
          <thead><tr><th scope="col">Student</th><th scope="col">Course access</th><th scope="col">Batches</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td><Link className={styles.rowLink} href={`/admin/v2/students/${row.id}`} aria-label={`View access: ${row.full_name || row.email || 'Student'}`}>
              <strong>{row.full_name || 'Student'}</strong>{!row.is_active && <span className={styles.inactive}>Inactive account</span>}
              <span className={styles.email}>{row.email}</span></Link></td>
            <td><AccessCell access={row.access} /></td>
            <td className={styles.batchCount}>{row.batches === null ? '—' : row.batches === 0 ? <span className={styles.muted}>None</span> : row.batches}<span aria-hidden="true" className={styles.chevron}>›</span></td>
          </tr>)}</tbody>
        </table>
      </section> : <section className={styles.empty} aria-labelledby="empty-students-title"><h2 id="empty-students-title">{q ? 'No students found' : page > 1 ? 'No students on this page' : 'No students yet'}</h2><p>{q ? 'Try a different name or email, or clear the search.' : page > 1 ? 'Return to the first page to see the current list.' : 'Student accounts appear here when they are created.'}</p>{page > 1 && <Link href={href(1)}>Go to the first page</Link>}</section>}
      {(page > 1 || hasNext) && <nav className={styles.pagination} aria-label="Student pages">
        {page > 1 && <Link href={href(page - 1)}>Previous page</Link>}
        <span>Page {page}</span>
        {hasNext && <Link href={href(page + 1)}>Next page</Link>}
      </nav>}
    </>}
  </div>;
}
