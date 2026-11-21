import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
function load(file,deps={}){const exports={};runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert.ok(name in deps);return deps[name];}});return exports;}
const readmes=load('src/lib/v2CourseReadmes.ts');
const {curriculumLibraries,curriculumClasses}=load('src/lib/v2BatchCurriculum.ts',{'./v2CourseReadmes':readmes});
const session=(key,title,section='quant')=>({key,title,section,content:{}});
const library={id:'course',productCode:'quant',events:[],sessions:[session('ace00001-0000','Before'),session('lesson','Fractions'),session('ace00002-0000','After')]};
test('curriculum excludes live batches, other subjects and empty libraries',()=>{
 const candidates=[library,{...library,id:'live',events:[{kind:'live'}]},{...library,id:'verbal',productCode:'verbal'},{...library,id:'empty',sessions:[]},{...library,id:'unpublished',curriculumPublicationRevision:-1}];
 assert.deepEqual(Array.from(curriculumLibraries(candidates,'quant'),item=>item.id),['course']);
 assert.deepEqual(Array.from(curriculumLibraries(candidates,'full_course'),item=>item.id),['course','verbal']);
});
test('class names and identities come from the course while reading pages remain undated',()=>{
 const before=JSON.stringify(library),classes=curriculumClasses([library]);
 assert.equal(classes.length,1);assert.equal(classes[0].title,'Fractions');assert.equal(classes[0].key,'lesson');assert.equal(classes[0].date,'');assert.equal(classes[0].duration,120);
 classes[0].title='Changed locally';assert.equal(JSON.stringify(library),before);
});

const {validCurriculumSources}=load('src/lib/v2CurriculumLinks.ts');
test('curriculum source requests reject ambiguous, empty and malformed identities',()=>{
 const source={batchId:'10000000-0000-4000-8000-000000000001',revision:1,sessionKeys:['20000000-0000-4000-8000-000000000001']};
 assert.equal(validCurriculumSources([source]),true);
 for(const value of [[],null,[{...source,revision:0}],[{...source,sessionKeys:[]}],[source,source],[{...source,sessionKeys:[...source.sessionKeys,...source.sessionKeys]}],[{...source,admin:true}],[source,{...source,batchId:'10000000-0000-4000-8000-000000000002'}]])assert.equal(validCurriculumSources(value),false);
});
