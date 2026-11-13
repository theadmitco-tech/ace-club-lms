import {bootstrapCandidate} from '../phase6/helpers.mjs';
import {randomUUID} from 'node:crypto';
export const literal=value=>`'${String(value).replaceAll("'","''")}'`;
export const json=value=>`${literal(JSON.stringify(value))}::jsonb`;
export const as=(id,sql,role='authenticated')=>`begin;set local role ${role};set local request.jwt.claim.sub=${literal(id??'')};${sql};commit;`;
export function preparePhase3Database(db){
 const {query,apply}=db;
 bootstrapCandidate(db);
 apply('20261103120000_fix_v2_integration_conflicts.sql');
 query("alter table auth.users add column raw_app_meta_data jsonb default '{}',add column email_confirmed_at timestamptz,add column created_at timestamptz default now()");
 const admin=randomUUID();query(`insert into auth.users(id,email) values('${admin}','phase3-admin@example.invalid');update public.profiles set role='admin',is_active=true where id='${admin}'`);
 function batch(product='quant',live=false){
  const templateId=randomUUID(),id=randomUUID(),sessionKey=randomUUID(),eventKey=randomUUID();
  const section=product==='full_course'?'quant':product;
  const content=Object.fromEntries(['materials','recordings','preSessionReads','postSessionReads'].map(kind=>[kind,[{key:randomUUID(),title:'Protected resource',url:'https://private.example.test/secret'}]]));
  const document={title:'Published subject',summary:'Private draft summary',durationDays:1,sessions:[{key:sessionKey,title:'Public outline heading',section,content}],events:live?[{key:eventKey,title:'Live class',section,kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}]:[]};
  query(as(admin,`select public.save_v2_template_draft('${templateId}','${product}',0,'${randomUUID()}',${json(document)})`));
  const request={id,templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Published '+product,startDate:live?'2027-01-10':'',timeZone:'Asia/Kolkata',events:null};
  const preview=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));
  query(as(admin,`select public.save_v2_batch_draft(${json(request)},${literal(preview.fingerprint)})`));
  return {id,templateId,sessionKey,eventKey,product,document};
 }
 function publish(b,revision=0,action='publish'){
  const input={batchId:b.id,batchRevision:1,expectedRevision:revision,requestId:randomUUID(),action};
  const preview=JSON.parse(query(as(admin,`select public.preview_v2_batch_publication(${json(input)})`)));
  query(as(admin,`select public.save_v2_batch_publication(${json(input)},${literal(preview.fingerprint)})`));
 }
 return {admin,batch,publish};
}
