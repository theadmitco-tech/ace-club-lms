import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercises the shared V2 environment policy with synthetic environments only.
function load(path) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, URL }, { filename: path });
  return exports;
}
const policy = load('src/lib/v2Environment.ts');

const staging = 'https://eyphkkginlgoaxflauog.supabase.co';
const production = 'https://owmlxsnzogfapotmjrqk.supabase.co';
const site = 'https://aceclub.theadmitco.com';
const preview = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: staging, NEXT_PUBLIC_SITE_URL: 'https://ace-club-fixture.vercel.app' };
const local = { NODE_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: staging, NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' };
const released = { VERCEL_ENV: 'production', NODE_ENV: 'production', V2_PRODUCTION_RELEASE_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: production, NEXT_PUBLIC_SITE_URL: site };

test('Production is off by default and on only with the master flag and approved origins', () => {
  const { V2_PRODUCTION_RELEASE_ENABLED, ...unreleased } = released; void V2_PRODUCTION_RELEASE_ENABLED;
  assert.equal(policy.isV2ProductionReleaseApproved(unreleased), false);
  assert.equal(policy.isV2ProductionBlocked(unreleased), true);
  assert.equal(policy.v2Project(unreleased), null);
  assert.equal(policy.v2Phase1SurfacesAllowed(unreleased), false);

  assert.equal(policy.isV2ProductionReleaseApproved(released), true);
  assert.equal(policy.isV2ProductionBlocked(released), false);
  assert.deepEqual({ ...policy.v2Project(released) }, { kind: 'production', ref: 'owmlxsnzogfapotmjrqk', supabaseOrigin: production });
  assert.equal(policy.v2Phase1SurfacesAllowed(released), true);
});

test('Production refuses wrong flags, wrong project, wrong site and malformed origins', () => {
  for (const change of [
    { V2_PRODUCTION_RELEASE_ENABLED: 'yes' }, { V2_PRODUCTION_RELEASE_ENABLED: 'TRUE' }, { V2_PRODUCTION_RELEASE_ENABLED: '' },
    { NEXT_PUBLIC_SUPABASE_URL: staging }, { NEXT_PUBLIC_SUPABASE_URL: undefined }, { NEXT_PUBLIC_SUPABASE_URL: 'not a url' },
    { NEXT_PUBLIC_SUPABASE_URL: production + '/rest/v1' }, { NEXT_PUBLIC_SUPABASE_URL: 'http://owmlxsnzogfapotmjrqk.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://user:secret@owmlxsnzogfapotmjrqk.supabase.co' }, { NEXT_PUBLIC_SUPABASE_URL: production + ':444' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://owmlxsnzogfapotmjrqk.supabase.co.evil.invalid' },
    { NEXT_PUBLIC_SITE_URL: 'https://ace-club-fixture.vercel.app' }, { NEXT_PUBLIC_SITE_URL: undefined }, { NEXT_PUBLIC_SITE_URL: site + '/?next=x' },
  ]) {
    const env = { ...released, ...change };
    assert.equal(policy.isV2ProductionReleaseApproved(env), false, JSON.stringify(change));
    assert.equal(policy.v2Project(env), null, JSON.stringify(change));
    assert.equal(policy.v2Phase1SurfacesAllowed(env), false, JSON.stringify(change));
  }
});

test('Preview and local development use staging only; the master flag cannot move them to Production', () => {
  for (const env of [preview, local]) {
    assert.equal(policy.v2Project(env).kind, 'staging');
    assert.equal(policy.v2Phase1SurfacesAllowed(env), true);
    assert.equal(policy.isV2ProductionBlocked(env), false);
    assert.equal(policy.v2Project({ ...env, NEXT_PUBLIC_SUPABASE_URL: production }), null);
    assert.equal(policy.v2Project({ ...env, NEXT_PUBLIC_SUPABASE_URL: production, V2_PRODUCTION_RELEASE_ENABLED: 'true', NEXT_PUBLIC_SITE_URL: site }), null);
    assert.equal(policy.isV2ProductionReleaseApproved({ ...env, V2_PRODUCTION_RELEASE_ENABLED: 'true' }), false);
  }
});

test('Unknown contexts fail closed', () => {
  for (const env of [
    { ...preview, VERCEL_ENV: 'development' }, { ...preview, VERCEL_ENV: 'staging' }, { NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: staging }, {},
  ]) {
    assert.equal(policy.v2DeploymentContext(env), 'unknown');
    assert.equal(policy.v2Project(env), null);
    assert.equal(policy.v2Phase1SurfacesAllowed(env), false);
  }
});
