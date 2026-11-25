import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
const load=(file,deps)=>{
 const exports={};
 const code=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(code,{exports,require:name=>{assert(Object.hasOwn(deps,name),name);return deps[name]}});return exports.default ?? exports;
};
const nodes=(tree,predicate)=>Array.isArray(tree)?tree.flatMap(x=>nodes(x,predicate)):!tree||typeof tree!=='object'?[]:[...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];
const batchId='11111111-1111-4111-8111-111111111111';
const publication={batchId,revision:2,events:[{key:'class-key',title:'Quant class',kind:'live',section:'quant'}],sessions:[]};
function mappingHarness(){
 let calls=0;
 const Component=load('src/app/admin/v2/batches/[batchId]/live/LiveSessionMappings.tsx',{
  'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:value=>[value,()=>{}],useRef:value=>({current:value})},'next/navigation':{useRouter:()=>({refresh(){}})},
  './actions':{setLiveMappingAction:async()=>{calls++;return {status:'success'}}},'../batchPage.module.css':{default:{}},
  '@/lib/v2LiveMappingSuggestions':load('src/lib/v2LiveMappingSuggestions.ts',{}),
 });
 // The exported component wraps a keyed editor; render through to the editor's tree.
 const render=(p,mappings=[])=>{let tree=Component({publication:{state:'published',...p},mappings,completedEventKeys:[]});while(typeof tree?.type==='function')tree=tree.type(tree.props);return tree;};
 return {render,calls:()=>calls};
}
test('legacy live-only or wrong-subject outline provides a recovery route instead of an empty select',()=>{
 const h=mappingHarness();
 for(const sessions of [[],[{key:'verbal-session',title:'Verbal',section:'verbal'}]]){
  const tree=h.render({...publication,sessions});
  assert.equal(nodes(tree,x=>x.type==='select').length,0);
  const [link]=nodes(tree,x=>x.type==='a');assert.equal(link.props.href,`/admin/v2/batches?batch=${batchId}&outline=1`);
  assert.equal(link.props.children,'Add a course session');
  assert.match(JSON.stringify(tree),/save and publish the batch, then return here/);
 }assert.equal(h.calls(),0);
});
test('a previous-publication mapping is only a suggestion and is not saved without confirmation',()=>{
 const h=mappingHarness(),sessions=[{key:'quant-session',title:'Quant session',section:'quant'}];
 const tree=h.render({...publication,sessions},[{eventKey:'class-key',sessionKey:'quant-session',publicationRevision:1}]);
 const [select]=nodes(tree,x=>x.type==='select');
 assert.equal(nodes(select,x=>x.type==='option').length,2);
 assert.match(JSON.stringify(tree),/Previously confirmed for this batch\. Review and confirm again for this publication\./);
 assert.ok(nodes(tree,x=>x.type==='button'&&x.props.children==='Confirm suggested links').length===1);
 assert.equal(h.calls(),0);
});
test('live page authorizes the Admin before loading and hands the published batch to live operations',async()=>{
 let roleChecks=0;const reads=[];
 const Page=load('src/app/admin/v2/batches/[batchId]/live/page.tsx',{
  'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},'next/navigation':{notFound(){throw Error('unexpected notFound')}},
  '@/lib/server/v2LearningFeature':{isV2LearningEnabled:()=>true},'@/lib/server/v2Learning':{readV2LiveMappings:async()=>{reads.push('mappings');return [];}},
  '@/lib/server/v2Publications':{listV2BatchPublications:async()=>{reads.push('publications');return {status:'ready',publications:[{...publication,state:'published',title:'Quant batch'}]};}},
  './LiveOperations':{default:'operations-component'},
  '@/lib/server/portalAuthorization':{requirePortalRole:async role=>{assert.equal(role,'admin');assert.equal(reads.length,0);roleChecks++;return {id:'synthetic-admin'}}},
  '@/lib/server/v2StudentScheduleFeature':{isV2StudentScheduleEnabled:()=>true},
  '@/lib/server/v2StudentDelivery':{readV2LiveOperations:async()=>{reads.push('operations');return {registrations:[],classes:[]};}},
  '@/lib/v2Meetings':{isV2MeetingBatchId:value=>value===batchId},'../batchPage.module.css':{default:{}},
 });
 const tree=await Page({params:Promise.resolve({batchId})});
 const [panel]=nodes(tree,x=>x.type==='operations-component');
 assert.equal(panel.props.publication.batchId,batchId);assert.equal(panel.props.seatLimit,8);assert.equal(panel.props.mappingsAvailable,true);
 assert.equal(roleChecks,1);assert.deepEqual(reads.sort(),['mappings','operations','publications']);
});
