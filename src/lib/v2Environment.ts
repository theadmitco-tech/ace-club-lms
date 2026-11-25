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
