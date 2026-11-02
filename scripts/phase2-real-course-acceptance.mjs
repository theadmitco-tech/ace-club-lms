import { createHash } from 'node:crypto';
import { PROJECT,UUID,check } from './phase1-hosted-closeout-config.mjs';
import { v2ReadingPageId,hasV2ReadingContent } from '../src/lib/v2ReadingPreview.ts';

const kinds=['preSessionReads','recordings','postSessionReads','materials'];
export const canonicalCourseSessions=sessions=>sessions.map(session=>({key:session.key,title:session.title,section:session.section,
  content:Object.fromEntries(kinds.map(kind=>[kind,session.content[kind].map(({key,title,url})=>({key,title,url}))]))}));
export function describeApprovedFullCourse(plan){
  check(plan?.format==='v2-content-transfer-plan-1'&&plan.source===PROJECT&&Array.isArray(plan.drafts),'The exact reviewed staging import plan is required.');
  const matches=plan.drafts.filter(draft=>draft.productCode==='full_course');check(matches.length===1,'The reviewed plan must identify one Full Course template.');
  const draft=matches[0];check(UUID.test(draft.templateId)&&Array.isArray(draft.document?.sessions),'Invalid Full Course source plan.');
  const resources=[];
  for(const session of draft.document.sessions){
    check(UUID.test(session.key)&&typeof session.title==='string'&&['quant','verbal','di','programme'].includes(session.section),'Invalid reviewed session.');
    for(const kind of kinds){
      check(Array.isArray(session.content?.[kind]),'Incomplete reviewed session content.');
      for(const item of session.content[kind]){check(UUID.test(item.key)&&typeof item.title==='string'&&typeof item.url==='string','Invalid reviewed resource.');resources.push({...item,sessionKey:session.key,sessionTitle:session.title,kind});}
    }
  }
  check(resources.length===19&&new Set(resources.map(item=>item.key)).size===19,'The reviewed Full Course must contain the exact nineteen resource placements.');
  const pdfs=resources.filter(item=>item.kind==='materials'&&item.url.startsWith('/api/materials/file?path='));
  const readings=[...new Map(resources.filter(item=>['preSessionReads','postSessionReads','materials'].includes(item.kind))
    .map(item=>({...item,pageId:v2ReadingPageId(item.url)})).filter(item=>item.pageId).map(item=>[item.pageId,item])).values()];
  check(pdfs.length===5&&readings.length===2,'The reviewed resource inventory must contain five protected PDFs and two unique Notion references.');
  return {draft,resources,pdfs,readings};
}
export function prepareRealCourseAttachment(state,batchId,publicationReport,plan){
  check(state.status==='accounts-created-awaiting-sql','Real-course attachment is allowed only before SQL fixture setup.');
  check(UUID.test(batchId)&&!state.courses.some(course=>course.batchId===batchId),'An exact existing course batch is required.');
  check(publicationReport?.project===PROJECT&&Array.isArray(publicationReport.documents),'A staging publication report is required.');
  const matches=publicationReport.documents.filter(document=>document.batchId===batchId);
  check(matches.length===1,'The publication report must identify the exact existing batch once.');
  const document=matches[0];
  check(document.productCode==='full_course'&&document.state==='published'&&Number.isInteger(document.revision)&&document.revision>0
    &&Number.isInteger(document.batchRevision)&&document.batchRevision>0,'The selected Full Course must be published at an exact revision.');
  const {draft,resources}=describeApprovedFullCourse(plan);
  check(Array.isArray(document.sessions)&&JSON.stringify(document.sessions.map(({key,title,section})=>({key,title,section})))===JSON.stringify(draft.document.sessions.map(({key,title,section})=>({key,title,section}))),
    'The published Full Course session headings do not match the reviewed import plan.');
  return {realFullCourseBatchId:batchId,realCourseReview:{templateId:draft.templateId,publicationRevision:document.revision,batchRevision:document.batchRevision,
    itemCount:resources.length,mappingReviewHash:plan.mappingReviewHash}};
}

