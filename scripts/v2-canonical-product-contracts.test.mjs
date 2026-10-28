import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const proposal = (suffix = '') => readFileSync(new URL(`../docs/v2/phase-1/proposals/20261025120000_canonical_product_contracts${suffix}.sql`, import.meta.url), 'utf8');
const alice = randomUUID(), bob = randomUUID(), admin = randomUUID();
const as = (role, id, sql) => `begin; set local role ${role}; set local request.jwt.claim.sub='${id ?? ''}'; ${sql}; commit;`;
test('canonical product contract proposal on a disposable Phase 1 database', { timeout: 120000 }, async (t) => withDisposablePostgres(async ({query, apply, rejects}) => {
  query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql']) apply(file);
  for (const [i,id] of [alice,bob,admin].entries()) query(`insert into auth.users(id,email) values('${id}','synthetic-${i}@example.test')`);
  query(`update public.profiles set is_active=true; update public.profiles set role='admin' where id='${admin}'`);
  const confirmed=query("select (now()-interval '1 day')::text");
  const grant=(fn,code,ref='same-payment',user=alice,price=2,amount=1000000)=>`select public.${fn}('${user}',array[${code}], '${ref}', '${confirmed}', 'a1000000-0000-4000-8000-00000000000${price}',${amount},'INR')`;
  const originalId=query(as('service_role',null,grant('grant_v2_purchase',"'quant_crash'")));
  const snapshot=()=>query(`select jsonb_build_object(
    'products',(select jsonb_agg(to_jsonb(p)-'canonical_code' order by code) from public.v2_products p),
    'prices',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_price_versions p),
    'purchases',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_purchases p),
    'grants',(select jsonb_agg(to_jsonb(p) order by purchase_id,product_code) from public.v2_product_grants p),
    'profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p))`);
  const before=snapshot();
  const inspection=readFileSync(new URL('../docs/v2/phase-1/proposals/canonical-contract-inspection.sql',import.meta.url),'utf8');
  const inspect=()=>JSON.parse(query(inspection));
  const initialInspection=inspect();
  const legacyRoutines=report=>report.routines.filter(r=>!r.added_by_proposal);
  await t.test('read-only inspection records hashes without exposing purchase or student values',()=>{
    assert.equal(initialInspection.transaction_read_only,'on');
    assert.equal(initialInspection.canonical_column_present,false);
    assert.equal(initialInspection.canonical_view_present,false);
    assert(initialInspection.routines.filter(r=>r.added_by_proposal).every(r=>!r.present));
    assert.doesNotMatch(JSON.stringify(initialInspection),new RegExp([alice,bob,admin,'same-payment','synthetic-'].join('|')));
    assert.equal(snapshot(),before);
  });
  await t.test('an incompatible existing view rolls back the entire forward transaction',()=>{
    query('create view public.v2_canonical_products as select 1 as incompatible');
    rejects(proposal(),/already exists/);
    assert.equal(query("select count(*) from information_schema.columns where table_schema='public' and table_name='v2_products' and column_name='canonical_code'"),'0');
    assert.equal(snapshot(),before);
    query('drop view public.v2_canonical_products');
  });
  await t.test('expansion preserves all legacy product, price, purchase, grant and profile values',()=>{
    query(proposal()); assert.equal(snapshot(),before);
    const after=inspect();
    assert.equal(after.canonical_column_present,true);assert.equal(after.canonical_view_present,true);
    assert.deepEqual(after.ledger,initialInspection.ledger);
    assert.deepEqual(legacyRoutines(after),legacyRoutines(initialInspection));
    assert.deepEqual(after.routines.find(r=>r.signature.startsWith('public.grant_v2_course_purchase')).execute_roles,['service_role']);
    assert.equal(after.routines.find(r=>r.signature.startsWith('public.v2_contract_ledger_codes')).execute_roles,null);
    assert.equal(createHash('sha256').update(readFileSync(new URL('../supabase/migrations/20261018090000_add_v2_product_entitlements.sql',import.meta.url))).digest('hex'),'ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7');
  });
  await t.test('canonical catalogue uses approved names and retains sales visibility policy',()=>{
    const catalogue=JSON.parse(query(as('anon',null,'select jsonb_agg(v order by code) from public.v2_canonical_products v')));
    assert.deepEqual(catalogue.map(p=>p.code),['di','full_course','quant','verbal']);
    assert.deepEqual(catalogue.map(p=>p.name),['DI','Full Course','Quant','Verbal']);
    assert.doesNotMatch(JSON.stringify(catalogue),/crash|full_batch/);
    query("update public.v2_products set available_for_purchase=false where code='di_crash'");
    assert.equal(query(as('anon',null,'select count(*) from public.v2_canonical_products')),'3');
    assert.equal(query(as('authenticated',admin,'select count(*) from public.v2_canonical_products')),'4');
    rejects(as('anon',null,"select public.quote_v2_course_products(array['di'])"),/unavailable/);
    query("update public.v2_products set available_for_purchase=true where code='di_crash'");
  });
  await t.test('all eight valid quotes preserve price versions and amounts; invalid aliases fail closed',()=>{
    const mapping={quant:'quant_crash',verbal:'verbal_crash',di:'di_crash',full_course:'full_batch'};
    for(const codes of [['quant'],['verbal'],['di'],['quant','verbal'],['quant','di'],['verbal','di'],['quant','verbal','di'],['full_course']]){
      const arr=values=>`array[${values.map(c=>`'${c}'`).join(',')}]`;
      const modern=JSON.parse(query(as('anon',null,`select public.quote_v2_course_products(${arr(codes)})`)));
      const old=JSON.parse(query(as('anon',null,`select public.quote_v2_products(${arr(codes.map(c=>mapping[c]))})`)));
      assert.equal(modern.price_version_id,old.price_version_id);assert.equal(modern.amount_paise,old.amount_paise);
      assert.deepEqual([...modern.product_codes].sort(),[...codes].sort());
    }
    for(const selection of ["null","array[]::text[]","array['quant',null]","array['quant','quant']","array['quant_crash']","array['quant','full_course']","array[['quant','di']]"])
      rejects(as('anon',null,`select public.quote_v2_course_products(${selection})`),/Select Full Course/);
  });
  await t.test('canonical and legacy replay return the identical purchase without duplicating grants',()=>{
    assert.equal(query(as('service_role',null,grant('grant_v2_course_purchase',"'quant'"))),originalId);
    assert.equal(snapshot(),before);
    rejects(as('service_role',null,grant('grant_v2_course_purchase',"'di'")),/different grant/);
    rejects(as('service_role',null,grant('grant_v2_course_purchase',"'quant'",'bad-price',alice,2,1)),/does not match/);
  });
  await t.test('authorization, subject scope, expiry and revocation stay delegated to Phase 1',()=>{
    const access=(id,code,section='null')=>query(as('authenticated',id,`select public.can_access_v2_course_product('${code}',${section})`));
    assert.equal(access(alice,'quant',"'quant'"),'t'); assert.equal(access(bob,'quant'),'f');
    assert.equal(access(alice,'full_course'),'f');assert.equal(access(alice,'quant',"'verbal'"),'f');assert.equal(access(alice,'quant_crash'),'f');
    const old=JSON.parse(query(as('authenticated',alice,'select public.get_my_v2_access()')));
    const modern=JSON.parse(query(as('authenticated',alice,'select public.get_my_v2_course_access()')));
    assert.deepEqual(modern,old.map(x=>({...x,product_code:'quant'})));
    query(`update public.profiles set is_active=false where id='${alice}'`);assert.equal(access(alice,'quant'),'f');
    query(`update public.profiles set is_active=true where id='${alice}'`);
    query(`update public.v2_purchases set revoked_at=now() where id='${originalId}'`);assert.equal(access(alice,'quant'),'f');
    query(`update public.v2_purchases set revoked_at=null,confirmed_at=now()-interval '7 months' where id='${originalId}'`);assert.equal(access(alice,'quant'),'f');
    query(`update public.v2_purchases set confirmed_at='${confirmed}' where id='${originalId}'`);
    assert.equal(snapshot(),before);
  });
  await t.test('three individual offerings do not grant Full Course and private helpers remain inaccessible',()=>{
    query(as('service_role',null,grant('grant_v2_course_purchase',"'quant','verbal','di'",'three-individual',bob,4,2500000)));
    assert.equal(query(as('authenticated',bob,"select public.can_access_v2_course_product('full_course')")),'f');
    for(const role of ['anon','authenticated','service_role'])
      rejects(as(role,alice,"select public.v2_contract_ledger_codes(array['quant'])"),/permission denied/);
    for(const role of ['anon','authenticated']) rejects(as(role,alice,grant('grant_v2_course_purchase',"'quant'",'forbidden')),/permission denied/);
    rejects(as('anon',null,'select public.get_my_v2_course_access()'),/permission denied/);
    rejects(as('authenticated',alice,"update public.v2_canonical_products set available_for_purchase=false"),/permission denied/);
    rejects("update public.v2_price_versions set amount_paise=1",/immutable/);
  });
  await t.test('rollback preserves new canonical purchases and permits old payment retries',()=>{
    const preserved=snapshot();
    query('create view public.synthetic_contract_consumer as select * from public.v2_canonical_products');
    rejects(proposal('.rollback'),/depend on it/);
    assert.equal(query("select to_regprocedure('public.quote_v2_course_products(text[])') is not null"),'t');
    query('drop view public.synthetic_contract_consumer');
    query(proposal('.rollback'));assert.equal(snapshot(),preserved);
    assert.equal(query("select to_regclass('public.v2_canonical_products') is null"),'t');
    const replay=query(as('service_role',null,grant('grant_v2_purchase',"'quant_crash','verbal_crash','di_crash'",'three-individual',bob,4,2500000)));
    assert.match(replay,/^[a-f0-9-]{36}$/);assert.equal(snapshot(),preserved);
    query(proposal());assert.equal(snapshot(),preserved);
  });
  await t.test('Phase 2 enrollment and published course access survive compatibility expansion and rollback',()=>{
    // The proposal is present before Phase 2, exercising the intended rollout order.
    for (const file of ['20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
      '20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql',
      '20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql']) apply(file);
    const lit=value=>`'${String(value).replaceAll("'","''")}'`;
    const json=value=>`${lit(JSON.stringify(value))}::jsonb`;
    const adminQuery=sql=>query(as('authenticated',admin,sql));
    const content={materials:[],recordings:[{key:randomUUID(),title:'Shared session recording',url:'https://private.example.test/recording'}],preSessionReads:[],postSessionReads:[]};
    const templateId=randomUUID(),sessionKey=randomUUID();
    const document={title:'Quant curriculum',summary:'',durationDays:null,events:[],sessions:[{key:sessionKey,title:'Quant 4',section:'quant',content}]};
    adminQuery(`select public.save_v2_template_draft('${templateId}','quant',0,'${randomUUID()}',${json(document)})`);
    const createBatch=()=>{
      const request={id:randomUUID(),templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Independent Quant batch',startDate:'',timeZone:'Asia/Kolkata',events:null};
      const preview=JSON.parse(adminQuery(`select public.preview_v2_batch_draft(${json(request)})`));
      const batch=JSON.parse(adminQuery(`select public.save_v2_batch_draft(${json(request)},${lit(preview.fingerprint)})`)).draft;
      const publication={batchId:batch.id,batchRevision:batch.revision,expectedRevision:0,requestId:randomUUID(),action:'publish'};
      const review=JSON.parse(adminQuery(`select public.preview_v2_batch_publication(${json(publication)})`));
      adminQuery(`select public.save_v2_batch_publication(${json(publication)},${lit(review.fingerprint)})`);
      return batch;
    };
    const batch=createBatch(),otherBatch=createBatch();
    const read=user=>JSON.parse(query(as('authenticated',user,'select public.get_my_v2_batch_schedules()')));
    assert.deepEqual(read(alice),[]);assert.deepEqual(read(bob),[]);
    // Alice has an old-contract grant; Bob has a canonical-contract grant.
    adminQuery(`select public.set_v2_batch_enrollment('${batch.id}','${alice}',true,0)`);
    adminQuery(`select public.set_v2_batch_enrollment('${otherBatch.id}','${bob}',true,0)`);
    const first=read(alice),second=read(bob);
    assert.deepEqual(first.map(b=>b.batchId),[batch.id]);assert.deepEqual(second.map(b=>b.batchId),[otherBatch.id]);
    assert.deepEqual(first[0].sessions,[{key:sessionKey,title:'Quant 4',section:'quant'}]);
    assert.doesNotMatch(JSON.stringify(first),/private.example|recording|crash/);
    assert.equal(query("select count(*) from public.v2_course_offerings o join public.v2_products p on p.code=o.entitlement_product_code where o.code=p.canonical_code"),'4');
    const ledgerBefore=snapshot();
    const tables=['v2_course_offerings','v2_course_templates','v2_course_template_revisions','v2_course_batches','v2_course_batch_revisions','v2_batch_publication_revisions','v2_batch_enrollments'];
    const phase2State=()=>tables.map(table=>query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${table} t`));
    const phase2Before=phase2State();
    query(proposal('.rollback'));
    assert.equal(snapshot(),ledgerBefore);assert.deepEqual(phase2State(),phase2Before);
    assert.deepEqual(read(alice),first);assert.deepEqual(read(bob),second);
    assert.deepEqual(legacyRoutines(inspect()),legacyRoutines(initialInspection));
    // Also exercises expansion after a Phase 2 installation, without touching its data.
    query(proposal());
    assert.equal(snapshot(),ledgerBefore);assert.deepEqual(phase2State(),phase2Before);
    assert.deepEqual(read(alice),first);assert.deepEqual(read(bob),second);
    query(`update public.v2_purchases set revoked_at=now() where student_id='${bob}'`);
    assert.deepEqual(read(bob),[]);assert.deepEqual(read(alice),first);
  });

}));
