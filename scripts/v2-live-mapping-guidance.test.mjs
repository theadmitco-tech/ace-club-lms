import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
const load=(file,deps)=>{
 const exports={};
 const code=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(code,{exports,require:name=>{assert(Object.hasOwn(deps,name),name);return deps[name]}});return exports.default;
};
const nodes=(tree,predicate)=>Array.isArray(tree)?tree.flatMap(x=>nodes(x,predicate)):!tree||typeof tree!=='object'?[]:[...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];
const batchId='11111111-1111-4111-8111-111111111111';
const publication={batchId,revision:2,events:[{key:'class-key',title:'Quant class',kind:'live',section:'quant'}],sessions:[]};
function mappingHarness(){
 let calls=0;
 const Component=load('src/app/admin/v2/batches/[batchId]/live/LiveSessionMappings.tsx',{
  'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:value=>[value,()=>{}]},'next/navigation':{useRouter:()=>({refresh(){}})},
  './actions':{setLiveMappingAction:async()=>{calls++;return {status:'success'}}},'../../../templates/templates.module.css':{default:{}},
 });return {render:(p,mappings=[])=>Component({publication:p,mappings}),calls:()=>calls};
}
test('legacy live-only or wrong-subject outline provides a recovery route instead of an empty select',()=>{
 const h=mappingHarness();
 for(const sessions of [[],[{key:'verbal-session',title:'Verbal',section:'verbal'}]]){
  const tree=h.render({...publication,sessions});
  assert.equal(nodes(tree,x=>x.type==='select').length,0);
  const [link]=nodes(tree,x=>x.type==='a');assert.equal(link.props.href,`/admin/v2/batches?batch=${batchId}&outline=1`);
  assert.equal(link.props.children,'Add a course session');
  assert.match(JSON.stringify(tree),/save and publish the batch, then return/);
 }assert.equal(h.calls(),0);
});
test('mapping choices remain explicit and previous-publication mappings are not silently reused',()=>{
 const h=mappingHarness(),sessions=[{key:'quant-session',title:'Quant session',section:'quant'}];
 const tree=h.render({...publication,sessions},[{eventKey:'class-key',sessionKey:'quant-session',publicationRevision:1}]);
 const [select]=nodes(tree,x=>x.type==='select');assert.equal(select.props.value,'');
 assert.equal(nodes(select,x=>x.type==='option').length,2);
 assert.equal(nodes(tree,x=>x.type==='button')[0].props.disabled,true);
 assert.equal(h.calls(),0);
});
test('publication next-step link opens the mapping section while the ordinary live page stays compact',async()=>{
 let roleChecks=0;
 const Page=load('src/app/admin/v2/batches/[batchId]/live/page.tsx',{
  'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},'next/navigation':{notFound(){throw Error('unexpected notFound')}},
  '@/lib/server/v2LearningFeature':{isV2LearningEnabled:()=>true},'@/lib/server/v2Learning':{readV2LiveMappings:async()=>[]},
  '@/lib/server/v2Publications':{listV2BatchPublications:async()=>({publications:[{...publication,state:'published'}]})},
  './LiveSessionMappings':{default:'mapping-component'},'./LiveOperations':{default:'operations-component'},
  '@/lib/server/portalAuthorization':{requirePortalRole:async role=>{assert.equal(role,'admin');roleChecks++;return {id:'synthetic-admin'}}},
  '@/lib/server/v2StudentScheduleFeature':{isV2StudentScheduleEnabled:()=>true},
  '@/lib/server/v2StudentDelivery':{readV2LiveOperations:async()=>({registrations:[],classes:[]})},
  '@/lib/v2Meetings':{isV2MeetingBatchId:value=>value===batchId},
 });
 for(const [setup,open] of [['1',true],[undefined,false]]){
  const tree=await Page({params:Promise.resolve({batchId}),searchParams:Promise.resolve({setup})});
  const [details]=nodes(tree,x=>x.type==='details');assert.equal(details.props.id,'class-session-mapping');assert.equal(details.props.open,open);
 }assert.equal(roleChecks,2);
});
