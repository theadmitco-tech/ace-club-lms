import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { v2ServiceConfig } from '@/lib/v2Environment';

/** The privileged V2 server client for this deployment's approved project, or null when misconfigured. */
export function createV2ServiceClient() {
  const config = v2ServiceConfig(process.env);
  return config ? createClient(config.supabaseOrigin, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

/** The Supabase origin the V2 service client talks to, for checking signed URLs. */
export function v2ServiceOrigin(): string | null {
  return v2ServiceConfig(process.env)?.supabaseOrigin ?? null;
}
