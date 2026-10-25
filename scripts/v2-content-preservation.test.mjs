import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { CONTENT_TABLES, compareInventories, inventorySql, validateInventory } from './v2-content-preservation.mjs';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const id = 'd1000000-0000-4000-8000-000000000001';
const other = 'd1000000-0000-4000-8000-000000000002';
const fixture = () => ({
  format: 'v2-legacy-content-inventory-1', source: 'synthetic-local',
  capturedAt: '2026-10-25T00:00:00Z', readOnly: true,
  tables: CONTENT_TABLES.map((name) => ({ name, schemaHash: 'a'.repeat(64), rows: [{ id, hash: 'b'.repeat(64) }] })),
});

test('comparison detects changed, removed and added rows independently, including equal-count replacements', () => {
  const before = fixture();
  const after = fixture();
  after.tables[0].rows[0].hash = 'c'.repeat(64);
  after.tables[1].rows[0].id = other;
  after.tables[2].schemaHash = 'd'.repeat(64);
  const result = compareInventories(before, after);
  assert.equal(result.status, 'drift');
  assert.deepEqual(result.tables[0].changed, [id]);
  assert.deepEqual(result.tables[1].removed, [id]);
  assert.deepEqual(result.tables[1].added, [other]);
  assert.equal(result.tables[2].schemaChanged, true);
});

test('table and row ordering do not create drift; empty inventories still declare the entire scope', () => {
  const before = fixture();
  before.tables[0].rows.push({ id: other, hash: 'c'.repeat(64) });
  const after = structuredClone(before);
  after.tables[0].rows.reverse();
  after.tables.reverse();
  assert.equal(compareInventories(before, after).status, 'unchanged');
  for (const table of before.tables) table.rows = [];
  assert.equal(compareInventories(before, before).status, 'unchanged');
});

test('rejects partial, duplicated, malformed or expanded inventories rather than passing incomplete evidence', () => {
  const mutations = [
    (v) => { v.tables.pop(); },
    (v) => { v.tables[0] = v.tables[1]; },
    (v) => { v.tables[0].rows.push(v.tables[0].rows[0]); },
    (v) => { v.tables[0].rows[0].hash = 'broken'; },
    (v) => { v.tables[0].rows[0].id = null; },
    (v) => { v.tables[0].rows[0].privateUrl = 'https://private.example.test'; },
    (v) => { v.readOnly = false; },
    (v) => { v.format = 'unknown-version'; },
    (v) => { v.capturedAt = '2026-10-25'; },
    (v) => { v.tables[0].name = 'profiles'; },
    (v) => { v.source = 'invalid label'; },
  ];
  for (const mutate of mutations) {
    const value = fixture(); mutate(value);
    assert.throws(() => validateInventory(value), /Invalid or incomplete/);
  }
});

test('rejects different environments, backwards captures and SQL injection through the operator label', () => {
  const before = fixture(); const after = fixture();
  after.source = 'different-project';
  assert.throws(() => compareInventories(before, after), /labels differ/);
  after.source = before.source; after.capturedAt = '2026-10-24T00:00:00Z';
  assert.throws(() => compareInventories(before, after), /predates/);
  assert.throws(() => inventorySql("x'; drop table public.materials;--"));
});

test('CLI returns 0 for unchanged, 1 for drift and 2 for invalid input without exposing private values', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ace-content-compare-'));
  try {
    const beforePath = join(directory, 'before.json'); const afterPath = join(directory, 'after.json');
    const before = fixture(); const after = fixture();
    writeFileSync(beforePath, JSON.stringify(before)); writeFileSync(afterPath, JSON.stringify(after));
    const run = () => spawnSync(process.execPath, ['scripts/v2-content-preservation.mjs', 'compare', beforePath, afterPath], { encoding: 'utf8' });
    assert.equal(run().status, 0);
    after.tables[0].rows = []; writeFileSync(afterPath, JSON.stringify(after));
    assert.equal(run().status, 1);
    writeFileSync(afterPath, '{"PRIVATE-CONTENT-DO-NOT-ECHO":');
    const invalid = run();
    assert.equal(invalid.status, 2);
    assert.doesNotMatch(invalid.stdout + invalid.stderr, /PRIVATE-CONTENT-DO-NOT-ECHO/);
    assert.equal(readFileSync(beforePath, 'utf8'), JSON.stringify(before));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('generated inventory executes against an isolated database and detects preservation failures', { timeout: 120000 }, async (t) => {
  await withDisposablePostgres(async ({ query, rejects }) => {
    // Minimal synthetic content shapes with the same UUID primary-key contract.
    // Deliberately include URLs, question answers, JSON and timestamps in hashes.
    for (const name of CONTENT_TABLES) query(`create table public.${name}(
      id uuid primary key, title text, file_url text, parent_id uuid,
      payload jsonb, available_from timestamptz, position integer);
      insert into public.${name} values ('${id}', 'PRIVATE-TITLE', 'https://private.example.test/token',
        '${other}', '{"answer":"PRIVATE-ANSWER","items":[1,2]}', '2026-10-25T00:00:00Z', 1);`);
    query(`create table public.profiles(id uuid, email text);
      insert into public.profiles values ('${id}', 'private@example.test');`);
    const sql = inventorySql('synthetic-local');
    const inspect = () => validateInventory(JSON.parse(query(sql)));
    const before = inspect();

    await t.test('read-only capture preserves every row, hides private values and ignores unrelated identity data', () => {
      assert.equal(before.tables.length, 17);
      assert(before.tables.every((table) => table.rows.length === 1));
      assert.doesNotMatch(JSON.stringify(before), /PRIVATE-|private\.example|private@example/);
      query(`update public.profiles set email='changed@example.test'`);
      assert.equal(compareInventories(before, inspect()).status, 'unchanged');
      rejects(sql.replace('rollback;', "update public.materials set title='bad'; rollback;"), /read-only transaction/);
    });

    await t.test('session timezone and datestyle cannot create false changes', () => {
      const after = JSON.parse(query(`set timezone='Asia/Kolkata'; set datestyle='SQL, DMY'; ${sql}`));
      assert.equal(compareInventories(before, after).status, 'unchanged');
    });

    await t.test('URL, association, order, question and release-time changes are visible', () => {
      for (const change of ["file_url='https://changed.example.test'", 'parent_id=null', 'position=2',
        "payload='{}'::jsonb", "available_from=available_from+interval '1 second'", 'title=null']) {
        const previous = inspect();
        query(`update public.materials set ${change}`);
        const result = compareInventories(previous, inspect());
        assert.deepEqual(result.tables.find((table) => table.name === 'materials').changed, [id]);
      }
    });

    await t.test('new columns on an empty table and missing tables cannot silently pass', () => {
      query('delete from public.course_template_resources');
      const empty = inspect();
      query('alter table public.course_template_resources add column new_content text');
      assert.equal(compareInventories(empty, inspect()).tables.find((table) => table.name === 'course_template_resources').schemaChanged, true);
      query('alter table public.course_template_resources rename to temporarily_missing');
      rejects(sql, /does not exist/);
      query('alter table public.temporarily_missing rename to course_template_resources');
    });

    await t.test('limited permissions and RLS cannot disguise invisible content as an empty inventory', () => {
      query(`create role content_reader nologin; grant usage on schema public to content_reader;
        grant select on all tables in schema public to content_reader;
        alter table public.materials enable row level security;`);
      rejects(`set role content_reader; ${sql}`, /row-level security/);
      query('alter table public.materials disable row level security; revoke select on public.materials from content_reader');
      rejects(`set role content_reader; ${sql}`, /permission denied/);
    });
  });
});
