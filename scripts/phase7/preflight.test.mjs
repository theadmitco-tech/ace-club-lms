import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {preparePhase3Database} from '../helpers/v2-phase3-fixture.mjs';

const folder='deliverables/phase7-release-preparation';
const packet='\\i '+folder+'/READ-ONLY-PREFLIGHT.sql';
const inventory=JSON.parse(readFileSync(folder+'/migration-inventory.json','utf8'));
const report={check:'phase7_preflight_local_rehearsal',recordedAt:new Date().toISOString(),scope:'Disposable local PostgreSQL only; no Production query, backup restore, release or rollback rehearsal.',status:'running',checks:[]};
const record=id=>report.checks.push({id,status:'pass'});

test('metadata preflight handles absent and installed V2 schema without persistent changes',{timeout:120000},async()=>{
 try{
  for(const migration of inventory.migrations)assert.equal(createHash('sha256').update(readFileSync(migration.path)).digest('hex'),migration.sourceSha256);
  assert.equal(inventory.phase3Included,true);assert.equal(inventory.migrations.length,20);
  assert.deepEqual(inventory.migrations.slice(-3).map(m=>m.version),['20261113090000','20261113100000','20261113110000']);
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
   preparePhase3Database(db);
   for(const migration of inventory.migrations.filter(m=>m.version.startsWith('20261113')))db.apply(migration.path.split('/').at(-1));
   db.query("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('20261018090000','synthetic_original',array['synthetic original ledger']);");
   const snapshot=()=>db.query("select jsonb_build_object('ledger',(select jsonb_agg(to_jsonb(m)) from supabase_migrations.schema_migrations m),'products',(select jsonb_agg(to_jsonb(p) order by code) from public.v2_products p),'bucket',(select jsonb_agg(to_jsonb(b)) from storage.buckets b))::text");
   const before=snapshot();const result=JSON.parse(db.query(packet));
   assert.equal(result.transactionReadOnly,'on');assert.equal(result.tables.length,36);assert.ok(result.tables.every(t=>t.rlsEnabled));record('installed-v2-tables-report-rls');
   assert.ok(result.routines.length>18);assert.ok(result.routines.every(r=>/^[a-f0-9]{32}$/.test(r.bodyMd5)));record('routine-fingerprints-and-privileges-are-reported');
   const privateNames=['v2_checkout_intents','v2_payment_events','v2_purchase_upgrades','v2_signup_candidates'];
   assert.equal(result.tables.filter(t=>privateNames.includes(t.name)).length,4);
   assert.ok(result.tables.filter(t=>privateNames.includes(t.name)).every(t=>t.readRoles.length===0&&t.directWriteRoles.length===0));record('phase3-private-tables-have-no-direct-client-grants');
   const fulfillment=result.routines.find(r=>r.signature.startsWith('fulfill_v2_checkout('));
   assert.ok(fulfillment);assert.deepEqual(fulfillment.executeRoles,['service_role']);assert.equal(fulfillment.publicExecute,false);record('payment-fulfillment-is-service-only-with-no-public-grant');
   assert.deepEqual(result.paymentTriggers.map(t=>t.name),['v2_live_capacity','v2_signup_activation_guard','z_v2_signup_candidate']);
   assert.ok(result.paymentTriggers.every(t=>t.enabled==='O'&&/^[a-f0-9]{32}$/.test(t.definitionMd5)));record('payment-capacity-and-signup-triggers-are-inventoried');
   assert.equal(result.privateBucket.public,false);assert.equal(result.privateBucket.fileSizeLimit,52428800);record('private-bucket-metadata-is-reported');
   assert.ok(result.policyMetadata.some(p=>p.name==='v2_private_content_no_browser_access'&&p.mode==='RESTRICTIVE'));record('restrictive-storage-policy-is-reported');
   assert.equal(result.ledger.filter(v=>v.present).length,1);assert.equal(snapshot(),before);record('existing-ledger-products-and-storage-metadata-preserved');
  });
  report.status='passed';
 }catch(error){report.status='failed';throw error;}
 finally{report.sqlSha256=createHash('sha256').update(readFileSync(folder+'/READ-ONLY-PREFLIGHT.sql')).digest('hex');writeFileSync(folder+'/local-preflight-results.json',JSON.stringify(report,null,2)+'\n');}
});
