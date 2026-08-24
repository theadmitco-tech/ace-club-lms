import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MockResultView } from '@/components/mock/MockResultView';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadMockResult } from '@/lib/server/mockResults';

export default async function AdminMockAttemptResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requirePortalRole('admin');
  let result;
  try { result = await loadMockResult((await params).attemptId, { admin: true }); }
  catch { notFound(); }
  return <div className="animate-fade-in"><div className="admin-results-heading"><Link href="/admin/mock-results">← Back to mock reporting</Link><p>Read-only Student attempt</p><h1>{result.student.full_name}</h1><span>{result.student.email}</span></div><MockResultView admin result={result}/></div>;
}
