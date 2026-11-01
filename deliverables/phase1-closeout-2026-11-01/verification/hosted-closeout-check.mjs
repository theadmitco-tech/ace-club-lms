import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
const base = 'https://ace-club-fay0xtx3g-theadmitco-techs-projects.vercel.app';
const out = '/tmp/ace-closeout-hosted';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [], checks = [], hosts = new Set();
page.on('pageerror', e => errors.push(e.message));
const responses = [];
page.on('response', r => { if (r.url().includes('/_next/static/') && r.url().endsWith('.js')) responses.push(r.text().then(t => { for (const m of t.matchAll(/https:\/\/([a-z]+)\.supabase\.co/g)) hosts.add(m[1]); }).catch(() => {})); });
try {
  const share = await readFile('/tmp/ace-closeout-share-url', 'utf8');
  await page.goto(share, {waitUntil:'networkidle'});
  await unlink('/tmp/ace-closeout-share-url');
  await page.goto(base + '/courses/v2', {waitUntil:'networkidle'});
  await page.getByRole('heading', {name:'Choose your subjects'}).waitFor();
  checks.push({name:'Hosted package catalogue',status:'pass'});
  await page.screenshot({path:out+'/catalogue-desktop.png',fullPage:true});
  const selections = [['quant'],['verbal'],['di'],['quant','verbal'],['quant','di'],['verbal','di'],['quant','verbal','di'],['full_course']];
  for (const selection of selections) {
    const params = new URLSearchParams(selection.map(s=>['course',s]));
    await page.goto(base+'/courses/v2?'+params, {waitUntil:'networkidle'});
    const text = await page.locator('#quote').innerText();
    const expected = selection[0]==='full_course'||selection.length===3?'25,000':selection.length===2?'18,000':'10,000';
    checks.push({name:selection.join('+'),status:text.includes(expected)?'pass':'fail',expected});
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/courses/v2', {waitUntil:'networkidle'});
  checks.push({name:'Mobile catalogue overflow',status:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)?'pass':'fail'});
  await page.screenshot({path:out+'/catalogue-mobile.png',fullPage:true});
  await page.goto(base+'/account/access/upgrade', {waitUntil:'networkidle'});
  checks.push({name:'Signed-out upgrade requires LMS login',status:new URL(page.url()).pathname==='/login'?'pass':'fail',path:new URL(page.url()).pathname});
  await page.goto(base+'/qa/phase1', {waitUntil:'networkidle'});
  const responsePromise = page.waitForResponse(r=>r.url().endsWith('/api/v2/phase1-verification')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Run read-only staging checks'}).click();
  const response = await responsePromise;
  const report = await response.json();
  await writeFile(out+'/anonymous-report.json',JSON.stringify(report,null,2));
  checks.push({name:'Hosted same-origin diagnostic POST',status:response.status()===200?'pass':'fail',httpStatus:response.status()});
  await page.getByRole('button',{name:'Copy sanitized report'}).waitFor();
  await page.screenshot({path:out+'/qa-anonymous.png',fullPage:true});
  await Promise.allSettled(responses);
  const result={date:new Date().toISOString(),commit:'c277a7f99499660f25674a40612665c1bfc5a2fe',deployment:'dpl_CCmEa9zXQEBmp1okUsSJw6hiwGPS',base,checks,errors,observedSupabaseHosts:[...hosts],diagnostic:report};
  await writeFile(out+'/results.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} catch(e) { console.error('Hosted check failed:', String(e.message).replace(/_vercel_share=[^&\s]+/g,'_vercel_share=[redacted]')); process.exitCode=1; }
finally { await browser.close(); }
