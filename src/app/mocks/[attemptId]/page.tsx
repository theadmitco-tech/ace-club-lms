import { notFound } from 'next/navigation';
import { loadAttemptState } from '@/lib/server/mockAttempts';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { MockPlayer } from './MockPlayer';

export default async function MockAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const identity = await requirePortalRole('student');
  let state;
  try { state = await loadAttemptState(identity.id, (await params).attemptId); }
  catch { notFound(); }
  return <MockPlayer initialState={state as never} />;
}
