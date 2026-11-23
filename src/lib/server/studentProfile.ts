import 'server-only';
import { createClient } from '@/utils/supabase/server';

/** The signed-in student's display name; falls back to a neutral label rather than failing the page. */
export async function getMyDisplayName(): Promise<string> {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return 'Student';
    const { data } = await client.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const name = typeof data?.full_name === 'string' ? data.full_name.trim() : '';
    return name || 'Student';
  } catch {
    return 'Student';
  }
}

/** Request time for server-rendered student pages (each request renders afresh). */
export function requestTime(): number {
  return Date.now();
}
