import { NextResponse } from 'next/server';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function PUT(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getPortalIdentity();
  if (!identity || identity.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE });
  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (typeof body?.attemptItemId !== 'string' || !note || note.length > 4000) return NextResponse.json({ error: 'Enter a note between 1 and 4,000 characters.' }, { status: 400, headers: PRIVATE_NO_STORE });
  const db = await createClient();
  const { error } = await db.from('mock_attempt_item_notes').upsert({ attempt_id: attemptId, attempt_item_id: body.attemptItemId, student_id: identity.id, note }, { onConflict: 'attempt_item_id,student_id' });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'This completed attempt is not available.' : 'Could not save this note.' }, { status: error.code === '42501' ? 403 : 422, headers: PRIVATE_NO_STORE });
  return NextResponse.json({ saved: true }, { headers: PRIVATE_NO_STORE });
}
