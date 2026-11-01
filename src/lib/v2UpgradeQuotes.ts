import { isV2ProductSelection, isV2QuoteFor, type V2ProductCode, type V2Quote } from './v2Products';

export const INDIVIDUAL_UPGRADE_POLICY = 'current-tier-preserve-expiry-v1';
export type IndividualProduct = Exclude<V2ProductCode, 'full_batch'>;
export type UpgradeQuote = {
  currentProducts: IndividualProduct[];
  targetProducts: IndividualProduct[];
  currentPricePaise: number;
  targetPricePaise: number;
  differencePaise: number;
  currency: 'INR';
  expiresAt: string;
  currentPriceVersion: string;
  targetPriceVersion: string;
};

export function individualSelection(value: unknown): value is IndividualProduct[] {
  return isV2ProductSelection(value) && !value.includes('full_batch');
}

export function isIndividualUpgrade(current: unknown, target: unknown): boolean {
  return individualSelection(current) && individualSelection(target)
    && current.length < target.length && current.every((product) => target.includes(product));
}

/** Read-only estimate. Payment must revalidate ownership, policy and prices. */
export function buildUpgradeQuote(current: IndividualProduct[], target: IndividualProduct[],
  currentQuote: unknown, targetQuote: unknown, expiresAt: string): UpgradeQuote | null {
  if (!isIndividualUpgrade(current, target) || !isV2QuoteFor(currentQuote, current)
    || !isV2QuoteFor(targetQuote, target) || !Number.isFinite(Date.parse(expiresAt))) return null;
  const difference = targetQuote.amount_paise - currentQuote.amount_paise;
  if (!Number.isSafeInteger(difference) || difference <= 0
    || currentQuote.price_version_id === targetQuote.price_version_id) return null;
  return {
    currentProducts: [...current].sort(), targetProducts: [...target].sort(),
    currentPricePaise: currentQuote.amount_paise, targetPricePaise: targetQuote.amount_paise,
    differencePaise: difference, currency: 'INR', expiresAt,
    currentPriceVersion: currentQuote.price_version_id, targetPriceVersion: targetQuote.price_version_id,
  };
}

export function sameConfiguredQuote(a: V2Quote, b: V2Quote): boolean {
  return a.price_version_id === b.price_version_id && a.amount_paise === b.amount_paise
    && a.currency === b.currency && [...a.product_codes].sort().join(',') === [...b.product_codes].sort().join(',');
}
