import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
const base='https://ace-club-m72s5ztc9-theadmitco-techs-projects.vercel.app';
const out='/tmp/ace-closeout-hosted-final';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(await readFile('/tmp/ace-closeout-share-url','utf8'),{waitUntil:'networkidle'});
  await unlink('/tmp/ace-closeout-share-url');
  await page.goto(base+'/qa/phase1',{waitUntil:'networkidle'});
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/v2/phase1-verification')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Run read-only staging checks'}).click();
  const response=await pending; const report=await response.json();
  await page.getByRole('button',{name:'Copy sanitized report'}).waitFor();
  await page.screenshot({path:out+'/qa-anonymous.png',fullPage:true});
  const result={date:new Date().toISOString(),base,httpStatus:response.status(),errors,report};
  await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  if(response.status()!==200||report.overall==='fail'||report.commit!=='155b3fbffc46db94be0fbee70b7b6fd9465a74b4') process.exitCode=1;
} catch(e) {console.error(String(e.message).replace(/_vercel_share=[^&\s]+/g,'_vercel_share=[redacted]'));process.exitCode=1;}
finally {await browser.close();}
