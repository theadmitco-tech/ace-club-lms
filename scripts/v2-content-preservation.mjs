import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Explicit legacy content scope. No identities, enrollments, attempts or payments.
export const CONTENT_TABLES = Object.freeze([
  'courses', 'sessions', 'materials', 'master_sessions', 'master_materials',
  'practice_sets', 'practice_questions', 'master_practice_sets', 'master_practice_questions',
  'master_worksheet_plans', 'master_worksheet_session_rules', 'master_worksheet_questions',
  'course_templates', 'course_template_revisions', 'course_template_sections',
  'course_template_events', 'course_template_resources',
]);
const FORMAT = 'v2-legacy-content-inventory-1';
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SOURCE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const invalid = () => { throw new Error('Invalid or incomplete content inventory.'); };
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function inventorySql(source) {
  if (typeof source !== 'string' || !SOURCE.test(source)) throw new Error('Use a source label containing 1–64 lowercase letters, digits, underscores or hyphens.');
  const tables = CONTENT_TABLES.map((name) => `select jsonb_build_object(
    'name', '${name}',
    'schemaHash', (select encode(sha256(convert_to(jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'notNull', a.attnotnull) order by a.attname)::text, 'UTF8')), 'hex')
      from pg_catalog.pg_attribute a where a.attrelid = 'public.${name}'::regclass
        and a.attnum > 0 and not a.attisdropped),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', r.id,
      'hash', encode(sha256(convert_to(to_jsonb(r)::text, 'UTF8')), 'hex')) order by r.id)
      from public.${name} r), '[]'::jsonb)
  ) as entry`).join('\nunion all\n');
  return `-- Read-only content fingerprints. Not a backup or a migration.
-- Source label is operator-supplied, not proof of the connected environment.
-- Run only after separate authorization and confirming the target project.
-- Missing tables, permissions or RLS-filtered reads must fail, never be skipped.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
set local lock_timeout = '2s';
set local row_security = off;
set local timezone = 'UTC';
set local datestyle = 'ISO, YMD';
set local intervalstyle = 'iso_8601';
set local extra_float_digits = 3;
set local bytea_output = 'hex';
with inventory as (
${tables}
)
select jsonb_build_object('format', '${FORMAT}', 'source', '${source}',
  'capturedAt', statement_timestamp(), 'readOnly', current_setting('transaction_read_only') = 'on',
  'tables', jsonb_agg(entry order by entry->>'name')) as report from inventory;
rollback;
`;
}

export function validateInventory(value) {
  if (!exactKeys(value, ['format', 'source', 'capturedAt', 'readOnly', 'tables'])
    || value.format !== FORMAT || value.readOnly !== true || typeof value.source !== 'string' || !SOURCE.test(value.source)
    || typeof value.capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value.capturedAt)
    || !Number.isFinite(Date.parse(value.capturedAt)) || !Array.isArray(value.tables)
    || value.tables.length !== CONTENT_TABLES.length) invalid();
  const names = new Set();
  for (const table of value.tables) {
    if (!exactKeys(table, ['name', 'schemaHash', 'rows']) || !CONTENT_TABLES.includes(table.name)
      || names.has(table.name) || typeof table.schemaHash !== 'string' || !HASH.test(table.schemaHash)
      || !Array.isArray(table.rows)) invalid();
    names.add(table.name);
    const ids = new Set();
    for (const row of table.rows) {
      if (!exactKeys(row, ['id', 'hash']) || typeof row.id !== 'string' || !UUID.test(row.id)
        || ids.has(row.id) || typeof row.hash !== 'string' || !HASH.test(row.hash)) invalid();
      ids.add(row.id);
    }
  }
  return value;
}

export function compareInventories(before, after) {
  validateInventory(before);
  validateInventory(after);
  if (before.source !== after.source) throw new Error('Inventory source labels differ.');
  if (Date.parse(after.capturedAt) < Date.parse(before.capturedAt)) throw new Error('The after inventory predates the before inventory.');
  const tables = CONTENT_TABLES.map((name) => {
    const old = before.tables.find((table) => table.name === name);
    const next = after.tables.find((table) => table.name === name);
    const oldRows = new Map(old.rows.map((row) => [row.id, row.hash]));
    const nextRows = new Map(next.rows.map((row) => [row.id, row.hash]));
    return {
      name, beforeCount: oldRows.size, afterCount: nextRows.size,
      schemaChanged: old.schemaHash !== next.schemaHash,
      removed: [...oldRows.keys()].filter((id) => !nextRows.has(id)).sort(),
      added: [...nextRows.keys()].filter((id) => !oldRows.has(id)).sort(),
      changed: [...oldRows.keys()].filter((id) => nextRows.has(id) && nextRows.get(id) !== oldRows.get(id)).sort(),
    };
  });
  return {
    status: tables.some((table) => table.schemaChanged || table.removed.length || table.added.length || table.changed.length) ? 'drift' : 'unchanged',
    scope: FORMAT, tables,
  };
}

function readInventory(path) {
  if (!statSync(path).isFile() || statSync(path).size > 64 * 1024 * 1024) invalid();
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'sql' && args.length === 1) process.stdout.write(inventorySql(args[0]));
    else if (command === 'compare' && args.length === 2) {
      const result = compareInventories(readInventory(args[0]), readInventory(args[1]));
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.status === 'unchanged' ? 0 : 1;
    } else {
      console.error('Usage: node scripts/v2-content-preservation.mjs sql SOURCE_LABEL | compare BEFORE.json AFTER.json');
      process.exitCode = 2;
    }
  } catch {
    // Never echo malformed JSON, source data, private paths or provider errors.
    console.error('Content preservation check failed: verify the command, source labels and complete inventory files.');
    process.exitCode = 2;
  }
}
