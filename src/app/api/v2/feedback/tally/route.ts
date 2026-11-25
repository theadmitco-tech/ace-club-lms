import { NextResponse } from 'next/server';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { createV2ServiceClient } from '@/lib/server/v2ServiceClient';
import { tallyFeedbackConfig, validTallySignature, parseTallySubmission, verifyFeedbackLinkToken } from '@/lib/server/v2TallyFeedback';
import { CheckoutRequestError, readCheckoutRequestText, parseCheckoutRequestJson } from '@/lib/server/v2CheckoutRequest';

export const runtime = 'nodejs';

// Tally retries non-2xx responses. Permanent problems (bad signature, foreign form, forged or
// expired link, someone else's obligation) answer 4xx; only temporary failures answer 503.
export async function POST(request: Request) {
  const config = tallyFeedbackConfig();
  if (!isV2LearningEnabled() || !config) return NextResponse.json({ error: 'Unavailable' }, { status: 404 });
  try {
    const raw = await readCheckoutRequestText(request, 100000);
    if (!validTallySignature(config, raw, request.headers.get('tally-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    const submission = parseTallySubmission(config, parseCheckoutRequestJson(raw));
    if (!submission) return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    if (submission.ignored) return NextResponse.json({ received: true });
    const link = verifyFeedbackLinkToken(config, submission.ref);
    if (!link) return NextResponse.json({ error: 'Invalid feedback link' }, { status: 400 });
    const client = createV2ServiceClient();
    if (!client) return NextResponse.json({ error: 'Feedback recording unavailable' }, { status: 503 });
    const { error } = await client.rpc('record_v2_tally_feedback', { p_obligation_id: link.obligationId, p_student_id: link.studentId, p_submission_id: submission.submissionId, p_response: submission.response });
    if (error) return NextResponse.json({ error: 'Feedback not recorded' }, { status: error.code === '42501' || error.code === '22023' ? 400 : 503 });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Feedback recording unavailable' }, { status: 503 });
  }
}
