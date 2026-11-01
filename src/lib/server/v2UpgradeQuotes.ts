import 'server-only';

import { createClient } from '@/utils/supabase/server';
import { getPortalIdentity } from './portalAuthorization';
import { isV2Phase1PreviewEnabled } from './v2Phase1Feature';
import { getMyV2Access, quoteV2Products } from './v2Products';
import { INDIVIDUAL_UPGRADE_POLICY, buildUpgradeQuote, individualSelection, isIndividualUpgrade,
  sameConfiguredQuote, type IndividualProduct, type UpgradeQuote } from '@/lib/v2UpgradeQuotes';

export type UpgradeReview =
  | { status: 'policy_pending' }
  | { status: 'unauthorized' }
  | { status: 'unavailable' }
  | { status: 'ineligible'; reason: 'no_active_package' | 'multiple_packages' | 'full_course' | 'all_subjects' }
  | { status: 'ready'; currentProducts: IndividualProduct[]; expiresAt: string;
      quote: UpgradeQuote | null; invalidSelection: boolean };

const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const instant = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));

export function isIndividualUpgradePolicyEnabled(): boolean {
  if (!isV2Phase1PreviewEnabled() || process.env.V2_INDIVIDUAL_UPGRADE_POLICY !== INDIVIDUAL_UPGRADE_POLICY) return false;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return url.origin === 'https://eyphkkginlgoaxflauog.supabase.co'
      && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

/** Caller-session reads only. No service key, payment call or grant mutation. */
export async function loadIndividualUpgrade(target?: unknown): Promise<UpgradeReview> {
  if (!isIndividualUpgradePolicyEnabled()) return { status: 'policy_pending' };
  try {
    const identity = await getPortalIdentity();
    if (!identity || identity.role !== 'student') return { status: 'unauthorized' };
    const client = await createClient();
    const now = new Date().toISOString();
    // At most two active purchases: two already makes credit attribution ambiguous.
    const { data, error } = await client.from('v2_purchases')
      .select('id, student_id, amount_paise, currency, confirmed_at, expires_at, revoked_at, v2_product_grants(product_code)')
      .eq('student_id', identity.id).is('revoked_at', null).lte('confirmed_at', now).gt('expires_at', now)
      .order('confirmed_at', { ascending: false }).limit(2);
    if (error || !Array.isArray(data) || data.length > 2) return { status: 'unavailable' };
    if (data.length === 0) return { status: 'ineligible', reason: 'no_active_package' };
    for (const row of data) {
      if (!record(row) || !uuid(row.id) || row.student_id !== identity.id
        || !Number.isSafeInteger(row.amount_paise) || Number(row.amount_paise) <= 0 || row.currency !== 'INR'
        || !instant(row.confirmed_at) || !instant(row.expires_at) || row.revoked_at !== null
        || Date.parse(row.confirmed_at) > Date.parse(now) || Date.parse(row.expires_at) <= Date.parse(now)
        || !Array.isArray(row.v2_product_grants)) return { status: 'unavailable' };
    }
    if (data.length > 1) return { status: 'ineligible', reason: 'multiple_packages' };
    const purchase = data[0];
    const products = purchase.v2_product_grants.map((grant: unknown) => record(grant) ? grant.product_code : null);
    if (products.length === 1 && products[0] === 'full_batch') return { status: 'ineligible', reason: 'full_course' };
    if (!individualSelection(products)) return { status: 'unavailable' };
    if (products.length === 3) return { status: 'ineligible', reason: 'all_subjects' };
    // Recheck access using database time; a history row alone is not authorization.
    const access = await getMyV2Access();
    if (access.length !== products.length || products.some((code) => !access.some((item) =>
      item.product_code === code && Date.parse(item.expires_at) === Date.parse(purchase.expires_at)))) return { status: 'unavailable' };
    const ready = { status: 'ready' as const, currentProducts: products, expiresAt: purchase.expires_at, quote: null };
    if (target === undefined) return { ...ready, invalidSelection: false };
    if (!individualSelection(target) || !isIndividualUpgrade(products, target)) return { ...ready, invalidSelection: true };
    const currentQuote = await quoteV2Products(products);
    const targetQuote = await quoteV2Products(target);
    // Fail on price revisions observed during the request; this still is not a payment reservation.
    const [currentAgain, targetAgain] = await Promise.all([quoteV2Products(products), quoteV2Products(target)]);
    if (!sameConfiguredQuote(currentQuote, currentAgain) || !sameConfiguredQuote(targetQuote, targetAgain)) return { status: 'unavailable' };
    const quote = buildUpgradeQuote(products, target, currentQuote, targetQuote, purchase.expires_at);
    if (!quote || Date.parse(purchase.expires_at) <= Date.now()) return { status: 'unavailable' };
    return { ...ready, quote, invalidSelection: false };
  } catch { return { status: 'unavailable' }; }
}
