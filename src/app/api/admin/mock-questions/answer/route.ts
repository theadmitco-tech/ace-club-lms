import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createMockAdminClient } from '@/lib/server/mockQuestionBankAdmin';

const HEADERS = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return NextResponse.json({ error: 'Admin access required.' }, { status: 403, headers: HEADERS });
  let body: { revisionId?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: HEADERS }); }
  const revisionId = typeof body.revisionId === 'string' ? body.revisionId : '';
  if (!UUID.test(revisionId)) return NextResponse.json({ error: 'Invalid question revision.' }, { status: 400, headers: HEADERS });
  const supabase = createMockAdminClient();
  const { data, error } = await supabase.rpc('get_mock_question_keys', { p_revision_ids: [revisionId] });
  if (error) return NextResponse.json({ error: 'Unable to reveal the protected answer.' }, { status: 409, headers: HEADERS });
  const row = (data as Array<{ question_revision_id: string; answer_json: Record<string, string> }> | null)?.[0];
  if (!row) return NextResponse.json({ error: 'No answer key is available for this revision.' }, { status: 404, headers: HEADERS });
  return NextResponse.json({ answer: row.answer_json }, { headers: HEADERS });
}
