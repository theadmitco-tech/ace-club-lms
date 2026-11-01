import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
const lit=value=>`'${String(value).replaceAll("'","''")}'`;
const json=value=>`${lit(JSON.stringify(value))}::jsonb`;
const admin=randomUUID(),student=randomUUID();
const as=(id,sql)=>`begin;set local role authenticated;set local request.jwt.claim.sub=${lit(id)};${sql};commit;`;
test('atomic cross-offering publication scopes', {timeout:120000},async t=>withDisposablePostgres(async ({query,apply,rejects,concurrentQuery})=>{
  query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for(const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
    '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
    '20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql',
    '20261020100000_add_v2_batch_publication.sql','20261102130000_add_v2_publication_scopes.sql'])apply(file);
  query(`insert into auth.users(id,email) values('${admin}','scope-admin@example.test'),('${student}','scope-student@example.test');
    update public.profiles set role='admin',is_active=true where id='${admin}';
    update public.profiles set role='student',is_active=true where id='${student}';`);
  const createBatch=(product,live=false)=>{
    const id=randomUUID(),template=randomUUID();
    query(as(admin,`select public.save_v2_template_draft('${template}',${lit(product)},0,'${randomUUID()}',${json({title:'Synthetic scope',summary:'',durationDays:live?7:null,sessions:[],events:live?[{key:randomUUID(),title:'Synthetic live class',section:product,kind:'live',dayOffset:0,localStartTime:'10:00',durationMinutes:60,capacity:8,instructor:''}]:[]})})`));
    const input={id,templateId:template,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:`Synthetic ${product}`,startDate:live?'2028-01-01':'',timeZone:'Asia/Kolkata',events:null};
    const review=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(input)})`)));
    return JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(input)},${lit(review.fingerprint)})`))).draft;
  };
  const q=createBatch('quant'),v=createBatch('verbal');createBatch('di');
  const request=(action='publish',productCodes=['quant','verbal'])=>({requestId:randomUUID(),action,productCodes});
  const preview=input=>JSON.parse(query(as(admin,`select public.preview_v2_publication_scope(${json(input)})`)));
  const sql=(input,fingerprint)=>`select public.save_v2_publication_scope(${json(input)},${lit(fingerprint)})`;
  const save=(input,review)=>JSON.parse(query(as(admin,sql(input,review.fingerprint))));
  const count=()=>query('select count(*) from public.v2_batch_publication_revisions');
  await t.test('scope derives all matching batches and excludes unselected offerings',()=>{
    const r=preview(request());assert.deepEqual(new Set(r.proposal.items.map(i=>i.document.batchId)),new Set([q.id,v.id]));
    assert.equal(count(),'0');
    assert.doesNotMatch(JSON.stringify(r),/meet.google|https:/);
  });
  await t.test('Student and anon cannot review, confirm or write scope history',()=>{
    const input=request();rejects(as(student,`select public.preview_v2_publication_scope(${json(input)})`),/Admin/);
    rejects(as(student,sql(input,'0'.repeat(32))),/Admin/);
    assert.equal(query(`select has_function_privilege('anon','public.preview_v2_publication_scope(jsonb)','execute')`),'f');
    assert.equal(query(`select has_table_privilege('authenticated','public.v2_publication_scope_requests','insert')`),'f');
    assert.equal(query(as(student,'select count(*) from public.v2_publication_scope_requests')),'0');
  });
  await t.test('a newly matching batch invalidates a reviewed scope without partial changes',()=>{
    const input=request(),review=preview(input);createBatch('quant');
    rejects(as(admin,sql(input,review.fingerprint)),/scope changed/);assert.equal(count(),'0');
  });
  await t.test('cross-offering publication is atomic and retries recover exact saved revisions',async()=>{
    const input=request(),review=preview(input);const results=await Promise.all([concurrentQuery(as(admin,sql(input,review.fingerprint))),concurrentQuery(as(admin,sql(input,review.fingerprint)))]);
    const parsed=results.map(value=>JSON.parse(value));assert.deepEqual(parsed.map(r=>r.replayed).sort(),[false,true]);
    assert.equal(parsed[0].documents.length,3);assert.equal(count(),'3');
    assert.equal(save(input,review).replayed,true);assert.equal(count(),'3');
    rejects(as(admin,sql({...input,action:'unpublish'},review.fingerprint)),/different scope/);
  });
  await t.test('competing review loses cleanly; unpublish and republish preserve history',()=>{
    const first=request(),second=request(),a=preview(first),b=preview(second);save(first,a);
    rejects(as(admin,sql(second,b.fingerprint)),/scope changed/);assert.equal(count(),'6');
    const off=request('unpublish');assert.ok(save(off,preview(off)).documents.every(d=>d.state==='unpublished'));assert.equal(count(),'9');
    const on=request();assert.ok(save(on,preview(on)).documents.every(d=>d.state==='published'));assert.equal(count(),'12');
  });
  await t.test('invalid scope and malformed request fail before any mutation',()=>{
    for(const input of [request('publish',[]),request('publish',['quant','quant']),request('publish',['unknown']),{...request(),extra:true}])assert.throws(()=>preview(input),/Invalid/);
    assert.equal(count(),'12');
  });
  await t.test('private meeting edits invalidate single and universal publication reviews',()=>{
    const batch=createBatch('di',true);
    const input={batchId:batch.id,batchRevision:batch.revision,expectedRevision:0,requestId:randomUUID(),action:'publish'};
    const single=JSON.parse(query(as(admin,`select public.preview_v2_batch_publication(${json(input)})`)));
    const scoped=request('publish',['di']),scope=preview(scoped);
    const meeting={batchId:batch.id,batchRevision:1,expectedRevision:0,requestId:randomUUID(),links:[{key:batch.events[0].key,url:'https://meet.google.com/aaa-bbbb-ccc'}]};
    query(as(admin,`select public.save_v2_meeting_draft(${json(meeting)})`));
    rejects(as(admin,`select public.save_v2_batch_publication(${json(input)},${lit(single.fingerprint)})`),/preview changed/);
    rejects(as(admin,sql(scoped,scope.fingerprint)),/scope changed/);
    assert.equal(count(),'12');
    assert.equal(save(scoped,preview(scoped)).documents.length,2);
  });
  await t.test('failure in any scoped insert rolls back the entire confirmation',()=>{
    const input=request(),review=preview(input),before=count();
    query(`create function public.scope_test_failure() returns trigger language plpgsql as $$begin if new.document->>'productCode'='verbal' then raise exception 'Synthetic insert failure';end if;return new;end;$$;
      create trigger scope_test_failure before insert on public.v2_batch_publication_revisions for each row execute function public.scope_test_failure();`);
    rejects(as(admin,sql(input,review.fingerprint)),/Synthetic insert failure/);
    assert.equal(count(),before);
    query('drop trigger scope_test_failure on public.v2_batch_publication_revisions;drop function public.scope_test_failure()');
    assert.equal(save(input,review).replayed,false);
  });
}));
