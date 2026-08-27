import { NextResponse } from 'next/server';
import { derivedMutationId, loadAttemptState, mutationHash } from '@/lib/server/mockAttempts';
import { createMockAdminClient } from '@/lib/server/mockQuestionBankAdmin';
import { getMockParticipantIdentity } from '@/lib/server/portalAuthorization';
import { createClient } from '@/utils/supabase/server';

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

function mutationError(error: { message: string; code?: string }) {
  const staleConflict = error.message.includes('STALE_ATTEMPT') || error.message.includes('STALE_RESPONSE');
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.code === '42501' ? 403 : staleConflict ? 409 : 422, headers: PRIVATE_NO_STORE },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getMockParticipantIdentity();
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE });
  try { return NextResponse.json(await loadAttemptState(identity.id, (await params).attemptId), { headers: PRIVATE_NO_STORE }); }
  catch { return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: PRIVATE_NO_STORE }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getMockParticipantIdentity();
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE });
  const attemptId = (await params).attemptId;
  const body = await request.json().catch(() => null);
  if (!body || !['begin','response','navigate','bookmark','review','submit','break','timeout','confirm_and_navigate'].includes(body.operation)
    || !Number.isInteger(body.expectedLockVersion) || typeof body.clientMutationId !== 'string') {
    return NextResponse.json({ error: 'Invalid mutation request.' }, { status: 400, headers: PRIVATE_NO_STORE });
  }
  const payload = body.payload ?? {};
  const supabase = await createClient();
  if (body.operation === 'confirm_and_navigate') {
    if (
      typeof payload !== 'object' || Array.isArray(payload)
      || typeof payload.attempt_item_id !== 'string'
      || typeof payload.next_attempt_item_id !== 'string'
      || !Number.isInteger(payload.expected_response_version)
      || !payload.response || typeof payload.response !== 'object' || Array.isArray(payload.response)
    ) return NextResponse.json({ error: 'Invalid combined mutation request.' }, { status: 400, headers: PRIVATE_NO_STORE });

    const responsePayload = {
      attempt_item_id: payload.attempt_item_id,
      response: payload.response,
      expected_response_version: payload.expected_response_version,
    };
    const responseInput = {
      attemptId, operation: 'response', payload: responsePayload,
      expectedLockVersion: body.expectedLockVersion,
    };
    const { data: responseResult, error: responseError } = await supabase.rpc('mutate_mock_attempt', {
      p_attempt_id: attemptId, p_operation: 'response', p_payload: responsePayload,
      p_expected_lock_version: body.expectedLockVersion,
      p_client_mutation_id: derivedMutationId(body.clientMutationId, 'response'),
      p_request_hash: mutationHash(responseInput),
    });
    if (responseError) return mutationError(responseError);

    const responseLockVersion = Number((responseResult as { lock_version?: number } | null)?.lock_version);
    if (!Number.isInteger(responseLockVersion)) {
      return NextResponse.json({ error: 'Invalid response mutation result.' }, { status: 422, headers: PRIVATE_NO_STORE });
    }
    const navigatePayload = { attempt_item_id: payload.next_attempt_item_id };
    const navigateInput = {
      attemptId, operation: 'navigate', payload: navigatePayload,
      expectedLockVersion: responseLockVersion,
    };
    const { data: navigateResult, error: navigateError } = await supabase.rpc('mutate_mock_attempt', {
      p_attempt_id: attemptId, p_operation: 'navigate', p_payload: navigatePayload,
      p_expected_lock_version: responseLockVersion,
      p_client_mutation_id: derivedMutationId(body.clientMutationId, 'navigate'),
      p_request_hash: mutationHash(navigateInput),
    });
    if (navigateError) return mutationError(navigateError);
    return NextResponse.json(navigateResult, { headers: PRIVATE_NO_STORE });
  }
  if (body.operation === 'timeout') {
    const { data, error } = await supabase.rpc('advance_mock_attempt_timeout', { p_attempt_id: attemptId });
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === '42501' ? 403 : 422, headers: PRIVATE_NO_STORE });
    if (body.includeState === true) {
      return NextResponse.json({ ...(data as Record<string, unknown>), state: await loadAttemptState(identity.id, attemptId) }, { headers: PRIVATE_NO_STORE });
    }
    return NextResponse.json(data, { headers: PRIVATE_NO_STORE });
  }
  const hashInput = { attemptId, operation: body.operation, payload, expectedLockVersion: body.expectedLockVersion };
  const { data, error } = await supabase.rpc('mutate_mock_attempt', {
    p_attempt_id: attemptId, p_operation: body.operation, p_payload: payload,
    p_expected_lock_version: body.expectedLockVersion, p_client_mutation_id: body.clientMutationId,
    p_request_hash: mutationHash(hashInput),
  });
  if (error) return mutationError(error);
  if (body.includeState === true) {
    return NextResponse.json({ ...(data as Record<string, unknown>), state: await loadAttemptState(identity.id, attemptId) }, { headers: PRIVATE_NO_STORE });
  }
  return NextResponse.json(data, { headers: PRIVATE_NO_STORE });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await getMockParticipantIdentity();
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE });
  const attemptId = (await params).attemptId;
  const db = createMockAdminClient();
  const production = process.env.VERCEL_ENV === 'production';
  if (production) {
    const { data: attempt } = await db.from('mock_attempts')
      .select('assignment_id')
      .eq('id', attemptId)
      .eq('student_id', identity.id)
      .maybeSingle();
    if (!attempt) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: PRIVATE_NO_STORE });

    const { data: grant } = await db.from('mock_assignment_testers')
      .select('assignment_id')
      .eq('assignment_id', attempt.assignment_id)
      .eq('user_id', identity.id)
      .is('revoked_at', null)
      .maybeSingle();
    if (!grant) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers: PRIVATE_NO_STORE });
  }
  const { error } = await db.rpc('reset_mock_attempt_for_testing', {
    p_attempt_id: attemptId,
    p_student_id: identity.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 422, headers: PRIVATE_NO_STORE });
  return NextResponse.json({ reset: true }, { headers: PRIVATE_NO_STORE });
}
