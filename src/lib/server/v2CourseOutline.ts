import 'server-only';
import { createClient } from '@/utils/supabase/server';
import type { SalesBatch } from '@/lib/v2Checkout';
import type { V2ProductCode } from '@/lib/v2Products';
import { courseReadmePosition } from '@/lib/v2CourseReadmes';

export type OutlineSection = 'quant' | 'verbal' | 'di';
export type CourseOutline = Record<OutlineSection, string[]>;

/**
 * Published session titles per subject for the chosen products, from the public sales catalogue
 * (titles only; protected content stays private). Null when the catalogue can't be read.
 */
export async function loadCourseOutline(products: V2ProductCode[]): Promise<CourseOutline | null> {
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_sales_catalogue');
    if (error || !Array.isArray(data)) return null;
    const batches = data as SalesBatch[];
    const outline: CourseOutline = { quant: [], verbal: [], di: [] };
    for (const section of ['quant', 'verbal', 'di'] as const) {
      const source = batches.find(batch => products.includes(batch.entitlementProductCode) && batch.sessions.some(session => session.section === section));
      outline[section] = [...new Set((source?.sessions ?? [])
        .filter(session => session.section === section && !courseReadmePosition(session.key)).map(session => session.title))];
    }
    return outline;
  } catch { return null; }
}
