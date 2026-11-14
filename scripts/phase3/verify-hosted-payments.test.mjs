import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadOnlyTransport,validateManifest,validatePaymentConfig,verifyPayments} from './verify-hosted-payments.mjs';
import {PROJECT,ORIGIN} from '../phase1-hosted-closeout-config.mjs';

const ids={run:'11111111-1111-4111-8111-111111111111',student:'22222222-2222-4222-8222-222222222222',checkout:'33333333-3333-4333-8333-333333333333',batch:'44444444-4444-4444-8444-444444444444',purchase:'55555555-5555-4555-8555-555555555555',foreignStudent:'66666666-6666-4666-8666-666666666666',foreignCheckout:'77777777-7777-4777-8777-777777777777'};
const token='private-synthetic-session-token-that-is-not-real';
const jwt=role=>'synthetic.'+Buffer.from(JSON.stringify({role,ref:PROJECT})).toString('base64url')+'.signature';
const staging={SUPABASE_URL:ORIGIN,SUPABASE_ANON_KEY:jwt('anon'),SUPABASE_SERVICE_ROLE_KEY:jwt('service_role')};
const paymentConfig={V2_RAZORPAY_TEST_KEY_ID:'rzp_test_synthetic',V2_RAZORPAY_TEST_KEY_SECRET:'synthetic-test-secret-only'};
function fixture(){
 const manifest={schema:'phase3-payment-verification-v1',stagingProject:PROJECT,runId:ids.run,candidateCommit:'a'.repeat(40),cases:[{studentId:ids.student,checkoutId:ids.checkout,orderId:'order_synthetic',paymentId:'pay_synthetic',expectedProducts:['quant_crash'],expectedAccessProducts:['quant_crash'],batchIds:[ids.batch],liveBatchIds:[],expectedAmountPaise:1000000,currency:'INR',expectedState:'fulfilled',expectedPaymentStatus:'captured',expectedActive:true,expectedExpiry:{kind:'six_calendar_months'},accessToken:token}]};
 const user={id:ids.student,email:'synthetic@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'google'}};
 const intent={id:ids.checkout,student_id:ids.student,products:['quant_crash'],batches:[{batchId:ids.batch,publicationRevision:1}],live_batches:[],amount_paise:1000000,currency:'INR',state:'fulfilled',provider_order_id:'order_synthetic',provider_payment_id:'pay_synthetic',purchase_id:ids.purchase,base_purchase_id:null,verified_at:'2026-08-31T12:34:56.123456Z',fulfilled_at:'2026-08-31T12:34:56.123456Z',email:user.email};
 const expiresAt='2027-02-28T12:34:56.123456Z';
 const responses={
  ['/rest/v1/rpc/read_v2_checkout_service?p_id='+ids.checkout]:intent,
  '/orders/order_synthetic':{entity:'order',id:'order_synthetic',receipt:ids.checkout,amount:1000000,amount_paid:1000000,amount_due:0,currency:'INR',status:'paid'},
  '/payments/pay_synthetic':{entity:'payment',id:'pay_synthetic',order_id:'order_synthetic',amount:1000000,currency:'INR',status:'captured',captured:true,amount_refunded:0,contact:'private-contact',email:user.email},
  ['/auth/v1/admin/users/'+ids.student]:user,
  ['/rest/v1/profiles?id=eq.'+ids.student+'&select=id,email,role,is_active']:[{id:ids.student,email:user.email,role:'student',is_active:true}],
  '/auth/v1/user':user,
  '/rest/v1/rpc/get_my_v2_checkouts':[{id:ids.checkout,state:'fulfilled',amountPaise:1000000,currency:'INR',products:['quant_crash'],expiresAt}],
  '/rest/v1/rpc/get_my_v2_access':[{product_code:'quant_crash',sections:['quant'],expires_at:expiresAt}],
  '/rest/v1/rpc/get_my_v2_purchase_packages':[{id:ids.purchase,products:['quant_crash'],expiresAt}],
  ['/rest/v1/rpc/get_my_v2_published_course?p_batch_id='+ids.batch]:{batchId:ids.batch,sessions:[{key:'synthetic-session',section:'quant'}]},
  ['/rest/v1/rpc/get_my_v2_learning_state?p_batch_id='+ids.batch]:{batchId:ids.batch,liveRegistered:false},
 };
 const requests=[];
 const read=async(kind,resource,session)=>{requests.push({kind,resource,session});assert(Object.hasOwn(responses,resource),resource);return structuredClone(responses[resource]);};
 return {manifest,responses,requests,read,intent,expiresAt};
}
const failed=(r,id)=>r.checks.some(c=>c.check===id&&c.status==='fail');

test('fresh independent provider and caller snapshots pass without exposing private values',async()=>{
 const f=fixture(),report=await verifyPayments(f.manifest,f.read);
 assert.equal(report.status,'passed');
 assert.equal(f.requests.filter(r=>r.kind==='provider').length,2);
 assert(f.requests.some(r=>r.kind==='caller'&&r.resource==='/auth/v1/user'&&r.session===token));
 const serialized=JSON.stringify(report);
 for(const value of [ids.student,ids.checkout,ids.purchase,token,'synthetic@example.invalid','private-contact','order_synthetic','pay_synthetic'])assert(!serialized.includes(value));
 assert.match(report.candidateAttribution,/Operator-supplied/);
 assert(report.limitations.some(v=>v.includes('not evidence of an actual OAuth')));
 assert(report.limitations.some(v=>v.includes('webhook delivery')));
});

test('manifest rejects foreign projects, malformed IDs, duplicates and inconsistent expectations',()=>{
 const mutations=[m=>m.stagingProject='production',m=>m.runId='bad',m=>m.candidateCommit='latest',m=>m.cases=[],m=>m.cases.push({...m.cases[0]}),m=>m.cases[0].checkoutId='../private',m=>m.cases[0].paymentId='pay_fake?redirect=1',m=>m.cases[0].expectedProducts=['full_batch','quant_crash'],m=>m.cases[0].liveBatchIds=[ids.purchase],m=>m.cases[0].expectedAmountPaise=1.5,m=>m.cases[0].currency='USD',m=>m.cases[0].expectedPaymentStatus='authorized',m=>m.cases[0].expectedExpiry={kind:'fixed',expiresAt:'tomorrow'},m=>m.cases[0].accessToken='short'];
 for(const mutate of mutations){const f=fixture();mutate(f.manifest);assert.throws(()=>validateManifest(f.manifest));}
});

test('provider snapshots override claimed fulfillment and reject mismatched amounts or refunds',async()=>{
 for(const mutate of [
  f=>f.responses['/payments/pay_synthetic'].amount=1,
  f=>f.responses['/payments/pay_synthetic'].order_id='order_other',
  f=>f.responses['/payments/pay_synthetic'].currency='USD',
  f=>f.responses['/payments/pay_synthetic'].status='authorized',
  f=>f.responses['/payments/pay_synthetic'].captured=false,
  f=>f.responses['/payments/pay_synthetic'].amount_refunded=1,
  f=>f.responses['/orders/order_synthetic'].receipt=ids.purchase,
  f=>f.responses['/orders/order_synthetic'].amount_due=1,
  f=>f.responses['/orders/order_synthetic'].status='attempted',
 ]){const f=fixture();mutate(f);const r=await verifyPayments(f.manifest,f.read);assert.equal(r.status,'failed');}
});

test('checkout ownership, exact product/batch scope and provider references are independently checked',async()=>{
 for(const mutate of [f=>f.intent.student_id=ids.foreignStudent,f=>f.intent.products=['verbal_crash'],f=>f.intent.batches.push({batchId:ids.purchase}),f=>f.intent.live_batches=[ids.batch],f=>f.intent.provider_payment_id='pay_other',f=>f.intent.state='review']){
  const f=fixture();mutate(f);assert.equal((await verifyPayments(f.manifest,f.read)).status,'failed');
 }
});

test('missing caller sessions remain incomplete and wrong-user sessions never read caller history',async()=>{
 const f=fixture();delete f.manifest.cases[0].accessToken;
 const r=await verifyPayments(f.manifest,f.read);assert.equal(r.status,'incomplete');assert(!f.requests.some(x=>x.kind==='caller'));
 const g=fixture();g.responses['/auth/v1/user'].id=ids.foreignStudent;
 const wrong=await verifyPayments(g.manifest,g.read);assert.equal(wrong.status,'failed');assert(failed(wrong,'caller-session-binding'));
 assert(!g.requests.some(x=>x.resource==='/rest/v1/rpc/get_my_v2_checkouts'));
});

test('exact caller entitlements and enrollment are checked beyond provider success',async()=>{
 for(const mutate of [f=>f.responses['/rest/v1/rpc/get_my_v2_access'][0].sections=['quant','verbal'],f=>f.responses['/rest/v1/rpc/get_my_v2_access'].push({product_code:'verbal_crash'}),f=>f.responses['/rest/v1/rpc/get_my_v2_checkouts']=[],f=>f.responses['/rest/v1/rpc/get_my_v2_published_course?p_batch_id='+ids.batch]=null,f=>f.responses['/rest/v1/rpc/get_my_v2_learning_state?p_batch_id='+ids.batch].liveRegistered=true]){
  const f=fixture();mutate(f);assert.equal((await verifyPayments(f.manifest,f.read)).status,'failed');
 }
});

test('six-month expiry clamps calendar end dates and upgrades require the pinned original expiry',async()=>{
 const f=fixture();assert.equal((await verifyPayments(f.manifest,f.read)).status,'passed');
 f.responses['/rest/v1/rpc/get_my_v2_access'][0].expires_at='2027-02-28T12:34:56.123457Z';
 assert(failed(await verifyPayments(f.manifest,f.read),'purchase-package-and-original-expiry'));
 const g=fixture();g.intent.base_purchase_id=ids.purchase;
 assert(failed(await verifyPayments(g.manifest,g.read),'purchase-package-and-original-expiry'));
 g.manifest.cases[0].expectedExpiry={kind:'fixed',expiresAt:g.expiresAt};
 assert.equal((await verifyPayments(g.manifest,g.read)).status,'passed');
});

test('confirmed Google metadata and matching profile email do not substitute for profile activation',async()=>{
 for(const mutate of [f=>f.responses['/auth/v1/admin/users/'+ids.student].app_metadata.provider='email',f=>f.responses['/auth/v1/admin/users/'+ids.student].email_confirmed_at=null,f=>f.responses['/rest/v1/profiles?id=eq.'+ids.student+'&select=id,email,role,is_active'][0].is_active=false,f=>f.responses['/rest/v1/profiles?id=eq.'+ids.student+'&select=id,email,role,is_active'][0].email='different@example.invalid']){
  const f=fixture();mutate(f);assert(failed(await verifyPayments(f.manifest,f.read),'student-profile-and-confirmed-google-metadata'));
 }
});

test('request errors are incomplete with no reflected credentials or private response text',async()=>{
 const f=fixture();const report=await verifyPayments(f.manifest,async()=>{throw new Error('secret '+token+' synthetic@example.invalid');});
 assert.equal(report.status,'incomplete');assert(!JSON.stringify(report).includes(token));assert(!JSON.stringify(report).includes('@'));
});

test('read-only transport fixes origins, methods, redirects and credential boundaries',async()=>{
 const calls=[];
 const transport=createReadOnlyTransport(staging,paymentConfig,async(url,options)=>{calls.push({url,options});return new Response('{}',{status:200});});
 await transport('provider','/orders/order_synthetic');
 await transport('service','/rest/v1/rpc/read_v2_checkout_service?p_id='+ids.checkout);
 await transport('caller','/auth/v1/user',token);
 assert(calls.every(c=>c.options.method==='GET'&&c.options.redirect==='error'&&!Object.hasOwn(c.options,'body')));
 assert.equal(calls[0].url,'https://api.razorpay.com/v1/orders/order_synthetic');
 assert(!JSON.stringify(calls[0]).includes(staging.SUPABASE_SERVICE_ROLE_KEY));
 assert.equal(calls[1].options.headers.Authorization,'Bearer '+staging.SUPABASE_SERVICE_ROLE_KEY);
 assert.equal(calls[2].options.headers.Authorization,'Bearer '+token);
 for(const [kind,resource] of [['provider','/orders'],['provider','/payments/pay_synthetic/capture'],['provider','https://external.invalid'],['provider','/orders/order_synthetic?expand=1'],['service','/rest/v1/rpc/fulfill_v2_checkout'],['service','/rest/v1/profiles?select=*'],['service','/rest/v1/rpc/read_v2_checkout_service?p_id='+ids.checkout+'&other=1'],['caller','/auth/v1/admin/users/'+ids.student]])await assert.rejects(()=>transport(kind,resource,token));
 assert.equal(calls.length,3);
});

test('configuration rejects live keys, foreign staging credentials and unexpected secrets',()=>{
 assert.throws(()=>validatePaymentConfig({...paymentConfig,V2_RAZORPAY_TEST_KEY_ID:'rzp_live_synthetic'}));
 assert.throws(()=>validatePaymentConfig({...paymentConfig,RAZORPAY_KEY_SECRET:'shared'}));
 assert.throws(()=>createReadOnlyTransport({...staging,SUPABASE_URL:'https://production.invalid'},paymentConfig));
 assert.throws(()=>createReadOnlyTransport({...staging,SUPABASE_SERVICE_ROLE_KEY:jwt('anon')},paymentConfig));
});

test('transport rejects non-success and oversized provider responses',async()=>{
 for(const response of [new Response('private failure',{status:403}),new Response('{}',{status:200,headers:{'content-length':'2000001'}})]){
  const transport=createReadOnlyTransport(staging,paymentConfig,async()=>response);
  await assert.rejects(()=>transport('provider','/payments/pay_synthetic'));
 }
});


test('authorized payment snapshots remain unfulfilled with no entitlement claim',async()=>{
 const f=fixture(),c=f.manifest.cases[0];
 c.expectedState='ready';c.expectedPaymentStatus='authorized';c.expectedAccessProducts=[];c.expectedActive=false;
 Object.assign(f.intent,{state:'ready',provider_payment_id:null,purchase_id:null,verified_at:null,fulfilled_at:null});
 Object.assign(f.responses['/orders/order_synthetic'],{status:'attempted',amount_paid:0,amount_due:1000000});
 Object.assign(f.responses['/payments/pay_synthetic'],{status:'authorized',captured:false});
 f.responses['/rest/v1/profiles?id=eq.'+ids.student+'&select=id,email,role,is_active'][0].is_active=false;
 Object.assign(f.responses['/rest/v1/rpc/get_my_v2_checkouts'][0],{state:'ready',expiresAt:null});
 f.responses['/rest/v1/rpc/get_my_v2_access']=[];
 assert.equal((await verifyPayments(f.manifest,f.read)).status,'passed');
 f.responses['/rest/v1/rpc/get_my_v2_access']=[{product_code:'quant_crash'}];
 assert(failed(await verifyPayments(f.manifest,f.read),'caller-exact-entitlements'));
});

test('known foreign fixture checkout cannot appear in another caller history',async()=>{
 const f=fixture();
 f.manifest.cases.push({...f.manifest.cases[0],studentId:ids.foreignStudent,checkoutId:ids.foreignCheckout});
 f.responses['/rest/v1/rpc/get_my_v2_checkouts'].push({id:ids.foreignCheckout});
 assert(failed(await verifyPayments(f.manifest,f.read),'foreign-fixture-history-hidden'));
});