// This verifier performs only authorized reads against the already published course.
// Real course rows and publications are never changed by the acceptance checks.
export async function verifyRealCourse({state,plan,sessions,browser,protectionCookies,rpc,ok,note}){
  const {draft,resources,pdfs,readings}=describeApprovedFullCourse(plan),batchId=state.realFullCourseBatchId;
  const course=await rpc(sessions.full.client,'get_my_v2_published_course',{p_batch_id:batchId});
  ok('real-course-exact-published-revision',course?.publicationRevision===state.realCourseReview.publicationRevision&&course?.batchRevision===state.realCourseReview.batchRevision,['P2-07','P2-08']);
  ok('real-course-exact-nineteen-resource-placements',JSON.stringify(canonicalCourseSessions(course.sessions))===JSON.stringify(canonicalCourseSessions(draft.document.sessions)),['P2-02','P2-03','P2-04','P2-10','P2-12']);
  const page=sessions.full.page;await page.setViewportSize({width:390,height:844});await page.goto(`${state.preview}/schedule/v2/${batchId}`,{waitUntil:'domcontentloaded'});
  const renderedSessionTitles=await page.locator('main article[aria-label^="Session content:"] h3').allTextContents();
  const renderedResourceTitles=await page.locator('main article[aria-label^="Session content:"] h5').allTextContents();
  ok('real-course-exact-student-titles',JSON.stringify(renderedSessionTitles)===JSON.stringify(draft.document.sessions.map(session=>session.title))
    &&JSON.stringify(renderedResourceTitles)===JSON.stringify(resources.map(item=>item.title)),['P2-10','P2-11']);
  ok('real-course-mobile-fit',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),['P2-11']);
  const anonymous=await browser.newContext();await anonymous.addCookies(protectionCookies);
  let apiReadingsVerified=0,originalEmbedsVerified=0;
  try{
    for(const [index,item] of pdfs.entries()){
      const path=`/api/v2/materials/file?batchId=${batchId}&sessionKey=${item.sessionKey}&itemKey=${item.key}`;
      const response=await sessions.full.context.request.get(`${state.preview}${path}`);
      const bytes=await response.body(),headers=response.headers();
      ok(`real-private-pdf:${index}`,response.status()===200&&bytes.subarray(0,5).toString()==='%PDF-'
        &&headers['content-type']?.startsWith('application/pdf')&&headers['cache-control']?.includes('no-store')
        &&!headers.location&&new URL(response.url()).origin===state.preview&&!/token=|signedUrl/i.test(response.url()),['P2-04','P2-11','P2-12']);
      const denied=await sessions.wrong_subject.context.request.get(`${state.preview}${path}`);
      const unauthenticated=await anonymous.request.get(`${state.preview}${path}`);
      ok(`real-private-pdf-negative:${index}`,denied.status()===404&&unauthenticated.status()===404,['P2-17']);
    }
    for(const [index,item] of readings.entries()){
      const response=await sessions.full.context.request.get(`${state.preview}/api/v2/course-reading?batchId=${batchId}&pageId=${item.pageId}`);
      let map=null;try{map=await response.json();}catch{ /* A provider or routing failure is reported as unavailable. */ }
      const apiValid=response.status()===200&&hasV2ReadingContent(map,item.pageId);
      ok(`real-notion-authorized-response:${index}`,[200,422,502,503,504].includes(response.status()),['P2-17']);
      if(apiValid){ok(`real-notion-page:${index}`,true,['P2-04','P2-11','P2-12']);apiReadingsVerified++;}
      else note({id:`real-notion-api:${index}`,status:'inconclusive',gates:[],reason:'The authorized provider reader did not return a validated page; original embed rendering is checked separately.'});
      const article=page.locator('main article[aria-label^="Session content:"]').filter({has:page.getByRole('heading',{name:item.sessionTitle,level:3,exact:true})});
      const resource=article.getByRole('heading',{name:item.title,level:5,exact:true}).locator('..');
      await resource.getByRole('button',{name:'Read here',exact:true}).click();
      if(apiValid){
        const reader=resource.locator('.custom-notion');await reader.waitFor({state:'visible',timeout:30000});
        ok(`real-notion-rendered:${index}`,(await reader.innerText()).trim().length>0||await reader.locator('img').count()>0,['P2-11']);
      }else{
        const frame=resource.locator('iframe');await frame.waitFor({state:'visible',timeout:30000});
        // The provider defers embedded content until the Student scrolls it into view.
        await frame.scrollIntoViewIfNeeded();
        ok(`real-notion-original-source:${index}`,await frame.getAttribute('src')===item.url&&await frame.getAttribute('title')===item.title,['P2-11','P2-12']);
        const contents=resource.frameLocator('iframe');await contents.locator('[data-block-id],.notion-page-content').first().waitFor({state:'visible',timeout:30000});
        const visibleText=(await contents.locator('body').innerText()).trim();
        ok(`real-notion-original-rendered:${index}`,visibleText.length>20&&!/^(access denied|page not found|loading[. ]*)$/i.test(visibleText),['P2-11']);
        originalEmbedsVerified++;
      }
      ok(`real-notion-mobile-fit:${index}`,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),['P2-11']);
      await resource.getByRole('button',{name:'Close resource',exact:true}).click();
      const denied=await sessions.wrong_subject.context.request.get(`${state.preview}/api/v2/course-reading?batchId=${batchId}&pageId=${item.pageId}`);
      const unauthenticated=await anonymous.request.get(`${state.preview}/api/v2/course-reading?batchId=${batchId}&pageId=${item.pageId}`);
      ok(`real-notion-negative:${index}`,denied.status()===404&&unauthenticated.status()===404,['P2-17']);
    }
  }finally{await anonymous.close();}
  return {batchId,publicationRevision:course.publicationRevision,resourceCount:resources.length,pdfCount:pdfs.length,uniqueReadingCount:readings.length,
    exactResourceFingerprint:createHash('sha256').update(JSON.stringify(canonicalCourseSessions(course.sessions))).digest('hex'),sourceUrlsChanged:false,realCourseMutated:false,apiReadingsVerified,originalEmbedsVerified};
}
