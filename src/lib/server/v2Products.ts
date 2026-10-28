import 'server-only';

import { v2ProductDisplayName, isV2AccessList, isV2ProductCode, isV2ProductList, isV2ProductSection, isV2ProductSelection, isV2QuoteFor,
  type V2Product, type V2ProductAccess, type V2ProductCode, type V2Quote, type V2Section } from '@/lib/v2Products';
import { createClient } from '@/utils/supabase/server';

// Use the caller's session and database authorization. Never cache access across
// requests or use a service-role client to read student access.
export async function listV2Products(): Promise<V2Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('v2_products')
      .select('code, name, product_kind, sections')
      .eq('available_for_purchase', true).order('code');
    if (!error && isV2ProductList(data)) return data.map((product) => ({ ...product, name: v2ProductDisplayName(product.code) }));
  } catch {
    // Configuration and transport failures use the same controlled response.
  }
  throw new Error('Unable to load the V2 catalogue.');
}

export async function quoteV2Products(productCodes: V2ProductCode[]): Promise<V2Quote> {
  try {
    if (isV2ProductSelection(productCodes)) {
      const selection = [...productCodes];
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('quote_v2_products', { p_product_codes: selection });
      if (!error && isV2QuoteFor(data, selection)) return data;
    }
  } catch {
    // A failed quote never falls back to a browser-supplied amount.
  }
  throw new Error('Unable to quote the selected V2 products.');
}

export async function getMyV2Access(): Promise<V2ProductAccess[]> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase.rpc('get_my_v2_access');
    if (!error && isV2AccessList(data)) return data;
  } catch {
    // Private provider diagnostics are not part of the caller's error message.
  }
  throw new Error('Unable to verify V2 access.');
}

export async function canAccessV2Product(productCode: V2ProductCode, section: V2Section | null = null): Promise<boolean> {
  try {
    if (!isV2ProductCode(productCode) || (section !== null && !isV2ProductSection(productCode, section))) return false;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;
    const { data, error } = await supabase.rpc('can_access_v2_product', {
      p_product_code: productCode,
      p_section: section,
    });
    // An unavailable migration/database never grants access.
    return !error && data === true;
  } catch {
    // Missing configuration and rejected network promises must also deny access,
    // rather than throwing out of a boolean authorization guard.
    return false;
  }
}
