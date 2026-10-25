import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isV2TemplateDraft } from '../src/lib/v2Templates.ts';
import { validateInventory } from './v2-content-preservation.mjs';

const SOURCE_TABLES = ['materials', 'master_materials', 'course_template_resources'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash = /^[a-f0-9]{64}$/;
const keysAre = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const invalid = () => { throw new Error('Invalid, incomplete or stale content mapping proposal.'); };
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;

// Pure review preparation: no connections, mutation, approval or publication.
export function reviewContentMapping(inventory, templates, proposal) {
  validateInventory(inventory);
  if (!Array.isArray(templates) || templates.length === 0 || templates.length > 1000
    || !templates.every(isV2TemplateDraft)
    || new Set(templates.map((template) => template.id)).size !== templates.length) invalid();
  if (!keysAre(proposal, ['format', 'source', 'bindings'])
    || !['v2-content-mapping-proposal-1', 'v2-content-mapping-proposal-2'].includes(proposal.format) || proposal.source !== inventory.source
    || !Array.isArray(proposal.bindings) || proposal.bindings.length === 0 || proposal.bindings.length > 10000) invalid();

  const sessionMapping = proposal.format === 'v2-content-mapping-proposal-2';
  const sourceTables = sessionMapping ? [...SOURCE_TABLES, 'sessions', 'master_sessions'] : SOURCE_TABLES;
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const tableMap = new Map(inventory.tables.map((table) => [table.name, {
    schemaHash: table.schemaHash, rows: new Map(table.rows.map((row) => [row.id, row.hash])),
  }]));
  const seen = new Set();
  const sources = new Set();
  const targets = new Set();
  const bindings = proposal.bindings.map((binding) => {
    if (!keysAre(binding, ['source', 'target'])
      || !keysAre(binding.source, ['table', 'id', 'rowHash', 'schemaHash'])
      || !keysAre(binding.target, sessionMapping ? ['templateId', 'revision', 'sessionKey', 'contentKind'] : ['templateId', 'revision', 'eventKey'])) invalid();
    const source = binding.source; const target = binding.target;
    if (!sourceTables.includes(source.table) || !matches(source.id, uuid)
      || !matches(source.rowHash, hash) || !matches(source.schemaHash, hash)
      || !matches(target.templateId, uuid) || !matches(sessionMapping ? target.sessionKey : target.eventKey, uuid)
      || !Number.isInteger(target.revision) || target.revision < 1) invalid();
    const table = tableMap.get(source.table);
    const template = templateMap.get(target.templateId);
    if (table.schemaHash !== source.schemaHash || table.rows.get(source.id) !== source.rowHash
      || !template || template.revision !== target.revision) invalid();
    if (sessionMapping && (!['materials', 'recordings', 'preSessionReads', 'postSessionReads'].includes(target.contentKind)
      || (['sessions', 'master_sessions'].includes(source.table) && target.contentKind !== 'recordings'))) invalid();
    const event = sessionMapping ? template.document.sessions?.find((item) => item.key === target.sessionKey)
      : template.document.events.find((item) => item.key === target.eventKey);
    if (!event) invalid();
    const sourceKey = `${source.table}:${source.id}`;
    const targetKey = `${target.templateId}:${sessionMapping ? target.sessionKey : target.eventKey}`;
    const key = `${sourceKey}:${targetKey}:${sessionMapping ? target.contentKind : ''}`;
    if (seen.has(key)) invalid();
    seen.add(key); sources.add(sourceKey); targets.add(targetKey);
    return {
      source: { ...source }, target: { ...target },
      productCode: template.productCode, section: event.section,
      ...(sessionMapping ? { targetKind: 'course_session' } : { eventKind: event.kind ?? 'live' }), templateHash: digest(template),
    };
  });
  // Binding order has no delivery meaning. No universal/all-events expansion.
  bindings.sort((a, b) => compareText(JSON.stringify(canonical(a)), JSON.stringify(canonical(b))));
  const contentInventory = {
    source: inventory.source,
    tables: inventory.tables.map((table) => ({ ...table, rows: [...table.rows].sort((a, b) => compareText(a.id, b.id)) }))
      .sort((a, b) => compareText(a.name, b.name)),
  };
  const scope = { source: inventory.source, inventoryHash: digest(contentInventory), bindings };
  return {
    format: sessionMapping ? 'v2-content-mapping-review-2' : 'v2-content-mapping-review-1', status: 'review_required',
    reviewHash: digest(scope), ...scope,
    counts: { bindings: bindings.length, sourceItems: sources.size, ...(sessionMapping ? { targetSessions: targets.size } : { targetEvents: targets.size }) },
    products: [...new Set(bindings.map((binding) => binding.productCode))].sort(),
    unmappedSourceCount: sourceTables.reduce((count, name) => count + tableMap.get(name).rows.size, 0) - sources.size,
    ...(sessionMapping
      ? { unboundTargetSessionCount: templates.reduce((count, template) => count + (template.document.sessions?.length ?? 0), 0) - targets.size }
      : { unboundTargetEventCount: templates.reduce((count, template) => count + template.document.events.length, 0) - targets.size }),
  };
}

function readJson(path) {
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > 64 * 1024 * 1024) invalid();
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, ...paths] = process.argv.slice(2);
  try {
    if (command !== 'review' || paths.length !== 3) {
      console.error('Usage: node --experimental-strip-types scripts/v2-content-mapping.mjs review INVENTORY.json TEMPLATES.json PROPOSAL.json');
      process.exitCode = 2;
    } else console.log(JSON.stringify(reviewContentMapping(...paths.map(readJson)), null, 2));
  } catch {
    console.error('Mapping review failed: check complete inventories, source fingerprints and exact target revisions.');
    process.exitCode = 2;
  }
}
