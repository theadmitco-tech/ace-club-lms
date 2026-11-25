// Server-owned V2 payment mode. Test Mode runs only in Preview/local development against
// staging; Live Mode only in an approved Production release with its own dedicated keys.
// Mixed, partial or opposite-mode configuration turns checkout off rather than guessing.
// There is no fallback to the legacy MVP Razorpay variables.
import { checkoutPreviewEnabled } from './v2Checkout';
import { isV2ProductionReleaseApproved } from './v2Environment';

type Env = Record<string, string | undefined>;
export type V2PaymentMode = 'test' | 'live';
export type V2PaymentConfig = { mode: V2PaymentMode; keyId: string; keySecret: string; webhookSecret: string };

const hasAny = (env: Env, prefix: string) => Object.entries(env).some(([key, value]) => key.startsWith(prefix) && !!value?.trim());

function keys(env: Env, mode: V2PaymentMode): V2PaymentConfig | null {
  const prefix = mode === 'test' ? 'V2_RAZORPAY_TEST_' : 'V2_RAZORPAY_LIVE_';
  const keyId = env[`${prefix}KEY_ID`]?.trim(), keySecret = env[`${prefix}KEY_SECRET`]?.trim(), webhookSecret = env[`${prefix}WEBHOOK_SECRET`]?.trim();
  const keyPattern = mode === 'test' ? /^rzp_test_[A-Za-z0-9]+$/ : /^rzp_live_[A-Za-z0-9]+$/;
  if (!keyId || !keyPattern.test(keyId) || !keySecret || keySecret.length < 8 || !webhookSecret || webhookSecret.length < 24) return null;
  return { mode, keyId, keySecret, webhookSecret };
}

/** The payment configuration this deployment may use, or null when checkout must stay off. */
export function v2PaymentConfig(env: Env): V2PaymentConfig | null {
  const testRequested = env.V2_CHECKOUT_TEST_ENABLED === 'true', liveRequested = env.V2_CHECKOUT_LIVE_ENABLED === 'true';
  if (testRequested && liveRequested) return null;
  if (testRequested) {
    if (!checkoutPreviewEnabled(env) || hasAny(env, 'V2_RAZORPAY_LIVE_')) return null;
    return keys(env, 'test');
  }
  if (liveRequested) {
    if (!isV2ProductionReleaseApproved(env) || hasAny(env, 'V2_RAZORPAY_TEST_')) return null;
    return keys(env, 'live');
  }
  return null;
}

/** New checkouts and payment attempts can be paused while paid-order reconciliation continues. */
export function v2NewCheckoutsPaused(env: Env): boolean {
  return env.V2_CHECKOUT_NEW_ORDERS_PAUSED === 'true';
}
