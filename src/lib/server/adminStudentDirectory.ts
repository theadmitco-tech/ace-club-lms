import 'server-only';
import { createClient } from '@/utils/supabase/server';

export type DirectoryAccess = { products: string[]; status: 'active' | 'expired' | 'revoked' | 'none'; expiresAt: string | null };
export type DirectoryRow = { id: string; full_name: string | null; email: string | null; is_active: boolean; access: DirectoryAccess | null; batches: number | null };
export type DirectoryResult = { rows: DirectoryRow[]; hasNext: boolean; error: boolean };

const PAGE = 25;
const productNames: Record<string, string> = { full_batch: 'Full Course', quant_crash: 'Quant', verbal_crash: 'Verbal', di_crash: 'DI' };

/** Students with their latest course access and batch count. Access is null when purchases could not be read, never guessed. */
export async function readStudentDirectory(q: string, page: number): Promise<DirectoryResult> {
  const client = await createClient();
  let query = client.from('profiles').select('id,full_name,email,is_active').eq('role', 'student');
  // Search matches name or email; characters with filter meaning are removed rather than interpreted.
  const term = q.replace(/[,()]/g, ' ').replace(/[\\%_]/g, '\\$&').trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query.order('full_name').order('id').range((page - 1) * PAGE, page * PAGE);
  if (error || !data) return { rows: [], hasNext: false, error: true };
  const profiles = data.slice(0, PAGE);
  const ids = profiles.map(row => row.id);
  const [purchases, enrollments] = ids.length ? await Promise.all([
    client.from('v2_purchases').select('student_id,expires_at,revoked_at,confirmed_at,v2_product_grants(product_code)').in('student_id', ids).order('confirmed_at', { ascending: false }),
    client.from('v2_batch_enrollments').select('student_id,active').in('student_id', ids).eq('active', true),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const now = Date.now();
  const rows = profiles.map(profile => {
    let access: DirectoryAccess | null = null;
    if (!purchases.error) {
      const own = (purchases.data ?? []).filter(item => item.student_id === profile.id);
      const current = own.find(item => !item.revoked_at && Date.parse(item.confirmed_at) <= now && Date.parse(item.expires_at) > now);
      const latest = current ?? own[0];
      access = latest ? {
        products: (latest.v2_product_grants as { product_code: string }[]).map(grant => productNames[grant.product_code] ?? 'Course'),
        status: current ? 'active' : latest.revoked_at ? 'revoked' : 'expired', expiresAt: latest.expires_at,
      } : { products: [], status: 'none', expiresAt: null };
    }
    const batches = enrollments.error ? null : (enrollments.data ?? []).filter(item => item.student_id === profile.id).length;
    return { ...profile, access, batches };
  });
  return { rows, hasNext: data.length > PAGE, error: false };
}
