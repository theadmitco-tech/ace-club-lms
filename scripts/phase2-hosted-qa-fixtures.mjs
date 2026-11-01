import { randomUUID } from 'node:crypto';
import { PROJECT, UUID, check, literal } from './phase1-hosted-closeout-config.mjs';
export const QA_CASES=[
  {label:'admin',role:'admin',products:[]},{label:'eligible',products:['quant_crash']},{label:'full',products:['full_batch']},
  {label:'unregistered',products:['quant_crash']},{label:'expired',products:['quant_crash']},{label:'revoked',products:['quant_crash']},
  {label:'inactive',products:['quant_crash']},{label:'wrong_subject',products:['di_crash']},{label:'empty',products:[]},
];
const json=value=>`${literal(JSON.stringify(value))}::jsonb`;
export function createQaCoursePlan(){
  return ['quant','verbal','di','full_course','quant_draft'].map(label=>{
    const product=label==='quant_draft'?'quant':label,section=product==='full_course'?'quant':product;
    const content=Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:`QA exact ${kind} title`,url:`https://example.test/phase2/${kind}`}]]));
    const sessions=[{key:randomUUID(),title:`QA ${label} session`,section,content}];
    if(product==='full_course')sessions.push({key:randomUUID(),title:'QA programme introduction',section:'programme',content});
    const live=label==='quant';
    return {label,product,templateId:randomUUID(),batchId:randomUUID(),eventKey:randomUUID(),published:label!=='quant_draft',document:{title:`Phase 2 QA ${label}`,summary:'Synthetic acceptance fixture',durationDays:live?1:null,sessions,events:[]},live};
  }).map(p=>({...p,document:{...p.document,events:p.live?[{key:p.eventKey,title:'QA live class',section:'quant',kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}]:[]}}));
}
function validate(state){
  check(state.project===PROJECT&&UUID.test(state.runId),'Invalid staging QA run.');
  check(state.users.length===QA_CASES.length&&new Set(state.users.map(u=>u.id)).size===QA_CASES.length,'Incomplete QA users.');
  for(const c of QA_CASES){const u=state.users.find(u=>u.label===c.label);check(u&&UUID.test(u.id)&&u.email===`ace-p2-${c.label}-${state.runId}@example.invalid`,'QA identity mismatch.');}
  check(state.courses.length===5&&state.courses.every(c=>UUID.test(c.batchId)&&UUID.test(c.templateId)&&UUID.test(c.eventKey)),'Invalid course fixture scope.');
}
const user=(state,label)=>state.users.find(u=>u.label===label);
const purchasePlan=state=>QA_CASES.filter(c=>c.products.length).map(c=>({...c,userId:user(state,c.label).id,reference:`phase2-qa:${state.runId}:${c.label}`}));
function header(state){
  validate(state);
  return `-- STAGING ONLY: https://supabase.com/dashboard/project/${PROJECT}/sql/new
-- The dashboard project must match the staging project before execution.
-- Exact generated QA accounts and IDs only; no existing records are fixture targets.
begin;
set local statement_timeout='60s';
set local lock_timeout='3s';
create temporary table phase2_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase2_qa_users values ${state.users.map(u=>`(${literal(u.label)},${literal(u.id)}::uuid,${literal(u.email)})`).join(',\n')};
create temporary table phase2_qa_courses(label text primary key,template_id uuid unique,batch_id uuid unique) on commit drop;
insert into phase2_qa_courses values ${state.courses.map(c=>`(${literal(c.label)},${literal(c.templateId)}::uuid,${literal(c.batchId)}::uuid)`).join(',\n')};
do $$ begin
 if (select count(*) from phase2_qa_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase2_qa_run'=${literal(state.runId)})<>${QA_CASES.length}
 then raise exception 'QA account ownership mismatch'; end if;
 if (select count(*) from phase2_qa_users q join public.profiles p on p.id=q.id and p.email=q.email and p.role=case when q.label='admin' then 'admin' else 'student' end)<>${QA_CASES.length}
 then raise exception 'QA profile ownership mismatch'; end if;
end $$;
create or replace function pg_temp.phase2_public_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; hashes text:=''; n integer:=0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then
   select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in (select id from phase2_qa_users);
  else
   execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;
  end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'excluded_generated_profiles',${QA_CASES.length});
end $$;
`;
}
export function buildPhase2SetupSql(state){
  const admin=user(state,'admin').id,quant=state.courses.find(c=>c.label==='quant'),full=state.courses.find(c=>c.label==='full_course'),di=state.courses.find(c=>c.label==='di');
  const purchases=purchasePlan(state).map(c=>`perform public.grant_v2_purchase('${c.userId}',array[${c.products.map(literal).join(',')}],${literal(c.reference)},statement_timestamp()-interval '1 second',(public.quote_v2_products(array[${c.products.map(literal).join(',')}])->>'price_version_id')::uuid,(public.quote_v2_products(array[${c.products.map(literal).join(',')}])->>'amount_paise')::integer,'INR');`).join('\n');
  const authoring=state.courses.map(c=>{
    const batch={id:c.batchId,templateId:c.templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:`Phase 2 QA ${c.label} batch`,startDate:c.live?'2026-11-10':'',timeZone:'Asia/Kolkata',events:null};
    const publish={batchId:c.batchId,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
    const meeting={batchId:c.batchId,batchRevision:1,expectedRevision:0,requestId:randomUUID(),links:[{key:c.eventKey,url:'https://meet.google.com/abc-defg-hij'}]};
    return `perform public.save_v2_template_draft('${c.templateId}',${literal(c.product)},0,'${randomUUID()}',${json(c.document)});
 v_request:=${json(batch)};v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 ${c.live?`perform public.save_v2_meeting_draft(${json(meeting)});`:''}
 ${c.published?`v_request:=${json(publish)};v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');`:''}`;
  }).join('\n');
  const enrollments=['eligible','unregistered','expired','revoked','inactive'].map(label=>`perform public.set_v2_batch_enrollment('${quant.batchId}','${user(state,label).id}',true,0);
 ${label!=='unregistered'?`perform public.set_v2_live_registration('${quant.batchId}','${user(state,label).id}',true,0);`:''}`).join('\n');
  return header(state)+`
create temporary table phase2_qa_baseline on commit drop as select pg_temp.phase2_public_fingerprint() fingerprint;
do $$ declare v_request jsonb;v_preview jsonb;begin
 if exists(select 1 from public.v2_course_templates t join phase2_qa_courses q on q.template_id=t.id)
 or exists(select 1 from public.v2_purchases p join phase2_qa_users q on q.id=p.student_id)
 then raise exception 'QA fixtures already exist; setup must not repeat'; end if;
 ${purchases}
 perform set_config('request.jwt.claim.sub','${admin}',true);
 ${authoring}
 ${enrollments}
 perform public.set_v2_batch_enrollment('${full.batchId}','${user(state,'full').id}',true,0);
 perform public.set_v2_batch_enrollment('${di.batchId}','${user(state,'wrong_subject').id}',true,0);
end $$;
update public.v2_purchases set confirmed_at=statement_timestamp()-interval '7 months' where student_id='${user(state,'expired').id}' and payment_reference=${literal(`phase2-qa:${state.runId}:expired`)};
update public.v2_purchases set revoked_at=statement_timestamp() where student_id='${user(state,'revoked').id}' and payment_reference=${literal(`phase2-qa:${state.runId}:revoked`)};
update public.profiles set is_active=false where id='${user(state,'inactive').id}';
select jsonb_build_object('check','phase2_qa_fixture_setup','run_id',${literal(state.runId)},'qa_accounts',${QA_CASES.length},'batches',5,'purchases',${purchasePlan(state).length},'baseline',(select fingerprint from phase2_qa_baseline));
commit;
`;
}
export function buildPhase2CleanupSql(state){
  const plan=purchasePlan(state),admin=user(state,'admin').id;
  const predicate=plan.map(p=>`(p.student_id='${p.userId}' and p.payment_reference=${literal(p.reference)})`).join(' or ');
  const expected=state.baseline?.md5??'REPLACE_WITH_SETUP_BASELINE_MD5';
  return header(state)+`
-- The exact baseline from setup is required before cleanup can commit.
do $$ begin
 if ${literal(expected)} !~ '^[0-9a-f]{32}$' then raise exception 'Recorded setup baseline required'; end if;
 if exists(select 1 from public.v2_course_template_revisions r join phase2_qa_courses q on q.template_id=r.template_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_course_batch_revisions r join phase2_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_batch_publication_revisions r join phase2_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'${admin}')
 then raise exception 'Fixture revisions have unexpected ownership'; end if;
 if exists(select 1 from public.v2_publication_scope_requests r,lateral jsonb_array_elements(r.result) d where r.actor_id='${admin}' and not exists(select 1 from phase2_qa_courses q where q.batch_id=(d->>'batchId')::uuid))
 then raise exception 'Publication scope contains non-fixture batches'; end if;
end $$;
delete from public.v2_publication_scope_requests where actor_id='${admin}';
delete from public.v2_live_registration_audit where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_live_registrations where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_live_class_completions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_published_meetings where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_enrollments where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_publication_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_meeting_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_batch_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_batches where id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_template_revisions where template_id in(select template_id from phase2_qa_courses);
delete from public.v2_course_templates where id in(select template_id from phase2_qa_courses);
delete from public.v2_product_grants g using public.v2_purchases p where g.purchase_id=p.id and (${predicate});
delete from public.v2_purchases p where ${predicate};
do $$ begin
 if pg_temp.phase2_public_fingerprint()->>'md5'<>${literal(expected)} then raise exception 'Existing public data fingerprint changed; cleanup rolled back'; end if;
end $$;
select jsonb_build_object('check','phase2_qa_fixture_cleanup','run_id',${literal(state.runId)},'baseline_restored',true,'fingerprint',pg_temp.phase2_public_fingerprint());
commit;
`;
}
