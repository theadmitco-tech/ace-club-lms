import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
function load(file, deps, env = {}) {
  const exports = {};
  const code = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { exports, process: { env }, Buffer, Date, URL, Response, require(name) {
    assert.ok(Object.hasOwn(deps, name), `Unexpected dependency ${name}`); return deps[name];
  } });
  return exports;
}
const domain = load('src/lib/v2Products.ts', {});
const publicKey = 'header.' + Buffer.from(JSON.stringify({ role: 'anon', ref: 'eyphkkginlgoaxflauog' })).toString('base64url') + '.signature';
const env = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey, VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) };
function harness(overrides = {}, purchaseClient = null) {
  const state = {
    user: { id: '10000000-0000-4000-8000-000000000001' }, authError: null,
    profile: { role: 'student', is_active: true }, profileError: null,
    access: { data: [], error: null }, grant: { data: null, error: { code: '42501' } },
    foreign: { count: 0, error: null }, privateRead: { count: null, error: { code: '42501' } }, calls: [], clients: 0,
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: state.authError }) },
    from(table) {
      assert.ok(['profiles', 'v2_purchases'].includes(table));
      if (table === 'v2_purchases' && purchaseClient) return purchaseClient.from(table);
      return { select(columns, options) {
        state.calls.push({ table, columns, options });
        if (table === 'profiles') return { eq(column, id) {
          assert.equal(column, 'id'); assert.equal(id, state.user.id);
          return { maybeSingle: async () => ({ data: state.profile, error: state.profileError }) };
        } };
        assert.equal(columns, 'id');
        if (!options) return { limit: async count => { assert.equal(count, 0); return state.privateRead; } };
        assert.equal(options.head, true); assert.equal(options.count, 'exact');
        return { then(resolve) { return Promise.resolve(state.privateRead).then(resolve); },
          neq: async (column, id) => { assert.equal(column, 'student_id'); assert.equal(id, state.user.id); return state.foreign; } };
      } };
    },
    rpc: async (name, args) => {
      state.calls.push({ rpc: name, args });
      if (name === 'get_my_v2_access') return state.access;
      assert.equal(name, 'grant_v2_purchase'); return state.grant;
    },
  };
  const app = load('src/lib/server/v2Phase1Verification.ts', {
    'server-only': {}, '@/utils/supabase/server': { createClient: async () => { state.clients++; return client; } }, '@/lib/v2Products': domain,
  }, { ...env, ...overrides });
  return { state, ...app };
}

