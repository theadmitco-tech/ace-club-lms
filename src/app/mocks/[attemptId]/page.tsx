import { notFound } from 'next/navigation';
import { loadAttemptState } from '@/lib/server/mockAttempts';
import { requireMockParticipant } from '@/lib/server/portalAuthorization';
import { MockPlayer } from './MockPlayer';

export default async function MockAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await requireMockParticipant();
  let state;
  try { state = await loadAttemptState(identity.id, (await params).attemptId); }
  catch { notFound(); }
  return <MockPlayer initialState={state as never} />;
}
