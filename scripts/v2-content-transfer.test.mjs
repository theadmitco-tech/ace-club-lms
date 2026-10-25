import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { CONTENT_TABLES } from './v2-content-preservation.mjs';
import { reviewContentMapping } from './v2-content-mapping.mjs';
import { prepareContentTransfer } from './v2-content-transfer.mjs';

const id=n=>`d2000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture() {
  const rowJson=JSON.stringify({id:id(1),title:'Before class: Ratios and mixtures',file_url:'https://private.example.test/notion/pre-read',video_url:'https://private.example.test/recording',privateNotes:'NEVER-EXPORT-THIS'});
  const inventory={format:'v2-legacy-content-inventory-1',source:'synthetic-local',capturedAt:'2026-10-25T00:00:00Z',readOnly:true,
    tables:CONTENT_TABLES.map(name=>({name,schemaHash:'a'.repeat(64),rows:name==='master_materials'?[{id:id(1),hash:hash(rowJson)}]:[]}))};
  const templates=['quant','full_course'].map((productCode,i)=>({id:id(10+i),productCode,revision:2,
    document:{title:'Course curriculum',summary:'',durationDays:null,events:[],sessions:[{key:id(20+i),title:'Quant 4',section:'quant',
      content:{materials:[],recordings:[],preSessionReads:[],postSessionReads:[]}}]}}));
  const mapping={format:'v2-content-mapping-proposal-2',source:inventory.source,bindings:[{
    source:{table:'master_materials',id:id(1),rowHash:hash(rowJson),schemaHash:'a'.repeat(64)},
    target:{templateId:id(10),revision:2,sessionKey:id(20),contentKind:'preSessionReads'},
  }]};
  const sourceExport={format:'v2-content-source-export-1',source:inventory.source,rows:[{table:'master_materials',rowJson}]};
  const selection={format:'v2-content-transfer-selection-1',source:inventory.source,mappingReviewHash:reviewContentMapping(inventory,templates,mapping).reviewHash,
    items:mapping.bindings.map(b=>({source:{table:b.source.table,id:b.source.id},target:{...b.target},titleField:'title',urlField:'file_url',position:0}))};
  return {inventory,templates,mapping,sourceExport,selection};
}
const run=f=>prepareContentTransfer(f.inventory,f.templates,f.mapping,f.sourceExport,f.selection);
const refresh=f=>{f.selection.mappingReviewHash=reviewContentMapping(f.inventory,f.templates,f.mapping).reviewHash;};
const changeRow=(f,change)=>{
  const row=JSON.parse(f.sourceExport.rows[0].rowJson);change(row);
  f.sourceExport.rows[0].rowJson=JSON.stringify(row);
  const fingerprint=hash(f.sourceExport.rows[0].rowJson);
  f.inventory.tables.find(t=>t.name==='master_materials').rows[0].hash=fingerprint;
  f.mapping.bindings.forEach(b=>{b.source.rowHash=fingerprint;});refresh(f);
};

test('prepares unscheduled course drafts preserving exact titles, URLs and source provenance',()=>{
  const f=fixture(),before=JSON.stringify(f),{report,plan}=run(f);
  assert.deepEqual(report.counts,{sourceRows:1,assets:1,placements:1,templates:1});
  assert.equal(report.imported,false);assert.equal(report.published,false);assert.equal(report.renderingVerified,false);
  assert.equal(plan.drafts[0].expectedRevision,2);assert.deepEqual(plan.drafts[0].document.events,[]);
  assert.equal(plan.drafts[0].document.durationDays,null);
  assert.equal(plan.drafts[0].document.sessions[0].content.preSessionReads[0].title,'Before class: Ratios and mixtures');
  assert.equal(plan.assets[0].source.rowHash,f.mapping.bindings[0].source.rowHash);
  assert.doesNotMatch(JSON.stringify(report),/private.example|Ratios|NEVER-EXPORT/);
  assert.doesNotMatch(JSON.stringify(plan),/NEVER-EXPORT/);
  assert.equal(JSON.stringify(f),before);
});

test('explicit destinations reuse one recording asset without expanding to other products',()=>{
  const f=fixture();f.mapping.bindings[0].target.contentKind='recordings';
  const extra=structuredClone(f.mapping.bindings[0]);extra.target.templateId=id(11);extra.target.sessionKey=id(21);f.mapping.bindings.push(extra);
  f.selection.items=f.mapping.bindings.map(b=>({source:{table:b.source.table,id:b.source.id},target:{...b.target},titleField:'title',urlField:'video_url',position:0}));refresh(f);
  const {plan,report}=run(f);assert.equal(plan.assets.length,1);assert.equal(plan.placements.length,2);
  assert.equal(plan.placements[0].assetId,plan.placements[1].assetId);assert.notEqual(plan.placements[0].itemId,plan.placements[1].itemId);
  assert.deepEqual(report.products,['full_course','quant']);
});

test('explicit final placement retains existing items and preserves deterministic replay',()=>{
  const f=fixture();const existing={key:id(77),title:'Existing reading',url:'https://example.test/existing'};
  f.templates[0].document.sessions[0].content.preSessionReads=[existing];f.selection.items[0].position=1;refresh(f);
  const first=run(f);assert.deepEqual(first.plan.drafts[0].document.sessions[0].content.preSessionReads[0],existing);
  assert.deepEqual(run(f),first);
  f.templates[0].document=first.plan.drafts[0].document;refresh(f);
  const retry=run(f);assert.equal(retry.plan.drafts[0].document.sessions[0].content.preSessionReads.length,2);
  assert.deepEqual(retry.plan.drafts[0].document,first.plan.drafts[0].document);
});

test('two source URL fields can be selected explicitly without losing either variant',()=>{
  const f=fixture();f.selection.items.push({...structuredClone(f.selection.items[0]),urlField:'video_url',position:1});
  const result=run(f);assert.equal(result.plan.assets.length,2);
  assert.equal(result.plan.drafts[0].document.sessions[0].content.preSessionReads.length,2);
  const reorder=structuredClone(f);reorder.selection.items.reverse();assert.deepEqual(run(reorder),result);
});

test('rejects stale review, stale exports, missing rows and unreviewed scope',()=>{
  for (const mutate of [
    f=>{f.selection.mappingReviewHash='f'.repeat(64);},
    f=>{f.sourceExport.rows[0].rowJson=f.sourceExport.rows[0].rowJson.replace('Ratios','Changed');},
    f=>{f.sourceExport.rows=[];},
    f=>{f.sourceExport.source='another-project';},
    f=>{f.selection.items[0].target.templateId=id(11);},
    f=>{f.selection.items[0].target.revision=1;},
    f=>{f.selection.items[0].target.contentKind='postSessionReads';},
    f=>{f.mapping.format='v2-content-mapping-proposal-1';},
    f=>{f.sourceExport.rows.push({...f.sourceExport.rows[0],rowJson:JSON.stringify({id:id(2),title:'Unbound'})});},
  ]){const f=fixture();mutate(f);assert.throws(()=>run(f));}
});

test('does not replace conflicting target items or silently truncate invalid source titles',()=>{
  const f=fixture();const plan=run(f).plan;
  f.templates[0].document=plan.drafts[0].document;
  f.templates[0].document.sessions[0].content.preSessionReads[0].title='Edited by Admin';refresh(f);
  assert.throws(()=>run(f),/rejected/);
  for (const title of ['', 'x'.repeat(121), ' trailing ',null]) {
    const g=fixture();changeRow(g,row=>{row.title=title;});assert.throws(()=>run(g));
  }
});

test('rejects unsafe or unavailable references without fetching remote content',()=>{
  for (const value of [null,'','http://example.test','javascript:alert(1)','https://user:secret@example.test',{},['https://example.test']]) {
    const f=fixture();changeRow(f,row=>{row.file_url=value;});assert.throws(()=>run(f));
  }
});

test('duplicate sources, duplicate placements, position gaps and unexpected fields fail closed',()=>{
  for (const mutate of [
    f=>{f.sourceExport.rows.push(structuredClone(f.sourceExport.rows[0]));},
    f=>{f.selection.items.push(structuredClone(f.selection.items[0]));},
    f=>{f.selection.items[0].position=1;},
    f=>{f.selection.items[0].position=-1;},
    f=>{f.selection.items[0].urlField='privateNotes';},
    f=>{f.selection.items[0].titleField='privateNotes';},
    f=>{f.selection.items[0].autoPublish=true;},
    f=>{f.selection.items.push({...structuredClone(f.selection.items[0]),urlField:'video_url'});},
    f=>{f.selection.items=[];},
  ]){const f=fixture();mutate(f);assert.throws(()=>run(f));}
});

test('CLI creates private draft files, emits a sanitized report and never overwrites an existing directory',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ace-content-transfer-'));
  try {
    const f=fixture();const names=['inventory','templates','mapping','sourceExport','selection'];
    const inputs=names.map(name=>{const path=join(dir,`${name}.json`);writeFileSync(path,JSON.stringify(f[name]));return path;});
    const before=inputs.map(p=>readFileSync(p,'utf8'));const output=join(dir,'private-plan');
    const cli=(args)=>spawnSync(process.execPath,['--experimental-strip-types','scripts/v2-content-transfer.mjs',...args],{encoding:'utf8',timeout:30000});
    const first=cli(['plan',...inputs,output]);assert.ifError(first.error);assert.equal(first.status,0,first.stderr);
    assert.equal(JSON.parse(first.stdout).imported,false);assert.doesNotMatch(first.stdout,/private.example|Ratios|NEVER-EXPORT/);
    assert.equal(statSync(output).mode&0o777,0o700);assert.equal(statSync(join(output,'plan.json')).mode&0o777,0o600);
    const saved=readFileSync(join(output,'plan.json'),'utf8');
    assert.equal(cli(['plan',...inputs,output]).status,2);assert.equal(readFileSync(join(output,'plan.json'),'utf8'),saved);
    const invalidOutput=join(dir,'invalid');writeFileSync(inputs[4],'{}');
    assert.equal(cli(['plan',...inputs,invalidOutput]).status,2);assert.equal(existsSync(invalidOutput),false);
    assert.deepEqual(inputs.slice(0,4).map(p=>readFileSync(p,'utf8')),before.slice(0,4));
    assert.equal(cli(['apply',...inputs,join(dir,'not-allowed')]).status,2);
  } finally {rmSync(dir,{recursive:true,force:true});}
});


test('verifies actual PostgreSQL row-text fingerprints without JSON reserialization', async()=>withDisposablePostgres(async({query})=>{
  const f=fixture();
  const result=JSON.parse(query(`select jsonb_build_object('rowJson',to_jsonb(r)::text,
    'rowHash',encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex'))
    from (values ('${id(1)}'::uuid,'Pré-read: Ratios & O''Brien'::text,'https://private.example.test/reading'::text)) r(id,title,file_url)`));
  f.sourceExport.rows[0].rowJson=result.rowJson;
  f.inventory.tables.find(table=>table.name==='master_materials').rows[0].hash=result.rowHash;
  f.mapping.bindings[0].source.rowHash=result.rowHash;refresh(f);
  assert.notEqual(hash(JSON.stringify(JSON.parse(result.rowJson))),result.rowHash);
  const output=run(f);
  assert.equal(output.plan.assets[0].title,"Pré-read: Ratios & O'Brien");
  assert.equal(output.plan.assets[0].source.rowHash,result.rowHash);
}));
