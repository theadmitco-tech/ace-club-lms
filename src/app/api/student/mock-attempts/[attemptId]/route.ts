import { NextResponse } from 'next/server';
import { loadAttemptState, mutationHash } from '@/lib/server/mockAttempts';
import { createMockAdminClient } from '@/lib/server/mockQuestionBankAdmin';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getPortalIdentity();
  if (!identity || identity.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await loadAttemptState(identity.id, (await params).attemptId)); }
  catch { return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getPortalIdentity();
  if (!identity || identity.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const attemptId = (await params).attemptId;
  const body = await request.json().catch(() => null);
  if (!body || !['begin','response','navigate','bookmark','review','submit','break','timeout'].includes(body.operation)
    || !Number.isInteger(body.expectedLockVersion) || typeof body.clientMutationId !== 'string') {
    return NextResponse.json({ error: 'Invalid mutation request.' }, { status: 400 });
  }
  const payload = body.payload ?? {};
  const supabase = await createClient();
  if (body.operation === 'timeout') {
    const { data, error } = await supabase.rpc('advance_mock_attempt_timeout', { p_attempt_id: attemptId });
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === '42501' ? 403 : 422 });
    return NextResponse.json(data);
  }
  const hashInput = { attemptId, operation: body.operation, payload, expectedLockVersion: body.expectedLockVersion };
  const { data, error } = await supabase.rpc('mutate_mock_attempt', {
    p_attempt_id: attemptId, p_operation: body.operation, p_payload: payload,
    p_expected_lock_version: body.expectedLockVersion, p_client_mutation_id: body.clientMutationId,
    p_request_hash: mutationHash(hashInput),
  });
  if (error) {
    const staleConflict = error.message.includes('STALE_ATTEMPT') || error.message.includes('STALE_RESPONSE');
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === '42501' ? 403 : staleConflict ? 409 : 422 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  if (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  const identity = await getPortalIdentity();
  if (!identity || identity.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await createMockAdminClient().rpc('reset_mock_attempt_for_testing', {
    p_attempt_id: (await params).attemptId,
    p_student_id: identity.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 422 });
  return NextResponse.json({ reset: true });
}
