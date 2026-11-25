// Shared V2 environment policy. Every V2 feature gate asks this module which
// deployment it is running in and which Supabase project it may use.
// Production stays off unless the release master flag is set AND both public
// origins are the approved Production ones; anything unknown fails closed.
// Only server-owned environment variables are read: never a query string,
// request header, browser storage value or client-supplied origin.

type Env = Record<string, string | undefined>;

export const V2_STAGING_PROJECT = {
  ref: 'eyphkkginlgoaxflauog',
  supabaseOrigin: 'https://eyphkkginlgoaxflauog.supabase.co',
} as const;

export const V2_PRODUCTION_PROJECT = {
  ref: 'owmlxsnzogfapotmjrqk',
  supabaseOrigin: 'https://owmlxsnzogfapotmjrqk.supabase.co',
  siteOrigin: 'https://aceclub.theadmitco.com',
} as const;

export type V2DeploymentContext = 'production' | 'preview' | 'development' | 'unknown';
export type V2Project = { kind: 'staging' | 'production'; ref: string; supabaseOrigin: string };

/** An HTTPS origin with no credentials, port, path, query or fragment; otherwise null. */
export function exactHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

/** Vercel Production, Vercel Preview, local `next dev` (no Vercel context), or anything else. */
export function v2DeploymentContext(env: Env): V2DeploymentContext {
  if (env.VERCEL_ENV === 'production') return 'production';
  if (env.VERCEL_ENV === 'preview') return 'preview';
  if (!env.VERCEL_ENV && env.NODE_ENV === 'development') return 'development';
  return 'unknown';
}

/** True only on Vercel Production with the master flag and the approved Production origins. */
export function isV2ProductionReleaseApproved(env: Env): boolean {
  return v2DeploymentContext(env) === 'production'
    && env.V2_PRODUCTION_RELEASE_ENABLED === 'true'
    && exactHttpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL) === V2_PRODUCTION_PROJECT.supabaseOrigin
    && exactHttpsOrigin(env.NEXT_PUBLIC_SITE_URL) === V2_PRODUCTION_PROJECT.siteOrigin;
}

/** Production is blocked unless approved; other contexts keep their existing per-feature rules. */
export function isV2ProductionBlocked(env: Env): boolean {
  return v2DeploymentContext(env) === 'production' && !isV2ProductionReleaseApproved(env);
}

/**
 * The Supabase project V2 server code may use here, or null when V2 must stay off.
 * Preview and local development may only use staging; Production only the approved Production project.
 */
export function v2Project(env: Env): V2Project | null {
  const context = v2DeploymentContext(env);
  if (context === 'production') {
    return isV2ProductionReleaseApproved(env) ? { kind: 'production', ref: V2_PRODUCTION_PROJECT.ref, supabaseOrigin: V2_PRODUCTION_PROJECT.supabaseOrigin } : null;
  }
  if ((context === 'preview' || context === 'development') && exactHttpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL) === V2_STAGING_PROJECT.supabaseOrigin) {
    return { kind: 'staging', ref: V2_STAGING_PROJECT.ref, supabaseOrigin: V2_STAGING_PROJECT.supabaseOrigin };
  }
  return null;
}

/** Catalogue, My access and other Phase 1 surfaces: Preview, local development or approved Production. */
export function v2Phase1SurfacesAllowed(env: Env): boolean {
  const context = v2DeploymentContext(env);
  return context === 'preview' || context === 'development' || isV2ProductionReleaseApproved(env);
}

// ── Supabase key consistency ───────────────────────────────────────────────
// A local consistency check, not provider authentication: Supabase itself
// still rejects a key used against another project. It catches keys pasted
// into the wrong slot or from the wrong project before any request is made.

export type SupabaseKeyRole = 'anon' | 'service_role';

/** Project ref of a `https://<ref>.supabase.co` origin, or null. */
export function supabaseProjectRef(origin: string | null): string | null {
  const match = origin?.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co$/);
  return match ? match[1] : null;
}

function jwtClaims(key: string): { ref?: unknown; role?: unknown } | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)));
  } catch { return null; }
}

/**
 * 'mismatch' when the key is provably for another project or the wrong role
 * (including a secret key in the public slot); 'match' when it names this
 * project and role; 'unverifiable' for formats that carry no project.
 */
export function checkSupabaseKey(key: string | undefined, projectRef: string, role: SupabaseKeyRole): 'match' | 'mismatch' | 'unverifiable' {
  const value = key?.trim();
  if (!value) return 'mismatch';
  if (value.startsWith('sb_secret_')) return role === 'service_role' ? 'unverifiable' : 'mismatch';
  if (value.startsWith('sb_publishable_')) return role === 'anon' ? 'unverifiable' : 'mismatch';
  const claims = jwtClaims(value);
  if (!claims) return 'unverifiable';
  return claims.ref === projectRef && claims.role === role ? 'match' : 'mismatch';
}

/**
 * Configuration for a privileged V2 server client, or null when it must not be created.
 * Approved Production uses only the Production project. Other contexts use the configured
 * project but never the Production one. Both keys must not provably mismatch that project.
 */
export function v2ServiceConfig(env: Env): { supabaseOrigin: string; serviceKey: string } | null {
  const context = v2DeploymentContext(env);
  const origin = context === 'production'
    ? (isV2ProductionReleaseApproved(env) ? V2_PRODUCTION_PROJECT.supabaseOrigin : null)
    : exactHttpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!origin || (context !== 'production' && origin === V2_PRODUCTION_PROJECT.supabaseOrigin)) return null;
  const ref = supabaseProjectRef(origin);
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!ref || !serviceKey) return null;
  if (checkSupabaseKey(serviceKey, ref, 'service_role') === 'mismatch') return null;
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && checkSupabaseKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ref, 'anon') === 'mismatch') return null;
  return { supabaseOrigin: origin, serviceKey };
}
