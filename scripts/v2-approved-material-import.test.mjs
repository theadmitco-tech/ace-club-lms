import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prepareApprovedMaterialImport, approvedMaterialImportSql } from './v2-approved-material-import.mjs';
import { isV2ContentUrl, isV2TemplateDraft } from '../src/lib/v2Templates.ts';

function fixture() {
 const revisionId=randomUUID(),template={id:'10000000-0000-4000-8000-000000000001',current_revision_id:revisionId};
 const sections=['qa','va','di','programme'].map(section_key=>({id:randomUUID(),revision_id:revisionId,section_key}));
 const events=Array.from({length:30},(_,i)=>({id:randomUUID(),revision_id:revisionId,section_id:sections[i%4].id,
  source_master_session_id:randomUUID(),title:`Synthetic session ${i+1}`,display_order:i}));
 const resources=Array.from({length:15},(_,i)=>({id:randomUUID(),revision_id:revisionId,event_id:i<13?events[i].id:null,
  resource_type:i<8?'pre_read':i<13?'worksheet':'starter',resource_scope:i<13?'event':'template',display_order:i,
  title:`Synthetic resource ${i+1}`,notion_url:i<8||i>=13?'https://example.test/notion':null,
  file_url:i>=8&&i<13?`/api/materials/file?path=worksheets%2F${randomUUID()}%2F${randomUUID()}.pdf`:null}));
 const recordingIds=['88678915-bb4a-4839-87ad-eb9cb77e2b29','0624af56-b3a7-4b45-a8c9-4660952967b0','b9fae72c-89df-4802-85c7-14b63cd5b905','e2ab8406-25be-4692-82e7-2d7284e8b95b'];
 const sessions=recordingIds.map((_,i)=>({id:randomUUID(),master_session_id:events[i].source_master_session_id}));
 const materials=recordingIds.map((id,i)=>({id,session_id:sessions[i].id,title:`Synthetic recording ${i+1}`,video_url:`https://example.test/video-${i}`}));
 return {course_templates:[template],course_template_revisions:[{id:revisionId}],course_template_sections:sections,
  course_template_events:events,course_template_resources:resources,sessions,materials};
}

test('approved inventory retains all source material and undated programme scope',()=>{
 const inventory=fixture(),result=prepareApprovedMaterialImport(inventory);
 assert.equal(result.report.sourceAssets,19);
 assert.equal(result.initialTemplates.length,4);
 for(const template of result.initialTemplates){
  assert.equal(isV2TemplateDraft(template),true);
  assert.equal(template.document.events.length,0);
  assert.equal(template.document.durationDays,null);
  if(template.productCode!=='full_course')assert.equal(template.document.sessions.some(session=>session.section==='programme'),false);
 }
 assert.equal(result.initialTemplates[0].document.sessions.length,31);
 assert.equal(result.plan.assets.filter(asset=>asset.url.startsWith('/api/materials/file?')).length,5);
 const starterIds=inventory.course_template_resources.filter(row=>row.resource_type==='starter').map(row=>row.id);
 const starterPlacements=result.plan.placements.filter(place=>starterIds.includes(place.source.id));
 assert.equal(starterPlacements.length,2);assert(starterPlacements.every(place=>place.target.templateId===result.initialTemplates[0].id));
 assert.deepEqual(result.report,prepareApprovedMaterialImport(inventory).report);
});

test('source changes alter review identity and missing approved rows fail closed',()=>{
 const inventory=fixture(),before=prepareApprovedMaterialImport(inventory);
 inventory.course_template_resources[0].title='Revised resource';
 assert.notEqual(prepareApprovedMaterialImport(inventory).report.mappingReviewHash,before.report.mappingReviewHash);
 inventory.materials.pop();assert.throws(()=>prepareApprovedMaterialImport(inventory),/Missing source relation/);
});

test('operator packet checks exact actor, source snapshots and legacy fingerprints',()=>{
 const result=prepareApprovedMaterialImport(fixture()),sql=approvedMaterialImportSql(result,randomUUID());
 assert.match(sql,/Approved source snapshot changed/);assert.match(sql,/active Admin/);assert.match(sql,/Legacy table preservation check failed/);
 assert.match(sql,/v2_product_grants/);assert.match(sql,/v2_content_imports/);assert.match(sql,/preview_v2_content_import/);
 assert.doesNotMatch(sql,/publish_v2|grant_v2_purchase|delete from public/);
 assert.throws(()=>approvedMaterialImportSql(result,'invalid'));
});

test('private file references accept only canonical protected paths',()=>{
 const path=`/api/materials/file?path=worksheets%2F${randomUUID()}%2F${randomUUID()}.pdf`;
 assert.equal(isV2ContentUrl(path),true);
 for(const value of ['/api/materials/file?path=../secret',`${path}&download=1`,`${path}#fragment`,'/private/file.pdf','javascript:alert(1)','//example.test/file'])assert.equal(isV2ContentUrl(value),false);
});
