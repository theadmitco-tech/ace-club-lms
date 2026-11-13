import type { V2ProductCode } from './v2Products';
export type SalesBatch = {
  batchId: string; publicationRevision: number; productCode: string;
  entitlementProductCode: V2ProductCode; title: string; sections: string[]; accessMonths: number;
  sessions: { key: string; title: string; section: string }[];
  events: { key: string; title: string; section: string; startsAt: string; endsAt: string }[];
};
export type CheckoutSummary = {
  id: string; products: V2ProductCode[]; batches: { batchId: string; publicationRevision: number }[];
  liveBatches: string[]; amountPaise: number; currency: string;
  state: 'prepared' | 'creating' | 'ready' | 'fulfilled' | 'review'; holdUntil: string;
  createdAt: string; confirmedAt: string | null; expiresAt: string | null; upgrade: boolean;
};
export type PurchasePackage = { id: string; products: V2ProductCode[]; expiresAt: string };
export function checkoutPreviewEnabled(env: Record<string, string | undefined>): boolean {
  if (env.VERCEL_ENV === 'production' || env.V2_CHECKOUT_TEST_ENABLED !== 'true') return false;
  if (env.VERCEL_ENV !== 'preview' && !(env.NODE_ENV === 'development' && !env.VERCEL_ENV)) return false;
  return env.NEXT_PUBLIC_SUPABASE_URL === 'https://eyphkkginlgoaxflauog.supabase.co';
}
export const checkoutUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
