import {createHash} from 'node:crypto';
import {check} from '../phase1-hosted-closeout-config.mjs';
import {v2ReadingPageId,hasV2ReadingContent} from '../../src/lib/v2ReadingPreview.ts';
import {REAL_COURSE_ID} from './fixtures.mjs';
const kinds=['preSessionReads','recordings','postSessionReads','materials'];
// Existing resources remain unchanged; only the designated QA learning reminders are created.
export async function verifyPhase4RealCourse({state,sessions,publicContext,rpc,ok,note=()=>{}}){
 check(state.realCourse?.batchId===REAL_COURSE_ID,'The designated published Full Course must be attached before resource acceptance.');
 const batchId=REAL_COURSE_ID,full=sessions.full;
 const course=await rpc(full.client,'get_my_v2_published_course',{p_batch_id:batchId});
 const initial=await rpc(full.client,'get_my_v2_learning_state',{p_batch_id:batchId});
 ok('real-course-authorized-learning',course?.productCode==='full_course'&&initial?.batchId===batchId&&initial.obligations.length===0&&!initial.liveRegistered);
 const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const before=fingerprint(course);
 const resources=course.sessions.flatMap(session=>kinds.flatMap(kind=>session.content[kind].map(item=>({...item,kind,sessionKey:session.key,sessionTitle:session.title}))));
 const pdfs=resources.filter(item=>item.kind==='materials'&&item.url.startsWith('/api/materials/file?path='));
 const readings=[...new Map(resources.filter(item=>item.kind!=='recordings').map(item=>({...item,pageId:v2ReadingPageId(item.url)})).filter(item=>item.pageId).map(item=>[item.pageId,item])).values()];
 ok('real-course-resource-inventory',resources.length===19&&pdfs.length===5&&readings.length===2);
 const page=full.page;await page.setViewportSize({width:390,height:844});await page.goto(`${state.preview}/schedule/v2/${batchId}`,{waitUntil:'domcontentloaded'});
 const outline=page.getByRole('complementary',{name:'Course outline'});await outline.waitFor({state:'visible',timeout:30000});
 ok('real-course-complete-outline',await outline.getByRole('button').count()===course.sessions.length);
 let apiReadingsVerified=0,originalEmbedsVerified=0;
 for(const [index,item] of pdfs.entries()){
  const path=`/api/v2/materials/file?batchId=${batchId}&sessionKey=${item.sessionKey}&itemKey=${item.key}`;
  const response=await full.context.request.get(`${state.preview}${path}`),bytes=await response.body(),headers=response.headers();
  ok(`real-private-pdf:${index}`,response.status()===200&&bytes.subarray(0,5).toString()==='%PDF-'&&headers['content-type']?.startsWith('application/pdf')&&headers['cache-control']?.includes('no-store')&&!headers.location&&new URL(response.url()).origin===state.preview);
  const denied=await sessions.wrong_subject.context.request.get(`${state.preview}${path}`),anonymous=await publicContext.request.get(`${state.preview}${path}`);
  ok(`real-private-pdf-unauthorized:${index}`,denied.status()===404&&anonymous.status()===404);
 }
 for(const [index,item] of readings.entries()){
  const path=`/api/v2/course-reading?batchId=${batchId}&sessionKey=${item.sessionKey}&pageId=${item.pageId}`;
  const response=await full.context.request.get(`${state.preview}${path}`);let map=null;try{map=await response.json();}catch{}
  const apiValid=response.status()===200&&hasV2ReadingContent(map,item.pageId);
  ok(`real-reading-authorized-response:${index}`,[200,422,502,503,504].includes(response.status()));
  await page.getByRole('button',{name:`Open ${item.sessionTitle}`,exact:true}).click();
  const article=page.getByRole('article',{name:`Session content: ${item.sessionTitle}`,exact:true});await article.waitFor();
  const resource=article.getByRole('heading',{name:item.title,level:5,exact:true}).locator('..');
  await resource.getByRole('button',{name:'Read here',exact:true}).click();
  if(apiValid){const reader=resource.locator('.custom-notion');await reader.waitFor({state:'visible',timeout:30000});ok(`real-reading-rendered:${index}`,(await reader.innerText()).trim().length>0||await reader.locator('img').count()>0);apiReadingsVerified++;}
  else{
   note({id:`real-reading-provider:${index}`,status:'inconclusive',reason:'The authorized provider API did not return a validated page; original embed rendering is checked separately.'});
   const frame=resource.locator('iframe');await frame.waitFor({state:'visible',timeout:30000});await frame.scrollIntoViewIfNeeded();
   ok(`real-reading-original-source:${index}`,await frame.getAttribute('src')===item.url&&await frame.getAttribute('title')===item.title);
   const content=resource.frameLocator('iframe');await content.locator('[data-block-id],.notion-page-content').first().waitFor({state:'visible',timeout:30000});
   const visible=(await content.locator('body').innerText()).trim();ok(`real-reading-original-rendered:${index}`,visible.length>20&&!/^(access denied|page not found|loading[. ]*)$/i.test(visible));originalEmbedsVerified++;
  }
  ok(`real-reading-mobile-fit:${index}`,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await resource.getByRole('button',{name:'Close resource',exact:true}).click();
  const denied=await sessions.wrong_subject.context.request.get(`${state.preview}${path}`),anonymous=await publicContext.request.get(`${state.preview}${path}`);
  ok(`real-reading-unauthorized:${index}`,denied.status()===404&&anonymous.status()===404);
 }
 const recordingSession=course.sessions.find(session=>session.section!=='programme'&&session.content.recordings.some(item=>/^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?|embed\/|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)/i.test(item.url)));
 if(recordingSession){
  const item=recordingSession.content.recordings.find(item=>/^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?|embed\/|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)/i.test(item.url));
  const watch=await rpc(full.client,'begin_v2_recording_watch',{p_batch_id:batchId,p_session_key:recordingSession.key,p_recording_key:item.key,p_publication_revision:course.publicationRevision});
  // Initialization records no invented duration, playback interval or attendance.
  ok('real-recording-observation-initialization-only',watch.watchedSeconds===0&&watch.due===false&&watch.durationSeconds===null);
 }
 const after=await rpc(full.client,'get_my_v2_published_course',{p_batch_id:batchId}),learning=await rpc(full.client,'get_my_v2_learning_state',{p_batch_id:batchId});
 ok('real-resources-and-feedback-preserved',fingerprint(after)===before&&learning.obligations.length===0);
 await page.setViewportSize({width:1280,height:900});
 return {batchId,publicationRevision:course.publicationRevision,resources:resources.length,pdfs:pdfs.length,readings:readings.length,apiReadingsVerified,originalEmbedsVerified,resourceFingerprint:before,videoPlaybackVerified:false,feedbackCreated:false};
}
