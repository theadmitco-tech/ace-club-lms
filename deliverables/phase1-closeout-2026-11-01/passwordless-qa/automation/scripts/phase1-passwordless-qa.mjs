import {resolve} from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright-core';
import { PROJECT, ORIGIN, PREVIEW, COMMIT, check, readConfig } from './phase1-hosted-closeout-config.mjs';
import { CASES, buildSetupSql, buildCleanupSql } from './phase1-sql-editor-fixtures.mjs';

const mode=process.argv[2];
if(!['prepare','verify','cleanup-accounts'].includes(mode)) {
  console.log('Use prepare, verify, or cleanup-accounts. Requires staging API keys; DATABASE_URL is not used. SQL Editor setup precedes verify; SQL Editor purchase cleanup precedes cleanup-accounts.');process.exit(0);
}
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const privatePath='/tmp/ace-phase1-passwordless-qa-state.json';
const output=resolve('deliverables/phase1-closeout-2026-11-01/passwordless-qa');
mkdirSync(output,{recursive:true});
const options={auth:{autoRefreshToken:false,persistSession:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const anon=createClient(ORIGIN,config.SUPABASE_ANON_KEY,options);
let state;
const safe=(result,stage)=>{check(!result.error,`${stage} failed (provider details withheld).`);return result.data;};
const rpc=async(client,name,args)=>safe(await client.rpc(name,args),name);
const save=()=>{
  writeFileSync(privatePath,JSON.stringify(state,null,2),{mode:0o600});
  // No password, token, key or session is included in the reviewable manifest.
  const {password,...publicState}=state;
  void password;
  writeFileSync(`${output}/fixture-manifest.json`,JSON.stringify(publicState,null,2));
};
const verifyOwned=async user=>{
  const data=safe(await service.auth.admin.getUserById(user.id),'Verify generated QA ownership');
  check(data.user.email===user.email&&data.user.user_metadata.phase1_qa_run===state.runId,'QA account ownership mismatch.');
};

if(mode==='prepare') {
  check(!existsSync(privatePath),'A QA run already exists; inspect its manifest instead of creating another run.');
  safe(await service.auth.admin.listUsers({page:1,perPage:1}),'Staging Auth admin preflight');
  const quote=await rpc(anon,'quote_v2_products',{p_product_codes:['quant_crash']});
  check(quote.amount_paise===1000000,'Unexpected configured price.');
  state={runId:randomUUID(),project:PROJECT,commit:COMMIT,createdAt:new Date().toISOString(),status:'creating-accounts',password:`Qa!${randomUUID()}aA9`,users:[],databasePasswordUsed:false};save();
  try {
    for(const item of CASES) {
      const email=`ace-p1-${item.label}-${state.runId}@example.invalid`;
      const data=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Phase 1 QA ${item.label}`,phase1_qa_run:state.runId}}),'Create dedicated QA account');
      const user={id:data.user.id,email,label:item.label};state.users.push(user);save();
      await verifyOwned(user);
      safe(await service.from('profiles').upsert({id:user.id,email,full_name:`Phase 1 QA ${item.label}`,role:item.role??'student',is_active:item.state!=='inactive'}),'Prepare dedicated QA profile');
    }
    writeFileSync(`${output}/01-SETUP-FIXTURES.sql`,buildSetupSql(state));
    writeFileSync(`${output}/02-CLEANUP-PURCHASES.sql`,buildCleanupSql(state));
    state.status='accounts-created-awaiting-sql-setup';save();
    console.log(JSON.stringify({status:state.status,accounts:state.users.length,runId:state.runId,output}));
  }catch {
    state.status='prepare-failed';save();
    // Purchase setup SQL is not emitted until every account is ready. On failure,
    // only newly generated Auth accounts can exist; remove those exact accounts.
    let removed=0;
    for(const user of [...state.users].reverse()) {
      try{await verifyOwned(user);safe(await service.auth.admin.deleteUser(user.id),'Remove partial QA account');removed++;}catch{break;}
    }
    state.partialCleanup={removed,created:state.users.length};save();
    console.log(JSON.stringify({status:state.status,partialCleanup:state.partialCleanup}));process.exitCode=1;
  }
}else {
  state=JSON.parse(readFileSync(privatePath,'utf8'));
  check(state.project===PROJECT&&state.commit===COMMIT,'QA manifest candidate mismatch.');
  if(mode==='cleanup-accounts') {
    for(const user of state.users) {
      const remaining=safe(await service.from('v2_purchases').select('id').eq('student_id',user.id).limit(1),'Check fixture purchase cleanup');
      check(remaining.length===0,'Run SQL Editor purchase cleanup before removing QA accounts.');
    }
    state.deletedAccountIds??=[];
    for(const user of [...state.users].reverse()) {
      if(state.deletedAccountIds.includes(user.id))continue;
      await verifyOwned(user);
      safe(await service.auth.admin.deleteUser(user.id),'Remove dedicated QA account');
      state.deletedAccountIds.push(user.id);save();
    }
    state.status='cleaned';state.cleanedAt=new Date().toISOString();delete state.password;save();
    console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));
  }else {
    const accessUrl=readFileSync('/tmp/ace-phase1-preview-access','utf8').trim();
    check(new URL(accessUrl).origin===PREVIEW&&new URL(accessUrl).searchParams.has('_vercel_share'),'Wrong protected Preview access link.');
    const report={runId:state.runId,project:PROJECT,commit:COMMIT,startedAt:new Date().toISOString(),checks:[],status:'running',limitations:['Legacy worksheet/editor/enrollment journeys are separate. Fixture cleanup is required before final sign-off.']};
    const saveReport=()=>writeFileSync(`${output}/hosted-results.json`,JSON.stringify(report,null,2));
    const ok=(id,passed)=>{report.checks.push({id,status:passed?'pass':'fail'});saveReport();check(passed,`Check failed: ${id}`);};
    let browser;
    const sessions={};
    try {
      const all=safe(await service.from('v2_purchases').select('id,student_id,payment_reference,confirmed_at,expires_at,revoked_at').in('student_id',state.users.map(u=>u.id)),'Read exact fixture purchases');
      ok('sql-fixtures-complete-and-owned',all.length===15&&all.every(p=>p.payment_reference.startsWith(`phase1-qa:${state.runId}:`)));
      browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
      for(const user of state.users) {
        await verifyOwned(user);let cookies=[];
        const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(x=>x.name!==c.name);cookies.push(c);}}}});
        safe(await client.auth.signInWithPassword({email:user.email,password:state.password}),'Sign in dedicated QA account');
        sessions[user.label]={...user,client,cookies};
      }
      const publicContext=await browser.newContext();const publicPage=await publicContext.newPage();
      await publicPage.goto(accessUrl,{waitUntil:'domcontentloaded'});
      await publicPage.goto(`${PREVIEW}/qa/phase1`,{waitUntil:'domcontentloaded'});
      const deployment=await publicPage.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
      ok('exact-hosted-candidate',deployment.commit===COMMIT&&deployment.stagingProject===PROJECT&&deployment.overall!=='fail');
      const protectionCookies=(await publicContext.cookies()).filter(c=>!c.name.startsWith('sb-'));
      await publicContext.close();
      for(const session of Object.values(sessions)) {
        session.context=await browser.newContext();
        await session.context.addCookies([...protectionCookies,...session.cookies.map(({name,value})=>({name,value,url:PREVIEW,secure:true,sameSite:'Lax'}))]);
        session.page=await session.context.newPage();
      }
      const codes=['quant_crash','verbal_crash','di_crash','full_batch'];
      const canonical=code=>({quant_crash:'quant',verbal_crash:'verbal',di_crash:'di',full_batch:'full_course'})[code];
      for(const item of CASES) {
        const session=sessions[item.label];
        const expected=['expired','revoked','inactive'].includes(item.label)?[]:item.label==='mixed'?item.extra:item.label==='multiple'?[...item.products,...item.extra]:item.products;
        const access=await rpc(session.client,'get_my_v2_access');
        ok(`access-list:${item.label}`,access.length===expected.length&&expected.every(code=>access.some(r=>r.product_code===code)));
        for(const code of codes)ok(`access-boundary:${item.label}:${code}`,await rpc(session.client,'can_access_v2_product',{p_product_code:code,p_section:null})===expected.includes(code));
        for(const code of expected)for(const section of ['quant','verbal','di'])ok(`section:${item.label}:${code}:${section}`,await rpc(session.client,'can_access_v2_product',{p_product_code:code,p_section:section})===(code==='full_batch'||code.startsWith(section)));
        if(item.label==='admin')continue;
        await session.page.goto(`${PREVIEW}/account/access/upgrade`,{waitUntil:'domcontentloaded'});
        if(item.label==='inactive'){ok('inactive-page-redirect',new URL(session.page.url()).pathname==='/login');continue;}
        const body=await session.page.locator('main').innerText();
        const rejected={expired:'There is no active individual package',revoked:'There is no active individual package',empty:'There is no active individual package',multiple:'multiple active purchases',full:'not part of individual-package upgrades',qvd:'already includes Quant, Verbal and DI'};
        if(rejected[item.label])ok(`upgrade-rejected:${item.label}`,body.includes(rejected[item.label]));
        if(['q','v','d','qv','qd','vd'].includes(item.label)) {
          for(const target of CASES.filter(c=>['qv','qd','vd','qvd'].includes(c.label)&&c.products.length>item.products.length&&item.products.every(code=>c.products.includes(code)))) {
            const params=new URLSearchParams(target.products.map(c=>['course',canonical(c)]));
            await session.page.goto(`${PREVIEW}/account/access/upgrade?${params}`,{waitUntil:'domcontentloaded'});
            const panel=session.page.getByRole('region',{name:'Your upgrade estimate'});await panel.waitFor();
            const difference=[0,1000000,1800000,2500000][target.products.length]-[0,1000000,1800000,2500000][item.products.length];
            const shown=await panel.innerText();
            ok(`upgrade-price:${item.label}->${target.label}`,shown.includes(`₹${(difference/100).toLocaleString('en-IN')}`));
            const purchase=all.find(p=>p.student_id===session.id);
            const expiry=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(purchase.expires_at))+' IST';
            ok(`upgrade-expiry:${item.label}->${target.label}`,shown.includes(`Expiry stays ${expiry}`));
          }
        }
      }
      const foreign=all.find(p=>p.student_id===sessions.v.id);
      ok('foreign-fixture-confirmed',!!foreign);
      for(const label of ['q','inactive'])for(const table of ['v2_purchases','v2_product_grants']) {
        const column=table==='v2_purchases'?'id':'purchase_id';
        ok(`cross-student:${label}:${table}`,safe(await sessions[label].client.from(table).select(column).eq(column,foreign.id),'Cross-student read').length===0);
      }
      for(const [label,client] of [['anon',anon],['student',sessions.q.client],['admin',sessions.admin.client]]) {
        const args={p_student_id:null,p_product_codes:null,p_payment_reference:null,p_confirmed_at:null,p_price_version_id:null,p_amount_paise:null,p_currency:null};
        ok(`grant-denied:${label}`,(await client.rpc('grant_v2_purchase',args)).error?.code==='42501');
        for(const table of ['v2_purchases','v2_product_grants']) {
          const id=randomUUID(),column=table==='v2_purchases'?'id':'purchase_id';
          ok(`insert-denied:${label}:${table}`,(await client.from(table).insert(table==='v2_purchases'?{id,student_id:null}:{purchase_id:null,product_code:null})).error?.code==='42501');
          ok(`update-denied:${label}:${table}`,(await client.from(table).update(table==='v2_purchases'?{revoked_at:null}:{product_code:'quant_crash'}).eq(column,id)).error?.code==='42501');
          ok(`delete-denied:${label}:${table}`,(await client.from(table).delete().eq(column,id)).error?.code==='42501');
        }
      }
      await sessions.q.page.goto(`${PREVIEW}/admin/v2/access`,{waitUntil:'domcontentloaded'});
      ok('student-admin-route-denied',!new URL(sessions.q.page.url()).pathname.startsWith('/admin'));
      const after=safe(await service.from('v2_purchases').select('id,student_id,payment_reference,confirmed_at,expires_at,revoked_at').in('student_id',state.users.map(u=>u.id)),'Verify fixture purchases unchanged');
      const normalize=rows=>JSON.stringify([...rows].sort((a,b)=>a.id.localeCompare(b.id)));
      ok('purchases-unchanged-by-ui-and-denial-probes',normalize(all)===normalize(after));
      report.status='passed-scoped-checks';state.status='verified-awaiting-purchase-cleanup';save();
    }catch(error){report.status='failed';report.failure=error?.message?.startsWith('Check failed:')?error.message:'Execution failed; inspect completed check IDs. Raw provider/browser details withheld.';process.exitCode=1;}
    finally{if(browser)await browser.close();report.finishedAt=new Date().toISOString();saveReport();console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.status==='pass').length,failed:report.checks.filter(c=>c.status==='fail').length,failure:report.failure,output}));}
  }
}
