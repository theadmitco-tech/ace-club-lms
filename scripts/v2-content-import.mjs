import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const literal=value=>`'${String(value).replaceAll("'","''")}'`;

export function contentImportSql(plan,actorId,importId) {
  if(!UUID.test(actorId)||!UUID.test(importId)||plan?.format!=='v2-content-transfer-plan-1'
    ||plan.status!=='draft_only'||!Array.isArray(plan.assets)||!Array.isArray(plan.drafts)||!Array.isArray(plan.placements)
    ||plan.assets.length===0||plan.drafts.length===0) throw new Error('A reviewed transfer plan and exact Admin identity are required.');
  const payload=literal(JSON.stringify(plan));
  return `-- Private operator packet. Source titles and asset URLs must remain outside version control.
-- The dashboard project must be verified as eyphkkginlgoaxflauog before execution.
-- Only unpublished destination revisions are added. Publication remains separate.
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';
set local timezone='UTC';
set local datestyle='ISO, YMD';
set local intervalstyle='iso_8601';
set local extra_float_digits=3;
set local bytea_output='hex';
select set_config('request.jwt.claim.sub',${literal(actorId)},true);
set local role authenticated;
select public.preview_v2_content_import(${payload}::jsonb) as reviewed_scope;
select public.apply_v2_content_import(${literal(importId)}::uuid,${payload}::jsonb,
  (public.preview_v2_content_import(${payload}::jsonb)->>'fingerprint')) as import_result;
commit;
`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [command,path,actorId,output,importId=randomUUID()]=process.argv.slice(2);
    if(command!=='sql'||!path||!output||process.argv.length>7||!statSync(path).isFile()||statSync(path).size>16*1024*1024)throw new Error('Invalid input');
    const plan=JSON.parse(readFileSync(path,'utf8'));
    writeFileSync(output,contentImportSql(plan,actorId,importId),{flag:'wx',mode:0o600});
    console.log(JSON.stringify({status:'operator_review_required',importId,templates:plan.drafts.length,
      assets:plan.assets.length,placements:plan.placements.length,imported:false,published:false}));
  }catch{
    console.error('Import packet preparation failed. Usage: sql PRIVATE_PLAN ADMIN_ID NEW_PRIVATE_SQL [IMPORT_ID].');
    process.exitCode=2;
  }
}
