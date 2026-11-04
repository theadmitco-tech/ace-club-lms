import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/adminResourceOrder.ts', import.meta.url), 'utf8');
const exports = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const choices = exports.resourceOrderChoices;
const target = { batchId:'course', sessionKey:'session', publicationRevision:1, placement:'session', anchorKey:null, replaceKey:'first', order:100 };
const document = { title:'Edited reading', kind:'preSessionReads', url:'https://example.invalid/read', targets:[target] };
const workspace = { items:[], courses:[{ batchId:'course', sessions:[{key:'session',content:{preSessionReads:[{key:'first',title:'First reading'},{key:'second',title:'Second reading'}]}}]}] };
test('replacement excludes its original and offers named before/after positions', () => {
 const result = choices(document,target,workspace);
 assert.equal(result.peers.length,1);assert.equal(result.peers[0].title,'Second reading');
 assert.ok(result.options.some(item=>item.label==='Before Second reading'&&item.value<200));
 assert.ok(result.options.some(item=>item.label==='After Second reading'&&item.value>200));
});
test('edited identity is excluded even when the title and URL change', () => {
 const original={id:'current',deleted:false,document:{...document,title:'Old title',url:'https://example.invalid/old'}};
 const result=choices(document,target,{...workspace,items:[original]},'current');
 assert.equal(result.peers.length,1);assert.equal(result.peers[0].title,'Second reading');
});
test('ordering is limited to the selected course, session, location and video anchor', () => {
 const items=[{...target,sessionKey:'another'},{...target,placement:'before_course'},{...target,anchorKey:'another-video',placement:'before_video'}].map((t,index)=>({id:String(index),deleted:false,document:{...document,title:'Elsewhere',targets:[t]}}));
 const result=choices(document,target,{...workspace,items});assert.equal(result.peers.length,1);
});
test('no invalid or tied position is offered around dense or boundary values', () => {
 const items=[0,1,9999].map((order,index)=>({id:String(index),deleted:false,document:{...document,title:`Managed ${index}`,targets:[{...target,replaceKey:null,order}]}}));
 const result=choices(document,target,{...workspace,items});
 for(const option of result.options){assert.ok(Number.isInteger(option.value)&&option.value>=0&&option.value<=9999);if(option.label!=='Keep current position')assert.ok(!result.peers.some(peer=>peer.order===option.value));}
});
