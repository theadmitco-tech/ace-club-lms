import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Session feedback through the approved Tally form.
// The form is opened with a signed `ref` hidden field naming the student and obligation, so a
// submission can only clear the feedback it was issued for. Tally's own webhook signature is
// checked separately before any `ref` is trusted.

type Env = Record<string, string | undefined>;
export type TallyFeedbackConfig = { formId: string; signingSecret: string; linkSecret: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINK_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

/** Tally is used only when its form, webhook secret and link secret are all configured; otherwise the in-app form remains. */
export function tallyFeedbackConfig(env: Env = process.env): TallyFeedbackConfig | null {
  const formId = env.V2_TALLY_FEEDBACK_FORM_ID?.trim(), signingSecret = env.V2_TALLY_SIGNING_SECRET?.trim(), linkSecret = env.V2_FEEDBACK_LINK_SECRET?.trim();
  if (!formId || !/^[A-Za-z0-9]{3,20}$/.test(formId) || !signingSecret || signingSecret.length < 16 || !linkSecret || linkSecret.length < 32) return null;
  return { formId, signingSecret, linkSecret };
}

const sign = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('base64url');
const sameText = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** A signed reference naming exactly one student and feedback obligation, valid for 30 days. */
export function feedbackLinkToken(config: TallyFeedbackConfig, studentId: string, obligationId: string, nowMs = Date.now()): string {
  if (!UUID.test(studentId) || !UUID.test(obligationId)) throw new Error('Invalid feedback link identity');
  const body = `v1.${obligationId}.${studentId}.${Math.floor(nowMs / 1000) + LINK_LIFETIME_SECONDS}`;
  return `${body}.${sign(config.linkSecret, body)}`;
}

export function verifyFeedbackLinkToken(config: TallyFeedbackConfig, token: unknown, nowMs = Date.now()): { studentId: string; obligationId: string } | null {
  if (typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1' || !UUID.test(parts[1]) || !UUID.test(parts[2]) || !/^\d{1,12}$/.test(parts[3])) return null;
  const body = parts.slice(0, 4).join('.');
  if (!sameText(parts[4], sign(config.linkSecret, body))) return null;
  if (Number(parts[3]) * 1000 < nowMs) return null;
  return { obligationId: parts[1], studentId: parts[2] };
}

/** Tally signs the raw request body with HMAC-SHA256 and sends it base64-encoded in `tally-signature`. */
export function validTallySignature(config: TallyFeedbackConfig, rawBody: string, header: string | null): boolean {
  if (!header || header.length > 200) return false;
  return sameText(header, createHmac('sha256', config.signingSecret).update(rawBody).digest('base64'));
}

/** The embeddable form for one obligation. The session title is display-only; `ref` is what counts. */
export function tallyFormUrl(config: TallyFeedbackConfig, token: string, sessionTitle: string): string {
  const query = new URLSearchParams({ alignLeft: '1', hideTitle: '1', transparentBackground: '1', ref: token, session: sessionTitle.slice(0, 200) });
  return `https://tally.so/embed/${config.formId}?${query}`;
}

type TallyField = { key?: unknown; label?: unknown; type?: unknown; value?: unknown };
/** Keeps an answer as-is when small, otherwise stores a truncated text copy so one response stays bounded. */
const bounded = (value: unknown) => { const text = JSON.stringify(value ?? null) ?? 'null'; return text.length <= 2000 ? (value ?? null) : text.slice(0, 2000); };
/** Extracts the submission, our `ref` and a bounded copy of the answers from a Tally webhook payload. */
export function parseTallySubmission(config: TallyFeedbackConfig, payload: unknown):
  { ignored: true } | { ignored: false; submissionId: string; ref: unknown; response: Record<string, unknown> } | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const event = payload as { eventType?: unknown; data?: { submissionId?: unknown; responseId?: unknown; formId?: unknown; fields?: unknown } };
  if (event.eventType !== 'FORM_RESPONSE') return { ignored: true };
  const data = event.data;
  if (!data || data.formId !== config.formId || !Array.isArray(data.fields)) return null;
  const submissionId = typeof data.submissionId === 'string' ? data.submissionId : typeof data.responseId === 'string' ? data.responseId : '';
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(submissionId)) return null;
  const fields = (data.fields as TallyField[]).filter(field => field && typeof field === 'object');
  const ref = fields.find(field => field.type === 'HIDDEN_FIELDS' && field.label === 'ref')?.value;
  const answers = fields.filter(field => !(field.type === 'HIDDEN_FIELDS' && field.label === 'ref')).slice(0, 40).map(field => ({
    label: typeof field.label === 'string' ? field.label.slice(0, 200) : '',
    type: typeof field.type === 'string' ? field.type.slice(0, 40) : '',
    value: bounded(field.value),
  }));
  return { ignored: false, submissionId, ref, response: { formId: config.formId, submissionId, fields: answers } };
}
