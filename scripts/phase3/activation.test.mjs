import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'node:test';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {preparePhase3Database,literal} from '../helpers/v2-phase3-fixture.mjs';

test('payment activation rehearses on restored prior-phase rows and preserves metadata',{timeout:120000},async()=>{
 const directory=mkdtempSync(join(tmpdir(),'phase3-activation-check-'));
 const snapshot=join(directory,'snapshot.json'),report=join(directory,'report.json'),packet=join(directory,'RUN-ACTIVATION.sql');
 function run(command,args){
  const child=spawnSync(command,args,{encoding:'utf8',timeout:60000});
  assert.equal(child.status,0,'Local rehearsal failed; private recovery diagnostics remain outside Git.');
 }
 try{
  await withDisposablePostgres(async db=>{
   const {admin}=preparePhase3Database(db);
   db.query("create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('20261018090000','fixture',array['synthetic']),('20261103120000','fixture',array['synthetic']);");
   writeFileSync(snapshot,JSON.stringify(JSON.parse(db.query(readFileSync('deliverables/phase3-preview-activation/00-EXPORT-EXACT-RECOVERY.sql','utf8')))),{mode:0o600});
   run(process.execPath,['scripts/phase3/rehearse-recovery.mjs',snapshot,report]);
   run('python3',['scripts/phase3/prepare-activation.py',report,packet]);
   const originalName=db.query(`select full_name from public.profiles where id='${admin}'`);
   db.query(`update public.profiles set full_name='Changed after snapshot' where id='${admin}'`);
   db.rejects(`\\i '${packet}'`,/Existing application data differs/);
   assert.equal(db.query("select to_regclass('public.v2_checkout_intents') is null"),'t');
   db.query(`update public.profiles set full_name=${literal(originalName)} where id='${admin}'`);
   db.query("update supabase_migrations.schema_migrations set name='changed' where version='20261103120000'");
   db.rejects(`\\i '${packet}'`,/Migration ledger changed/);
   db.query("update supabase_migrations.schema_migrations set name='fixture' where version='20261103120000'");
   db.query('grant execute on function public.get_my_v2_access() to anon');
   db.rejects(`\\i '${packet}'`,/Payment routine privilege mismatch/);
   assert.equal(db.query("select to_regclass('public.v2_checkout_intents') is null"),'t');
   db.query('revoke execute on function public.get_my_v2_access() from anon');
   const applied=JSON.parse(db.query(`\\i '${packet}'`));
   assert.equal(applied.existingRowsPreserved,true);
   db.rejects(`\\i '${packet}'`,/A Phase 3 migration exists/);
  });
  run(process.execPath,['scripts/phase3/rehearse-recovery.mjs',snapshot,report,packet]);
  const result=JSON.parse(readFileSync(report,'utf8'));
  assert.equal(result.activationRehearsal.check,'phase3_activation');
  assert.equal(result.activationRehearsal.newPrivateTables,4);
  assert.equal(result.activationRehearsal.functionsVerified,21);
  assert.equal(result.activationRehearsal.existingRowsPreserved,true);
  assert.equal(result.activationRehearsal.originalSecurityMetadataPreserved,true);
  assert.equal(result.activationRehearsal.originalLedgerPreserved,true);
  assert.equal(result.activationRehearsal.paymentsTaken,false);
  assert.equal(result.activationRehearsal.checkoutEnabled,false);
  const envelope=JSON.parse(readFileSync(snapshot,'utf8'));envelope.payload+=' ';
  writeFileSync(snapshot,JSON.stringify(envelope),{mode:0o600});
  const invalid=spawnSync(process.execPath,['scripts/phase3/rehearse-recovery.mjs',snapshot,report],{encoding:'utf8',timeout:60000});
  assert.notEqual(invalid.status,0,'A modified snapshot must not pass rehearsal.');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
