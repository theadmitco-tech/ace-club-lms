import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createMockAdminClient } from '@/lib/server/mockQuestionBankAdmin';

const HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  let body: { namespace?: unknown; email?: unknown; active?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid membership request.' }, { status: 400, headers: HEADERS }); }
  const code = typeof body.namespace === 'string' ? body.namespace.trim().toUpperCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const active = body.active !== false;
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(code) || !email.includes('@') || email.length > 320) return NextResponse.json({ error: 'A valid namespace and Admin email are required.' }, { status: 400, headers: HEADERS });
  const admin = createMockAdminClient();
  const [{ data: namespace, error: namespaceError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from('mock_source_namespaces').select('id, code').eq('code', code).eq('is_active', true).maybeSingle(),
    admin.from('profiles').select('id, role, is_active').ilike('email', email).maybeSingle(),
  ]);
  if (namespaceError || profileError) return NextResponse.json({ error: 'Unable to verify namespace membership.' }, { status: 500, headers: HEADERS });
  if (!namespace) return NextResponse.json({ error: 'Active namespace not found.' }, { status: 404, headers: HEADERS });
  if (!profile || profile.role !== 'admin' || !profile.is_active) return NextResponse.json({ error: 'The member must be an active Admin.' }, { status: 400, headers: HEADERS });
  const { error } = await admin.from('mock_source_namespace_members').upsert({ namespace_id: namespace.id, user_id: profile.id, is_active: active }, { onConflict: 'namespace_id,user_id' });
  if (error) return NextResponse.json({ error: 'Unable to save namespace membership.' }, { status: 500, headers: HEADERS });
  return NextResponse.json({ namespace: code, active }, { headers: HEADERS });
}
