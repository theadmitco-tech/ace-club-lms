/** Product identity is independent of display names, content sections, and schedules. */
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
