import { NextResponse } from 'next/server';
import { isSectionOrder } from '@/lib/mockAttempt';
import { mutationHash } from '@/lib/server/mockAttempts';
import { getMockParticipantIdentity } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const identity = await getMockParticipantIdentity();
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.assignmentId !== 'string' || typeof body.clientMutationId !== 'string' || !isSectionOrder(body.sectionOrder)) {
    return NextResponse.json({ error: 'Invalid attempt request.' }, { status: 400, headers: PRIVATE_NO_STORE });
  }
  const supabase = await createClient();
  const payload = { assignmentId: body.assignmentId, sectionOrder: body.sectionOrder };
  const { data, error } = await supabase.rpc('start_mock_attempt', {
    p_assignment_id: body.assignmentId,
    p_section_order: body.sectionOrder,
    p_client_mutation_id: body.clientMutationId,
    p_request_hash: mutationHash(payload),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 409, headers: PRIVATE_NO_STORE });
  return NextResponse.json(data, { headers: PRIVATE_NO_STORE });
}
