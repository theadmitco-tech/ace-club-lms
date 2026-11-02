import {existsSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {PROJECT,ORIGIN,check,readConfig} from '../phase1-hosted-closeout-config.mjs';
import {getYoutubeVideoId} from '../../src/lib/youtube.ts';

const privateFile='/tmp/ace-phase4-hosted-qa-state.json',info=statSync(privateFile);
check(info.isFile()&&(info.mode&0o077)===0&&info.uid===process.getuid(),'Dedicated private QA state is required.');
const state=JSON.parse(readFileSync(privateFile,'utf8'));
check(state.project===PROJECT&&state.status==='verification-completed','The hosted workflow must complete before provider acceptance.');
const preview=new URL(state.preview);
check(preview.protocol==='https:'&&/^ace-club(?:-lms)?-[a-z0-9-]+-theadmitco-techs-projects\.vercel\.app$/.test(preview.hostname)&&preview.pathname==='/'&&!preview.search&&!preview.hash,'The designated Preview is required.');
const accessFile='/tmp/ace-phase4-preview-access',accessInfo=statSync(accessFile);
check((accessInfo.mode&0o077)===0&&accessInfo.uid===process.getuid(),'Preview access remains private.');
const accessUrl=readFileSync(accessFile,'utf8').trim(),access=new URL(accessUrl);
check(access.origin===preview.origin&&access.searchParams.has('_vercel_share'),'Preview access must match the candidate.');
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const report={check:'phase4_recording_provider_acceptance',project:PROJECT,commit:state.commit,runId:state.runId,status:'running',checks:[],limitations:['A short real playback checks provider integration and observed samples; it does not claim full viewing or attendance.','No artificial positions, provider events, completed feedback, recording source edits or real-course publication changes are used.']};
const output='deliverables/phase4-hosted-acceptance/provider-results.json';
if(existsSync(output)){
 const previous=JSON.parse(readFileSync(output,'utf8'));
 check(previous.status!=='running','A provider run is already recorded as running; its state requires review before another attempt.');
 if(previous.runId===state.runId)writeFileSync(output.replace('.json',`-attempt-${Date.now()}.json`),JSON.stringify(previous,null,2)+'\n');
}
const save=()=>writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const ok=(id,value)=>{report.checks.push({id,status:value?'pass':'fail'});save();check(value,`Provider acceptance failed: ${id}`);};
const safe=(result,label)=>{check(!result.error,`${label} failed; provider diagnostics withheld.`);return result.data;};
const rpc=async(client,name,args)=>safe(await client.rpc(name,args),name);
async function signIn(label){
 const owner=state.users.find(user=>user.label===label);check(owner,'Designated role missing.');let cookies=[];
 const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:items=>{for(const cookie of items){cookies=cookies.filter(old=>old.name!==cookie.name);cookies.push(cookie);}}}});
 const result=safe(await client.auth.signInWithPassword({email:owner.email,password:state.password}),'Dedicated QA sign-in');
 check(result.user.id===owner.id&&result.user.user_metadata.phase4_qa_run===state.runId,'Dedicated QA ownership mismatch.');return {client,cookies};
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
let browser,page;
const diagnostics={stage:'initialization',requests:[],consoleErrors:[]};
async function youtubeSnapshot(content){
 return content.locator('body').evaluate(()=>{
  const player=document.getElementById('movie_player'),video=document.querySelector('video');
  const apiDuration=typeof player?.getDuration==='function'?player.getDuration():NaN;
  const visible=element=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return box.width>0&&box.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&style.opacity!=='0';};
  return {duration:Number.isFinite(apiDuration)&&apiDuration>0?apiDuration:video?.duration??NaN,
   readyState:video?.readyState??null,paused:video?.paused??null,position:video?.currentTime??null,
   advertPlaying:Boolean(document.querySelector('.ad-showing,.ad-interrupting')),
   providerError:Array.from(document.querySelectorAll('.ytp-error-content-wrap,.ytp-error')).filter(visible).map(element=>element.textContent?.trim()).filter(Boolean).join(' ').slice(0,1200),
   visibleButtons:Array.from(document.querySelectorAll('button')).filter(visible).map(button=>button.getAttribute('aria-label')||button.textContent?.trim()).slice(0,30)};
 });
}
async function startYoutubePlayback(content){
 // Visible provider controls initiate actual playback; no position or event is fabricated.
 const controls=[content.getByRole('button',{name:/^Play(?: video)?(?: \(k\))?$/i}),content.locator('.ytp-large-play-button'),content.locator('.ytp-play-button')];
 for(let attempt=0;attempt<30;attempt++){
 for(const selector of controls){const control=selector.first();if(await control.isVisible()){
  const label=await control.getAttribute('aria-label');
  if(label&&/pause/i.test(label))continue;
  await control.click({timeout:15000});return;
 }}
 await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw Error('No visible provider playback control was available after metadata readiness.');
}
try{
 const full=await signIn('full'),admin=await signIn('admin'),batchId=state.realCourse.batchId;
 const course=await rpc(full.client,'get_my_v2_published_course',{p_batch_id:batchId});
 const before=await rpc(full.client,'get_my_v2_learning_state',{p_batch_id:batchId});
 ok('real-course-feedback-initially-clear',course?.productCode==='full_course'&&before?.obligations.length===0);
 const [drafts,publications]=await Promise.all([rpc(admin.client,'list_v2_batch_drafts'),rpc(admin.client,'list_v2_batch_publications')]);
 const realBatches=drafts.filter(batch=>!state.courses.some(synthetic=>synthetic.batchId===batch.id));
 const shared=[];
 for(const batch of realBatches.filter(batch=>['quant','verbal','di'].includes(batch.productCode))){
  const publication=publications.find(row=>row.batchId===batch.id&&row.state==='published');if(!publication)continue;
  check(publication.batchRevision===batch.revision,'Published revision differs from the compared content.');
  const urls=(batch.sessions??[]).flatMap(session=>session.content.recordings.map(item=>item.url));
  const expected=new Set(course.sessions.filter(session=>session.section===batch.productCode).flatMap(session=>session.content.recordings.map(item=>item.url)));
  ok(`published-shared-recordings:${batch.productCode}`,urls.every(url=>expected.has(url)));shared.push({productCode:batch.productCode,recordings:urls.length});
 }
 ok('actual-shared-recordings-compared',shared.some(item=>item.productCode==='quant'&&item.recordings>0)&&shared.some(item=>item.productCode==='di'&&item.recordings>0));report.sharedReferences=shared;save();
 const candidate=course.sessions.filter(session=>session.section!=='programme').flatMap(session=>session.content.recordings.map(item=>({session,item}))).find(({item})=>getYoutubeVideoId(item.url)||/\.(mp4|webm|ogg)(?:\?|$)/i.test(item.url));
 ok('supported-real-recording-present',Boolean(candidate));
 const provider=getYoutubeVideoId(candidate.item.url)?'youtube':'native';report.provider=provider;report.recording={sessionKey:candidate.session.key,recordingKey:candidate.item.key,publicationRevision:course.publicationRevision,referenceSha256:digest(candidate.item.url)};save();
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext();page=await context.newPage();
 await page.goto(accessUrl,{waitUntil:'domcontentloaded'});
 await context.addCookies(full.cookies.map(({name,value})=>({name,value,url:preview.origin,secure:true,sameSite:'Lax'})));
 const observed=[],watchStarts=[];
 page.on('requestfailed',request=>{if(diagnostics.requests.length<30)diagnostics.requests.push({url:request.url(),failure:request.failure()?.errorText});});
 page.on('console',message=>{if(message.type()==='error'&&diagnostics.consoleErrors.length<20)diagnostics.consoleErrors.push(message.text());});
 page.on('response',async response=>{
  if(new URL(response.url()).origin!==preview.origin||new URL(response.url()).pathname!=='/api/v2/learning')return;
  let body,result;try{body=response.request().postDataJSON();result=await response.json();}catch{return;}
  if(body?.action==='watch-start')watchStarts.push({httpStatus:response.status(),watchedSeconds:result.watchedSeconds,durationSeconds:result.durationSeconds,due:result.due});
  if(body?.action==='watch-sample')observed.push({positionSeconds:body.positionSeconds,durationSeconds:body.durationSeconds,playing:body.playing,httpStatus:response.status(),watchedSeconds:result.watchedSeconds,due:result.due});
 });
 await page.goto(`${preview.origin}/schedule/v2/${batchId}`,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:`Open ${candidate.session.title}`,exact:true}).click();
 const article=page.getByRole('article',{name:`Session content: ${candidate.session.title}`,exact:true});
 const resource=article.getByRole('heading',{name:candidate.item.title,level:5,exact:true}).locator('..');
 await resource.getByRole('button',{name:'Watch here',exact:true}).click();
 let video;
 diagnostics.stage='provider metadata';
 if(provider==='youtube'){
  const frame=resource.locator('iframe');await frame.waitFor({state:'visible',timeout:30000});await frame.scrollIntoViewIfNeeded();await frame.hover();
  const content=resource.frameLocator('iframe');await content.locator('body').waitFor({state:'attached',timeout:30000});
  let snapshot;
  for(let attempt=0;attempt<30;attempt++){
   snapshot=await youtubeSnapshot(content);diagnostics.youtube=snapshot;
   if(snapshot.providerError)throw Error('The provider reported an embedded-player error; private diagnostics contain its message.');
   if(Number.isFinite(snapshot.duration)&&snapshot.duration>0)break;
   await page.waitForTimeout(1000);
  }
  ok('recording-duration-safe-for-short-observation',Number.isFinite(snapshot?.duration)&&snapshot.duration>60);
  for(let attempt=0;attempt<40&&!watchStarts.length;attempt++)await page.waitForTimeout(500);
  const started=watchStarts.at(-1);
  ok('short-observation-remains-below-feedback-threshold',started?.httpStatus===200&&started.due===false&&Number.isFinite(started.watchedSeconds)&&started.watchedSeconds+15<snapshot.duration*0.5);
  diagnostics.stage='provider playback';
  if(snapshot.paused!==false)await startYoutubePlayback(content);video=content.locator('video').first();
  // Advertisement playback cannot establish that the requested course recording advances.
  await page.waitForTimeout(1500);diagnostics.youtube=await youtubeSnapshot(content);
  check(!diagnostics.youtube.advertPlaying,'An advertisement is active; course playback has not been established.');
 }else{
  video=resource.locator('video');await video.waitFor({state:'attached',timeout:15000});
  const duration=await video.evaluate(async element=>{if(!Number.isFinite(element.duration))await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Metadata unavailable')),15000);element.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});});return element.duration;});
  ok('recording-duration-safe-for-short-observation',Number.isFinite(duration)&&duration>60);
  for(let attempt=0;attempt<40&&!watchStarts.length;attempt++)await page.waitForTimeout(500);
  const started=watchStarts.at(-1);
  ok('short-observation-remains-below-feedback-threshold',started?.httpStatus===200&&started.due===false&&Number.isFinite(started.watchedSeconds)&&started.watchedSeconds+15<duration*0.5);
  diagnostics.stage='provider playback';await video.evaluate(element=>element.play());
 }
 await video.waitFor({state:'attached',timeout:15000});
 await page.waitForTimeout(1500);
 diagnostics.stage='observed media advancement';
 const initial=await video.evaluate(element=>({duration:element.duration,position:element.currentTime,paused:element.paused}));
 await page.waitForTimeout(10000);
 const final=await video.evaluate(element=>{const value={duration:element.duration,position:element.currentTime,paused:element.paused};element.pause();return value;});
 await page.waitForTimeout(1000);
 ok('real-provider-playback-advanced',final.position>initial.position+5&&final.position<final.duration*0.5);
 const successful=observed.filter(sample=>sample.httpStatus===200&&sample.durationSeconds>60&&sample.due===false);
 ok('real-observations-confirmed-by-server',successful.length>=2&&successful.some(sample=>sample.playing)&&Math.max(...successful.map(sample=>sample.positionSeconds))-Math.min(...successful.map(sample=>sample.positionSeconds))>=5&&successful.some(sample=>sample.watchedSeconds>0));
 const after=await rpc(full.client,'get_my_v2_learning_state',{p_batch_id:batchId}),afterCourse=await rpc(full.client,'get_my_v2_published_course',{p_batch_id:batchId});
 ok('short-playback-created-no-feedback-or-source-change',after.obligations.length===0&&digest(afterCourse)===digest(course));
 report.observation={provider,durationSeconds:final.duration,advancementSeconds:final.position-initial.position,successfulSamples:successful.length,maximumObservedWatchedSeconds:Math.max(...successful.map(sample=>sample.watchedSeconds)),feedbackCreated:false};
 report.status='passed';
}catch(error){try{if(page)writeFileSync('/tmp/ace-phase4-provider-debug.png',await page.screenshot({fullPage:false,timeout:5000}),{mode:0o600});}catch{}const frames=[];for(const frame of page?.frames()??[]){try{frames.push({url:frame.url(),text:(await frame.locator('body').innerText({timeout:3000})).slice(0,6000)});}catch{}}writeFileSync('/tmp/ace-phase4-provider-debug.json',JSON.stringify({message:error instanceof Error?error.message:'Unknown provider error',stack:error instanceof Error?error.stack:null,diagnostics,frames},null,2),{mode:0o600});report.status='failed';report.failure='Provider acceptance stopped at the last recorded check; private resource references and browser diagnostics withheld.';process.exitCode=1;}
finally{await page?.close();await browser?.close();report.finishedAt=new Date().toISOString();save();}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,passed:report.checks.filter(item=>item.status==='pass').length}));
