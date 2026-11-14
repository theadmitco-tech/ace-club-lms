import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {PROJECT,ORIGIN,UUID,readConfig,validateConfig,check} from '../phase1-hosted-closeout-config.mjs';

const products=['full_batch','quant_crash','verbal_crash','di_crash'];
const productSections={full_batch:['quant','verbal','di'],quant_crash:['quant'],verbal_crash:['verbal'],di_crash:['di']};
const paymentKeys=['V2_RAZORPAY_TEST_KEY_ID','V2_RAZORPAY_TEST_KEY_SECRET','V2_RAZORPAY_TEST_WEBHOOK_SECRET'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sameSet=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&left.length===new Set(left).size&&right.length===new Set(right).size&&JSON.stringify([...left].sort())===JSON.stringify([...right].sort());
const instant=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
function privateText(filename){
 const info=statSync(filename);
 check(info.isFile()&&info.uid===process.getuid()&&(info.mode&0o077)===0,'Private inputs must be owner-only files.');
 check(info.size<=2_000_000,'Private input exceeds the accepted size.');
 return readFileSync(filename,'utf8');
}
export function validatePaymentConfig(config){
 check(object(config)&&Object.keys(config).every(key=>paymentKeys.includes(key)),'Unexpected payment configuration entry.');
 check(/^rzp_test_[A-Za-z0-9]+$/.test(config.V2_RAZORPAY_TEST_KEY_ID??''),'Razorpay Test Mode credentials are required.');
 check(typeof config.V2_RAZORPAY_TEST_KEY_SECRET==='string'&&config.V2_RAZORPAY_TEST_KEY_SECRET.length>=16,'A Test Mode API secret is required.');
 return config;
}
function paymentFile(filename){
 const config={};
 for(const line of privateText(filename).split(/\r?\n/)){
  if(!line.trim()||line.trimStart().startsWith('#'))continue;
  const match=/^([A-Z0-9_]+)=(.*)$/.exec(line);
  check(match&&paymentKeys.includes(match[1])&&!Object.hasOwn(config,match[1]),'Invalid payment configuration entry.');
  let value=match[2].trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  config[match[1]]=value;
 }
 return validatePaymentConfig(config);
}
export function validateManifest(manifest){
 check(object(manifest)&&manifest.schema==='phase3-payment-verification-v1'&&manifest.stagingProject===PROJECT,'The designated staging verification manifest is required.');
 check(UUID.test(manifest.runId??'')&&/^[a-f0-9]{40}$/.test(manifest.candidateCommit??''),'Manifest run and source identifiers are invalid.');
 check(Array.isArray(manifest.cases)&&manifest.cases.length>=1&&manifest.cases.length<=40,'One to forty exact checkout cases are required.');
 const seen=new Set();
 for(const entry of manifest.cases){
  check(object(entry)&&UUID.test(entry.studentId??'')&&UUID.test(entry.checkoutId??'')&&!seen.has(entry.checkoutId),'Invalid or duplicate checkout identity.');seen.add(entry.checkoutId);
  check(/^order_[A-Za-z0-9]{1,80}$/.test(entry.orderId??'')&&/^pay_[A-Za-z0-9]{1,80}$/.test(entry.paymentId??''),'Exact provider order and payment identifiers are required.');
  for(const key of ['expectedProducts','expectedAccessProducts']){
   check(Array.isArray(entry[key])&&entry[key].length<=3&&entry[key].every(code=>products.includes(code))&&new Set(entry[key]).size===entry[key].length,'Invalid expected product selection.');
   check(!entry[key].includes('full_batch')||entry[key].length===1,'Full Course must remain separate.');
  }
  check(entry.expectedProducts.length>0,'Checkout products cannot be empty.');
  for(const key of ['batchIds','liveBatchIds'])check(Array.isArray(entry[key])&&entry[key].length<=4&&entry[key].every(id=>typeof id==='string'&&UUID.test(id))&&new Set(entry[key]).size===entry[key].length,'Invalid exact batch scope.');
  check(entry.batchIds.length>0&&entry.liveBatchIds.every(id=>entry.batchIds.includes(id)),'Live batches must belong to the checkout scope.');
  check(Number.isSafeInteger(entry.expectedAmountPaise)&&entry.expectedAmountPaise>0&&entry.expectedAmountPaise<=2147483647&&entry.currency==='INR','Expected amount and INR currency are required.');
  check(['fulfilled','review','ready'].includes(entry.expectedState)&&['captured','authorized','failed','created'].includes(entry.expectedPaymentStatus),'Unsupported expected lifecycle state.');
  check(entry.expectedState!=='fulfilled'||entry.expectedPaymentStatus==='captured','Fulfillment requires a captured payment.');
  check(typeof entry.expectedActive==='boolean','The expected active-profile state is required.');
  if(entry.expectedState==='fulfilled'){
   check(object(entry.expectedExpiry)&&['six_calendar_months','fixed'].includes(entry.expectedExpiry.kind),'An independent expiry expectation is required.');
   if(entry.expectedExpiry.kind==='fixed')check(instant(entry.expectedExpiry.expiresAt),'The fixed original expiry is invalid.');
  }
  if(entry.accessToken!==undefined)check(typeof entry.accessToken==='string'&&entry.accessToken.length>=40&&entry.accessToken.length<=12000&&!/\s/.test(entry.accessToken),'Invalid caller session token.');
 }
 return manifest;
}
export function createReadOnlyTransport(staging,payment,fetchImpl=fetch){
 validateConfig(staging,{database:false});validatePaymentConfig(payment);
 const providerAuthorization=`Basic ${Buffer.from(`${payment.V2_RAZORPAY_TEST_KEY_ID}:${payment.V2_RAZORPAY_TEST_KEY_SECRET}`).toString('base64')}`;
 return async(kind,resource,token)=>{
  let url,headers;
  if(kind==='provider'){
   check(/^\/(orders\/order_[A-Za-z0-9]+|payments\/pay_[A-Za-z0-9]+)$/.test(resource),'Provider verification permits exact GET reads only.');
   url='https://api.razorpay.com/v1'+resource;headers={Authorization:providerAuthorization};
  }else{
   check(kind==='service'||kind==='caller','Unknown verification credential scope.');
   const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
   const servicePath=new RegExp(`^(?:/auth/v1/admin/users/${uuid}|/rest/v1/rpc/read_v2_checkout_service\\?p_id=${uuid}|/rest/v1/profiles\\?id=eq\\.${uuid}&select=id,email,role,is_active)$`,'i');
   const callerPath=new RegExp(`^(?:/auth/v1/user|/rest/v1/rpc/(?:get_my_v2_checkouts|get_my_v2_access|get_my_v2_purchase_packages)|/rest/v1/rpc/(?:get_my_v2_learning_state|get_my_v2_published_course)\\?p_batch_id=${uuid})$`,'i');
   check((kind==='service'?servicePath:callerPath).test(resource),'Only designated read endpoints are permitted.');
   if(kind==='caller')check(typeof token==='string'&&token.length>=40,'A caller session is required.');
   url=ORIGIN+resource;headers={apikey:kind==='service'?staging.SUPABASE_SERVICE_ROLE_KEY:staging.SUPABASE_ANON_KEY,Authorization:'Bearer '+(kind==='service'?staging.SUPABASE_SERVICE_ROLE_KEY:token)};
  }
  const response=await fetchImpl(url,{method:'GET',headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('A designated read request was rejected.');
  const length=Number(response.headers?.get('content-length'));
  if(Number.isFinite(length)&&length>2_000_000)throw new Error('Verification response exceeds the accepted size.');
  const text=await response.text();
  if(text.length>2_000_000)throw new Error('Verification response exceeds the accepted size.');
  return JSON.parse(text);
 };
}
function micros(value){
 if(!instant(value))return null;
 const fraction=/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1]??'';
 return BigInt(Date.parse(value))*1000n+BigInt(fraction.padEnd(6,'0').slice(3));
}
function sixMonths(value){
 const date=new Date(value),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+6);
 const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return BigInt(date.getTime())*1000n+(micros(value)%1000n);
}
export async function verifyPayments(manifest,read){
 validateManifest(manifest);
 const report={check:'phase3_readonly_payment_verification',recordedAt:new Date().toISOString(),stagingProject:PROJECT,candidateCommit:manifest.candidateCommit,candidateAttribution:'Operator-supplied manifest; deployment commit identity requires separate verification.',caseCount:manifest.cases.length,scope:'Fresh read-only database and Razorpay snapshots. No order creation, payment capture, fulfillment, webhook delivery, OAuth login, account mutation or cleanup is performed.',checks:[],status:'running',limitations:['Provider state is freshly fetched with Test Mode credentials; a supplied success message is never accepted as provider evidence.','A present Google provider marker and confirmed email are metadata checks, not evidence of an actual OAuth redirect flow.','Snapshot consistency does not establish webhook delivery, retry idempotency, concurrent capacity behavior or complete Phase 3 acceptance.']};
 const record=(index,id,passed)=>report.checks.push({case:index,check:id,status:passed?'pass':'fail'});
 for(const [index,c] of manifest.cases.entries()){
  try{
   const intent=await read('service',`/rest/v1/rpc/read_v2_checkout_service?p_id=${c.checkoutId}`);
   record(index,'checkout-identity-and-scope',object(intent)&&intent.id===c.checkoutId&&intent.student_id===c.studentId&&sameSet(intent.products,c.expectedProducts)&&Array.isArray(intent.batches)&&sameSet(intent.batches.map(b=>b.batchId),c.batchIds)&&sameSet(intent.live_batches,c.liveBatchIds));
   if(!object(intent)){report.checks.push({case:index,check:'dependent-reads',status:'incomplete'});continue;}
   record(index,'checkout-amount-and-state',intent.amount_paise===c.expectedAmountPaise&&intent.currency==='INR'&&intent.state===c.expectedState&&intent.provider_order_id===c.orderId);
   const order=await read('provider',`/orders/${c.orderId}`),payment=await read('provider',`/payments/${c.paymentId}`);
   record(index,'provider-order-identity-and-price',object(order)&&order.entity==='order'&&order.id===c.orderId&&order.receipt===c.checkoutId&&order.amount===c.expectedAmountPaise&&order.currency==='INR');
   record(index,'provider-payment-identity-and-price',object(payment)&&payment.entity==='payment'&&payment.id===c.paymentId&&payment.order_id===c.orderId&&payment.amount===c.expectedAmountPaise&&payment.currency==='INR'&&payment.status===c.expectedPaymentStatus);
   if(c.expectedPaymentStatus==='captured')record(index,'provider-captured-and-paid',payment?.captured===true&&payment?.amount_refunded===0&&order?.status==='paid'&&order?.amount_paid===c.expectedAmountPaise&&order?.amount_due===0);
   else record(index,'provider-not-captured',payment?.captured===false&&payment?.amount_refunded===0&&order?.status!=='paid'&&order?.amount_paid===0&&order?.amount_due===c.expectedAmountPaise);
   if(c.expectedState==='fulfilled')record(index,'fulfilled-provider-references',intent.provider_payment_id===c.paymentId&&UUID.test(intent.purchase_id??'')&&instant(intent.verified_at)&&instant(intent.fulfilled_at));
   else record(index,'unfulfilled-does-not-claim-purchase',intent.purchase_id===null&&intent.fulfilled_at===null);
   const account=await read('service',`/auth/v1/admin/users/${c.studentId}`);
   const user=account?.user??account;
   const profiles=await read('service',`/rest/v1/profiles?id=eq.${c.studentId}&select=id,email,role,is_active`);
   const profile=Array.isArray(profiles)&&profiles.length===1?profiles[0]:null;
   record(index,'student-profile-and-confirmed-google-metadata',user?.id===c.studentId&&profile?.id===c.studentId&&profile?.role==='student'&&profile?.is_active===c.expectedActive&&user?.app_metadata?.provider==='google'&&instant(user?.email_confirmed_at)&&typeof user.email==='string'&&user.email===intent.email&&profile.email===user.email);
   if(!c.accessToken){report.checks.push({case:index,check:'caller-bound-access-and-history',status:'incomplete'});continue;}
   const caller=await read('caller','/auth/v1/user',c.accessToken);
   record(index,'caller-session-binding',caller?.id===c.studentId);
   if(caller?.id!==c.studentId)continue;
   const history=await read('caller','/rest/v1/rpc/get_my_v2_checkouts',c.accessToken);
   const selected=Array.isArray(history)?history.filter(h=>h.id===c.checkoutId):[];
   const foreignCheckouts=manifest.cases.filter(other=>other.studentId!==c.studentId).map(other=>other.checkoutId);
   if(foreignCheckouts.length)record(index,'foreign-fixture-history-hidden',Array.isArray(history)&&!history.some(h=>foreignCheckouts.includes(h.id)));
   record(index,'caller-checkout-history',selected.length===1&&selected[0].state===c.expectedState&&selected[0].amountPaise===c.expectedAmountPaise&&selected[0].currency==='INR'&&sameSet(selected[0].products,c.expectedProducts));
   const access=await read('caller','/rest/v1/rpc/get_my_v2_access',c.accessToken);
   record(index,'caller-exact-entitlements',Array.isArray(access)&&sameSet(access.map(a=>a.product_code),c.expectedAccessProducts));
   record(index,'caller-subject-boundaries',Array.isArray(access)&&access.every(a=>sameSet(a.sections,productSections[a.product_code]??[])));
   if(c.expectedState==='fulfilled'){
    const packages=await read('caller','/rest/v1/rpc/get_my_v2_purchase_packages',c.accessToken);
    const own=Array.isArray(packages)?packages.filter(p=>p.id===intent.purchase_id):[];
    const validExpiry=c.expectedExpiry.kind==='fixed'?micros(c.expectedExpiry.expiresAt):!intent.base_purchase_id&&instant(intent.verified_at)?sixMonths(intent.verified_at):null;
    record(index,'purchase-package-and-original-expiry',own.length===1&&sameSet(own[0].products,c.expectedAccessProducts)&&instant(own[0].expiresAt)&&micros(own[0].expiresAt)===validExpiry&&selected.length===1&&micros(selected[0].expiresAt)===validExpiry&&Array.isArray(access)&&access.every(a=>micros(a.expires_at)===validExpiry));
    for(const [batchIndex,batchId] of c.batchIds.entries()){
     const course=await read('caller',`/rest/v1/rpc/get_my_v2_published_course?p_batch_id=${batchId}`,c.accessToken);
     const learning=await read('caller',`/rest/v1/rpc/get_my_v2_learning_state?p_batch_id=${batchId}`,c.accessToken);
     record(index,`course-${batchIndex}-enrollment-and-live-scope`,object(course)&&course.batchId===batchId&&Array.isArray(course.sessions)&&course.sessions.every(s=>c.expectedAccessProducts.some(code=>productSections[code].includes(s.section)||(code==='full_batch'&&s.section==='programme')))&&object(learning)&&learning.batchId===batchId&&learning.liveRegistered===c.liveBatchIds.includes(batchId));
    }
   }
  }catch{report.checks.push({case:index,check:'read-request-completed',status:'incomplete'});}
 }
 report.status=report.checks.some(c=>c.status==='fail')?'failed':report.checks.some(c=>c.status==='incomplete')?'incomplete':'passed';
 return report;
}
export async function main(argv=process.argv.slice(2)){
 if(argv.includes('--help')){console.log('Read-only verification: --manifest <private-json> --staging-env <private-env> --razorpay-env <private-test-env> --output <sanitized-report>');return;}
 check(process.env.NODE_ENV!=='production'&&process.env.VERCEL_ENV!=='production','Production execution is excluded.');
 const options={};
 for(let i=0;i<argv.length;i+=2){check(['--manifest','--staging-env','--razorpay-env','--output'].includes(argv[i])&&!Object.hasOwn(options,argv[i])&&argv[i+1]&&!argv[i+1].startsWith('--'),'Invalid verification option.');options[argv[i]]=argv[i+1];}
 check(Object.keys(options).length===4,'All verification paths are required.');
 check(['--manifest','--staging-env','--razorpay-env'].every(key=>path.resolve(options[key])!==path.resolve(options['--output'])),'The report must not overwrite a private input.');
 const manifest=validateManifest(JSON.parse(privateText(options['--manifest']))),staging=readConfig(options['--staging-env'],{database:false}),payment=paymentFile(options['--razorpay-env']);
 const report=await verifyPayments(manifest,createReadOnlyTransport(staging,payment));
 report.execution='Live read requests; no mutating endpoint is invoked.';
 report.verifierSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
 writeFileSync(options['--output'],JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({check:report.check,status:report.status,cases:report.caseCount,checks:report.checks.length}));
 if(report.status!=='passed')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){main().catch(()=>{console.error('Payment verification could not complete. Private input permissions, staging/Test Mode scope and manifest format require verification.');process.exitCode=1;});}
