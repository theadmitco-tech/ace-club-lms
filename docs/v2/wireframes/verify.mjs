import { chromium } from 'playwright-core';
const entry = new URL('./index.html', import.meta.url).href;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const failures=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(entry);
await page.locator('#review-tools summary').click();
const scenarios=await page.locator('#scenario option').evaluateAll(xs=>xs.map(x=>x.value));
for(const id of scenarios){await page.selectOption('#scenario',id);if(!await page.locator('h1').textContent())failures.push(id+' missing heading');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))failures.push(id+' overflow');}
await page.selectOption('#scenario','quant4');await page.locator('[data-session="4"]').first().click();await page.locator('[data-action="read"]').click();if(await page.locator('#content').innerText().then(t=>t.includes('Feedback required for Quant 4')))failures.push('read creates lock');await page.locator('[data-action="watched"]').click();await page.locator('[data-action="submit-feedback"]').click();if(!await page.locator('h1').innerText().then(x=>x.includes('being confirmed')))failures.push('confirmation waiting');await page.locator('[data-action="confirm-feedback"]').click();await page.locator('[data-screen="course"]').last().click();if(await page.locator('[data-session]:disabled').count())failures.push('confirmed lock retained');
await page.selectOption('#scenario','missing');await page.locator('[data-screen="feedback"]').first().click();await page.locator('input[value="missed"]').check();await page.locator('[data-action="submit-feedback"]').click();await page.locator('[data-action="confirm-feedback"]').click();if(!await page.locator('h1').innerText().then(t=>t.includes('confirmed')))failures.push('missed unlock');
await page.selectOption('#scenario','editor');await page.fill('#reading-title','Edited ratio reading');await page.locator('[data-action="preview-reading"]').first().click();if(!await page.locator('.reading-view h2').innerText().then(t=>t==='Edited ratio reading'))failures.push('draft title');
await page.fill('#post-title','Edited post recap');await page.locator('[data-action="preview-post"]').click();if(!await page.locator('.reading-view h2').innerText().then(t=>t==='Edited post recap'))failures.push('post draft title');
await page.locator('[data-action="reorder"]').click();if(!await page.locator('#content').innerText().then(t=>t.includes('1. Quant notation refresher → 2. Edited ratio reading')))failures.push('reading order');
for(const id of ['expired','unpaid']){await page.selectOption('#scenario',id);await page.locator('#nav [data-screen="course"]').click();if(await page.locator('.player').count()||await page.locator('[data-session]').count())failures.push(id+' sidebar bypass');await page.locator('#nav [data-screen="session"]').click();if(await page.locator('.player').count())failures.push(id+' session bypass');}
await page.selectOption('#scenario','browse');await page.locator('[data-offering="DI"]').click();if(await page.locator('.outline').innerText().then(t=>t.includes('Verbal')||t.includes('Quant')))failures.push('DI outline scope');await page.locator('[data-action="purchase"]').click();if(!await page.locator('h1').innerText().then(t=>t.startsWith('DI')))failures.push('DI purchase wrong course');await page.locator('[data-subject="Quant"]').click();if(!await page.locator('h1').innerText().then(t=>t.includes('Add Quant')))failures.push('DI grants Quant');await page.locator('#nav [data-screen="course"]').click();if(!await page.locator('h1').innerText().then(t=>t.startsWith('DI')))failures.push('upgrade option blocks owned DI');
await page.selectOption('#scenario','watch');await page.locator('[data-action="post-read"]').click();if(!await page.locator('.reading-view h2').innerText().then(t=>t==='After class: Ratio practice and recap'))failures.push('post reading placement');if(!await page.locator('#content').innerText().then(t=>t.includes('Before class: Ratios and mixtures')))failures.push('post mutates pretitle');
await page.selectOption('#scenario','publish');await page.locator('[data-action="publish"]').click();if(!await page.locator('#toast').innerText().then(t=>t.includes('Confirm')))failures.push('scope bypass');await page.check('#scope-confirm');await page.locator('[data-action="publish"]').click();await page.check('#scope-confirm');await page.locator('[data-action="unpublish"]').click();if(!await page.locator('[data-action="publish"]').innerText().then(t=>t.includes('republish')))failures.push('republish');
await page.selectOption('#scenario','support');await page.locator('[data-action="override"]').click();if(!await page.locator('#toast').innerText().then(t=>t.includes('reason')))failures.push('reason bypass');await page.fill('#override-reason','Provider delayed; confirmation investigated.');await page.check('#override-confirm');await page.locator('[data-action="override"]').click();if(!await page.locator('.audit').innerText().then(t=>t.includes('Provider delayed')))failures.push('audit reason');
await page.selectOption('#scenario','live-admin');await page.check('#completion-confirm');await page.locator('[data-action="complete-class"]').click();if(!await page.locator('[data-action="complete-class"]').isDisabled())failures.push('completion not saved');

