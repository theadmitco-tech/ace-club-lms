import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const json=value=>`${literal(JSON.stringify(value))}::jsonb`;
const as=(actor,sql,role='authenticated')=>`begin; set local role ${role}; set local request.jwt.claim.sub=${literal(actor??'')}; ${sql}; commit;`;
const actor=randomUUID(),student=randomUUID(),inactive=randomUUID();

test('additive content imports preserve source data and publication boundaries',{timeout:120000},async t=>withDisposablePostgres(async({query,rejects,apply,concurrentQuery})=>{
 query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
 for(const migration of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
 '20260731110000_require_provisioned_portal_access.sql','20260731160000_align_master_course.sql',
 '20260817090845_add_versioned_course_templates.sql','20261018090000_add_v2_product_entitlements.sql',
 '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
 '20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261102100000_add_v2_programme_content.sql','20261102120000_add_v2_content_imports.sql']) apply(migration);
 query(`insert into auth.users(id,email) values('${actor}','import-admin@example.test'),('${student}','import-student@example.test'),('${inactive}','inactive-import-admin@example.test');
 update public.profiles set role='admin',is_active=true where id='${actor}';
 update public.profiles set role='student',is_active=true where id='${student}';
 update public.profiles set role='admin',is_active=false where id='${inactive}';`);
 const sourceId=randomUUID(),sessionId=query('select id from public.master_sessions limit 1');
 query(`insert into public.master_materials(id,master_session_id,type,title,notion_url) values('${sourceId}','${sessionId}','pre_read','Synthetic reading','https://example.test/reading');`);
 const source={table:'master_materials',id:sourceId,rowHash:query(`select encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex') from public.master_materials r where id='${sourceId}'`),
 schemaHash:query(`select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull) order by a.attname)::text,'UTF8')),'hex') from pg_attribute a where a.attrelid='public.master_materials'::regclass and a.attnum>0 and not a.attisdropped`)};
 const createTarget=()=>{
 const id=randomUUID(),key=randomUUID(),doc={title:'Synthetic course',summary:'',durationDays:null,events:[],sessions:[{key,title:'Synthetic session',section:'quant',content:{materials:[],recordings:[],preSessionReads:[],postSessionReads:[]}}]};
 query(as(actor,`select public.save_v2_template_draft('${id}','quant',0,'${randomUUID()}',${json(doc)})`));return {id,key,doc};};
 const assetId=randomUUID();
 const planFor=(target)=>{
 const itemId=randomUUID(),targetRef={templateId:target.id,revision:1,sessionKey:target.key,contentKind:'preSessionReads'},document=structuredClone(target.doc);
 document.sessions[0].content.preSessionReads.push({key:itemId,title:'Synthetic reading',url:'https://example.test/reading'});
 return {format:'v2-content-transfer-plan-1',status:'draft_only',source:'synthetic-local',mappingReviewHash:'a'.repeat(64),
 assets:[{assetId,source,titleField:'title',urlField:'notion_url',title:'Synthetic reading',url:'https://example.test/reading'}],
 placements:[{assetId,itemId,source,target:targetRef,position:0}],drafts:[{templateId:target.id,productCode:'quant',expectedRevision:1,sourceTemplateHash:'b'.repeat(64),document}]};};
 const target=createTarget(),plan=planFor(target),importId=randomUUID();
 const fingerprint=p=>query(`select encode(sha256(convert_to(${json(p)}::text,'UTF8')),'hex')`);
 const preview=p=>`select public.preview_v2_content_import(${json(p)})`;
 const execute=(p,id=importId)=>`select public.apply_v2_content_import('${id}',${json(p)},'${fingerprint(p)}')`;
 const sourceBefore=query(`select to_jsonb(r) from public.master_materials r where id='${sourceId}'`);
 await t.test('Student, inactive Admin, anonymous and service roles cannot import or read registry',()=>{
 for(const [user,role] of [[student,'authenticated'],[inactive,'authenticated'],[null,'anon'],[actor,'service_role']]){
 rejects(as(user,preview(plan),role),/permission denied|Active Admin/);
 rejects(as(user,'select public.list_v2_content_import_workspace()',role),/permission denied|Active Admin/);
 rejects(as(user,execute(plan),role),/permission denied|Active Admin/);
 rejects(as(user,`select public.recover_v2_content_import('${importId}')`,role),/permission denied|Active Admin/);
 }
 for(const role of ['anon','authenticated','service_role'])for(const table of ['v2_shared_content_assets','v2_content_imports','v2_content_asset_placements','v2_shared_content_asset_revisions','v2_content_asset_replacements']){
 assert.equal(query(`select has_table_privilege('${role}','public.${table}','INSERT,UPDATE,DELETE')`),'f');
 }
 assert.equal(query(as(student,'select count(*) from public.v2_shared_content_assets')),'0');
 });
 await t.test('programme sessions remain Full Course-only and private file paths remain restricted',()=>{
 const document={title:'Programme outline',summary:'',durationDays:null,events:[],sessions:[{key:randomUUID(),title:'Getting started',section:'programme',content:{materials:[],recordings:[],preSessionReads:[],postSessionReads:[]}}]};
 query(as(actor,`select public.save_v2_template_draft('${randomUUID()}','full_course',0,'${randomUUID()}',${json(document)})`));
 rejects(as(actor,`select public.save_v2_template_draft('${randomUUID()}','quant',0,'${randomUUID()}',${json(document)})`),/Invalid template/);
 const content=document.sessions[0].content;content.materials.push({key:randomUUID(),title:'Protected worksheet',url:`/api/materials/file?path=worksheets%2F${randomUUID()}%2F${randomUUID()}.pdf`});
 query(as(actor,`select public.save_v2_template_draft('${randomUUID()}','full_course',0,'${randomUUID()}',${json(document)})`));
 content.materials[0].url+='&path=private';
 rejects(as(actor,`select public.save_v2_template_draft('${randomUUID()}','full_course',0,'${randomUUID()}',${json(document)})`),/Invalid template/);
 });
 await t.test('source revisions, schema and target revisions fail closed',()=>{
 for(const mutate of [p=>p.assets[0].source.rowHash='f'.repeat(64),p=>p.assets[0].source.schemaHash='f'.repeat(64),p=>p.drafts[0].expectedRevision=2,
 p=>p.assets[0].url='https://example.test/wrong',p=>p.drafts[0].document.title='Replacement',p=>p.placements[0].position=3]){
 const bad=structuredClone(plan);mutate(bad);rejects(as(actor,preview(bad)),/changed|match|preserve|placement/);
 }
 });
 await t.test('review is read-only and concurrent retries create exactly one import',async()=>{
 const review=JSON.parse(query(as(actor,preview(plan))));assert.equal(review.published,false);assert.equal(review.assets,1);
 assert.equal(query('select count(*) from public.v2_content_imports'),'0');
 const results=await Promise.all([concurrentQuery(as(actor,execute(plan))),concurrentQuery(as(actor,execute(plan)))]);
 assert.deepEqual(results.map(r=>JSON.parse(r).replayed).sort(),[false,true]);
 assert.equal(query('select count(*) from public.v2_shared_content_assets'),'1');
 assert.equal(query('select count(*) from public.v2_content_imports'),'1');
 assert.equal(query('select count(*) from public.v2_course_batches'),'0');
 assert.equal(query(`select latest_revision from public.v2_course_templates where id='${target.id}'`),'2');
 assert.equal(query(`select to_jsonb(r) from public.master_materials r where id='${sourceId}'`),sourceBefore);
 assert.equal(query(as(student,'select count(*) from public.v2_content_asset_placements')),'0');
 });
 await t.test('a second destination reuses one immutable shared asset',()=>{
 const other=createTarget(),p=planFor(other);query(as(actor,execute(p,randomUUID())));
 assert.equal(query('select count(*) from public.v2_shared_content_assets'),'1');
 assert.equal(query('select count(*) from public.v2_content_asset_placements'),'2');
 });
 await t.test('recovery appends a restoring revision and retains audit and assets',()=>{
 const result=JSON.parse(query(as(actor,`select public.recover_v2_content_import('${importId}')`)));assert.equal(result.recovered,true);
 assert.equal(query(`select latest_revision from public.v2_course_templates where id='${target.id}'`),'3');
 assert.deepEqual(JSON.parse(query(`select document from public.v2_course_template_revisions where template_id='${target.id}' and revision=3`)),target.doc);
 assert.equal(query('select count(*) from public.v2_shared_content_assets'),'1');
 assert.equal(query('select count(*) from public.v2_content_imports'),'2');
 assert.equal(JSON.parse(query(as(actor,`select public.recover_v2_content_import('${importId}')`))).replayed,true);
 rejects(as(actor,execute(plan)),/another operation/);
 });
 await t.test('recovery rejects intervening edits and cannot overwrite them',()=>{
 const destination=createTarget(),p=planFor(destination),id=randomUUID();query(as(actor,execute(p,id)));
 const updated=structuredClone(p.drafts[0].document);updated.summary='Later reviewed change';
 query(as(actor,`select public.save_v2_template_draft('${destination.id}','quant',2,'${randomUUID()}',${json(updated)})`));
 rejects(as(actor,`select public.recover_v2_content_import('${id}')`),/changed after import/);
 assert.equal(query(`select document->>'summary' from public.v2_course_template_revisions where template_id='${destination.id}' and revision=3`),'Later reviewed change');
 });
 await t.test('shared recording replacement previews exact scope, preserves unselected drafts and rejects stale review',async()=>{
 const first=createTarget(),second=createTarget();
 query(as(actor,execute(planFor(first),randomUUID())));query(as(actor,execute(planFor(second),randomUUID())));
 const request={assetId,title:'Reviewed replacement',url:'https://example.test/new-recording',templateIds:[first.id]};
 const previewSql=`select public.preview_v2_asset_replacement(${json(request)})`;
 rejects(as(student,previewSql),/Active Admin/);
 const reviewed=JSON.parse(query(as(actor,previewSql)));assert.equal(reviewed.scope.length,1);assert.equal(reviewed.scope[0].items,1);
 const replacementId=randomUUID(),applySql=`select public.apply_v2_asset_replacement('${replacementId}',${json(request)},'${reviewed.fingerprint}')`;
 const results=await Promise.all([concurrentQuery(as(actor,applySql)),concurrentQuery(as(actor,applySql))]);
 assert.deepEqual(results.map(result=>JSON.parse(result).replayed).sort(),[false,true]);
 assert.equal(query(`select document#>>'{sessions,0,content,preSessionReads,0,url}' from public.v2_course_template_revisions where template_id='${first.id}' and revision=3`),request.url);
 assert.equal(query(`select latest_revision from public.v2_course_templates where id='${second.id}'`),'2');
 assert.equal(query(`select document#>>'{sessions,0,content,preSessionReads,0,url}' from public.v2_course_template_revisions where template_id='${second.id}' and revision=2`),'https://example.test/reading');
 assert.equal(query(`select url from public.v2_shared_content_asset_revisions where asset_id='${assetId}' and revision=1`),'https://example.test/reading');
 assert.equal(query('select count(*) from public.v2_course_batches'),'0');
 const stale=JSON.parse(query(as(actor,previewSql)));
 const changed=JSON.parse(query(`select document from public.v2_course_template_revisions where template_id='${first.id}' and revision=3`));changed.summary='Intervening change';
 query(as(actor,`select public.save_v2_template_draft('${first.id}','quant',3,'${randomUUID()}',${json(changed)})`));
 rejects(as(actor,`select public.apply_v2_asset_replacement('${randomUUID()}',${json(request)},'${stale.fingerprint}')`),/scope changed/);
 });
}));
