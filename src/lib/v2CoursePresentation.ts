import { isV2ProductSelection, v2ProductDisplayName, type V2ProductCode } from './v2Products';

export const COURSE_IDENTITIES = {
  full_course: 'full_batch', quant: 'quant_crash', verbal: 'verbal_crash', di: 'di_crash',
} as const satisfies Record<string, V2ProductCode>;
export type CourseIdentity = keyof typeof COURSE_IDENTITIES;
export function courseIdentity(code: V2ProductCode): CourseIdentity {
  return (Object.keys(COURSE_IDENTITIES) as CourseIdentity[]).find((key) => COURSE_IDENTITIES[key] === code)!;
}
export function parseCourseSelection(value: string | string[] | undefined): V2ProductCode[] | null {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  if (!values.every((key) => Object.hasOwn(COURSE_IDENTITIES, key))) return null;
  const codes = values.map((key) => COURSE_IDENTITIES[key as CourseIdentity]);
  return isV2ProductSelection(codes) ? codes : null;
}
export function courseMoney(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(paise / 100);
}
export function courseDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST';
}
export function courseNames(codes: V2ProductCode[]): string { return codes.map(v2ProductDisplayName).join(' + '); }
export type PurchaseState = 'Active' | 'Expired' | 'Revoked' | 'Not started' | 'Account inactive';
export function purchaseState(purchase: { confirmed_at: string; expires_at: string; revoked_at: string | null; accountActive: boolean }, now: number): PurchaseState {
  if (purchase.revoked_at !== null) return 'Revoked';
  if (!purchase.accountActive) return 'Account inactive';
  if (now < Date.parse(purchase.confirmed_at)) return 'Not started';
  if (now >= Date.parse(purchase.expires_at)) return 'Expired';
  return 'Active';
}
