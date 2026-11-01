import { isV2ContentUrl } from '../src/lib/v2Templates.ts';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>{const h=digest(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const literal=value=>`'${String(value).replaceAll("'","''")}'`;
const empty=()=>({materials:[],recordings:[],preSessionReads:[],postSessionReads:[]});
const subjects={qa:'quant',va:'verbal',di:'di',programme:'programme'};
const approvedRecordings=['88678915-bb4a-4839-87ad-eb9cb77e2b29','0624af56-b3a7-4b45-a8c9-4660952967b0','b9fae72c-89df-4802-85c7-14b63cd5b905','e2ab8406-25be-4692-82e7-2d7284e8b95b'];
const labels={full_course:'Full Course',quant:'Quant',verbal:'Verbal',di:'DI'};

// This explicit mapping records the approved current Full Course reuse decision.
export function prepareApprovedMaterialImport(inventory){
 const template=inventory.course_templates.find(row=>row.id==='10000000-0000-4000-8000-000000000001');
 if(!template)throw new Error('Full Course source missing');
 const revision=inventory.course_template_revisions.find(row=>row.id===template.current_revision_id);
 const sections=inventory.course_template_sections.filter(row=>row.revision_id===template.current_revision_id);
 const events=inventory.course_template_events.filter(row=>row.revision_id===template.current_revision_id).sort((a,b)=>a.display_order-b.display_order||a.id.localeCompare(b.id));
 const resources=inventory.course_template_resources.filter(row=>row.revision_id===template.current_revision_id).sort((a,b)=>a.display_order-b.display_order||a.id.localeCompare(b.id));
 if(!revision||events.length!==30||resources.length!==15)throw new Error('Reviewed source inventory changed');
 const expected=new Map();const capture=(table,row)=>{if(!row)throw new Error('Missing source relation');expected.set(`${table}:${row.id}`,{table,row});return row;};
 capture('course_templates',template);capture('course_template_revisions',revision);sections.forEach(row=>capture('course_template_sections',row));events.forEach(row=>capture('course_template_events',row));
 const sectionOf=event=>subjects[sections.find(section=>section.id===event.section_id)?.section_key];
 if(events.some(event=>!sectionOf(event)))throw new Error('Unsupported source section');
 const templates=Object.keys(labels).map(productCode=>({id:id(['approved-material-template-2026-11-02',productCode]),productCode,revision:1,document:{
  title:labels[productCode],summary:'Course sessions and learning material.',durationDays:null,events:[],
  sessions:events.filter(event=>productCode==='full_course'||sectionOf(event)===productCode).map(event=>({key:id(['source-session',productCode,event.id]),title:event.title,section:sectionOf(event),content:empty()}))
 }}));
 const full=templates[0];full.document.sessions.push({key:id(['source-session','full_course','starter']),title:'Getting started',section:'programme',content:empty()});
 const assets=[],placements=[];
 function append(table,row,urlField,event,kind){
  capture(table,row);const assetId=id(['eyphkkginlgoaxflauog',table,row.id,urlField]);
  const source={table,id:row.id,rowHash:'0'.repeat(64),schemaHash:'0'.repeat(64)};
  assets.push({assetId,source,titleField:'title',urlField,title:row.title,url:row[urlField]});
  if(typeof row[urlField]!=='string'||!isV2ContentUrl(row[urlField]))throw new Error('Missing approved asset URL');
  for(const target of templates.filter(target=>target.productCode==='full_course'||(event&&sectionOf(event)===target.productCode))){
   const key=id(['source-session',target.productCode,event?.id??'starter']);const session=target.document.sessions.find(session=>session.key===key);
   if(!session)throw new Error('Missing mapped session');
   const itemId=id([assetId,target.id,key,kind]),position=session.content[kind].length;
   session.content[kind].push({key:itemId,title:row.title,url:row[urlField]});
   placements.push({assetId,itemId,source,target:{templateId:target.id,revision:1,sessionKey:key,contentKind:kind},position});
  }
 }
 for(const row of resources){
  const event=row.event_id?events.find(event=>event.id===row.event_id):null;
  if(row.resource_type==='starter'&&row.resource_scope==='template'&&!row.event_id)append('course_template_resources',row,row.notion_url?'notion_url':'file_url',null,'materials');
  else if(event&&['pre_read','worksheet'].includes(row.resource_type))append('course_template_resources',row,row.notion_url?'notion_url':'file_url',event,row.resource_type==='pre_read'?'preSessionReads':'materials');
  else throw new Error('Unreviewed source resource placement');
 }
 for(const recordingId of approvedRecordings){
  const row=inventory.materials.find(row=>row.id===recordingId);const session=capture('sessions',inventory.sessions.find(session=>session.id===row?.session_id));
  const event=events.find(event=>event.source_master_session_id===session.master_session_id);
  if(!event||!row?.video_url)throw new Error('Approved recording relation changed');
  append('materials',row,'video_url',event,'recordings');
 }
 const mappingReviewHash=digest({sourceRevision:template.current_revision_id,expected:[...expected.values()],templates,placements});
 const plan={format:'v2-content-transfer-plan-1',status:'draft_only',source:'eyphkkginlgoaxflauog',mappingReviewHash,assets,placements,
  drafts:templates.map(template=>({templateId:template.id,productCode:template.productCode,expectedRevision:1,sourceTemplateHash:digest(template),document:template.document}))};
 const initialTemplates=templates.map(template=>({...template,document:{...template.document,sessions:template.document.sessions.map(session=>({...session,content:empty()}))}}));
 const report={status:'operator_review_required',sourceProject:'eyphkkginlgoaxflauog',sourceRevision:template.current_revision_id,
  importId:id(['approved-material-import-2026-11-02',mappingReviewHash]),mappingReviewHash,sourceAssets:assets.length,placements:placements.length,
  courses:templates.map(template=>({productCode:template.productCode,templateId:template.id,sessions:template.document.sessions.length,
   placements:placements.filter(place=>place.target.templateId===template.id).length})),
  excludedRecordingIds:['29be7af0-b438-451c-9b22-798770de70f6'],imported:false,published:false};
 return {plan,initialTemplates,expected:[...expected.values()],report};
}

export function approvedMaterialImportSql(prepared,actorId){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(actorId))throw new Error('Exact Admin identity required');
 const {plan,initialTemplates,expected,report}=prepared;
 return `-- Private approved material-transfer packet; source records and URLs remain private.
-- The selected dashboard project must be verified as eyphkkginlgoaxflauog.
-- Existing batches, source materials and mocks remain unchanged; V2 drafts remain unpublished.
begin;
set local statement_timeout='60s'; set local lock_timeout='5s';
set local timezone='UTC'; set local datestyle='ISO, YMD'; set local intervalstyle='iso_8601';
set local extra_float_digits=3; set local bytea_output='hex';
select set_config('request.jwt.claim.sub',${literal(actorId)},true);
create temporary table import_result(report jsonb) on commit drop;
create function pg_temp.phase2_import_table_fingerprint(p_table oid) returns text language plpgsql as $fingerprint$
declare v_hash text;
begin
 execute format('select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]'')::text,''UTF8'')),''hex'') from %s r',p_table::regclass)
   into v_hash;
 return v_hash;
end;
$fingerprint$;
do $approved_import$
declare v_expected jsonb; v_actual jsonb; v_asset jsonb; v_assets jsonb:='[]'; v_hash text; v_schema text;
 v_template jsonb; v_plan jsonb:=${literal(JSON.stringify(plan))}::jsonb; v_before jsonb; v_after jsonb; v_table text;
begin
 if not public.is_portal_admin() then raise exception 'Selected identity must be an active Admin'; end if;
 for v_expected in select value from jsonb_array_elements(${literal(JSON.stringify(expected))}::jsonb) loop
   execute format('select to_jsonb(r) from public.%I r where id=$1 for share',v_expected->>'table') into v_actual using (v_expected#>>'{row,id}')::uuid;
   if v_actual is distinct from v_expected->'row' then raise exception 'Approved source snapshot changed; a new source review is required'; end if;
 end loop;
 select jsonb_object_agg(table_name,rows_hash) into v_before from (
   select c.relname as table_name,pg_temp.phase2_import_table_fingerprint(c.oid) as rows_hash
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname not like 'v2_%' or c.relname=any(array['v2_products','v2_price_versions','v2_purchases','v2_product_grants']))
 ) baseline;
 for v_template in select value from jsonb_array_elements(${literal(JSON.stringify(initialTemplates))}::jsonb) loop
   perform public.save_v2_template_draft((v_template->>'id')::uuid,v_template->>'productCode',0,
     (v_template->>'id')::uuid,v_template->'document');
 end loop;
 for v_asset in select value from jsonb_array_elements(v_plan->'assets') loop
   v_table:=v_asset#>>'{source,table}';
   execute format('select encode(sha256(convert_to(to_jsonb(r)::text,''UTF8'')),''hex'') from public.%I r where id=$1',v_table)
     into v_hash using (v_asset#>>'{source,id}')::uuid;
   select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull)
     order by a.attname)::text,'UTF8')),'hex') into v_schema from pg_attribute a where a.attrelid=to_regclass('public.'||v_table) and a.attnum>0 and not a.attisdropped;
   v_assets:=v_assets||jsonb_build_array(jsonb_set(jsonb_set(v_asset,'{source,rowHash}',to_jsonb(v_hash)),'{source,schemaHash}',to_jsonb(v_schema)));
   v_plan:=jsonb_set(v_plan,'{placements}',(select jsonb_agg(case when value->>'assetId'=v_asset->>'assetId' then
     jsonb_set(jsonb_set(value,'{source,rowHash}',to_jsonb(v_hash)),'{source,schemaHash}',to_jsonb(v_schema)) else value end)
     from jsonb_array_elements(v_plan->'placements')));
 end loop;
 v_plan:=jsonb_set(v_plan,'{assets}',v_assets);
 if not exists(select 1 from public.v2_content_imports where id=${literal(report.importId)}::uuid) then perform public.preview_v2_content_import(v_plan); end if;
 insert into import_result select public.apply_v2_content_import(${literal(report.importId)}::uuid,v_plan,encode(sha256(convert_to(v_plan::text,'UTF8')),'hex'));
 select jsonb_object_agg(table_name,rows_hash) into v_after from (
   select c.relname as table_name,pg_temp.phase2_import_table_fingerprint(c.oid) as rows_hash
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname not like 'v2_%' or c.relname=any(array['v2_products','v2_price_versions','v2_purchases','v2_product_grants']))
 ) baseline;
 if v_before is distinct from v_after then raise exception 'Legacy table preservation check failed'; end if;
 update import_result set report=report||jsonb_build_object('legacyPreserved',true,'legacyTableCount',(select count(*) from jsonb_object_keys(v_before)),
   'legacyFingerprint',encode(sha256(convert_to(v_after::text,'UTF8')),'hex'),'programmeSessionsFullCourseOnly',true);
end;
$approved_import$;
select report from import_result;
commit;
`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [sourcePath,actorId,output]=process.argv.slice(2);if(!sourcePath||!actorId||!output)throw new Error();
  const prepared=prepareApprovedMaterialImport(JSON.parse(readFileSync(sourcePath,'utf8')));
  mkdirSync(output,{mode:0o700});
  writeFileSync(`${output}/review.json`,JSON.stringify(prepared.report,null,2)+'\n',{flag:'wx',mode:0o600});
  writeFileSync(`${output}/plan-scaffold.private.json`,JSON.stringify(prepared.plan,null,2)+'\n',{flag:'wx',mode:0o600});
  writeFileSync(`${output}/import.private.sql`,approvedMaterialImportSql(prepared,actorId),{flag:'wx',mode:0o600});
  console.log(JSON.stringify(prepared.report,null,2));
 }catch{console.error('Preparation failed. Supply PRIVATE_SOURCE_INVENTORY EXACT_ADMIN_UUID NEW_PRIVATE_DIRECTORY.');process.exitCode=2;}
}
