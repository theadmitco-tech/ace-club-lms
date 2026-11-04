import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { createClient } from '@/utils/supabase/server';
import { historyPage } from '@/lib/server/v2CourseWorkspace';
export default async function StudentsPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  if(!isV2ContentPublishingEnabled())notFound();await requirePortalRole('admin');
  const params=await searchParams,q=(typeof params.q==='string'?params.q:'').slice(0,100),page=historyPage(params.page);
  const client=await createClient();let query=client.from('profiles').select('id,full_name,email,is_active').eq('role','student');
  if(q)query=query.ilike('full_name',`%${q.replace(/[\\%_]/g,'\\$&')}%`);
  const {data,error}=await query.order('full_name').order('id').range((page-1)*25,page*25);
  const rows=data?.slice(0,25)??[],href=(number:number)=>`/admin/v2/students?q=${encodeURIComponent(q)}&page=${number}`;
  return <div><p className="workflow-kicker">People</p><h1 className="admin-page-title">Students</h1><p className="admin-page-subtitle">Find a student to check course access, expiry and batch registration.</p>
    <form className="workflow-search" action="/admin/v2/students"><label>Search student name<input name="q" type="search" maxLength={100} defaultValue={q} placeholder="Student name"/></label><button className="btn btn-secondary" type="submit">Search</button></form>
    {error?<p className="workflow-error" role="alert">The student list could not be loaded. Reload to retry.</p>:<section className="admin-card workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Student</th><th>Account</th><th>Access</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.full_name||'Student'}</strong><p className="workflow-muted">{row.email}</p></td><td>{row.is_active?'Active':'Inactive'}</td><td><Link href={`/admin/v2/students/${row.id}`}>View access</Link></td></tr>)}{!rows.length&&<tr><td colSpan={3}>No students match this view.</td></tr>}</tbody></table></section>}
    <div className="workflow-actions">{page>1&&<Link href={href(page-1)}>Previous page</Link>}{(data?.length??0)>25&&<Link href={href(page+1)}>Next page</Link>}</div><details className="workflow-secondary"><summary>More student tools</summary><div className="workflow-actions"><Link href="/admin/users">Manage accounts</Link><Link href="/admin/progress">Existing batch progress</Link><Link href="/admin/v2/access">Purchase history</Link></div></details>
  </div>;
}
