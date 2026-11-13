import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {withDisposablePostgres} from './helpers/disposable-postgres.mjs';
import {preparePhase3Database,as,literal,json} from './helpers/v2-phase3-fixture.mjs';
const migrations=['20261113090000_add_v2_sales_catalogue.sql','20261113100000_add_v2_checkout_ledger.sql','20261113110000_add_v2_payment_fulfillment.sql'];
function setup(db){
 const f=preparePhase3Database(db);migrations.forEach(db.apply);
 const student=(active=false,google=true)=>{const id=randomUUID();db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('${id}','${id}@example.invalid',now(),${json({provider:google?'google':'email'})})`);if(active)db.query(`update public.profiles set is_active=true where id='${id}'`);return id;};
 const prepareSQL=(s,batches,live=[],upgrade=false,id=randomUUID())=>as(s,`select public.prepare_v2_checkout('${id}',array[${batches.map(b=>literal(b.product==='full_course'?'full_batch':b.product+'_crash')).join(',')}],array[${batches.map(b=>literal(b.id)).join(',')}]::uuid[],array[${live.map(b=>literal(b.id)).join(',')}]::uuid[],'QA Student','+919000000000',${upgrade})`);
 const prepare=(...args)=>JSON.parse(db.query(prepareSQL(...args)));
 const attach=id=>{const order='order_'+id.replaceAll('-','');assert.equal(db.query(as(null,`select public.claim_v2_checkout_order('${id}')`,'service_role')),'t');db.query(as(null,`select public.attach_v2_checkout_order('${id}','${order}')`,'service_role'));return order;};
 const capture=(c,order='order_'+c.id.replaceAll('-',''),amount=c.amountPaise)=>JSON.parse(db.query(as(null,`select public.fulfill_v2_checkout('${c.id}','${order}','pay_${c.id.replaceAll('-','')}',${amount},'INR')`,'service_role')));
 const access=s=>JSON.parse(db.query(as(s,'select public.get_my_v2_access()')));
 return {...f,student,prepare,prepareSQL,attach,capture,access};
}
test('verified fulfillment activates only eligible new Students and preserves idempotency',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db), q=f.batch('quant',true);f.publish(q);const s=f.student(),c=f.prepare(s,[q],[q]);
 assert.equal(c.amountPaise,1000000);assert.deepEqual(f.access(s),[]);
 const immutable=db.query(`select row_to_json(p) from public.v2_products p where code='quant_crash'`);
 db.rejects(as(s,`select public.fulfill_v2_checkout('${c.id}','order_forged','pay_forged',1000000,'INR')`),/permission denied/);
 db.rejects(as(s,`insert into public.v2_checkout_intents(id) values('${randomUUID()}')`),/permission denied/);
 const order=f.attach(c.id);assert.equal(db.query(as(null,`select public.claim_v2_checkout_order('${c.id}')`,'service_role')),'f');
 db.rejects(as(null,`select public.fulfill_v2_checkout('${c.id}','${order}','pay_wrong',1,'INR')`,'service_role'),/does not match/);
 assert.deepEqual(f.access(s),[]);assert.equal(f.capture(c).state,'fulfilled');assert.equal(f.capture(c).replayed,true);
 assert.deepEqual(f.access(s).map(x=>x.product_code),['quant_crash']);
 assert.equal(db.query(`select count(*) from public.v2_purchases where student_id='${s}'`),'1');
 assert.equal(db.query(`select count(*) from public.v2_live_registration_audit where student_id='${s}'`),'1');
 assert.equal(db.query(`select count(*) from public.v2_signup_candidates where student_id='${s}'`),'0');
 assert.equal(db.query(`select row_to_json(p) from public.v2_products p where code='quant_crash'`),immutable);
 const stranger=f.student();assert.deepEqual(JSON.parse(db.query(as(stranger,'select public.get_my_v2_checkouts()'))),[]);
 for(const table of ['v2_checkout_intents','v2_purchase_upgrades','v2_payment_events','v2_signup_candidates']) db.rejects(as(stranger,`select * from public.${table}`),/permission denied/);
 const disabled=f.student();db.query(`update public.profiles set is_active=false where id='${disabled}'`);db.rejects(f.prepareSQL(disabled,[q]),/unavailable for this account/);
 db.rejects(f.prepareSQL(f.student(false,false),[q]),/unavailable for this account/);
 const laterDisabled=f.student(),later=f.prepare(laterDisabled,[q]);f.attach(later.id);db.query(`update public.profiles set is_active=false where id='${laterDisabled}'`);assert.equal(f.capture(later).state,'review');assert.deepEqual(f.access(laterDisabled),[]);
}));
test('upgrades extend effective subjects without rewriting purchase history or expiry',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db),s=f.student(true),q=f.batch('quant'),v=f.batch('verbal'),d=f.batch('di');[q,v,d].forEach(b=>f.publish(b));
 const c=f.prepare(s,[q]);f.attach(c.id);assert.equal(f.capture(c).state,'fulfilled');
 const before=db.query(`select to_jsonb(p) from public.v2_purchases p where student_id='${s}'`),expiry=f.access(s)[0].expires_at;
 const up=f.prepare(s,[q,v],[],true);assert.equal(up.amountPaise,800000);f.attach(up.id);assert.equal(f.capture(up).state,'fulfilled');
 assert.deepEqual(f.access(s).map(x=>x.product_code),['quant_crash','verbal_crash']);assert.ok(f.access(s).every(x=>x.expires_at===expiry));
 assert.equal(db.query(`select to_jsonb(p) from public.v2_purchases p where student_id='${s}'`),before);
 const up2=f.prepare(s,[q,v,d],[],true);assert.equal(up2.amountPaise,700000);f.attach(up2.id);assert.equal(f.capture(up2).state,'fulfilled');assert.equal(f.capture(up2).replayed,true);
 assert.equal(f.access(s).length,3);assert.equal(db.query(`select count(*) from public.v2_product_grants`),'1');
 assert.equal(db.query(as(s,`select public.can_access_v2_product('di_crash','quant')`)),'f');
 db.query(`update public.v2_purchases set revoked_at=now() where student_id='${s}'`);assert.deepEqual(f.access(s),[]);
}));
test('eight batch places remain atomic across parallel checkout and Admin registration',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db),b=f.batch('full_course',true);f.publish(b);
 const students=Array.from({length:10},()=>f.student());
 const results=await Promise.allSettled(students.map(s=>db.concurrentQuery(f.prepareSQL(s,[b],[b]))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,8);assert.equal(results.filter(r=>r.status==='rejected').length,2);
 const checkouts=results.filter(r=>r.status==='fulfilled').map(r=>JSON.parse(r.value));
 for(const c of checkouts){f.attach(c.id);assert.equal(f.capture(c).state,'fulfilled');}
 assert.equal(db.query(`select count(*) from public.v2_live_registrations where active`),'8');
 assert.deepEqual(f.access(students[results.findIndex(r=>r.status==='fulfilled')])[0].sections,['quant','verbal','di']);
 const extra=students[results.findIndex(r=>r.status==='rejected')],recording=f.prepare(extra,[b]);f.attach(recording.id);assert.equal(f.capture(recording).state,'fulfilled');
 db.rejects(as(f.admin,`select public.set_v2_live_registration('${b.id}','${extra}',true,0)`),/Live batch is full/);
}));
test('late captured payments and changed publications enter review without partial access',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db),b=f.batch('quant',true);f.publish(b);const s=f.student(),late=f.prepare(s,[b],[b]);f.attach(late.id);
 db.query(`update public.v2_checkout_intents set hold_until=now()-interval '1 minute' where id='${late.id}'`);
 for(let i=0;i<8;i++){const c=f.prepare(f.student(),[b],[b]);f.attach(c.id);assert.equal(f.capture(c).state,'fulfilled');}
 assert.equal(f.capture(late).state,'review');assert.deepEqual(f.access(s),[]);assert.equal(db.query(`select count(*) from public.v2_purchases where student_id='${s}'`),'0');
 const other=f.student(),c=f.prepare(other,[b]);f.attach(c.id);f.publish(b,1,'unpublish');assert.equal(f.capture(c).state,'review');assert.deepEqual(f.access(other),[]);
 db.query(as(null,`select public.record_v2_payment_event('evt_test',repeat('a',64),'${c.id}')`,'service_role'));
 db.query(as(null,`select public.record_v2_payment_event('evt_test',repeat('a',64),'${c.id}')`,'service_role'));
 db.rejects(as(null,`select public.record_v2_payment_event('evt_test',repeat('b',64),'${c.id}')`,'service_role'),/Event replay mismatch/);
 assert.equal(db.query(`select count(*) from public.v2_payment_events`),'1');
}));
test('paid access retains Phase 4 gates, Phase 5 content and Phase 6 conflict responses',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db),s=f.student(),b=f.batch('quant');f.publish(b);
 const c=f.prepare(s,[b]);f.attach(c.id);assert.equal(f.capture(c).state,'fulfilled');
 const rpc=(id,name,args)=>JSON.parse(db.query(as(id,`select public.${name}(${args})`))||'null');
 const course=()=>rpc(s,'get_my_v2_published_course',literal(b.id));
 assert.equal(course().sessions[0].key,b.sessionKey);
 assert.equal(rpc(s,'get_my_v2_learning_state',literal(b.id)).liveRegistered,false);
 const item=randomUUID(),doc={title:'Independent paid reading',kind:'preSessionReads',url:'https://example.test/phase3/reading',targets:[{batchId:b.id,sessionKey:b.sessionKey,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:10}]};
 rpc(f.admin,'save_v2_content_item',`${literal(item)},0,${literal(randomUUID())},${json(doc)}`);
 const scope=rpc(f.admin,'v2_content_scope',`${literal(item)},1,'publish'`);
 rpc(f.admin,'publish_v2_content_item',`${literal(item)},1,'publish',${literal(randomUUID())},${literal(scope.fingerprint)}`);
 assert.ok(course().sessions[0].content.preSessionReads.some(r=>r.title===doc.title));
 const obligation=rpc(s,'report_v2_recording_watched',`${literal(b.id)},${literal(b.sessionKey)},${literal(b.document.sessions[0].content.recordings[0].key)},1`);
 assert.equal(rpc(s,'get_my_v2_learning_state',literal(b.id)).obligations.length,1);
 rpc(s,'submit_v2_session_feedback',`${literal(obligation.obligationId)},${literal(randomUUID())},${json({usefulness:4,clarity:5,comment:'Synthetic feedback',attendance:'recording'})}`);
 assert.equal(rpc(s,'get_my_v2_learning_state',literal(b.id)).obligations.length,0);
 db.rejects(as(f.admin,`select public.set_v2_batch_enrollment(${literal(b.id)},${literal(s)},true,0)`),/Enrollment changed; reload the roster/);
 assert.equal(db.query("select position('PT409' in pg_get_functiondef('public.set_v2_batch_enrollment(uuid,uuid,boolean,integer)'::regprocedure))>0"),'t');
 db.query(`update public.v2_purchases set revoked_at=now() where student_id=${literal(s)}`);
 assert.equal(course(),null);assert.deepEqual(rpc(s,'get_my_v2_content_placements',literal(b.id)),[]);
}));
test('event receipts are idempotent and reject payload or checkout substitution',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=setup(db),q=f.batch('quant');f.publish(q);const c=f.prepare(f.student(),[q]);
 const event=as(null,`select public.record_v2_payment_event('evt_local','${'a'.repeat(64)}','${c.id}')`,'service_role');
 db.query(event);db.query(event);assert.equal(db.query('select count(*) from public.v2_payment_events'),'1');
 db.rejects(as(null,`select public.record_v2_payment_event('evt_local','${'b'.repeat(64)}','${c.id}')`,'service_role'),/replay mismatch/);
 assert.equal(db.query('select count(*) from public.v2_purchases'),'0');
}));
