import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { isV2AccessList } from '@/lib/v2Products';

const STAGING_PROJECT = 'eyphkkginlgoaxflauog';
const STAGING_ORIGIN = `https://${STAGING_PROJECT}.supabase.co`;

/** This diagnostic is deliberately stricter than general development visibility. */
export function isPhase1VerificationEnabled(): boolean {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.NEXT_PUBLIC_SUPABASE_URL !== STAGING_ORIGIN) return false;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,512}$/.test(key)) return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims.role === 'anon' && claims.ref === STAGING_PROJECT;
  } catch { return false; }
}

export type Phase1VerificationCheck = {
  id: string;
  status: 'pass' | 'fail' | 'inconclusive';
  observation: string;
  count?: number;
};
export type Phase1VerificationReport = {
  check: 'phase1_caller_session_verification';
  recordedAt: string;
  commit: string;
  stagingProject: string;
  role: 'signed_out' | 'student' | 'admin' | 'inactive' | 'unavailable';
  overall: 'inconclusive' | 'fail';
  checks: Phase1VerificationCheck[];
  limitations: string[];
};

// Even if execution permissions drift, the applied function immediately invokes
// v2_purchase_shape(NULL), which raises 22023 before any INSERT. Never substitute
// real IDs, products, price versions, references, amounts or confirmation times.
export const INVALID_GRANT_PROBE = Object.freeze({
  p_student_id: null,
  p_product_codes: null,
  p_payment_reference: null,
  p_confirmed_at: null,
  p_price_version_id: null,
  p_amount_paise: null,
  p_currency: null,
});

export async function verifyPhase1CallerSession(): Promise<Phase1VerificationReport> {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const report: Phase1VerificationReport = {
    check: 'phase1_caller_session_verification', recordedAt: new Date().toISOString(),
    commit: sha && /^[a-f0-9]{40}$/i.test(sha) ? sha : 'unavailable',
    stagingProject: STAGING_PROJECT, role: 'unavailable', overall: 'inconclusive', checks: [],
    limitations: [
      'Uses this browser session forwarded by the server to Supabase; no identity is supplied by the operator.',
      'Zero foreign rows is not cross-Student acceptance without independently confirmed designated fixtures.',
      'Expired, revoked, inactive and wrong-section cases require designated fixture-state evidence.',
      'No direct table-write attempt, checkout, legacy content mutation or full Phase 1 sign-off is performed.',
    ],
  };
  const add = (id: string, status: Phase1VerificationCheck['status'], observation: string, count?: number) => {
    report.checks.push({ id, status, observation, ...(count === undefined ? {} : { count }) });
    if (status === 'fail') report.overall = 'fail';
  };
  if (!isPhase1VerificationEnabled()) {
    add('environment', 'fail', 'Diagnostic is unavailable outside the verified staging Preview configuration.');
    return report;
  }
  add('environment', 'pass', 'Preview environment and staging public-client configuration match.');
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError && authError.name !== 'AuthSessionMissingError') {
      add('identity', 'inconclusive', 'The current session could not be verified. Sign in again and retry.');
      return report;
    }
    let profileActive = false;
    if (!user) {
      report.role = 'signed_out';
      add('identity', 'pass', 'No authenticated LMS session is present.');
    } else {
      const profile = await client.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
      if (profile.error || !profile.data || !['student', 'admin'].includes(profile.data.role) || typeof profile.data.is_active !== 'boolean') {
        add('identity', 'inconclusive', 'The caller profile could not be verified. No role was assumed.');
        return report;
      }
      profileActive = profile.data.is_active;
      report.role = profileActive ? profile.data.role : 'inactive';
      add('identity', 'pass', 'The current authenticated profile and active state were verified.');
    }

    const access = await client.rpc('get_my_v2_access');
    if (!user) {
      add('access_rpc', access.error?.code === '42501' ? 'pass' : 'fail',
        access.error?.code === '42501' ? 'Anonymous access RPC execution is denied.' : 'Anonymous access RPC did not return the required permission denial.');
    } else if (access.error || !isV2AccessList(access.data)) {
      add('access_rpc', 'inconclusive', 'Access RPC did not return a valid access list.');
    } else if (!profileActive || report.role === 'admin') {
      add('access_rpc', access.data.length === 0 ? 'pass' : 'fail',
        access.data.length === 0 ? 'This non-Student or inactive identity has no active Student entitlements.' : 'Unexpected active Student entitlements were returned.', access.data.length);
    } else {
      add('access_rpc', 'pass', 'The active Student access RPC returned a validated list; fixture-state correctness is separate.', access.data.length);
    }

    // HEAD/count only: never fetch purchase IDs, payment references or other rows.
    if (!user) {
      const privateRead = await client.from('v2_purchases').select('id', { count: 'exact', head: true });
      add('private_purchase_read', privateRead.error?.code === '42501' ? 'pass' : 'fail',
        privateRead.error?.code === '42501' ? 'Anonymous private purchase reads are denied.' : 'Anonymous private purchase read did not return the required permission denial.');
    } else if (report.role === 'student' || report.role === 'inactive') {
      const foreign = await client.from('v2_purchases').select('id', { count: 'exact', head: true }).neq('student_id', user.id);
      if (foreign.error || !Number.isSafeInteger(foreign.count) || (foreign.count ?? -1) < 0) {
        add('foreign_purchase_visibility', 'inconclusive', 'The foreign-row visibility query could not be verified.');
      } else if (foreign.count !== 0) {
        add('foreign_purchase_visibility', 'fail', 'Foreign purchase rows were visible to this non-Admin caller.');
      } else {
        add('foreign_purchase_visibility', 'inconclusive', 'No foreign rows were visible; another designated Student purchase fixture has not been independently confirmed.', 0);
      }
    } else {
      add('foreign_purchase_visibility', 'inconclusive', 'Admin can inspect history; repeat this check in a designated Student session.');
    }

    const deniedGrant = await client.rpc('grant_v2_purchase', INVALID_GRANT_PROBE);
    add('browser_role_grant_permission', deniedGrant.error?.code === '42501' ? 'pass' : 'fail',
      deniedGrant.error?.code === '42501'
        ? 'The caller database role cannot execute the grant RPC. The deliberately invalid payload created no purchase.'
        : deniedGrant.error?.code === '22023'
          ? 'Grant validation was reached: execution permission has drifted. The null selection is rejected before writes.'
          : 'Grant RPC permission could not be established. Stop and inspect its deployed definition and grants.');
  } catch {
    add('transport', 'inconclusive', 'A verification request failed. No provider message or private response is included.');
  }
  return report;
}
