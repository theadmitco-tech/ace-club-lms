import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { createClient } from '@/utils/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  let body: { revisionId?: unknown; action?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid lifecycle request.' }, { status: 400, headers: HEADERS }); }
  const revisionId = typeof body.revisionId === 'string' ? body.revisionId : '';
  const action = body.action === 'publish' || body.action === 'retire' || body.action === 'revise' ? body.action : '';
  if (!UUID.test(revisionId) || !action) return NextResponse.json({ error: 'Choose a valid question revision and action.' }, { status: 400, headers: HEADERS });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_mock_question_lifecycle', { p_revision_id: revisionId, p_action: action });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 409, headers: HEADERS });
  return NextResponse.json(data, { headers: HEADERS });
}
