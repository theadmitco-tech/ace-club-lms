import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROJECT, ORIGIN, validateConfig, readConfig, purchaseCleanupSql } from './phase1-hosted-closeout-config.mjs';

const key = (role,ref=PROJECT) => 'header.'+Buffer.from(JSON.stringify({role,ref})).toString('base64url')+'.signature';
const base = () => ({SUPABASE_URL:ORIGIN,SUPABASE_ANON_KEY:key('anon'),SUPABASE_SERVICE_ROLE_KEY:key('service_role'),DATABASE_URL:`postgresql://postgres:synthetic-password@db.${PROJECT}.supabase.co:5432/postgres?sslmode=require`});
test('configuration refuses Production, foreign API keys and role confusion before any client is created',()=>{
  for(const patch of [{SUPABASE_URL:'https://owmlxsnzogfapotmjrqk.supabase.co'},{SUPABASE_ANON_KEY:key('service_role')},{SUPABASE_SERVICE_ROLE_KEY:key('anon')},{SUPABASE_SERVICE_ROLE_KEY:key('service_role','other')},{SUPABASE_ANON_KEY:'bad'}])assert.throws(()=>validateConfig({...base(),...patch}));
  assert.equal(validateConfig(base()).db.hostname,`db.${PROJECT}.supabase.co`);
});
test('database target must identify staging and require TLS; redirect/query injection is rejected',()=>{
  for(const DATABASE_URL of ['postgresql://postgres:pass@localhost/postgres',`postgresql://postgres:pass@db.${PROJECT}.supabase.co/another`,`postgresql://postgres:pass@db.${PROJECT}.supabase.co/postgres?sslmode=disable`,`postgresql://postgres:pass@db.${PROJECT}.supabase.co/postgres?host=evil.example`,`postgresql://postgres:pass@aws-0-ap-south-1.pooler.supabase.com/postgres`,'postgresql://postgres.owmlxsnzogfapotmjrqk:pass@aws-0-ap-south-1.pooler.supabase.com/postgres'])assert.throws(()=>validateConfig({...base(),DATABASE_URL}));
  assert.equal(validateConfig({...base(),DATABASE_URL:`postgresql://postgres.${PROJECT}:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`}).db.port,'6543');
});
test('opaque modern API keys accepted only with staging URL; network preflight remains required',()=>{
  assert.equal(validateConfig({...base(),SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32),SUPABASE_SERVICE_ROLE_KEY:'sb_secret_'+'b'.repeat(32)}).SUPABASE_URL,ORIGIN);
});
test('credentials require owner-only file permissions and are parsed as data, never shell code',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ace-qa-config-'));const file=join(dir,'credentials');
  try {
    writeFileSync(file,Object.entries(base()).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600});
    assert.equal(readConfig(file).SUPABASE_URL,ORIGIN);
    chmodSync(file,0o644);assert.throws(()=>readConfig(file),/chmod 600/);chmodSync(file,0o600);
    writeFileSync(file,'SUPABASE_URL=$(echo unsafe)');assert.throws(()=>readConfig(file));
    writeFileSync(file,'UNRELATED_SECRET=anything');assert.throws(()=>readConfig(file),/Unexpected/);
    writeFileSync(file,'SUPABASE_URL=x\nSUPABASE_URL=y');assert.throws(()=>readConfig(file),/Duplicate/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('cleanup cannot be generated without both a valid run and explicit generated-user scope',()=>{
  const run='10000000-0000-4000-8000-000000000001',user='20000000-0000-4000-8000-000000000002';
  for(const args of [[run,[]],['%', [user]],[run,["'; delete from profiles; --"]]])assert.throws(()=>purchaseCleanupSql(...args));
  const sql=purchaseCleanupSql(run,[user]);assert.ok(sql.includes(`student_id in ('${user}') and payment_reference like 'phase1-qa:${run}:%'`));
  assert.ok(sql.indexOf('delete from public.v2_product_grants')<sql.indexOf('delete from public.v2_purchases'));
  assert.ok(!sql.includes('truncate'));
});
