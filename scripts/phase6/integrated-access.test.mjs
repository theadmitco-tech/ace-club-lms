import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {bootstrapCandidate} from './helpers.mjs';
import {literal} from '../phase1-hosted-closeout-config.mjs';

const report={check:'phase6_local_integrated_access',candidate:'879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d',repairMigration:'20261103120000',recordedAt:new Date().toISOString(),scope:'Disposable PostgreSQL, synthetic Auth and Storage catalogues, fixture-granted access; no provider payment or hosted acceptance.',status:'running',checks:[]};
const record=(id,pass)=>{report.checks.push({id,status:pass?'pass':'fail'});assert(pass,id);};
const j=value=>literal(JSON.stringify(value))+'::jsonb';
const subjects=['quant','verbal','di'];
const products=[['full_course','full_batch',subjects],['quant','quant_crash',['quant']],['verbal','verbal_crash',['verbal']],['di','di_crash',['di']]];
test('all four offerings retain entitlement, publication and feedback boundaries across Phases 1, 2, 4 and 5',{timeout:120000},async()=>{
 try{await withDisposablePostgres(async db=>{
  const {query,apply,rejects}=db;bootstrapCandidate(db);
  apply('20261103120000_fix_v2_integration_conflicts.sql');
  const as=(id,sql,readonly=false)=>`begin${readonly?' read only':''};set local role authenticated;set local request.jwt.claim.sub='${id}';${sql};commit;`;
  const rpc=(id,name,args,readonly=false)=>JSON.parse(query(as(id,`select public.${name}(${args})`,readonly))||'null');
  const identity=(role)=>{const id=randomUUID();query(`insert into auth.users(id,email) values('${id}','phase6-${id}@example.invalid');update public.profiles set role='${role}',is_active=true where id='${id}'`);return id;};
  const admin=identity('admin'),empty=identity('student'),cases=[];
  for(const [product,code,sections] of products){
   const student=identity('student'),template=randomUUID(),batch=randomUUID();
   const sessions=sections.flatMap(section=>[1,2].map(number=>({key:randomUUID(),title:`Synthetic ${section} ${number}`,section,content:Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:`Synthetic ${kind}`,url:`https://example.test/phase6/${section}/${number}/${kind}`}]]))})));
   const document={title:`Synthetic ${product}`,summary:'Local acceptance fixture',durationDays:8,sessions,events:[]};
   const quote=JSON.parse(query(`select public.quote_v2_products(array['${code}'])`));
   query(`select public.grant_v2_purchase('${student}',array['${code}'],'phase6-fixture:${student}',statement_timestamp()-interval '1 second','${quote.price_version_id}',${quote.amount_paise},'INR')`);
   rpc(admin,'save_v2_template_draft',`'${template}','${product}',0,'${randomUUID()}',${j(document)}`);
   query(as(admin,`do $$begin perform public.save_v2_template_draft('${template}','${product}',0,'${randomUUID()}',${j(document)});raise exception 'Stale template unexpectedly accepted';exception when sqlstate 'PT409' then null;end;$$`));
   record(`${product}:stale-template-bounded-conflict`,true);
   const request={id:batch,templateId:template,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:document.title,startDate:'',timeZone:'Asia/Kolkata',events:null};
   const preview=rpc(admin,'preview_v2_batch_draft',j(request));rpc(admin,'save_v2_batch_draft',`${j(request)},'${preview.fingerprint}'`);
   const pub={batchId:batch,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
   const scope=rpc(admin,'preview_v2_batch_publication',j(pub));rpc(admin,'save_v2_batch_publication',`${j(pub)},'${scope.fingerprint}'`);
   rpc(admin,'set_v2_batch_enrollment',`'${batch}','${student}',true,0`);
   query(as(admin,`do $$begin perform public.set_v2_batch_enrollment('${batch}','${student}',false,0);raise exception 'Stale enrollment unexpectedly accepted';exception when sqlstate 'PT409' then null;end;$$`));
   record(`${product}:stale-enrollment-bounded-conflict`,true);
   const delivered=rpc(student,'get_my_v2_published_course',`'${batch}'`,true);
   record(`${product}:recording-only-authorized`,delivered.sessions.length===sessions.length&&rpc(student,'get_my_v2_learning_state',`'${batch}'`,true).liveRegistered===false);
   record(`${product}:exact-subject-scope`,JSON.stringify([...new Set(delivered.sessions.map(s=>s.section))].sort())===JSON.stringify([...sections].sort()));
   cases.push({product,student,batch,sessions});
  }
  for(const c of cases)for(const other of cases.filter(x=>x!==c))record(`${c.product}:other-offering-${other.product}-denied`,rpc(c.student,'get_my_v2_published_course',`'${other.batch}'`,true)===null);
  const targets=cases.map(c=>({batchId:c.batch,sessionKey:c.sessions[0].key,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:10}));
  const item=randomUUID(),doc={title:'Shared independent reading',kind:'preSessionReads',url:'https://example.test/phase6/shared-reading',targets};
  rpc(admin,'save_v2_content_item',`'${item}',0,'${randomUUID()}',${j(doc)}`);
  const scope=rpc(admin,'v2_content_scope',`'${item}',1,'publish'`);record('universal-review-names-four-targets',scope.targets.length===4);
  rpc(admin,'publish_v2_content_item',`'${item}',1,'publish','${randomUUID()}','${scope.fingerprint}'`);
  for(const c of cases){
   const delivery=()=>rpc(c.student,'get_my_v2_published_course',`'${c.batch}'`,true);
   record(`${c.product}:independent-reading-delivered`,delivery().sessions[0].content.preSessionReads.some(r=>r.title===doc.title));
   const obligation=rpc(c.student,'report_v2_recording_watched',`'${c.batch}','${c.sessions[1].key}','${c.sessions[1].content.recordings[0].key}',1`);
   const locked=delivery();record(`${c.product}:same-subject-feedback-gate`,!locked.sessions.some(s=>s.key===c.sessions[0].key)&&locked.sessions.some(s=>s.key===c.sessions[1].key));
   if(c.product==='full_course')record('full-course:other-subjects-remain-accessible',subjects.slice(1).every(section=>locked.sessions.some(s=>s.section===section)));
   rejects(as(empty,`select public.submit_v2_session_feedback('${obligation.obligationId}','${randomUUID()}',${j({usefulness:4,clarity:5,comment:'Synthetic response',attendance:'recording'})})`),/unavailable|access|feedback/i);
   record(`${c.product}:foreign-feedback-denied`,true);
   rpc(c.student,'submit_v2_session_feedback',`'${obligation.obligationId}','${randomUUID()}',${j({usefulness:4,clarity:5,comment:'Synthetic response',attendance:'recording'})}`);
   query(as(c.student,`do $$begin perform public.submit_v2_session_feedback('${obligation.obligationId}','${randomUUID()}',${j({usefulness:4,clarity:5,comment:'Synthetic response',attendance:'recording'})});raise exception 'Conflicting feedback unexpectedly accepted';exception when sqlstate 'PT409' then null;end;$$`));
   record(`${c.product}:conflicting-feedback-bounded-conflict`,true);
   record(`${c.product}:feedback-restores-independent-reading`,delivery().sessions[0].content.preSessionReads.some(r=>r.title===doc.title));
   query(`update public.v2_purchases set revoked_at=statement_timestamp() where student_id='${c.student}'`);
   record(`${c.product}:revocation-denies-course-and-placements`,delivery()===null&&rpc(c.student,'get_my_v2_content_placements',`'${c.batch}'`,true).length===0);
  }
  const before=query("select count(*) from public.v2_learning_progress");
  const preview=rpc(admin,'read_v2_content_preview',`'${cases[0].batch}','${item}',1`,true);
  record('admin-preview-survives-student-revocation-without-progress-writes',preview.course.sessions.length===6&&query('select count(*) from public.v2_learning_progress')===before);
  const after=rpc(admin,'v2_content_scope',`'${item}',1,'publish'`);
  rpc(admin,'save_v2_content_item',`'${item}',1,'${randomUUID()}',${j({...doc,title:'Revised shared reading'})}`);
  query(as(admin,`do $$begin perform public.publish_v2_content_item('${item}',1,'publish','${randomUUID()}','${after.fingerprint}');raise exception 'Conflict unexpectedly accepted';exception when sqlstate 'PT409' then null;end;$$`));
  record('stale-independent-publication-returns-nonretryable-conflict',true);
 });report.status='passed';}catch(error){report.status='failed';throw error;}finally{
  report.testSourceSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
  writeFileSync('deliverables/phase6-staging-acceptance/local-integrated-results.json',JSON.stringify(report,null,2)+'\n');
 }
});