test('verification refuses Production, other projects, unknown environment and service-role keys before client creation', async () => {
  const privileged = 'header.' + Buffer.from(JSON.stringify({ role: 'service_role', ref: 'eyphkkginlgoaxflauog' })).toString('base64url') + '.signature';
  for (const patch of [{ VERCEL_ENV: 'production' }, { VERCEL_ENV: undefined }, { VERCEL_ENV: 'development' }, { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: privileged }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'invalid' }]) {
    const h = harness(patch); assert.equal(h.isPhase1VerificationEnabled(), false);
    assert.equal((await h.verifyPhase1CallerSession()).overall, 'fail'); assert.equal(h.state.clients, 0);
  }
  assert.equal(harness().isPhase1VerificationEnabled(), true);
});
test('Student session is derived from auth and no foreign rows is inconclusive without independent fixtures', async () => {
  const h = harness(); const result = await h.verifyPhase1CallerSession();
  assert.equal(result.role, 'student'); assert.equal(result.overall, 'inconclusive');
  assert.equal(result.checks.find(c => c.id === 'foreign_purchase_visibility').status, 'inconclusive');
  assert.equal(result.checks.find(c => c.id === 'browser_role_grant_permission').status, 'pass');
  const args = h.state.calls.find(c => c.rpc === 'grant_v2_purchase').args;
  assert.equal(Object.keys(args).length, 7); assert.ok(Object.values(args).every(v => v === null));
  assert.ok(!JSON.stringify(result).includes(h.state.user.id)); assert.ok(!JSON.stringify(result).includes(publicKey));
});
test('foreign row visibility is failure and never returns row identifiers or foreign counts', async () => {
  const h = harness(); h.state.foreign.count = 3; const result = await h.verifyPhase1CallerSession();
  const check = result.checks.find(c => c.id === 'foreign_purchase_visibility');
  assert.equal(result.overall, 'fail'); assert.equal(check.status, 'fail'); assert.equal(check.count, undefined);
});
test('grant permission drift, missing function and unexpected success never pass', async () => {
  for (const error of [{ code: '22023', message: 'private' }, { code: 'PGRST202', message: 'private' }, null]) {
    const h = harness(); h.state.grant = { data: null, error }; const result = await h.verifyPhase1CallerSession();
    assert.equal(result.overall, 'fail'); assert.equal(result.checks.find(c => c.id === 'browser_role_grant_permission').status, 'fail');
    assert.ok(!JSON.stringify(result).includes('"message":"private"'));
  }
});
test('signed-out session checks real anonymous RPC/table permissions without assuming authenticated identity', async () => {
  const h = harness(); h.state.user = null; h.state.authError = { name: 'AuthSessionMissingError' };
  h.state.access = { data: null, error: { code: '42501' } };
  const result = await h.verifyPhase1CallerSession(); assert.equal(result.role, 'signed_out');
  for (const id of ['access_rpc', 'private_purchase_read', 'browser_role_grant_permission']) assert.equal(result.checks.find(c => c.id === id).status, 'pass');
  assert.ok(!h.state.calls.some(c => c.table === 'profiles'));
});
test('anonymous table probe uses a zero-row GET so real SDK preserves permission errors; unexpected success fails', async () => {
  for (const permitted of [false, true]) {
    const requests = [];
    const client = createSupabaseClient('https://staging.example.test', 'public-test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input, init) => {
        const url = new URL(input); requests.push({ method: init.method, limit: url.searchParams.get('limit') });
        // Real HEAD responses have no error body, including on permission denial.
        return new Response(init.method === 'HEAD' ? null : permitted ? '[]' : JSON.stringify({ code: '42501', message: 'permission denied' }),
          { status: permitted ? 200 : 401, headers: { 'Content-Type': 'application/json' } });
      } },
    });
    const h = harness({}, client); h.state.user = null;
    h.state.access = { data: null, error: { code: '42501' } };
    const result = await h.verifyPhase1CallerSession();
    assert.deepEqual(requests, [{ method: 'GET', limit: '0' }]);
    assert.equal(result.checks.find(c => c.id === 'private_purchase_read').status, permitted ? 'fail' : 'pass');
  }
});
test('inactive and Admin identities cannot be interpreted as active Student access', async () => {
  for (const profile of [{ role: 'student', is_active: false }, { role: 'admin', is_active: true }]) {
    const h = harness(); h.state.profile = profile;
    h.state.access.data = [{ product_code: 'quant_crash', sections: ['quant'], expires_at: '2027-04-01T00:00:00Z' }];
    const result = await h.verifyPhase1CallerSession(); assert.equal(result.checks.find(c => c.id === 'access_rpc').status, 'fail');
  }
});
test('unverified auth/profile fails closed and returns no provider diagnostics', async () => {
  for (const mutate of [s => { s.authError = { name: 'AuthApiError', message: 'secret' }; }, s => { s.profileError = { message: 'secret' }; }]) {
    const h = harness(); mutate(h.state); const result = await h.verifyPhase1CallerSession();
    assert.equal(result.role, 'unavailable'); assert.equal(result.overall, 'inconclusive');
    assert.ok(!h.state.calls.some(c => c.rpc)); assert.ok(!JSON.stringify(result).includes('secret'));
  }
});
test('manual endpoint blocks disabled, cross-origin, non-JSON and caller-supplied targets; replies are private no-store', async () => {
  let calls = 0; let enabled = true;
  const route = load('src/app/api/v2/phase1-verification/route.ts', { '@/lib/server/v2Phase1Verification': {
    isPhase1VerificationEnabled: () => enabled, verifyPhase1CallerSession: async () => { calls++; return { check: 'sanitized' }; },
  } });
  const req = (origin = 'https://preview.example.test', body = '{}', type = 'application/json') => new Request('https://preview.example.test/api/v2/phase1-verification', { method: 'POST', headers: { host: 'preview.example.test', origin, 'content-type': type }, body });
  enabled = false; assert.equal((await route.POST(req())).status, 404); enabled = true;
  assert.equal((await route.POST(req('https://external.example.test'))).status, 403);
  assert.equal((await route.POST(req(undefined, '{}', 'text/plain'))).status, 403);
  assert.equal((await route.POST(req(undefined, '{"student_id":"injected"}'))).status, 400);
  assert.equal(calls, 0);
  const response = await route.POST(req()); assert.equal(response.status, 200); assert.equal(calls, 1);
  assert.match(response.headers.get('cache-control'), /private, no-store/); assert.equal(response.headers.get('vary'), 'Cookie');
  const internal = new Request('http://localhost:3000/api/v2/phase1-verification', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await route.POST(internal)).status, 200);
  const deployed = (host, origin, forwarded = '') => new Request('https://localhost/api/v2/phase1-verification', { method: 'POST', headers: { ...(host ? {host} : {}), origin, 'x-forwarded-host': forwarded, 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await route.POST(deployed('immutable.vercel.app', 'https://immutable.vercel.app'))).status, 200);
  assert.equal((await route.POST(deployed('review-branch.vercel.app', 'https://review-branch.vercel.app'))).status, 200);
  assert.equal((await route.POST(deployed('preview.example.test:8443', 'https://preview.example.test:8443'))).status, 200);
  for (const [host, origin] of [
    ['immutable.vercel.app', 'https://evil.example'], ['immutable.vercel.app', 'null'],
    ['immutable.vercel.app', 'not an origin'], ['immutable.vercel.app', 'https://user:pass@immutable.vercel.app'],
    ['immutable.vercel.app', 'https://immutable.vercel.app/path'], ['immutable.vercel.app', 'http://immutable.vercel.app'],
    ['preview.example.test:8443', 'https://preview.example.test'], [null, 'https://localhost'],
    ['immutable.vercel.app,evil.example', 'https://immutable.vercel.app,evil.example'],
    ['user:pass@immutable.vercel.app', 'https://user:pass@immutable.vercel.app'], ['immutable.vercel.app/path', 'https://immutable.vercel.app/path'],
  ]) assert.equal((await route.POST(deployed(host, origin, 'immutable.vercel.app'))).status, 403);
});
test('null grant diagnostic is non-mutating even with simulated execution-permission drift in a disposable database', { timeout: 60000 }, () => {
  const migration = new URL('supabase/migrations/20261018090000_add_v2_product_entitlements.sql', root);
  assert.equal(createHash('sha256').update(readFileSync(migration)).digest('hex'), 'ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7');
  const source = readFileSync(migration, 'utf8');
  const grant = source.split('create or replace function public.grant_v2_purchase(')[1].split('$$;')[0];
  assert.ok(grant.indexOf('public.v2_purchase_shape(p_product_codes)') < grant.indexOf('insert into public.v2_purchases'));
  const dir = mkdtempSync(join(tmpdir(), 'ace-phase1-closing-'));
  const dbEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG'))), PGHOST: dir, PGPORT: '55443', PGUSER: 'phase1_check', PGDATABASE: 'postgres' };
  const run = (bin, args) => spawnSync(bin, args, { env: dbEnv, encoding: 'utf8', timeout: 20000 });
  const checked = (bin, args) => { const r = run(bin, args); assert.equal(r.status, 0, r.stderr || r.error?.message); return r.stdout.trim(); };
  const query = sql => checked('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  let started = false;
  try {
    checked('initdb', ['-D', join(dir, 'data'), '-U', dbEnv.PGUSER, '-A', 'trust', '--no-locale', '--encoding=UTF8', '--no-sync']);
    checked('pg_ctl', ['-D', join(dir, 'data'), '-l', join(dir, 'postgres.log'), '-o', `-h '' -k '${dir}' -p 55443 -F -c unix_socket_permissions=0700`, '-w', 'start']); started = true;
    query("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; grant usage on schema auth,public to anon,authenticated,service_role; create table public.profiles(id uuid primary key,role text,is_active boolean); create function public.is_portal_admin() returns boolean language sql stable as $$ select false $$;");
    checked('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', fileURLToPath(migration)]);
    const counts = () => query('select (select count(*) from public.v2_purchases)||\':\'||(select count(*) from public.v2_product_grants)');
    assert.equal(counts(), '0:0');
    const call = 'select public.grant_v2_purchase(null::uuid,null::text[],null::text,null::timestamptz,null::uuid,null::integer,null::text)';
    for (const role of ['anon', 'authenticated']) {
      const result = run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-c', `set role ${role}; ${call}`]);
      assert.notEqual(result.status, 0); assert.match(result.stderr, /42501/); assert.equal(counts(), '0:0');
    }
    query('grant execute on function public.grant_v2_purchase(uuid,text[],text,timestamptz,uuid,integer,text) to authenticated');
    const drift = run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-c', `set role authenticated; ${call}`]);
    assert.notEqual(drift.status, 0); assert.match(drift.stderr, /22023/); assert.equal(counts(), '0:0');
  } finally {
    if (started) run('pg_ctl', ['-D', join(dir, 'data'), '-m', 'immediate', '-w', 'stop']);
    rmSync(dir, { recursive: true, force: true });
  }
});
