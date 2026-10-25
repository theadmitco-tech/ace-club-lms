import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isV2TemplateDraft } from '../src/lib/v2Templates.ts';
import { reviewContentMapping } from './v2-content-mapping.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => object(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value,key));
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(canonical(value)));
const uuid = value => { const h=digest(value); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const invalid = () => { throw new Error('Content transfer dry run rejected: review sources, fingerprints, placement and target revisions.'); };
const bindingKey = (source,target) => JSON.stringify([source.table,source.id,target.templateId,target.revision,target.sessionKey,target.contentKind]);
const sourceKey = source => `${source.table}:${source.id}`;
const compare = (a,b) => a<b?-1:a>b?1:0;

// Pure preparation only. Does not read the network, connect to a DB or publish content.
export function prepareContentTransfer(inventory,templates,mapping,sourceExport,selection) {
  if (mapping?.format !== 'v2-content-mapping-proposal-2') invalid();
  const review=reviewContentMapping(inventory,templates,mapping);
  if (!keys(sourceExport,['format','source','rows']) || sourceExport.format!=='v2-content-source-export-1'
    || sourceExport.source!==inventory.source || !Array.isArray(sourceExport.rows) || sourceExport.rows.length>10000
    || !keys(selection,['format','source','mappingReviewHash','items']) || selection.format!=='v2-content-transfer-selection-1'
    || selection.source!==inventory.source || selection.mappingReviewHash!==review.reviewHash
    || !Array.isArray(selection.items) || selection.items.length<review.bindings.length || selection.items.length>10000) invalid();
  const records=new Map();
  const allowedTables=new Set(['materials','master_materials','course_template_resources','sessions','master_sessions']);
  for (const entry of sourceExport.rows) {
    if (!keys(entry,['table','rowJson']) || !allowedTables.has(entry.table) || typeof entry.rowJson!=='string') invalid();
    let row;try { row=JSON.parse(entry.rowJson); } catch { invalid(); }
    if (!object(row) || typeof row.id!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.id)) invalid();
    const key=sourceKey({table:entry.table,id:row.id});
    if (records.has(key)) invalid();
    records.set(key,{row,rowHash:hash(entry.rowJson)});
  }
  const bindings=new Map(review.bindings.map(binding=>[bindingKey(binding.source,binding.target),binding]));
  const templatesById=new Map(templates.map(template=>[template.id,template]));
  const drafts=new Map();const assets=new Map();const groups=new Map();const seen=new Set();const usedRecords=new Set();
  const placements=[];const coveredBindings=new Set();
  for (const item of selection.items) {
    if (!keys(item,['source','target','titleField','urlField','position'])
      || !keys(item.source,['table','id']) || !keys(item.target,['templateId','revision','sessionKey','contentKind'])
      || item.titleField!=='title' || !['file_url','video_url','recording_url','url'].includes(item.urlField)
      || !Number.isInteger(item.position) || item.position<0 || item.position>=50) invalid();
    const key=bindingKey(item.source,item.target),binding=bindings.get(key);
    const assetBindingKey=`${key}:${item.urlField}`;
    if (!binding || seen.has(assetBindingKey)) invalid();seen.add(assetBindingKey);coveredBindings.add(key);
    const source=records.get(sourceKey(item.source));
    if (!source || source.rowHash!==binding.source.rowHash) invalid();
    usedRecords.add(sourceKey(item.source));
    if (!Object.hasOwn(source.row,item.titleField) || !Object.hasOwn(source.row,item.urlField)) invalid();
    const title=source.row[item.titleField],url=source.row[item.urlField];
    if (typeof title!=='string' || typeof url!=='string') invalid();
    // Stable source identity, not URL equality: distinct sources are never silently merged.
    const assetId=uuid([inventory.source,item.source.table,item.source.id,item.urlField]);
    const asset={assetId,source:{...binding.source},titleField:item.titleField,urlField:item.urlField,title,url};
    if (assets.has(assetId) && digest(assets.get(assetId))!==digest(asset)) invalid();assets.set(assetId,asset);
    const itemId=uuid([assetId,item.target.templateId,item.target.sessionKey,item.target.contentKind]);
    const entry={key:itemId,title,url};
    let draft=drafts.get(item.target.templateId);
    if (!draft) {
      const template=templatesById.get(item.target.templateId);
      draft={templateId:template.id,productCode:template.productCode,expectedRevision:template.revision,
        sourceTemplateHash:binding.templateHash,document:structuredClone(template.document)};
      drafts.set(template.id,draft);
    }
    const groupKey=JSON.stringify([item.target.templateId,item.target.sessionKey,item.target.contentKind]);
    if (!groups.has(groupKey)) groups.set(groupKey,{draft,sessionKey:item.target.sessionKey,kind:item.target.contentKind,items:[]});
    groups.get(groupKey).items.push({position:item.position,entry});
    placements.push({assetId,itemId,source:{...binding.source},target:{...binding.target},position:item.position});
  }
  // Refuse incomplete or unrelated exports; operator must scope the private export explicitly.
  if (usedRecords.size!==records.size || coveredBindings.size!==bindings.size) invalid();
  for (const group of groups.values()) {
    const session=group.draft.document.sessions.find(s=>s.key===group.sessionKey);
    const original=session.content[group.kind];
    if (new Set(group.items.map(item=>item.position)).size!==group.items.length) invalid();
    const planned=new Map(group.items.map(item=>[item.entry.key,item.entry]));
    // Idempotent rehearsal accepts an identical item; never overwrites a different title/URL.
    const retained=original.filter(item=>{
      if (!planned.has(item.key)) return true;
      if (digest(item)!==digest(planned.get(item.key))) invalid();return false;
    });
    for (const item of group.items.sort((a,b)=>a.position-b.position)) {
      if (item.position>retained.length) invalid();
      retained.splice(item.position,0,item.entry);
    }
    session.content[group.kind]=retained;
  }
  for (const draft of drafts.values()) {
    if (!isV2TemplateDraft({id:draft.templateId,productCode:draft.productCode,revision:draft.expectedRevision,document:draft.document})) invalid();
  }
  const payload={format:'v2-content-transfer-plan-1',status:'draft_only',source:inventory.source,
    mappingReviewHash:review.reviewHash,
    assets:[...assets.values()].sort((a,b)=>compare(a.assetId,b.assetId)),
    placements:placements.sort((a,b)=>compare(digest(a),digest(b))),
    drafts:[...drafts.values()].sort((a,b)=>compare(a.templateId,b.templateId))};
  const report={format:'v2-content-transfer-report-1',status:'review_required',planHash:digest(payload),
    mappingReviewHash:review.reviewHash,counts:{sourceRows:records.size,assets:assets.size,placements:placements.length,templates:drafts.size},
    products:[...new Set([...drafts.values()].map(draft=>draft.productCode))].sort(),
    imported:false,published:false,renderingVerified:false};
  return {report,plan:payload};
}

function readJson(path) {
  const stat=statSync(path);
  if (!stat.isFile() || stat.size>64*1024*1024) invalid();
  return JSON.parse(readFileSync(path,'utf8'));
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [command,...args]=process.argv.slice(2);
  let createdDirectory;
  try {
    if (command!=='plan' || args.length!==6) throw new Error('usage');
    const result=prepareContentTransfer(...args.slice(0,5).map(readJson));
    const output=resolve(args[5]);
    // A new private directory only. Never replace an existing export or plan.
    mkdirSync(output,{mode:0o700});createdDirectory=output;
    writeFileSync(`${output}/plan.json`,JSON.stringify(result.plan,null,2)+'\n',{flag:'wx',mode:0o600});
    writeFileSync(`${output}/report.json`,JSON.stringify(result.report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify(result.report,null,2));
  } catch {
    if (createdDirectory) rmSync(createdDirectory,{recursive:true,force:true});
    console.error('Dry run failed. Supply plan INVENTORY TEMPLATES MAPPING SOURCE_EXPORT SELECTION NEW_OUTPUT_DIRECTORY; check reviewed inputs.');
    process.exitCode=2;
  }
}
