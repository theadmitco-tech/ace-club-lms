import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const sql = readFileSync(new URL('./v2-schema-preflight.sql', import.meta.url), 'utf8');
const migrations = [
  '20261018090000_add_v2_product_entitlements.sql',
  '20261019090000_add_v2_template_drafts.sql',
  '20261019100000_add_v2_batch_drafts.sql',
  '20261019110000_add_v2_private_meeting_drafts.sql',
  '20261020090000_add_v2_outline_schedules.sql',
  '20261020100000_add_v2_batch_publication.sql',
  '20261025100000_add_v2_enrolled_schedules.sql',
];

test('staging metadata inspection runs only against a disposable local database', { timeout: 120000 }, async (t) =>
  withDisposablePostgres(async ({ query, apply, rejects }) => {
    query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
    for (const name of ['20260731051000_production_baseline.sql', '20260731062700_enforce_material_release.sql',
      '20260731110000_require_provisioned_portal_access.sql']) apply(name);

    const inspect = () => JSON.parse(query(sql));
    const snapshot = () => query(`select jsonb_agg(jsonb_build_object('name',relname,'acl',relacl,'rls',relrowsecurity) order by relname)
      from pg_class where relnamespace='public'::regnamespace`);

    await t.test('missing migrations produce a useful report without errors or mutations', () => {
      const before = snapshot();
      const report = inspect();
      assert.equal(report.transaction_read_only, 'on');
      assert.equal(report.migration_ledger_present, false);
      assert.equal(report.tables.length, 12);
      assert.equal(report.routines.length, 17);
      assert(report.tables.every((table) => !table.present && table.direct_write_roles.length === 0));
      assert(report.routines.every((routine) => !routine.present && routine.execute_roles.length === 0));
      assert.equal(snapshot(), before);
    });

    await t.test('a partially applied chain distinguishes Phase 1 from absent Phase 2 objects', () => {
      apply(migrations[0]);
      const report = inspect();
      assert.equal(report.tables.filter((table) => table.present).length, 4);
      assert.equal(report.routines.filter((routine) => routine.present).length, 4);
      assert.deepEqual(report.tables.find((table) => table.name === 'v2_products').read_roles, ['anon', 'authenticated', 'service_role']);
      assert.deepEqual(report.routines.find((routine) => routine.signature.startsWith('public.grant_v2_purchase')).execute_roles, ['service_role']);
    });

    await t.test('the combined chain preserves purchases and legacy rows; draft states cannot be published directly', () => {
      query(`insert into auth.users(id,email) values ('d1000000-0000-4000-8000-000000000001','synthetic@example.test');
        update public.profiles set role='student',is_active=true where id='d1000000-0000-4000-8000-000000000001';
        select public.grant_v2_purchase('d1000000-0000-4000-8000-000000000001',array['quant_crash'],'synthetic-preflight',
          now()-interval '1 day','a1000000-0000-4000-8000-000000000002',1000000,'INR');`);
      const purchase = query('select jsonb_agg(to_jsonb(p)) from public.v2_purchases p');
      const profiles = query('select jsonb_agg(to_jsonb(p) order by id) from public.profiles p');
      for (const name of migrations.slice(1)) apply(name);
      assert.equal(query('select jsonb_agg(to_jsonb(p)) from public.v2_purchases p'), purchase);
      assert.equal(query('select jsonb_agg(to_jsonb(p) order by id) from public.profiles p'), profiles);
      const report = inspect();
      assert(report.tables.every((table) => table.present && table.ordinary_table && table.rls_enabled && table.direct_write_roles.length === 0));
      for (const table of report.tables.filter((table) => !['v2_products','v2_price_versions','v2_purchases','v2_product_grants'].includes(table.name))) {
        assert.deepEqual(table.read_roles, ['authenticated']);
      }
      for (const routine of report.routines.filter((routine) => !['public.quote_v2_products(text[])'].includes(routine.signature)
        && !routine.signature.startsWith('public.grant_v2_purchase'))) {
        assert.equal(routine.present, true);
        assert(routine.execute_roles.includes('authenticated'));
        assert(!routine.execute_roles.includes('anon'));
      }
      const draftConstraint = query(`select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.v2_course_batches'::regclass
        and conname='v2_course_batches_state_check'`);
      assert.match(draftConstraint, /state = 'draft'/);
      for (const role of ['anon','authenticated','service_role']) {
        rejects(`begin; set local role ${role}; update public.v2_course_batches set state='published'; rollback;`, /permission denied/);
      }
      const before = snapshot();
      inspect();
      assert.equal(snapshot(), before);
      assert.equal(query('select jsonb_agg(to_jsonb(p)) from public.v2_purchases p'), purchase);
    });

    await t.test('schema drift is visible without attempting automatic repairs', () => {
      query('alter table public.v2_batch_meeting_revisions disable row level security; grant update on public.v2_course_batches to authenticated;');
      const report = inspect();
      assert.equal(report.tables.find((table) => table.name === 'v2_batch_meeting_revisions').rls_enabled, false);
      assert.deepEqual(report.tables.find((table) => table.name === 'v2_course_batches').direct_write_roles, ['authenticated']);
      query('revoke update on public.v2_course_batches from authenticated; alter table public.v2_batch_meeting_revisions enable row level security;');
    });

    await t.test('inspection never reads purchase, identity, draft or migration statement contents', () => {
      query(`create schema supabase_migrations;
        create table supabase_migrations.schema_migrations(version text,statements text[]);
        insert into supabase_migrations.schema_migrations values ('20261018090000',array['synthetic-private-migration-body']);
        create role metadata_reader nologin; grant usage on schema public,supabase_migrations to metadata_reader;`);
      const output = query(`set role metadata_reader; ${sql}`);
      assert.equal(JSON.parse(output).migration_ledger_present, true);
      assert.doesNotMatch(output, /synthetic@example|synthetic-preflight|synthetic-private-migration-body|d1000000/);
    });
  }));
