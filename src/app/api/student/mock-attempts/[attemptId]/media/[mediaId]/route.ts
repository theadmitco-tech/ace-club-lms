import { NextResponse } from 'next/server';
import { createMockAdminClient } from '@/lib/server/mockQuestionBankAdmin';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string; mediaId: string }> }) {
  const identity = await getPortalIdentity();
  if (!identity || identity.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { attemptId, mediaId } = await params;
  const db = createMockAdminClient();
  const { data: attempt, error: attemptError } = await db.from('mock_attempts').select('id').eq('id', attemptId).eq('student_id', identity.id).single();
  if (attemptError || !attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: itemIds, error: itemError } = await db.from('mock_attempt_items').select('question_revision_id,stimulus_revision_id').eq('attempt_id', attemptId);
  if (itemError) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const questionIds = (itemIds ?? []).map((row) => row.question_revision_id);
  const stimulusIds = (itemIds ?? []).flatMap((row) => row.stimulus_revision_id ? [row.stimulus_revision_id] : []);
  const [{ data: questionLink }, { data: stimulusLink }] = await Promise.all([
    questionIds.length ? db.from('mock_question_media').select('media_id').eq('media_id', mediaId).in('question_revision_id', questionIds).maybeSingle() : Promise.resolve({ data: null }),
    stimulusIds.length ? db.from('mock_stimulus_media').select('media_id').eq('media_id', mediaId).in('stimulus_revision_id', stimulusIds).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!questionLink && !stimulusLink) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: media, error: mediaError } = await db.from('mock_media').select('storage_path,status').eq('id', mediaId).single();
  if (mediaError || media.status !== 'ready') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data, error } = await db.storage.from('mock-media').createSignedUrl(media.storage_path, 60);
  if (error) return NextResponse.json({ error: 'Media unavailable' }, { status: 503 });
  return new NextResponse(null, { status: 307, headers: { 'Cache-Control': 'private, no-store', Location: data.signedUrl } });
}
