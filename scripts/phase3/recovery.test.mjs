import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import test from 'node:test';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
test('string-enveloped recovery survives dashboard JSON copying without numeric or scale loss',{timeout:120000},async()=>{
 const directory=mkdtempSync(join(tmpdir(),'phase3-recovery-check-'));
 try{
  const snapshot=join(directory,'snapshot.json'),report=join(directory,'report.json');
  await withDisposablePostgres(async({query})=>{
   query(`create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
    insert into supabase_migrations.schema_migrations values('1',array['synthetic'],'synthetic');
    create table public.sample(id uuid primary key default gen_random_uuid(),value numeric not null,details jsonb,words text[],doubled numeric generated always as (value*2) stored);
    insert into public.sample(value,details,words) values(9007199254740993.123456789,'{"position":0.000,"duration":12.000,"nested":[9007199254740993.123456789]}'::jsonb,array['apostrophe''s','unicode —']);`);
   const raw=query(readFileSync('deliverables/phase3-preview-activation/00-EXPORT-EXACT-RECOVERY.sql','utf8'));
   writeFileSync(snapshot,JSON.stringify(JSON.parse(raw)),{mode:0o600});
  });
  const child=spawnSync(process.execPath,['scripts/phase3/rehearse-recovery.mjs',snapshot,report],{encoding:'utf8',timeout:60000});
  assert.equal(child.status,0,'Application-row restore failed; private diagnostics remain outside Git.');
  const result=JSON.parse(readFileSync(report,'utf8'));
  assert.equal(result.sourceSerializationVerified,true);assert.equal(result.ledgerMatches,true);assert.equal(result.tables.length,1);assert.equal(result.tables[0].matches,true);assert.equal(result.fullPlatformRecovery,false);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
