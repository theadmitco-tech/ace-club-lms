/** Legacy Phase 1 ledger contracts. Do not rename keys without a compatibility migration. */
export type V2ProductCode = 'full_batch' | 'quant_crash' | 'verbal_crash' | 'di_crash';
export type V2Section = 'quant' | 'verbal' | 'di';

export interface V2Product {
  code: V2ProductCode;
  name: string;
  product_kind: 'full_batch' | 'crash_course';
  sections: V2Section[];
}

export interface V2Quote {
  product_codes: V2ProductCode[];
  price_version_id: string;
  /** Integer minor units. Obtain from database configuration, never from the browser. */
  amount_paise: number;
  currency: 'INR';
}

export interface V2ProductAccess {
  product_code: V2ProductCode;
  sections: V2Section[];
  expires_at: string;
}

const sectionsByProduct: Record<V2ProductCode, readonly V2Section[]> = {
  full_batch: ['quant', 'verbal', 'di'],
  quant_crash: ['quant'],
  verbal_crash: ['verbal'],
  di_crash: ['di'],
};
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) =>
  Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));

export function isV2ProductCode(value: unknown): value is V2ProductCode {
  return typeof value === 'string' && Object.hasOwn(sectionsByProduct, value);
}

export function isV2ProductSection(code: V2ProductCode, value: unknown): value is V2Section {
  return isV2ProductCode(code) && sectionsByProduct[code].some((section) => section === value);
}

function matchingSections(code: V2ProductCode, value: unknown): value is V2Section[] {
  return Array.isArray(value) && value.length === sectionsByProduct[code].length
    && value.every((section, index) => section === sectionsByProduct[code][index]);
}

export function isV2ProductSelection(value: unknown): value is V2ProductCode[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 3
    && value.every(isV2ProductCode) && new Set(value).size === value.length
    && (!value.includes('full_batch') || value.length === 1);
}

export function isV2ProductList(value: unknown): value is V2Product[] {
  return Array.isArray(value) && value.length <= 4 && value.every((product) =>
    object(product) && keys(product, ['code', 'name', 'product_kind', 'sections'])
    && isV2ProductCode(product.code)
    && typeof product.name === 'string' && product.name.trim().length > 0
    && [...product.name.trim()].length <= 120
    && product.product_kind === (product.code === 'full_batch' ? 'full_batch' : 'crash_course')
    && matchingSections(product.code, product.sections))
    && new Set(value.map((product) => product.code)).size === value.length;
}

export function isV2QuoteFor(value: unknown, selection: V2ProductCode[]): value is V2Quote {
  return isV2ProductSelection(selection) && object(value)
    && keys(value, ['product_codes', 'price_version_id', 'amount_paise', 'currency'])
    && isV2ProductSelection(value.product_codes)
    && value.product_codes.length === selection.length
    && value.product_codes.every((code) => selection.includes(code))
    && typeof value.price_version_id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.price_version_id)
    && value.price_version_id.length === 36
    && typeof value.amount_paise === 'number' && Number.isSafeInteger(value.amount_paise)
    && value.amount_paise > 0 && value.amount_paise <= 2147483647 && value.currency === 'INR';
}

// Access summaries are display data. Protected reads must still call the
// database access guard at use time; a valid summary is not authorization.
export function isV2AccessList(value: unknown): value is V2ProductAccess[] {
  return Array.isArray(value) && value.length <= 4 && value.every((access) =>
    object(access) && keys(access, ['product_code', 'sections', 'expires_at'])
    && isV2ProductCode(access.product_code) && matchingSections(access.product_code, access.sections)
    && typeof access.expires_at === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(access.expires_at)
    && Number.isFinite(Date.parse(access.expires_at)))
    && new Set(value.map((access) => access.product_code)).size === value.length;
}

/** Approved names for display; payment/grant identifiers remain unchanged. */
export function v2ProductDisplayName(code: V2ProductCode): string {
  const names: Record<V2ProductCode, string> = {
    full_batch: 'Full Course', quant_crash: 'Quant', verbal_crash: 'Verbal', di_crash: 'DI',
  };
  return names[code];
}
