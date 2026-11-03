import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {bootstrapCandidate} from '../phase6/helpers.mjs';

const folder='deliverables/phase7-release-preparation';
const packet='\\i '+folder+'/READ-ONLY-PREFLIGHT.sql';
const inventory=JSON.parse(readFileSync(folder+'/migration-inventory.json','utf8'));
const report={check:'phase7_preflight_local_rehearsal',recordedAt:new Date().toISOString(),scope:'Disposable local PostgreSQL only; no Production query, backup restore, release or rollback rehearsal.',status:'running',checks:[]};
const record=id=>report.checks.push({id,status:'pass'});

test('metadata preflight handles absent and installed V2 schema without persistent changes',{timeout:120000},async()=>{
 try{
  for(const migration of inventory.migrations)assert.equal(createHash('sha256').update(readFileSync(migration.path)).digest('hex'),migration.sourceSha256);
  assert.equal(inventory.approvedForExecution,false);assert.equal(inventory.releaseCandidate,null);record('source-hashes-match-and-release-remains-unapproved');
  await withDisposablePostgres(async db=>{
   db.query('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);');
   db.query("create schema storage;create table storage.buckets(id text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
   const result=JSON.parse(db.query(packet));
   assert.equal(result.transactionReadOnly,'on');assert.equal(result.projectIdentityVerifiedBySql,false);assert.equal(result.releaseApproved,false);
   assert.equal(result.ledger.length,inventory.migrations.length);assert.ok(result.ledger.every(v=>!v.present));
   assert.deepEqual(result.tables,[]);assert.deepEqual(result.routines,[]);assert.equal(result.privateBucket,null);record('absent-v2-schema-is-reported-without-acceptance');
   assert.equal(db.query('select count(*) from supabase_migrations.schema_migrations'),'0');record('empty-ledger-is-not-created-or-repaired');
  });
  await withDisposablePostgres(async db=>{
   bootstrapCandidate(db);db.apply('20261103120000_fix_v2_integration_conflicts.sql');
   db.query("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('20261018090000','synthetic_original',array['synthetic original ledger']);");
   const snapshot=()=>db.query("select jsonb_build_object('ledger',(select jsonb_agg(to_jsonb(m)) from supabase_migrations.schema_migrations m),'products',(select jsonb_agg(to_jsonb(p) order by code) from public.v2_products p),'bucket',(select jsonb_agg(to_jsonb(b)) from storage.buckets b))::text");
   const before=snapshot();const result=JSON.parse(db.query(packet));
   assert.equal(result.transactionReadOnly,'on');assert.equal(result.tables.length,32);assert.ok(result.tables.every(t=>t.rlsEnabled));record('installed-v2-tables-report-rls');
   assert.ok(result.routines.length>18);assert.ok(result.routines.every(r=>/^[a-f0-9]{32}$/.test(r.bodyMd5)));record('routine-fingerprints-and-privileges-are-reported');
   assert.equal(result.privateBucket.public,false);assert.equal(result.privateBucket.fileSizeLimit,52428800);record('private-bucket-metadata-is-reported');
   assert.ok(result.policyMetadata.some(p=>p.name==='v2_private_content_no_browser_access'&&p.mode==='RESTRICTIVE'));record('restrictive-storage-policy-is-reported');
   assert.equal(result.ledger.filter(v=>v.present).length,1);assert.equal(snapshot(),before);record('existing-ledger-products-and-storage-metadata-preserved');
  });
  report.status='passed';
 }catch(error){report.status='failed';throw error;}
 finally{report.sqlSha256=createHash('sha256').update(readFileSync(folder+'/READ-ONLY-PREFLIGHT.sql')).digest('hex');writeFileSync(folder+'/local-preflight-results.json',JSON.stringify(report,null,2)+'\n');}
});
