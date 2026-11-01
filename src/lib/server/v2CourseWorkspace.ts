import 'server-only';

import { listV2Products, quoteV2Products } from './v2Products';
import { getPortalIdentity } from './portalAuthorization';
import { isV2Phase1PreviewEnabled } from './v2Phase1Feature';
import { createClient } from '@/utils/supabase/server';
import { isV2ProductSelection, type V2ProductCode, type V2Product } from '@/lib/v2Products';

export type PricedCourse = V2Product & { amountPaise: number | null };
export async function loadCourseCatalogue(): Promise<PricedCourse[] | null> {
  if (!isV2Phase1PreviewEnabled()) return null;
  try {
    const products = await listV2Products();
    return await Promise.all(products.map(async (product) => {
      try { return { ...product, amountPaise: (await quoteV2Products([product.code])).amount_paise }; }
      catch { return { ...product, amountPaise: null }; }
    }));
  } catch { return null; }
}

export type PurchaseHistoryItem = {
  id: string; studentName: string; accountActive: boolean; amount_paise: number;
  confirmed_at: string; expires_at: string; revoked_at: string | null; products: V2ProductCode[];
};
export type PurchaseHistory = { status: 'ready'; items: PurchaseHistoryItem[]; hasMore: boolean; checkedAt: number }
  | { status: 'unavailable' };
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export function historyPage(value: string | string[] | undefined): number {
  return typeof value === 'string' && /^[1-9]\d{0,4}$/.test(value) ? Number(value) : 1;
}
// All reads use the current caller's session and RLS; never a service-role client.
// Payment references and provider details are deliberately not selected.
export async function loadPurchaseHistory(audience: 'student' | 'admin', page: number): Promise<PurchaseHistory> {
  if (!isV2Phase1PreviewEnabled() || !Number.isInteger(page) || page < 1 || page > 99999) return { status: 'unavailable' };
  try {
    const identity = await getPortalIdentity();
    if (!identity || identity.role !== audience) return { status: 'unavailable' };
    const supabase = await createClient();
    let query = supabase.from('v2_purchases').select('id, student_id, amount_paise, currency, confirmed_at, expires_at, revoked_at, v2_product_grants(product_code), profiles!v2_purchases_student_id_fkey(full_name, is_active)');
    if (audience === 'student') query = query.eq('student_id', identity.id);
    const { data, error } = await query.order('confirmed_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 25, page * 25);
    if (error || !Array.isArray(data) || data.length > 26) return { status: 'unavailable' };
    const items: PurchaseHistoryItem[] = [];
    for (const row of data) {
      if (!record(row) || !uuid(row.id) || !uuid(row.student_id) || (audience === 'student' && row.student_id !== identity.id)
        || !Number.isSafeInteger(row.amount_paise) || Number(row.amount_paise) <= 0 || row.currency !== 'INR'
        || !date(row.confirmed_at) || !date(row.expires_at) || Date.parse(row.expires_at) <= Date.parse(row.confirmed_at)
        || !(row.revoked_at === null || date(row.revoked_at)) || !Array.isArray(row.v2_product_grants)
        || !record(row.profiles) || typeof row.profiles.is_active !== 'boolean'
        || !(row.profiles.full_name === null || typeof row.profiles.full_name === 'string')) return { status: 'unavailable' };
      const products = row.v2_product_grants.map((grant: unknown) => record(grant) ? grant.product_code : null);
      if (!isV2ProductSelection(products)) return { status: 'unavailable' };
      items.push({ id: row.id, studentName: row.profiles.full_name?.trim() || 'Student', accountActive: row.profiles.is_active,
        amount_paise: Number(row.amount_paise), confirmed_at: row.confirmed_at, expires_at: row.expires_at, revoked_at: row.revoked_at, products });
    }
    return { status: 'ready', items: items.slice(0, 25), hasMore: items.length > 25, checkedAt: Date.now() };
  } catch { return { status: 'unavailable' }; }
}
