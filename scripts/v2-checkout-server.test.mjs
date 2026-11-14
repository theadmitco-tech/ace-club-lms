import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
function load(file,deps={},globals={}){const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Buffer,URL,Date,AbortSignal,TextDecoder,process:{env:{}},...globals,require(name){assert.ok(Object.hasOwn(deps,name),name);return deps[name];}});return exports;}
const env={V2_CHECKOUT_TEST_ENABLED:'true',VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://eyphkkginlgoaxflauog.supabase.co'};
const domain=load('src/lib/v2Checkout.ts');
const provider=load('src/lib/server/v2Razorpay.ts',{'server-only':{},'node:crypto':crypto});
const requestBody=load('src/lib/server/v2CheckoutRequest.ts',{'server-only':{}});
test('checkout environment fails closed in Production and on any non-staging project',()=>{
 assert.equal(domain.checkoutPreviewEnabled(env),true);
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_ENV:'other'},{V2_CHECKOUT_TEST_ENABLED:undefined},{NEXT_PUBLIC_SUPABASE_URL:'https://owmlxsnzogfapotmjrqk.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL+'.evil.invalid'}])assert.equal(domain.checkoutPreviewEnabled({...env,...patch}),false);
 assert.throws(()=>provider.testPaymentConfiguration({V2_RAZORPAY_TEST_KEY_ID:'rzp_live_abc',V2_RAZORPAY_TEST_KEY_SECRET:'testsecret'}));
 assert.throws(()=>provider.testPaymentConfiguration({RAZORPAY_KEY_ID:'rzp_test_abc',RAZORPAY_KEY_SECRET:'testsecret'}));
});
test('callback and webhook signatures require exact content and valid hexadecimal encoding',()=>{
 const secret='synthetic-test-secret',raw='order_1|pay_1',sig=crypto.createHmac('sha256',secret).update(raw).digest('hex');
 assert.equal(provider.validPaymentSignature(secret,raw,sig),true);
 for(const bad of [null,'',sig.slice(1),'g'.repeat(64),sig.toUpperCase()])assert.equal(provider.validPaymentSignature(secret,raw,bad),false);
 assert.equal(provider.validPaymentSignature(secret,raw+'x',sig),false);
});
test('captured payment validation rejects wrong order, amount, receipt, currency, refund and incomplete capture',()=>{
 const payment={entity:'payment',id:'pay_abc',order_id:'order_abc',status:'captured',captured:true,amount:1000000,currency:'INR',amount_refunded:0};
 const order={entity:'order',id:'order_abc',receipt:'checkout-abc',status:'paid',amount:1000000,amount_paid:1000000,amount_due:0,currency:'INR'};
 const expected={order:'order_abc',amount:1000000,receipt:'checkout-abc'};
 assert.equal(provider.capturedPaymentMatches(payment,order,expected),true);
 for(const patch of [{status:'authorized'},{captured:false},{amount:1},{amount:'1000000'},{currency:'USD'},{order_id:'order_other'},{amount_refunded:1},{id:'forged'}])assert.equal(provider.capturedPaymentMatches({...payment,...patch},order,expected),false);
 for(const patch of [{receipt:'other'},{amount_paid:1},{amount_due:1},{status:'created'},{id:'order_other'},{currency:'USD'}])assert.equal(provider.capturedPaymentMatches(payment,{...order,...patch},expected),false);
});
function routeHarness(){
 const calls=[],id='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002';
 const state={enabled:true,user:{id:student,email_confirmed_at:'2026-11-02',app_metadata:{provider:'google'}},intent:{student_id:student,provider_order_id:'order_saved'},admin:false};
 const route=load('src/app/api/v2/checkout/route.ts',{
  '@/lib/server/v2CheckoutRequest':requestBody,
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
  '@/lib/v2Checkout':domain,'@/lib/v2Products':{isV2ProductSelection:()=>true},
  '@/utils/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:state.admin?'admin':'student',is_active:true}})})})}),rpc:async(name)=>{calls.push(name);return {data:{}};}})},
  '@/lib/server/v2Checkout':{isV2CheckoutEnabled:()=>state.enabled,serviceRpc:async(name)=>{calls.push(name);return state.intent;},startProviderOrder:async()=>{calls.push('create');return {};},reconcileV2Payment:async(...args)=>{calls.push(['reconcile',...args]);return {state:'fulfilled'};}},
  '@/lib/server/v2Razorpay':{...provider,testPaymentConfiguration:()=>({secret:'testsecret'}),razorpayRequest:async()=>{throw Error('unexpected provider call');}},
 });
 const request=(body,origin='https://preview.example.test')=>new Request('https://preview.example.test/api/v2/checkout',{method:'POST',headers:{origin},body:JSON.stringify({id,...body})});
 return {state,calls,route,request,id};
}
test('checkout route enforces feature, origin and authenticated ownership before verification',async()=>{
 const h=routeHarness();h.state.enabled=false;assert.equal((await h.route.POST(h.request({action:'verify'}))).status,404);assert.equal(h.calls.length,0);
 h.state.enabled=true;assert.equal((await h.route.POST(h.request({action:'verify'},'https://attacker.invalid'))).status,403);assert.equal(h.calls.length,0);
 h.state.user=null;assert.equal((await h.route.POST(h.request({action:'verify'}))).status,401);assert.equal(h.calls.length,0);
});
test('forged callback, foreign checkout and non-Admin recovery never reach fulfillment',async()=>{
 const h=routeHarness();const payload={action:'verify',orderId:'order_saved',paymentId:'pay_abc',signature:'0'.repeat(64)};
 assert.equal((await h.route.POST(h.request(payload))).status,400);
 h.state.intent.student_id='foreign';assert.equal((await h.route.POST(h.request(payload))).status,404);
 assert.equal((await h.route.POST(h.request({action:'admin-reconcile'}))).status,403);
 assert.ok(!h.calls.some(x=>Array.isArray(x)&&x[0]==='reconcile'));
});
test('valid caller signature only triggers server reconciliation using the stored order',async()=>{
 const h=routeHarness(),signature=crypto.createHmac('sha256','testsecret').update('order_saved|pay_abc').digest('hex');
 assert.equal((await h.route.POST(h.request({action:'verify',orderId:'order_saved',paymentId:'pay_abc',signature}))).status,200);
 assert.ok(h.calls.some(x=>Array.isArray(x)&&x[0]==='reconcile'&&x[1]===h.id&&x[2]==='pay_abc'));
});
function webhookHarness(){
 const calls=[],secret='synthetic-webhook-secret-for-local-tests';
 const state={enabled:true,checkout:'10000000-0000-4000-8000-000000000001',fail:false};
 const route=load('src/app/api/v2/checkout/webhook/route.ts',{
  'node:crypto':crypto,'@/lib/server/v2CheckoutRequest':requestBody,
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
  '@/lib/server/v2Razorpay':provider,
  '@/lib/server/v2Checkout':{isV2CheckoutEnabled:()=>state.enabled,serviceRpc:async(name,args)=>{calls.push([name,args]);return state.checkout;},reconcileV2Payment:async id=>{calls.push(['reconcile',id]);if(state.fail)throw Error('temporary provider failure');return {state:'fulfilled'};}},
 },{process:{env:{V2_RAZORPAY_TEST_WEBHOOK_SECRET:secret}}});
 const request=(event='payment.captured',signatureValid=true,eventId='evt_synthetic')=>{
  const raw=JSON.stringify({event,payload:{payment:{entity:{order_id:'order_saved',status:'captured',amount:1}}}});
  return new Request('https://preview.example.test/api/v2/checkout/webhook',{method:'POST',headers:{'x-razorpay-signature':signatureValid?crypto.createHmac('sha256',secret).update(raw).digest('hex'):'0'.repeat(64),'x-razorpay-event-id':eventId},body:raw});
 };
 return {state,calls,route,request};
}
test('webhooks reject forged signatures and missing event IDs before database transitions',async()=>{
 const h=webhookHarness();assert.equal((await h.route.POST(h.request('payment.captured',false))).status,400);
 assert.equal((await h.route.POST(h.request('payment.captured',true,''))).status,400);assert.equal(h.calls.length,0);
 h.state.enabled=false;assert.equal((await h.route.POST(h.request())).status,404);assert.equal(h.calls.length,0);
});
test('webhooks reconcile provider state on every duplicate and out-of-order delivery',async()=>{
 const h=webhookHarness();
 for(const event of ['payment.captured','payment.captured','payment.failed','order.paid'])assert.equal((await h.route.POST(h.request(event))).status,200);
 assert.equal(h.calls.filter(c=>c[0]==='reconcile').length,4);
 assert.equal(h.calls.filter(c=>c[0]==='record_v2_payment_event').length,4);
 assert.ok(h.calls.filter(c=>c[0]==='reconcile').every(c=>c.length===2));
});
test('webhook provider failure is retryable and unknown or unsupported events grant no access',async()=>{
 const h=webhookHarness();h.state.fail=true;assert.equal((await h.route.POST(h.request())).status,503);
 h.state.fail=false;assert.equal((await h.route.POST(h.request())).status,200);
 h.calls.length=0;h.state.checkout=null;assert.equal((await h.route.POST(h.request())).status,200);
 assert.deepEqual(h.calls.map(c=>c[0]),['find_v2_checkout_order']);
 h.calls.length=0;assert.equal((await h.route.POST(h.request('unhandled.event'))).status,200);assert.equal(h.calls.length,0);
});
test('ambiguous provider order creation cannot issue a second order on retry',async()=>{
 const id='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002';
 const intent={id,student_id:student,state:'prepared',amount_paise:1000000};let providerCalls=0;
 const server=load('src/lib/server/v2Checkout.ts',{'server-only':{},'@supabase/supabase-js':{createClient:()=>({rpc:async name=>{
  if(name==='read_v2_checkout_service')return {data:{...intent}};
  if(name==='claim_v2_checkout_order'){intent.state='creating';return {data:true};}
  throw Error('unexpected database transition');
 }})},'@/utils/supabase/server':{},'@/lib/v2Checkout':domain,'./v2Razorpay':{...provider,testPaymentConfiguration:()=>({key:'rzp_test_synthetic'}),razorpayRequest:async()=>{providerCalls++;throw Error('ambiguous timeout');}}},{process:{env:{...env,SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'}}});
 await assert.rejects(server.startProviderOrder(id,student),/ambiguous timeout/);
 await assert.rejects(server.startProviderOrder(id,student),/requires review/);
 assert.equal(providerCalls,1);assert.equal(intent.state,'creating');
});

test('checkout rejects malformed JSON and oversized streamed requests before database work',async()=>{
 const h=routeHarness();
 const request=body=>new Request('https://preview.example.test/api/v2/checkout',{method:'POST',headers:{origin:'https://preview.example.test'},body});
 for(const raw of ['{','null','[]','true'])assert.equal((await h.route.POST(request(raw))).status,400);
 assert.equal((await h.route.POST(request('x'.repeat(10001)))).status,413);
 assert.equal(h.calls.length,0);
});
test('request limits count bytes, stop the stream early, and preserve signed UTF-8 text',async()=>{
 const text=JSON.stringify({comment:'हिन्दी feedback'});
 assert.equal(await requestBody.readCheckoutRequestText(new Request('https://preview.example.test',{method:'POST',body:text}),1000),text);
 let cancelled=false;
 const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(10001));},cancel(){cancelled=true;}});
 await assert.rejects(requestBody.readCheckoutRequestText(new Request('https://preview.example.test',{method:'POST',body,duplex:'half'}),10000),error=>error.status===413);
 assert.equal(cancelled,true);
 const invalid=new Request('https://preview.example.test',{method:'POST',body:new Uint8Array([0xff])});
 await assert.rejects(requestBody.readCheckoutRequestText(invalid,100),error=>error.status===400);
 const unicode=new Request('https://preview.example.test',{method:'POST',body:'₹'.repeat(4)});
 await assert.rejects(requestBody.readCheckoutRequestText(unicode,10),error=>error.status===413);
});
test('signed malformed webhook JSON is rejected without provider retries or ledger writes',async()=>{
 const h=webhookHarness(),raw='{',secret='synthetic-webhook-secret-for-local-tests';
 const request=new Request('https://preview.example.test/api/v2/checkout/webhook',{method:'POST',body:raw,headers:{'x-razorpay-signature':crypto.createHmac('sha256',secret).update(raw).digest('hex'),'x-razorpay-event-id':'evt_malformed'}});
 assert.equal((await h.route.POST(request)).status,400);assert.equal(h.calls.length,0);
 const oversized=new Request('https://preview.example.test/api/v2/checkout/webhook',{method:'POST',body:'x'.repeat(100001)});
 assert.equal((await h.route.POST(oversized)).status,413);assert.equal(h.calls.length,0);
});
function reconciliationHarness(){
 const id='10000000-0000-4000-8000-000000000001';
 const payment={entity:'payment',id:'pay_saved',order_id:'order_saved',status:'captured',captured:true,amount:1000000,currency:'INR',amount_refunded:0};
 const order={entity:'order',id:'order_saved',receipt:id,status:'paid',amount:1000000,amount_paid:1000000,amount_due:0,currency:'INR'};
 const state={payment,order,items:[payment],fail:false};const calls=[];
 const server=load('src/lib/server/v2Checkout.ts',{'server-only':{},'@supabase/supabase-js':{createClient:()=>({rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='read_v2_checkout_service')return {data:{id,provider_order_id:'order_saved',amount_paise:1000000}};
  if(name==='fulfill_v2_checkout')return {data:{state:'fulfilled'}};
  throw Error('unexpected database call');
 }})},'@/utils/supabase/server':{},'@/lib/v2Checkout':domain,'./v2Razorpay':{...provider,razorpayRequest:async path=>{
  calls.push({path});if(state.fail)throw Error('provider unavailable');
  if(path==='/orders/order_saved')return state.order;
  if(path==='/orders/order_saved/payments')return {items:state.items};
  if(path==='/payments/pay_saved')return state.payment;
  throw Error('unexpected provider path');
 }}},{process:{env:{...env,SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'}}});
 return {id,state,calls,server};
}
test('server reconciliation fetches authoritative provider state before forwarding an exact capture',async()=>{
 const h=reconciliationHarness();
 assert.equal((await h.server.reconcileV2Payment(h.id,'pay_saved')).state,'fulfilled');
 const grant=h.calls.find(c=>c.name==='fulfill_v2_checkout');
 assert.equal(JSON.stringify(grant.args),JSON.stringify({p_id:h.id,p_order:'order_saved',p_payment:'pay_saved',p_amount:1000000,p_currency:'INR'}));
 assert.deepEqual(h.calls.filter(c=>c.path).map(c=>c.path),['/orders/order_saved','/payments/pay_saved']);
});
test('pending, failed and delayed provider states never call fulfillment',async()=>{
 for(const status of ['created','authorized','failed']){
  const h=reconciliationHarness();h.state.payment={...h.state.payment,status,captured:false};
  assert.equal((await h.server.reconcileV2Payment(h.id,'pay_saved')).state,'pending');
  assert.ok(!h.calls.some(c=>c.name==='fulfill_v2_checkout'));
 }
 const h=reconciliationHarness();h.state.items=[];
 assert.equal((await h.server.reconcileV2Payment(h.id)).state,'pending');
 assert.ok(!h.calls.some(c=>c.name==='fulfill_v2_checkout'));
});
test('mismatched, refunded or ambiguous provider captures never grant access',async()=>{
 for(const patch of [{amount:1},{currency:'USD'},{order_id:'order_foreign'},{amount_refunded:1}]){
  const h=reconciliationHarness();h.state.payment={...h.state.payment,...patch};
  await assert.rejects(h.server.reconcileV2Payment(h.id,'pay_saved'),/validation failed/);
  assert.ok(!h.calls.some(c=>c.name==='fulfill_v2_checkout'));
 }
 const h=reconciliationHarness();h.state.items=[h.state.payment,{...h.state.payment,id:'pay_duplicate'}];
 await assert.rejects(h.server.reconcileV2Payment(h.id),/Multiple captured/);
 assert.ok(!h.calls.some(c=>c.name==='fulfill_v2_checkout'));
});
test('provider failure can be retried without assuming access or creating another provider order',async()=>{
 const h=reconciliationHarness();h.state.fail=true;
 await assert.rejects(h.server.reconcileV2Payment(h.id),/provider unavailable/);
 assert.ok(!h.calls.some(c=>c.name==='fulfill_v2_checkout'));
 h.state.fail=false;assert.equal((await h.server.reconcileV2Payment(h.id)).state,'fulfilled');
 assert.ok(h.calls.filter(c=>c.path).every(c=>c.path!=='/orders'));
});

test('unknown actions and non-Admin recovery stop before privileged checkout lookup',async()=>{
 const h=routeHarness();
 assert.equal((await h.route.POST(h.request({action:'unknown'}))).status,400);
 assert.equal((await h.route.POST(h.request({action:'admin-recover',orderId:'order_saved'}))).status,403);
 h.state.intent=null;
 assert.equal((await h.route.POST(h.request({action:'admin-reconcile'}))).status,403);
 assert.equal(h.calls.length,0);
});
