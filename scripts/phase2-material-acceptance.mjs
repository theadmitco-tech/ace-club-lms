import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { PROJECT, ORIGIN, check, readConfig } from './phase1-hosted-closeout-config.mjs';
import { OPERATOR_STATE, ownedOperator, readOperatorState } from './phase2-content-operator.mjs';
import { prepareApprovedMaterialImport } from './v2-approved-material-import.mjs';

const privateStatePath = '/tmp/ace-phase2-material-acceptance.private.json';
const inventoryPath = '/tmp/ace-phase2-source-inventory.private.json';
const outputPath = resolve('deliverables/phase2-preview-activation/evidence/material-acceptance-2026-11-02.json');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const id = value => { const h=digest(value); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const safe = (response, stage) => { check(!response.error, `${stage} failed; provider details withheld.`); return response.data; };
const safeRead = path => { const stat=lstatSync(path); check(stat.isFile() && !stat.isSymbolicLink() && stat.uid===process.getuid() && (stat.mode&0o077)===0,'The material state must remain in an owned private file.'); return JSON.parse(readFileSync(path,'utf8')); };
const rpc = async (client, name, args = {}) => safe(await client.rpc(name,args),name);

export function approvedBatchRequests(prepared) {
  const labels={full_course:'Full Course · Learning library',quant:'Quant · Learning library',verbal:'Verbal · Learning library',di:'DI · Learning library'};
  return prepared.plan.drafts.map(draft=>({id:id(['approved-library-batch',prepared.report.importId,draft.templateId]),templateId:draft.templateId,
    templateRevision:2,expectedRevision:0,requestId:id(['approved-library-request',prepared.report.importId,draft.templateId]),
    title:labels[draft.productCode],startDate:'',timeZone:'Asia/Kolkata',events:null}));
}

export function matchingImportedBatch(batch, request, template) {
  return !!batch && batch.id===request.id && batch.templateId===request.templateId && batch.templateRevision===2
    && batch.productCode===template.productCode && batch.revision===1 && batch.title===request.title
    && batch.startDate==='' && batch.timeZone==='Asia/Kolkata' && batch.events?.length===0
    && same(batch.sessions,template.document.sessions);
}

export async function verifyImportedMaterial(client, prepared, operatorId, record) {
  const imported=safe(await client.from('v2_content_imports').select('id,actor_id,plan,result,recovered_at').eq('id',prepared.report.importId).single(),'Read approved import');
  record('durable-operator-import-identity',imported.actor_id===operatorId && imported.recovered_at===null && imported.result?.imported===true && imported.result?.published===false);
  record('approved-import-counts',imported.result.assets===19 && imported.result.placements===33 && imported.result.templates===4);
  const plan=imported.plan;
  record('approved-source-review-identity',plan.mappingReviewHash===prepared.report.mappingReviewHash && plan.source===PROJECT);
  record('all-destination-documents-exact',same(plan.drafts,prepared.plan.drafts));
  record('all-source-identities-and-content-exact',Array.isArray(plan.assets)&&plan.assets.length===19&&prepared.plan.assets.every(expected=>{
    const actual=plan.assets.find(asset=>asset.assetId===expected.assetId);
    return actual&&same({...actual,source:{...actual.source,rowHash:'0'.repeat(64),schemaHash:'0'.repeat(64)}},expected)
      && /^[a-f0-9]{64}$/.test(actual.source.rowHash)&&actual.source.rowHash!=='0'.repeat(64)&&/^[a-f0-9]{64}$/.test(actual.source.schemaHash);
  }));
  const assets=safe(await client.from('v2_shared_content_assets').select('*').in('id',prepared.plan.assets.map(asset=>asset.assetId)),'Read exact shared assets');
  record('all-shared-assets-preserved',assets.length===19&&plan.assets.every(asset=>assets.some(saved=>saved.id===asset.assetId&&saved.source_table===asset.source.table&&saved.source_id===asset.source.id
    &&saved.source_field===asset.urlField&&saved.source_hash===asset.source.rowHash&&saved.title===asset.title&&saved.url===asset.url)));
  const placements=safe(await client.from('v2_content_asset_placements').select('*').eq('import_id',prepared.report.importId),'Read exact import placements');
  record('all-placements-preserved',placements.length===33&&prepared.plan.placements.every(place=>placements.some(saved=>saved.template_id===place.target.templateId&&saved.item_id===place.itemId
    &&saved.session_key===place.target.sessionKey&&saved.content_kind===place.target.contentKind&&saved.asset_id===place.assetId&&saved.asset_revision===1)));
  const templates=await rpc(client,'list_v2_template_drafts');
  for(const expected of prepared.plan.drafts){
    const actual=templates.find(template=>template.id===expected.templateId);
    record(`exact-imported-template:${expected.productCode}`,actual?.revision===2&&actual.productCode===expected.productCode&&same(actual.document,expected.document));
  }
  for(const source of prepared.expected){
    const current=safe(await client.from(source.table).select('*').eq('id',source.row.id).single(),'Compare exact legacy source');
    record(`source-preserved:${source.table}:${source.row.id}`,same(current,source.row));
  }
  return templates;
}

export async function prepareImportedBatches(client, prepared, record) {
  const batches=await rpc(client,'list_v2_batch_drafts');const results=[];
  for(const request of approvedBatchRequests(prepared)){
    const template=prepared.plan.drafts.find(draft=>draft.templateId===request.templateId);
    let batch=batches.find(batch=>batch.id===request.id);
    if(batch)record(`existing-library-batch-exact:${template.productCode}`,matchingImportedBatch(batch,request,template));
    else{
      const preview=await rpc(client,'preview_v2_batch_draft',{p_request:request});
      record(`library-batch-preview-exact:${template.productCode}`,matchingImportedBatch(preview.draft,request,template)&&/^[a-f0-9]{32}$/.test(preview.fingerprint));
      const saved=await rpc(client,'save_v2_batch_draft',{p_request:request,p_fingerprint:preview.fingerprint});
      batch=saved.draft;record(`library-batch-save-exact:${template.productCode}`,matchingImportedBatch(batch,request,template));
    }
    results.push(batch);
  }
  return results;
}

export function publicationScopeMatches(review, requests, prepared) {
  return requests.length === 4 && !!review && /^[a-f0-9]{32}$/.test(review.fingerprint) && review.proposal?.action === 'publish'
    && Array.isArray(review.proposal.items) && review.proposal.items.length === 4
    && new Set(review.proposal.items.map(item => item?.document?.batchId)).size === 4
    && requests.every(request => {
      const item = review.proposal.items.find(item => item?.document?.batchId === request.id);
      const template = prepared.plan.drafts.find(draft => draft.templateId === request.templateId);
      return item && item.input && typeof item.input === 'object' && item.input.batchId === request.id && item.input.batchRevision === 1 && item.input.action === 'publish'
        && item.document.batchRevision === 1 && item.document.title === request.title && item.document.productCode === template.productCode
        && item.document.state === 'published' && item.document.events?.length === 0
        && same(item.document.sessions, template.document.sessions.map(({ key, title, section }) => ({ key, title, section })));
    });
}

async function main(mode, confirmedScopeHash) {
  check(['verify-import','prepare-batches','review-publication','publish-reviewed','verify-publication'].includes(mode),'Supported modes: verify-import, prepare-batches, review-publication, publish-reviewed EXACT_SCOPE_HASH, verify-publication.');
  const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
  const operator=readOperatorState(OPERATOR_STATE);check(operator.status==='ready'&&typeof operator.password==='string','An active owned content operator is required.');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(20000)})}};
  const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
  const identity=safe(await service.auth.admin.getUserById(operator.userId),'Verify operator ownership').user;
  check(ownedOperator(identity,operator),'Content operator ownership mismatch.');
  const client=createClient(ORIGIN,config.SUPABASE_ANON_KEY,options);
  safe(await client.auth.signInWithPassword({email:operator.email,password:operator.password}),'Sign in content operator');
  const prepared=prepareApprovedMaterialImport(safeRead(inventoryPath));
  let state=existsSync(privateStatePath)?safeRead(privateStatePath):{project:PROJECT,operatorId:operator.userId,importId:prepared.report.importId,createdAt:new Date().toISOString()};
  check(state.project===PROJECT&&state.operatorId===operator.userId&&state.importId===prepared.report.importId,'Material acceptance run identity changed.');
  const report={check:'phase2_approved_material_acceptance',mode,project:PROJECT,importId:prepared.report.importId,startedAt:new Date().toISOString(),checks:[],status:'running',
    limitations:['API checks verify approved source records and draft content; rendered Notion/PDF/recording acceptance is separate.','Original legacy and Phase 1 full-table preservation is recorded by the guarded import SQL transaction.','Publication requires the explicit publish-reviewed mode and exact previously inspected four-batch scope hash.']};
  const record=(id,passed)=>{report.checks.push({id,status:passed?'pass':'fail'});check(passed,`Material acceptance failed: ${id}`);};
  try{
    await verifyImportedMaterial(client,prepared,operator.userId,record);
    if(mode==='prepare-batches'){
      const batches=await prepareImportedBatches(client,prepared,record);
      state.batchIds=batches.map(batch=>batch.id);
      const publications=await rpc(client,'list_v2_batch_publications');
      record('library-batches-remain-unpublished',publications.every(publication=>!state.batchIds.includes(publication.batchId)||publication.state!=='published'));
    }
    if(['review-publication','publish-reviewed','verify-publication'].includes(mode)){
      const requests=approvedBatchRequests(prepared),batches=await rpc(client,'list_v2_batch_drafts');
      record('exact-four-library-batches',requests.every(request=>matchingImportedBatch(batches.find(batch=>batch.id===request.id),request,prepared.plan.drafts.find(draft=>draft.templateId===request.templateId))));
      const publications=await rpc(client,'list_v2_batch_publications');
      if(mode==='review-publication'){
        const revisions=requests.map(request=>[request.id,publications.find(publication=>publication.batchId===request.id)?.revision??0]);
        const input={requestId:id(['library-publication-scope',prepared.report.importId,revisions]),action:'publish',productCodes:['full_course','quant','verbal','di']};
        const review=await rpc(client,'preview_v2_publication_scope',{p_request:input});
        record('publication-scope-exactly-four-approved-batches',publicationScopeMatches(review,requests,prepared));
        state.publicationScopeRequest=input;state.publicationScopeReview=review;state.publicationScopeHash=digest({input,review});
        report.publicationScope={scopeHash:state.publicationScopeHash,batches:review.proposal.items.map(({document})=>({batchId:document.batchId,title:document.title,productCode:document.productCode,
          batchRevision:document.batchRevision,publicationRevision:document.revision,sessions:document.sessions?.length??0,liveClasses:document.events.length})),published:false};
      }else if(mode==='publish-reviewed'){
        record('explicit-previously-reviewed-scope-confirmed',typeof confirmedScopeHash==='string'&&/^[a-f0-9]{64}$/.test(confirmedScopeHash)
          &&confirmedScopeHash===state.publicationScopeHash&&confirmedScopeHash===digest({input:state.publicationScopeRequest,review:state.publicationScopeReview}));
        record('saved-publication-scope-exactly-four-approved-batches',publicationScopeMatches(state.publicationScopeReview,requests,prepared));
        const expected=state.publicationScopeReview.proposal.items.map(item=>item.document);
        const alreadyCommitted=expected.every(document=>publications.some(current=>same(current,document)));
        if(!alreadyCommitted){
          const current=await rpc(client,'preview_v2_publication_scope',{p_request:state.publicationScopeRequest});
          record('publication-review-remains-current',same(current,state.publicationScopeReview)&&publicationScopeMatches(current,requests,prepared));
        }
        const result=await rpc(client,'save_v2_publication_scope',{p_request:state.publicationScopeRequest,p_fingerprint:state.publicationScopeReview.fingerprint});
        record('publication-receipt-matches-approved-scope',Array.isArray(result.documents)&&result.documents.length===4&&expected.every(document=>result.documents.some(saved=>same(saved,document))));
        const current=await rpc(client,'list_v2_batch_publications');
        record('published-heads-match-approved-scope',expected.every(document=>current.some(saved=>same(saved,document))));
        state.publishedAt??=new Date().toISOString();state.publishedDocuments=expected;
        writeFileSync('/tmp/ace-phase2-real-course-publications.private.json',JSON.stringify({project:PROJECT,documents:expected},null,2)+'\n',{mode:0o600});
        report.publicationScope={scopeHash:state.publicationScopeHash,batches:expected.map(document=>({batchId:document.batchId,productCode:document.productCode,publicationRevision:document.revision})),published:true};
      }else{
        const documents=requests.map(request=>publications.find(publication=>publication.batchId===request.id));
        record('exact-library-batches-published',documents.every(document=>document?.batchRevision===1&&document.state==='published'));
        writeFileSync('/tmp/ace-phase2-real-course-publications.private.json',JSON.stringify({project:PROJECT,documents},null,2)+'\n',{mode:0o600});
      }

    }
    state.lastVerifiedAt=new Date().toISOString();state.lastMode=mode;report.status='passed';
  }catch{report.status='failed';process.exitCode=1;}
  finally{
    state.lastStatus=report.status;writeFileSync(privateStatePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    report.finishedAt=new Date().toISOString();mkdirSync(dirname(outputPath),{recursive:true});writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
    writeFileSync(outputPath.replace('.json',`-${mode}.json`),JSON.stringify(report,null,2)+'\n');
    await client.auth.signOut();
    console.log(JSON.stringify({status:report.status,mode,checks:report.checks.length,failed:report.checks.filter(check=>check.status==='fail').length,publicationScope:report.publicationScope},null,2));
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main(process.argv[2],process.argv[3]).catch(()=>{console.error('Material acceptance could not start; verify private staging configuration and operator ownership.');process.exitCode=1;});
}
