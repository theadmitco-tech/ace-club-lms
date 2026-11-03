import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {bootstrapCandidate} from './helpers.mjs';
import {literal} from '../phase1-hosted-closeout-config.mjs';
const packet='\\i deliverables/phase6-staging-acceptance/REPAIR-INTEGRATION-CONFLICTS.sql';
const manifest=JSON.parse(readFileSync('deliverables/phase6-staging-acceptance/conflict-routines.json','utf8'));
const report={check:'phase6_local_conflict_repair',recordedAt:new Date().toISOString(),scope:'Disposable PostgreSQL rehearsal; no hosted migration or HTTP assertion.',status:'running',checks:[]};
const record=id=>report.checks.push({id,status:'pass'});
test('additive conflict repair preserves rows, ledger, identities and security metadata',{timeout:120000},async()=>{
 try{await withDisposablePostgres(async db=>{
  bootstrapCandidate(db);const {query,rejects}=db;
  query("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('20261103110000','fixture_prior_ledger',array['synthetic prior ledger']),('20261018090000','fixture_phase1_ledger',array['synthetic Phase 1 ledger']);");
  const routines=manifest.routines.map(r=>r.signature);
  const ids=routines.map(x=>`to_regprocedure(${literal(x)})`).join(',');
  const metadata=()=>query(`select jsonb_agg(jsonb_build_object('oid',oid,'acl',proacl,'owner',proowner,'volatility',provolatile,'securityDefiner',prosecdef,'configuration',proconfig,'parallel',proparallel,'strict',proisstrict,'leakproof',proleakproof) order by oid)::text from pg_proc where oid in (${ids})`);
  const before=metadata(),originalLedger=query('select jsonb_agg(to_jsonb(r) order by version)::text from supabase_migrations.schema_migrations r');
  const source=routines[0];
  query(`do $$begin execute replace(pg_get_functiondef(to_regprocedure(${literal(source)})),E'\nbegin',E'\n-- Synthetic drift\nbegin');end;$$`);
  rejects(packet,/source mismatch/);record('definition-drift-rejects-entire-packet');
  assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '2');record('rejected-packet-adds-no-ledger-entry');
  query(`do $$begin execute replace(pg_get_functiondef(to_regprocedure(${literal(source)})),E'\n-- Synthetic drift\nbegin',E'\nbegin');end;$$`);
  const receipt=JSON.parse(query(packet));assert.equal(receipt.functionsRepaired,routines.length);assert.equal(receipt.existingRowsPreserved,true);record('current-application-rows-preserved');
  assert.equal(metadata(),before);record('routine-oids-acls-owners-and-security-metadata-preserved');
  assert.equal(query("select jsonb_agg(to_jsonb(r) order by version)::text from supabase_migrations.schema_migrations r where version<>'20261103120000'"),originalLedger);record('prior-ledger-and-phase1-entry-preserved');
  for(const r of manifest.routines)assert.equal(query(`select md5(prosrc) from pg_proc where oid=to_regprocedure(${literal(r.signature)})`),r.after);record('all-18-exact-repaired-bodies-match');
  assert.equal(query("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%v2%' and p.prosrc like '%''40001''%'"),'0');record('no-explicit-serialization-conflict-remains-in-v2-routines');
  rejects(packet,/already recorded/);record('repeated-activation-rejected-without-reapplication');
  assert.equal(query("select count(*) from supabase_migrations.schema_migrations where version in ('20261102140000','20261102150000','20261102160000')"),'0');record('phase3-not-activated');
 });report.status='passed';}catch(error){report.status='failed';throw error;}finally{writeFileSync('deliverables/phase6-staging-acceptance/local-conflict-repair-results.json',JSON.stringify(report,null,2)+'\n');}
});
