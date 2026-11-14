import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {preparePhase3Database,as,literal,json} from '../helpers/v2-phase3-fixture.mjs';

const migrations=['20261113090000_add_v2_sales_catalogue.sql','20261113100000_add_v2_checkout_ledger.sql','20261113110000_add_v2_payment_fulfillment.sql'];
const report={check:'phase6_local_paid_integration',candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),recordedAt:new Date().toISOString(),scope:'Disposable local PostgreSQL with synthetic Google identities and trusted-service fulfillment inputs. No provider requests, hosted database writes, browser OAuth, or actual payment acceptance.',status:'running',checks:[]};
const record=(id,condition)=>{report.checks.push({id,status:condition?'pass':'fail'});assert(condition,id);};
const offerings=[['full_course','full_batch',['quant','verbal','di']],['quant','quant_crash',['quant']],['verbal','verbal_crash',['verbal']],['di','di_crash',['di']]];

test('fulfilled purchases across all offerings retain session gates, independent readings, expiry and isolation',{timeout:120000},async()=>{
 try{await withDisposablePostgres(async db=>{
  const {query,apply}=db,{admin}=preparePhase3Database(db);migrations.forEach(apply);
  const rpc=(id,name,args,role='authenticated')=>JSON.parse(query(as(id,`select public.${name}(${args})`,role))||'null');
  const cases=[];
  for(const [product,code,sections] of offerings){
   const student=randomUUID(),template=randomUUID(),batch=randomUUID();
   query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values(${literal(student)},${literal(student+'@example.invalid')},now(),'{}'::jsonb||jsonb_build_object('provider','google'))`);
   const sessions=sections.flatMap(section=>[1,2].map(number=>({key:randomUUID(),title:`Synthetic ${section} ${number}`,section,content:Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:`Synthetic ${kind}`,url:`https://example.test/integration/${section}/${number}/${kind}`}]]))})));
   const document={title:`Synthetic paid ${product}`,summary:'Local integrated acceptance fixture',durationDays:8,sessions,events:[]};
   rpc(admin,'save_v2_template_draft',`${literal(template)},${literal(product)},0,${literal(randomUUID())},${json(document)}`);
   const draft={id:batch,templateId:template,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:document.title,startDate:'',timeZone:'Asia/Kolkata',events:null};
   const draftPreview=rpc(admin,'preview_v2_batch_draft',json(draft));rpc(admin,'save_v2_batch_draft',`${json(draft)},${literal(draftPreview.fingerprint)}`);
   const publication={batchId:batch,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
   const publicationPreview=rpc(admin,'preview_v2_batch_publication',json(publication));rpc(admin,'save_v2_batch_publication',`${json(publication)},${literal(publicationPreview.fingerprint)}`);
   const checkout=rpc(student,'prepare_v2_checkout',`${literal(randomUUID())},array[${literal(code)}],array[${literal(batch)}]::uuid[],array[]::uuid[],'Synthetic Student','+919000000000',false`);
   const course=()=>rpc(student,'get_my_v2_published_course',literal(batch));
   record(`${product}:unpaid-course-denied`,course()===null);
   const order='order_'+checkout.id.replaceAll('-',''),payment='pay_'+checkout.id.replaceAll('-','');
   record(`${product}:service-order-claim`,query(as(null,`select public.claim_v2_checkout_order(${literal(checkout.id)})`,'service_role'))==='t');
   rpc(null,'attach_v2_checkout_order',`${literal(checkout.id)},${literal(order)}`,'service_role');
   const fulfillment=()=>rpc(null,'fulfill_v2_checkout',`${literal(checkout.id)},${literal(order)},${literal(payment)},${checkout.amountPaise},'INR'`,'service_role');
   record(`${product}:fulfillment-activates-and-enrolls`,fulfillment().state==='fulfilled'&&course()?.sessions.length===sessions.length);
   record(`${product}:fulfillment-replay-single-purchase`,fulfillment().replayed===true&&query(`select count(*) from public.v2_purchases where student_id=${literal(student)}`)==='1');
   const access=rpc(student,'get_my_v2_access','');
   record(`${product}:exact-subject-entitlement`,JSON.stringify([...new Set(access.flatMap(p=>p.sections))].sort())===JSON.stringify([...sections].sort()));
   record(`${product}:no-live-registration-invented`,rpc(student,'get_my_v2_learning_state',literal(batch)).liveRegistered===false);
   cases.push({product,student,batch,sessions,course});
  }
  for(const c of cases){
   record(`${c.product}:foreign-purchase-history-hidden`,JSON.stringify(rpc(c.student,'get_my_v2_purchase_packages','').map(p=>p.id))===JSON.stringify([query(`select id from public.v2_purchases where student_id=${literal(c.student)}`)]));
   record(`${c.product}:other-course-enrollment-denied`,cases.filter(other=>other!==c).every(other=>rpc(c.student,'get_my_v2_published_course',literal(other.batch))===null));
   const item=randomUUID(),doc={title:`Independent ${c.product} reading`,kind:'preSessionReads',url:'https://example.test/integration/independent',targets:[{batchId:c.batch,sessionKey:c.sessions[0].key,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:10}]};
   rpc(admin,'save_v2_content_item',`${literal(item)},0,${literal(randomUUID())},${json(doc)}`);
   const review=rpc(admin,'v2_content_scope',`${literal(item)},1,'publish'`);
   rpc(admin,'publish_v2_content_item',`${literal(item)},1,'publish',${literal(randomUUID())},${literal(review.fingerprint)}`);
   record(`${c.product}:independent-reading-delivered`,c.course().sessions[0].content.preSessionReads.some(r=>r.title===doc.title));
   const obligation=rpc(c.student,'report_v2_recording_watched',`${literal(c.batch)},${literal(c.sessions[1].key)},${literal(c.sessions[1].content.recordings[0].key)},1`);
   const gated=c.course();
   record(`${c.product}:pending-feedback-hides-sibling-session`,!gated.sessions.some(s=>s.key===c.sessions[0].key)&&gated.sessions.some(s=>s.key===c.sessions[1].key));
   if(c.product==='full_course')record('full_course:other-paid-subjects-remain-accessible',['verbal','di'].every(subject=>gated.sessions.some(s=>s.section===subject)));
   rpc(c.student,'submit_v2_session_feedback',`${literal(obligation.obligationId)},${literal(randomUUID())},${json({usefulness:4,clarity:5,comment:'Synthetic response',attendance:'recording'})}`);
   record(`${c.product}:confirmed-feedback-restores-reading`,c.course().sessions[0].content.preSessionReads.some(r=>r.title===doc.title));
   const immutable=query(`select to_jsonb(p)-'expires_at'-'confirmed_at' from public.v2_purchases p where student_id=${literal(c.student)}`);
   query(`update public.v2_purchases set confirmed_at=statement_timestamp()-interval '7 months' where student_id=${literal(c.student)}`);
   record(`${c.product}:expired-purchase-denies-course-and-resource-placement`,c.course()===null&&rpc(c.student,'get_my_v2_content_placements',literal(c.batch)).length===0);
   record(`${c.product}:expiry-retains-purchase-history`,rpc(c.student,'get_my_v2_purchase_packages','').length===0&&query(as(c.student,'select count(*) from public.v2_purchases'))==='1'&&query(`select to_jsonb(p)-'expires_at'-'confirmed_at' from public.v2_purchases p where student_id=${literal(c.student)}`)===immutable);
   const progress=query('select count(*) from public.v2_learning_progress');
   const preview=rpc(admin,'read_v2_content_preview',`${literal(c.batch)},${literal(item)},1`);
   record(`${c.product}:admin-preview-does-not-change-progress`,preview.course.sessions.length===c.sessions.length&&query('select count(*) from public.v2_learning_progress')===progress);
  }
 });report.status='passed';}catch(error){report.status='failed';throw error;}finally{
  report.testSourceSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
  report.paymentMigrationSha256=Object.fromEntries(migrations.map(name=>[name,createHash('sha256').update(readFileSync('supabase/migrations/'+name)).digest('hex')]));
  writeFileSync(join(process.env.PHASE6_REPORT_DIRECTORY??'deliverables/phase6-staging-acceptance','local-paid-integration-results.json'),JSON.stringify(report,null,2)+'\n');
 }
});
