import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// This suite always creates its own cluster. It cannot target an existing DB.
const migration = fileURLToPath(new URL('../supabase/migrations/20261018090000_add_v2_product_entitlements.sql', import.meta.url));
const preflight = readFileSync(new URL('./v2-phase-1-schema-preflight.sql', import.meta.url), 'utf8');
const alice = 'b1000000-0000-4000-8000-000000000001';
const bob = 'b1000000-0000-4000-8000-000000000002';
const inactive = 'b1000000-0000-4000-8000-000000000003';
const admin = 'b1000000-0000-4000-8000-000000000004';
const prices = [1, 2, 3, 4].map((id) => `a1000000-0000-4000-8000-00000000000${id}`);
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const codes = (values) => `array[${values.map(literal).join(',')}]::text[]`;

test('V2 product catalogue and entitlement database boundaries', { timeout: 120000 }, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ace-v2-products-'));
  const dataDir = join(directory, 'data');
  const logFile = join(directory, 'postgres.log');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
  Object.assign(env, { PGHOST: directory, PGPORT: '55439', PGUSER: 'ace_v2_test', PGDATABASE: 'postgres' });
  let started = false;
  const run = (command, args) => spawnSync(command, args, { env, encoding: 'utf8', timeout: 30000 });
  const checked = (command, args) => {
    const result = run(command, args);
    assert.equal(result.status, 0, result.error?.message ?? result.stderr ?? `${command} failed`);
    return result.stdout.trim();
  };
  const query = (sql) => checked('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  const applyMigration = (name) => checked('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f',
    fileURLToPath(new URL(`../supabase/migrations/${name}`, import.meta.url))]);
  const sendQuery = (sql) => new Promise((resolve, reject) => {
    const child = spawn('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env, timeout: 30000 });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr)));
  });
  const rejects = (sql, pattern) => {
    const result = run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
    assert.notEqual(result.status, 0, 'SQL unexpectedly succeeded');
    assert.match(result.stderr, pattern);
  };
  const session = (role, user, sql) => `begin; set local role ${role}; set local request.jwt.claim.sub = ${literal(user ?? '')}; ${sql}; rollback;`;
  const checkAccess = (user, product, section = null) => query(session('authenticated', user,
    `select public.can_access_v2_product(${literal(product)}, ${section === null ? 'null' : literal(section)})`));
  const grantSql = ({ user = alice, products = ['quant_crash'], reference, confirmed, price = prices[1], amount = 1000000, currency = 'INR' }) =>
    `select public.grant_v2_purchase(${literal(user)}, ${codes(products)}, ${literal(reference)}, ${literal(confirmed)}::timestamptz, ${literal(price)}, ${amount}, ${literal(currency)})`;

  try {
    checked('initdb', ['-D', dataDir, '-U', env.PGUSER, '-A', 'trust', '--no-locale', '--encoding=UTF8', '--no-sync']);
    checked('pg_ctl', ['-D', dataDir, '-l', logFile, '-o', `-h '' -k '${directory}' -p 55439 -F -c unix_socket_permissions=0700`, '-w', 'start']);
    started = true;
    query(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      -- Exercise explicit revocation even when the platform defaults are broad.
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    `);
    // Apply committed legacy schema and its access hardening, never a remote DB.
    // This is deliberately not a claim to reproduce the deployed migration ledger.
    applyMigration('20260731051000_production_baseline.sql');
    applyMigration('20260731062700_enforce_material_release.sql');
    applyMigration('20260731110000_require_provisioned_portal_access.sql');
    query(`
      insert into auth.users (id, email) values
        ('${alice}', 'alice@example.test'), ('${bob}', 'bob@example.test'),
        ('${inactive}', 'inactive@example.test'), ('${admin}', 'admin@example.test');
      update public.profiles set is_active=true where id in ('${alice}', '${bob}', '${admin}');
      update public.profiles set role='admin' where id='${admin}';
      insert into public.courses(id,name,is_active) values ('c1000000-0000-4000-8000-000000000001', 'Synthetic legacy course', false);
      insert into public.enrollments(user_id,course_id) values ('${alice}', 'c1000000-0000-4000-8000-000000000001');
      insert into public.sessions(id,course_id,title,session_number,session_date,is_published)
        values ('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Synthetic lesson',1,now(),true);
      insert into public.materials(session_id,type,title,available_from) values
        ('d1000000-0000-4000-8000-000000000001','pre_read','Released fixture',now()-interval '1 day'),
        ('d1000000-0000-4000-8000-000000000001','pre_read','Unreleased fixture',now()+interval '1 day');
    `);
    const legacyFunctionIds = query("select string_agg(oid::text, ',') from pg_proc where pronamespace='public'::regnamespace");
    const legacyTables = query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
    const snapshot = (sql) => query(`select coalesce(jsonb_agg(to_jsonb(s) order by to_jsonb(s)::text), '[]') from (${sql}) s`);
    const legacyState = () => ({
      functions: snapshot(`select oid, pg_get_functiondef(oid), proacl from pg_proc where oid in (${legacyFunctionIds})`),
      columns: snapshot("select * from information_schema.columns where table_schema='public' and table_name not like 'v2_%'"),
      policies: snapshot("select * from pg_policies where schemaname='public' and tablename not like 'v2_%'"),
      constraints: snapshot("select conrelid, conname, pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text not like 'v2_%'"),
      indexes: snapshot("select * from pg_indexes where schemaname='public' and tablename not like 'v2_%'"),
      tables: snapshot("select oid,relname,relrowsecurity,relforcerowsecurity,relacl from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname not like 'v2_%'"),
      triggers: snapshot("select t.oid,pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and c.relname not like 'v2_%' and not t.tgisinternal"),
      rows: Object.fromEntries(legacyTables.map((table) => [table, snapshot(`select * from public."${table}"`)])),
    });
    const beforeMigration = legacyState();
    await t.test('Phase 1 inspection reports missing objects in a read-only transaction', () => {
      const report = JSON.parse(query(preflight));
      assert.equal(report.check, 'v2_phase1_schema_metadata_only');
      assert.equal(report.transaction_read_only, 'on');
      assert.equal(report.tables.length, 4);
      assert.equal(report.routines.length, 4);
      assert(report.tables.every((entry) => !entry.present));
      assert(report.routines.every((entry) => !entry.present));
      assert.deepEqual(legacyState(), beforeMigration);
    });
    await t.test('a migration failure rolls back earlier DDL and leaves legacy state intact', () => {
      query('create view public.v2_product_grants as select 1 as unexpected_column');
      const result = run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', migration]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /v2_product_grants/);
      assert.equal(query("select to_regclass('public.v2_products') is null and to_regclass('public.v2_purchases') is null"), 't');
      query('drop view public.v2_product_grants');
      assert.deepEqual(legacyState(), beforeMigration);
    });
    checked('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', migration]);
    await t.test('applying the migration preserves the complete baseline schema and synthetic rows', () => {
      assert.equal(legacyTables.length, 19);
      assert.deepEqual(legacyState(), beforeMigration);
      assert.equal(query(session('authenticated', alice, 'select count(*) from public.materials')), '1');
      assert.equal(query(session('authenticated', bob, 'select count(*) from public.materials')), '0');
    });
    await t.test('Phase 1 inspection identifies access privileges and drift without reading private rows', () => {
      query('create role phase1_metadata_reader nologin; grant usage on schema public to phase1_metadata_reader;');
      const inspect = () => JSON.parse(query(`set role phase1_metadata_reader; ${preflight}`));
      const report = inspect();
      assert(report.tables.every((entry) => entry.present && entry.ordinary_table && entry.rls_enabled));
      assert(report.tables.every((entry) => entry.direct_write_roles.length === 0));
      assert(report.routines.every((entry) => entry.present));
      assert.deepEqual(report.routines.find((entry) => entry.signature.startsWith('public.grant_v2_purchase')).execute_roles, ['service_role']);
      assert.doesNotMatch(JSON.stringify(report), /alice@|bob@|b1000000|Released fixture/);
      try {
        query('alter table public.v2_product_grants disable row level security; grant update on public.v2_purchases to authenticated;');
        const drift = inspect();
        assert.equal(drift.tables.find((entry) => entry.name === 'v2_product_grants').rls_enabled, false);
        assert.deepEqual(drift.tables.find((entry) => entry.name === 'v2_purchases').direct_write_roles, ['authenticated']);
      } finally {
        query('revoke update on public.v2_purchases from authenticated; alter table public.v2_product_grants enable row level security;');
      }
      assert.deepEqual(legacyState(), beforeMigration);
    });
    const confirmed = query("select (statement_timestamp() - interval '1 day')::text");

    await t.test('four products have exact section scopes and no inferred schedule', () => {
      const products = JSON.parse(query('select jsonb_object_agg(code, sections) from public.v2_products'));
      assert.deepEqual(products, { full_batch: ['quant', 'verbal', 'di'], quant_crash: ['quant'], verbal_crash: ['verbal'], di_crash: ['di'] });
      rejects("update public.v2_products set sections = array['quant'] where code = 'full_batch'", /v2_product_scope/);
      rejects("update public.v2_products set sections = array['quant','verbal'] where code = 'quant_crash'", /v2_product_scope/);
    });

    await t.test('configured prices cover all eight valid selections', () => {
      const combinations = [
        [['full_batch'], 2500000], [['quant_crash'], 1000000], [['verbal_crash'], 1000000], [['di_crash'], 1000000],
        [['quant_crash', 'verbal_crash'], 1800000], [['quant_crash', 'di_crash'], 1800000],
        [['verbal_crash', 'di_crash'], 1800000], [['quant_crash', 'verbal_crash', 'di_crash'], 2500000],
      ];
      for (const [selection, amount] of combinations) {
        const quote = JSON.parse(query(session('anon', null, `select public.quote_v2_products(${codes(selection)})`)));
        assert.equal(quote.amount_paise, amount);
        assert.equal(quote.currency, 'INR');
        assert.deepEqual(quote.product_codes, [...selection].sort());
      }
      for (const selection of [[], ['unknown'], ['quant_crash', 'quant_crash'], ['full_batch', 'di_crash']]) {
        rejects(session('anon', null, `select public.quote_v2_products(${codes(selection)})`), /Select one|Unknown|separately/);
      }
      rejects('select public.quote_v2_products(null)', /Select one/);
      rejects("select public.quote_v2_products(array['quant_crash',null])", /Unknown/);
      rejects("select public.quote_v2_products(array[['quant_crash']])", /Select one/);
    });

    await t.test('anonymous and student callers cannot manufacture or edit grants', () => {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        for (const table of ['v2_products', 'v2_price_versions', 'v2_purchases', 'v2_product_grants']) {
          for (const operation of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
            assert.equal(query(`select has_table_privilege('${role}', 'public.${table}', '${operation}')`), 'f', `${role} ${operation} ${table}`);
          }
        }
      }
      for (const [role, user] of [['anon', null], ['authenticated', alice]]) {
        rejects(session(role, user, grantSql({ reference: 'not-authorized', confirmed })), /permission denied/);
        rejects(session(role, user, "insert into public.v2_product_grants values (gen_random_uuid(), 'full_batch')"), /permission denied/);
        rejects(session(role, user, 'delete from public.v2_purchases'), /permission denied/);
        rejects(session(role, user, "update public.v2_products set sections = array['quant','verbal','di']"), /permission denied/);
        rejects(session(role, user, "select * from public.v2_purchase_shape(array['full_batch'])"), /permission denied/);
      }
      rejects(session('anon', null, 'select * from public.v2_purchases'), /permission denied/);
      rejects(session('service_role', null, 'delete from public.v2_purchases'), /permission denied/);
      rejects(session('service_role', null, "insert into public.v2_product_grants values (gen_random_uuid(), 'full_batch')"), /permission denied/);
      rejects(session('service_role', null, 'truncate public.v2_price_versions cascade'), /permission denied/);
    });

    await t.test('service grant authorizes only the bought product and its section', () => {
      query(`set role service_role; ${grantSql({ reference: 'quant-paid', confirmed })}; reset role;`);
      assert.equal(checkAccess(alice, 'quant_crash', 'quant'), 't');
      assert.equal(checkAccess(alice, 'quant_crash', 'verbal'), 'f');
      assert.equal(checkAccess(alice, 'di_crash'), 'f');
      assert.equal(checkAccess(alice, 'full_batch'), 'f');
      assert.equal(checkAccess(bob, 'quant_crash'), 'f');
      assert.equal(checkAccess(null, 'quant_crash'), 'f');
      assert.equal(checkAccess(admin, 'quant_crash'), 'f');
      assert.equal(query(session('authenticated', alice, 'select count(*) from public.v2_purchases')), '1');
      assert.equal(query(session('authenticated', bob, 'select count(*) from public.v2_purchases')), '0');
      assert.equal(query(session('authenticated', bob, 'select count(*) from public.v2_product_grants')), '0');
      assert.equal(query(session('authenticated', admin, 'select count(*) from public.v2_purchases')), '1');
      const access = JSON.parse(query(session('authenticated', alice, 'select public.get_my_v2_access()')));
      assert.equal(access.length, 1);
      assert.deepEqual(Object.keys(access[0]).sort(), ['expires_at', 'product_code', 'sections']);
      assert.equal(access[0].product_code, 'quant_crash');
    });

    await t.test('replays are idempotent and mismatches fail without extending access', () => {
      const before = query("select row_to_json(p)::text from public.v2_purchases p where payment_reference = 'quant-paid'");
      query(grantSql({ reference: 'quant-paid', confirmed }));
      for (const overrides of [{ user: bob }, { products: ['di_crash'] }, { confirmed: '2020-01-01T00:00:00Z' }]) {
        rejects(grantSql({ reference: 'quant-paid', confirmed, ...overrides }), /different grant/);
      }
      assert.equal(query("select row_to_json(p)::text from public.v2_purchases p where payment_reference = 'quant-paid'"), before);
      assert.equal(query('select count(*) from public.v2_product_grants'), '1');
      for (const overrides of [{ amount: 1 }, { currency: 'USD' }, { price: prices[0] }]) {
        rejects(grantSql({ reference: 'bad-payment', confirmed, ...overrides }), /does not match/);
      }
      rejects(grantSql({ reference: 'future-payment', confirmed: '9999-01-01T00:00:00Z' }), /valid past/);
      rejects(grantSql({ reference: 'infinite-payment', confirmed: '-infinity' }), /valid past/);
      rejects(grantSql({ reference: ' admin-payment', confirmed }), /canonical/);
      rejects(grantSql({ user: admin, reference: 'admin-payment', confirmed }), /Student profile/);
      assert.equal(query('select count(*) from public.v2_purchases'), '1');
    });

    await t.test('all three Crash Courses remain distinct from Full Batch; a later Full purchase works', () => {
      const purchase = { user: bob, products: ['quant_crash', 'verbal_crash', 'di_crash'], reference: 'three-crashes', confirmed, price: prices[3], amount: 2500000 };
      query(grantSql(purchase));
      query(grantSql({ ...purchase, products: [...purchase.products].reverse() }));
      for (const product of purchase.products) assert.equal(checkAccess(bob, product), 't');
      assert.equal(checkAccess(bob, 'full_batch'), 'f');
      assert.equal(query("select count(*) from public.v2_product_grants g join public.v2_purchases p on p.id=g.purchase_id where p.payment_reference='three-crashes'"), '3');
      query(grantSql({ user: bob, products: ['full_batch'], reference: 'full-paid', confirmed, price: prices[0], amount: 2500000 }));
      for (const section of ['quant', 'verbal', 'di']) assert.equal(checkAccess(bob, 'full_batch', section), 't');
      assert.equal(checkAccess(bob, 'full_batch', 'unknown'), 'f');
    });

    await t.test('expiry uses UTC calendar months, leap years, and original confirmation precision', () => {
      const cases = [
        ['2023-08-31T10:20:30.123456Z', '2024-02-29T10:20:30.123456Z'],
        ['2024-08-31T10:20:30.123456Z', '2025-02-28T10:20:30.123456Z'],
        ['2024-08-31T23:30:00-04:00', '2025-03-01T03:30:00Z'],
      ];
      for (const [start, end] of cases) {
        query(`set time zone 'Asia/Kolkata'; ${grantSql({ user: inactive, reference: `expiry-${start}`, confirmed: start })}`);
        assert.equal(query(`select expires_at = ${literal(end)}::timestamptz from public.v2_purchases where payment_reference=${literal(`expiry-${start}`)}`), 't');
      }
      assert.equal(checkAccess(inactive, 'quant_crash'), 'f');
      query(`update public.profiles set is_active=true where id='${inactive}'`);
      assert.equal(checkAccess(inactive, 'quant_crash'), 'f', 'Expired access must stay denied after reactivation');
      assert.equal(query(session('authenticated', inactive, 'select public.get_my_v2_access()')), '[]');
      query(`update public.profiles set is_active=false where id='${inactive}'`);
    });

    await t.test('the shared access window includes start, excludes expiry, and denies invalid values', () => {
      const start = '2024-08-31T10:20:30.123456Z';
      const end = '2025-02-28T10:20:30.123456Z';
      for (const [at, expected] of [
        ['2024-08-31T10:20:30.123455Z', 'f'], [start, 't'],
        ['2025-02-28T10:20:30.123455Z', 't'], [end, 'f'],
        ['2025-02-28T10:20:30.123457Z', 'f'],
      ]) {
        assert.equal(query(`select public.v2_access_window_contains('${start}', '${end}', null, '${at}')`), expected);
      }
      assert.equal(query(`select public.v2_access_window_contains('${start}', '${end}', '${start}', '${start}')`), 'f');
      assert.equal(query(`select public.v2_access_window_contains(null, '${end}', null, '${start}')`), 'f');
      assert.equal(query(`select public.v2_access_window_contains('${start}', 'infinity', null, '${start}')`), 'f');
      // Verify the public authorization path uses the inclusive database clock too.
      query(`do $$ declare at timestamptz := statement_timestamp(); purchase_id uuid; begin
        purchase_id := public.grant_v2_purchase('${alice}', array['di_crash'], 'start-now', at, '${prices[1]}', 1000000, 'INR');
        perform set_config('request.jwt.claim.sub', '${alice}', true);
        if not public.can_access_v2_product('di_crash') then raise exception 'Start boundary was denied'; end if;
      end $$;`);
    });

    await t.test('expired purchases deny all product access without deleting history or needing a cleanup job', () => {
      const student = 'b1000000-0000-4000-8000-000000000005';
      const paidAt = query("select (statement_timestamp()-interval '7 months')::text");
      const selections = ['full_batch', 'quant_crash', 'verbal_crash', 'di_crash'];
      const grants = selections.map((product) => grantSql({
        user: student, products: [product], reference: `expired-${product}`, confirmed: paidAt,
        price: product === 'full_batch' ? prices[0] : prices[1],
        amount: product === 'full_batch' ? 2500000 : 1000000,
      })).join(';');
      // The transaction and account exist only in this disposable fixture.
      query(`begin;
        insert into auth.users(id,email) values ('${student}','expired-fixture@example.test');
        update public.profiles set is_active=true where id='${student}';
        ${grants};
        ${grants};
        set local role authenticated;
        set local request.jwt.claim.sub='${student}';
        do $$ declare product text; history jsonb; begin
          select jsonb_agg(to_jsonb(p) order by p.id) into history from public.v2_purchases p;
          if jsonb_array_length(history) <> 4 then raise exception 'Expired replay duplicated purchase history'; end if;
          foreach product in array array['full_batch','quant_crash','verbal_crash','di_crash'] loop
            if public.can_access_v2_product(product) then raise exception 'Expired product remained accessible'; end if;
          end loop;
          foreach product in array array['quant','verbal','di'] loop
            if public.can_access_v2_product('full_batch',product) then raise exception 'Expired section remained accessible'; end if;
          end loop;
          if public.get_my_v2_access() <> '[]'::jsonb then raise exception 'Expired access remained in summary'; end if;
          if (select count(*) from public.v2_product_grants) <> 4 then raise exception 'Expiry erased grant history'; end if;
          if history <> (select jsonb_agg(to_jsonb(p) order by p.id) from public.v2_purchases p) then
            raise exception 'Access checks changed payment history';
          end if;
        end $$;
        rollback;`);
      assert.equal(query(`select count(*) from public.profiles where id='${student}'`), '0');
    });

    await t.test('revocation, deactivation, and closed sales have distinct access behavior', () => {
      query("update public.v2_products set available_for_purchase=false where code='quant_crash'");
      rejects("select public.quote_v2_products(array['quant_crash'])", /unavailable/);
      assert.equal(checkAccess(alice, 'quant_crash'), 't', 'Closing sales must preserve paid access');
      query("update public.v2_products set available_for_purchase=true where code='quant_crash'");
      query(`update public.profiles set is_active=false where id='${alice}'`);
      assert.equal(checkAccess(alice, 'quant_crash'), 'f');
      assert.equal(query(session('authenticated', alice, 'select public.get_my_v2_access()')), '[]');
      assert.equal(query(session('authenticated', alice, 'select count(*) from public.v2_purchases')), '0');
      query(`update public.profiles set is_active=true where id='${alice}'`);
      query("update public.v2_purchases set revoked_at=statement_timestamp() where payment_reference='quant-paid'");
      query(grantSql({ reference: 'quant-paid', confirmed }));
      assert.equal(checkAccess(alice, 'quant_crash'), 'f', 'A replay must not restore revoked access');
    });

    await t.test('new price versions affect quotes without rewriting past prices or access', () => {
      query("insert into public.v2_price_versions(product_kind,crash_count,amount_paise,effective_from) values ('crash_course',1,1100000,statement_timestamp()-interval '1 hour'), ('crash_course',1,1200000,statement_timestamp()+interval '1 day')");
      const quote = JSON.parse(query("select public.quote_v2_products(array['di_crash'])"));
      assert.equal(quote.amount_paise, 1100000);
      assert.equal(query("select amount_paise from public.v2_purchases where payment_reference='quant-paid'"), '1000000');
      rejects(`update public.v2_price_versions set amount_paise=1 where id='${prices[1]}'`, /immutable/);
      rejects(`delete from public.v2_price_versions where id='${prices[1]}'`, /immutable/);
      assert.equal(checkAccess(bob, 'full_batch'), 't');
      assert.equal(query(session('anon', null, 'select count(*) from public.v2_price_versions where effective_from > statement_timestamp()')), '0');
      assert.equal(query(session('authenticated', admin, 'select count(*) from public.v2_price_versions where effective_from > statement_timestamp()')), '1');
    });

    await t.test('a failed bundle grant rolls back the purchase and all partial grants', () => {
      const before = query('select count(*) from public.v2_product_grants');
      query(`create function public.test_reject_second_grant() returns trigger language plpgsql as $$
        begin if new.product_code='verbal_crash' then raise exception 'Synthetic grant fault'; end if; return new; end $$;
        create trigger test_reject_second_grant before insert on public.v2_product_grants
        for each row execute function public.test_reject_second_grant();`);
      try {
        rejects(grantSql({ products: ['quant_crash','verbal_crash'], reference: 'interrupted-bundle', confirmed, price: prices[2], amount: 1800000 }), /Synthetic grant fault/);
        assert.equal(query("select count(*) from public.v2_purchases where payment_reference='interrupted-bundle'"), '0');
        assert.equal(query('select count(*) from public.v2_product_grants'), before);
      } finally {
        query('drop trigger test_reject_second_grant on public.v2_product_grants; drop function public.test_reject_second_grant()');
      }
    });

    await t.test('overlapping purchases survive one revocation and summarize only valid expiry', () => {
      const older = query("select (statement_timestamp()-interval '2 months')::text");
      const newer = query("select (statement_timestamp()-interval '1 month')::text");
      query(`begin;
        ${grantSql({ user: inactive, reference: 'overlap-older', confirmed: older })};
        ${grantSql({ user: inactive, reference: 'overlap-newer', confirmed: newer })};
        update public.profiles set is_active=true where id='${inactive}';
        set local role authenticated;
        set local request.jwt.claim.sub='${inactive}';
        do $$ begin
          if not public.can_access_v2_product('quant_crash') then raise exception 'Missing overlapping access'; end if;
          if (public.get_my_v2_access()->0->>'expires_at')::timestamptz <>
            (select expires_at from public.v2_purchases where payment_reference='overlap-newer') then
            raise exception 'Incorrect latest valid expiry'; end if;
        end $$;
        reset role;
        update public.v2_purchases set revoked_at=statement_timestamp() where payment_reference='overlap-newer';
        set local role authenticated;
        do $$ begin
          if not public.can_access_v2_product('quant_crash') then raise exception 'Other purchase was revoked'; end if;
          if (public.get_my_v2_access()->0->>'expires_at')::timestamptz <>
            (select expires_at from public.v2_purchases where payment_reference='overlap-older') then
            raise exception 'Revoked expiry remains visible'; end if;
        end $$;
        rollback;`);
    });

    await t.test('concurrent duplicate payment delivery creates one purchase and one grant', async () => {
      const sql = `set role service_role; ${grantSql({ reference: 'concurrent-paid', confirmed })}`;
      const results = await Promise.all([sendQuery(sql), sendQuery(sql), sendQuery(sql)]);
      assert.equal(new Set(results).size, 1);
      assert.equal(query("select count(*) from public.v2_purchases where payment_reference='concurrent-paid'"), '1');
      assert.equal(query("select count(*) from public.v2_product_grants g join public.v2_purchases p on p.id=g.purchase_id where p.payment_reference='concurrent-paid'"), '1');
    });

    await t.test('concurrent conflicting buyers cannot share a payment reference', async () => {
      const results = await Promise.allSettled([alice, bob].map((user) => sendQuery(
        `set role service_role; ${grantSql({ user, reference: 'conflicting-paid', confirmed })}`,
      )));
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      const failure = results.find((result) => result.status === 'rejected');
      assert.match(failure.reason.message, /different grant/);
      assert.equal(query("select count(*) from public.v2_purchases where payment_reference='conflicting-paid'"), '1');
      assert.equal(query("select count(*) from public.v2_product_grants g join public.v2_purchases p on p.id=g.purchase_id where p.payment_reference='conflicting-paid'"), '1');
    });

    await t.test('migration is repeatable and preserves legacy access, enrollment, and new purchase data', () => {
      const count = query('select count(*) from public.v2_purchases');
      checked('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', migration]);
      assert.equal(query('select count(*) from public.v2_purchases'), count);
      assert.deepEqual(legacyState(), beforeMigration);
      assert.equal(query('select count(*) from public.enrollments'), '1');
      assert.equal(query(session('authenticated', alice, "select public.can_access_course('c1000000-0000-4000-8000-000000000001')")), 't');
      assert.equal(query(session('authenticated', bob, "select public.can_access_course('c1000000-0000-4000-8000-000000000001')")), 'f');
    });
  } finally {
    if (started || existsSync(join(dataDir, 'postmaster.pid'))) {
      checked('pg_ctl', ['-D', dataDir, '-m', 'immediate', '-w', 'stop']);
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
