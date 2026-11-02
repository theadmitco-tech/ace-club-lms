import { NextResponse } from 'next/server';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { markV2LearningProgress, submitV2SessionFeedback, beginV2RecordingWatch, recordV2RecordingSample, reportV2RecordingWatched } from '@/lib/server/v2Learning';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function POST(request: Request) {
  if (!isV2LearningEnabled()) return NextResponse.json({ error: 'Learning unavailable.' }, { status: 404, headers });
  const url = new URL(request.url), host = request.headers.get('host');
  let expectedOrigin = '';
  try {
    if (host && ['https:', 'http:'].includes(url.protocol)) {
      const external = new URL(`${url.protocol}//${host}`);
      if (external.host === host && !external.username && !external.password && external.pathname === '/'
        && !external.search && !external.hash && !host.includes(',')) expectedOrigin = external.origin;
    }
  } catch { /* Malformed host values cannot authorize a learning mutation. */ }
  if (!expectedOrigin || request.headers.get('origin') !== expectedOrigin
    || !request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Same-site JSON request required.' }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 16000) return NextResponse.json({ error: 'Request too large.' }, { status: 413, headers });
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
    const { action, ...input } = body;
    if (action === 'progress' && await markV2LearningProgress(input)) return NextResponse.json({ saved: true }, { headers });
    if (action === 'feedback') {
      const result = await submitV2SessionFeedback(input);
      if (result) return NextResponse.json(result, { headers });
    }
    const watchResult = action === 'watch-start' ? await beginV2RecordingWatch(input) : action === 'watch-sample' ? await recordV2RecordingSample(input) : action === 'watch-report' ? await reportV2RecordingWatched(input) : null;
    if (watchResult) return NextResponse.json(watchResult, { headers });
    return NextResponse.json({ error: 'The update could not be confirmed. Reload the course before retrying.' }, { status: 409, headers });
  } catch { return NextResponse.json({ error: 'The learning update could not be processed.' }, { status: 400, headers }); }
}
