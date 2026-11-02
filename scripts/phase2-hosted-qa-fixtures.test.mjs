import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { QA_CASES,createQaCoursePlan,buildPhase2SetupSql,buildPhase2CleanupSql } from './phase2-hosted-qa-fixtures.mjs';
import { literal,PROJECT } from './phase1-hosted-closeout-config.mjs';

for(const withReal of [false,true])test(`hosted QA setup and cleanup preserve the baseline${withReal?' including an existing published course':''}`,{timeout:120000},async()=>withDisposablePostgres(async({query,apply,rejects})=>{
  query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
  create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
  alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
  alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for(const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql',
  '20261018090000_add_v2_product_entitlements.sql','20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql','20261019110000_add_v2_private_meeting_drafts.sql',
  '20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql',
  '20261102100000_add_v2_programme_content.sql','20261102110000_add_v2_student_delivery.sql','20261102120000_add_v2_content_imports.sql','20261102130000_add_v2_publication_scopes.sql'])apply(file);
  const runId=randomUUID(),state={runId,project:PROJECT,users:QA_CASES.map(c=>({label:c.label,id:randomUUID(),email:`ace-p2-${c.label}-${runId}@example.invalid`})),courses:createQaCoursePlan()};
  for(const u of state.users){query(`insert into auth.users(id,email,raw_user_meta_data) values('${u.id}',${literal(u.email)},${literal(JSON.stringify({phase2_qa_run:runId,full_name:`Phase 2 QA ${u.label}`}))}::jsonb)`);query(`update public.profiles set is_active=true,role=${literal(u.label==='admin'?'admin':'student')} where id='${u.id}'`);}
  if(withReal){
    const operator=randomUUID(),templateId=randomUUID(),batchId=randomUUID();
    query(`insert into auth.users(id,email) values('${operator}','operator@example.test');update public.profiles set role='admin',is_active=true where id='${operator}'`);
    const v=value=>`${literal(JSON.stringify(value))}::jsonb`;
    const asOperator=sql=>`begin;set local role authenticated;set local request.jwt.claim.sub='${operator}';${sql};commit;`;
    const document={title:'Existing Full Course',summary:'',durationDays:null,events:[],sessions:[{key:randomUUID(),title:'Existing programme',section:'programme',content:{materials:[],recordings:[],preSessionReads:[],postSessionReads:[]}}]};
    query(asOperator(`select public.save_v2_template_draft('${templateId}','full_course',0,'${randomUUID()}',${v(document)})`));
    const request={id:batchId,templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Existing Full Course',startDate:'',timeZone:'Asia/Kolkata',events:null};
    const preview=JSON.parse(query(asOperator(`select public.preview_v2_batch_draft(${v(request)})`)));
    query(asOperator(`select public.save_v2_batch_draft(${v(request)},${literal(preview.fingerprint)})`));
    const publication={batchId,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
    const review=JSON.parse(query(asOperator(`select public.preview_v2_batch_publication(${v(publication)})`)));
    query(asOperator(`select public.save_v2_batch_publication(${v(publication)},${literal(review.fingerprint)})`));
    state.realFullCourseBatchId=batchId;state.realCourseReview={templateId,publicationRevision:1,batchRevision:1};
  }
  const setup=JSON.parse(query(buildPhase2SetupSql(state)));assert.equal(setup.qa_accounts,9);assert.equal(setup.batches,5);assert.equal(setup.purchases,7);assert.equal(setup.real_course_enrollments,withReal?1:0);
  if(withReal){
    const qaFull=state.users.find(u=>u.label==='full').id;
    assert.equal(query(`select count(*) from public.v2_batch_enrollments where batch_id='${state.realFullCourseBatchId}' and student_id='${qaFull}' and active`),'1');
  }
  rejects(buildPhase2SetupSql(state),/already exist/);
  rejects(buildPhase2CleanupSql(state),/Recorded setup baseline required/);
  state.baseline=setup.baseline;
  const admin=state.users.find(u=>u.label==='admin').id,student=state.users.find(u=>u.label==='eligible').id,quant=state.courses.find(c=>c.label==='quant');
  const asAdmin=sql=>`begin;set local role authenticated;set local request.jwt.claim.sub='${admin}';${sql};commit;`;
  const input={batchId:quant.batchId,batchRevision:1,expectedRevision:1,requestId:randomUUID(),action:'publish'};
  const value=v=>`${literal(JSON.stringify(v))}::jsonb`;
  const proposal=JSON.parse(query(asAdmin(`select public.preview_v2_batch_publication(${value(input)})`)));
  query(asAdmin(`select public.save_v2_meeting_draft(${value({batchId:quant.batchId,batchRevision:1,expectedRevision:1,requestId:randomUUID(),links:[{key:quant.eventKey,url:'https://meet.google.com/klm-nopq-rst'}]})})`));
  rejects(asAdmin(`select public.save_v2_batch_publication(${value(input)},${literal(proposal.fingerprint)})`),/Publication preview changed/);
  const reviewed=JSON.parse(query(asAdmin(`select public.preview_v2_batch_publication(${value(input)})`)));
  query(asAdmin(`select public.save_v2_batch_publication(${value(input)},${literal(reviewed.fingerprint)})`));
  const meeting=JSON.parse(query(`begin;set local role authenticated;set local request.jwt.claim.sub='${student}';select public.get_my_v2_meeting('${quant.batchId}','${quant.eventKey}');commit;`));
  assert.equal(meeting.url,'https://meet.google.com/klm-nopq-rst');
  query(`update public.v2_course_template_revisions set actor_id='${student}' where template_id='${quant.templateId}'`);
  rejects(buildPhase2CleanupSql(state),/unexpected ownership/);
  assert.equal(query('select count(*) from public.v2_course_batches'),withReal?'6':'5');
  query(`update public.v2_course_template_revisions set actor_id='${admin}' where template_id='${quant.templateId}'`);
  const cleanup=JSON.parse(query(buildPhase2CleanupSql(state)));assert.equal(cleanup.baseline_restored,true);assert.equal(cleanup.fingerprint.md5,state.baseline.md5);
  for(const table of ['v2_course_templates','v2_course_batches','v2_live_class_completions','v2_live_registrations','v2_published_meetings','v2_purchases'])assert.equal(query(`select count(*) from public.${table}`),withReal&&['v2_course_templates','v2_course_batches'].includes(table)?'1':'0');
  if(withReal)assert.equal(query(`select count(*) from public.v2_batch_enrollments where batch_id='${state.realFullCourseBatchId}'`),'0');
}));
