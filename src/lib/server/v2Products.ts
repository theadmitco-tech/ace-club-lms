import 'server-only';

import type { V2Product, V2ProductAccess, V2ProductCode, V2Quote, V2Section } from '@/lib/v2Products';
import { createClient } from '@/utils/supabase/server';

// Use the caller's session and database authorization. Never cache access across
// requests or use a service-role client to read student access.
export async function listV2Products(): Promise<V2Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('v2_products')
    .select('code, name, product_kind, sections')
    .eq('available_for_purchase', true).order('code');
  if (error) throw new Error('Unable to load the V2 catalogue.');
  return (data ?? []) as V2Product[];
}

export async function quoteV2Products(productCodes: V2ProductCode[]): Promise<V2Quote> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('quote_v2_products', { p_product_codes: productCodes });
  if (error || !data) throw new Error('Unable to quote the selected V2 products.');
  return data as V2Quote;
}

export async function getMyV2Access(): Promise<V2ProductAccess[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];
  const { data, error } = await supabase.rpc('get_my_v2_access');
  if (error) throw new Error('Unable to verify V2 access.');
  return (data ?? []) as V2ProductAccess[];
}

export async function canAccessV2Product(productCode: V2ProductCode, section: V2Section | null = null): Promise<boolean> {
  try {
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