// Browsing live offerings cannot turn recordings access into live registration.
await page.selectOption('#scenario','browse');
await page.locator('[data-offering="DI"]').click();
if(await page.locator('.public-sessions li').count()!==6)failures.push('public available-session list');
if(await page.locator('.public-sessions').innerText().then(t=>t.includes('Quant')))failures.push('public sessions wrong subject');
if(await page.locator('.player').count())failures.push('public session list exposes recording');
await page.locator('[data-action="purchase"]').click();
await page.locator('[data-session="1"]').first().click();
await page.locator('details').filter({hasText:'Interested in live classes?'}).locator('summary').click();
await page.locator('[data-action="explore-live"]').click();
await page.locator('#nav [data-screen="session"]').click();
if(await page.locator('[data-action="meet"]').count())failures.push('live browsing grants Meet');
await page.selectOption('#scenario','live');
if(await page.locator('[data-action="meet"]').count()!==1)failures.push('registered live missing Meet');
await page.locator('#nav [data-screen="course"]').click();await page.locator('[data-subject="DI"]').click();await page.locator('[data-session="1"]').first().click();
if(await page.locator('[data-action="meet"]').count())failures.push('Quant live registration grants DI Meet');

// New-tab student previews use unsaved draft input and do not mutate the editor or feedback.
await page.selectOption('#scenario','editor');
await page.selectOption('#admin-offering','DI');
await page.fill('#reading-title','Compare tables before class');
await page.fill('#post-title','Review the table evidence');
await page.selectOption('#placement','course-top');
await page.locator('[data-action="reorder"]').click();
await page.fill('#reading-title','Unsaved DI draft title');
const previewPagePromise=page.context().waitForEvent('page');
await page.locator('[data-action="student-recordings"]').click();
const previewPage=await previewPagePromise;
await previewPage.waitForLoadState();
if(!await previewPage.locator('h1').innerText().then(t=>t.startsWith('DI 4')))failures.push('draft offering lost');
if(!await previewPage.locator('.reading-view h2').innerText().then(t=>t==='Unsaved DI draft title'))failures.push('unsaved draft title lost');
if(!await previewPage.locator('.reading-view').innerText().then(t=>t.includes('At the top of the subject area')&&t.includes('Item 2')))failures.push('draft placement/order lost');
if(await previewPage.locator('[data-action="meet"]').count())failures.push('recording preview grants Meet');
if(!await previewPage.locator('.reading-view').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.lesson-stage'))&Node.DOCUMENT_POSITION_FOLLOWING)))failures.push('course-top preview placement');
if(await page.locator('#reading-title').inputValue()!=='Unsaved DI draft title')failures.push('preview changed source editor');
await previewPage.close();
await page.selectOption('#admin-offering','Quant');
await page.locator('[data-action="preview-post"]').click();
await page.fill('#post-title','Unsaved post-read draft');
const postPagePromise=page.context().waitForEvent('page');
await page.locator('[data-action="student-live"]').click();
const postPage=await postPagePromise;await postPage.waitForLoadState();
if(!await postPage.locator('.reading-view h2').innerText().then(t=>t==='Unsaved post-read draft'))failures.push('new-tab post-read lost');
await postPage.locator('[data-action="watched"]').click();
if(!await postPage.locator('h1').innerText().then(t=>t.startsWith('Quant 4')))failures.push('draft preview creates feedback');
await postPage.close();

// Completion confirms the selected schedule; correction changes class status only.
await page.selectOption('#scenario','live-admin');
await page.fill('#live-date','2026-11-09');await page.fill('#live-time','19:15');
await page.check('#completion-confirm');await page.locator('[data-action="complete-class"]').click();
if(await page.locator('[data-action="complete-class"]').isDisabled())failures.push('completion accepts unsaved date');
await page.locator('[data-action="save-schedule"]').click();
if(!await page.locator('.notice').first().innerText().then(t=>t.includes('2026-11-09, 19:15 IST')))failures.push('completion shows stale schedule');
await page.locator('[data-action="complete-class"]').click();
if(await page.locator('[data-action="complete-class"]').isDisabled())failures.push('completion bypasses confirmation');
await page.check('#completion-confirm');await page.locator('[data-action="complete-class"]').click();
await page.locator('[data-action="reverse-completion"]').click();
await page.fill('#correction-reason','Wrong class selected in demo');
await page.locator('[data-action="record-correction"]').click();
if(!await page.locator('#correction-confirm').count())failures.push('correction bypasses confirmation');
await page.check('#correction-confirm');await page.locator('[data-action="record-correction"]').click();
if(!await page.locator('.audit').innerText().then(t=>t.includes('Class status corrected to Scheduled')&&t.includes('Wrong class selected in demo')&&t.includes('2026-11-09 19:15 IST')))failures.push('class correction audit');
if(!await page.locator('.table').innerText().then(t=>t.includes('Quant locked')&&t.includes('Submitted · preserved')))failures.push('correction changes unresolved locks or submissions');
await page.locator('#nav [data-screen="live-admin"]').click();
if(await page.locator('[data-action="complete-class"]').isDisabled())failures.push('corrected class remains completed');

// Reading controls affect presentation only; they must retain the access/feedback state.
await page.selectOption('#scenario','reading');
await page.locator('[data-action="text-size"]').click();
if(await page.locator('[data-action="text-size"]').getAttribute('aria-pressed')!=='true')failures.push('larger text state');
if(await page.locator('.reading-prose').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))<20)failures.push('larger reading not applied');
await page.locator('[data-action="focus-mode"]').click();
if(await page.locator('.sidebar').isVisible()||await page.locator('.lesson-aside').isVisible())failures.push('focus mode distractions');
if(!await page.locator('.reading-view').isVisible())failures.push('focus hides reading');
await page.keyboard.press('Escape');
if(!await page.locator('.sidebar').isVisible())failures.push('cannot exit focus');
if(await page.locator('[data-action="focus-mode"]').getAttribute('aria-pressed')!=='false')failures.push('focus aria state');
await page.locator('[data-action="text-size"]').click();
await page.selectOption('#scenario','missing');
await page.locator('[data-action="focus-mode"]').click();
await page.locator('[data-screen="feedback"]').first().click();
if(!await page.locator('input[value="missed"]').isVisible())failures.push('focus prevents required feedback');
for(const width of [1366,1024]){
 await page.setViewportSize({width,height:900});
 for(const id of ['quant4','reading','watch','locked','editor','preview','support']){
  await page.selectOption('#scenario',id);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))failures.push(`${id} overflow at ${width}`);
 }
}
await page.setViewportSize({width:1440,height:1000});
await page.selectOption('#scenario','reading');
await page.addStyleTag({content:'* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p {margin-bottom:2em!important}'});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))failures.push('reading spacing overflow');
if(!await page.locator('[data-action="read"]').isVisible())failures.push('reading spacing loses controls');

await page.goto(entry+'?print=1');if(await page.locator('.print-screen').count()!==23)failures.push('printcount');
console.log(JSON.stringify({scenarios:scenarios.length,failures,errors}));await browser.close();if(failures.length||errors.length)process.exit(1);
