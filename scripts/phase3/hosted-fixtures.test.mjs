import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withDisposablePostgres } from '../helpers/disposable-postgres.mjs';
import { preparePhase3Database, as, literal, json } from '../helpers/v2-phase3-fixture.mjs';
import { fixtureLabels, fixtureEmail, createManifest, validateManifest, setupSql, cleanupSql } from './hosted-fixtures.mjs';
const migrations=['20261113090000_add_v2_sales_catalogue.sql','20261113100000_add_v2_checkout_ledger.sql','20261113110000_add_v2_payment_fulfillment.sql'];
function makeManifest(expectedTableCount=92){
 const runId=randomUUID(),users=Object.fromEntries(fixtureLabels.map(label=>[label,{id:randomUUID(),email:fixtureEmail(runId,label)}]));
 return createManifest({runId,users,createdAt:new Date(Date.now()-10000).toISOString(),startDate:'2030-01-10',preview:'https://ace-club-qa-fixture.vercel.app',commit:'a'.repeat(40),expectedTableCount});
}
function bootstrap(db){
 const f=preparePhase3Database(db);migrations.forEach(db.apply);
 db.query("create schema if not exists supabase_migrations;create table if not exists supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations values('20261018090000','original_phase1',array['preserved source'])");
 const existing=f.batch('quant');f.publish(existing);
 const m=makeManifest(Number(db.query("select count(*) from pg_tables where schemaname='public'")));
 for(const u of Object.values(m.users))db.query(`insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,email_confirmed_at) values(${literal(u.id)},${literal(u.email)},${json({phase3_qa_run:m.runId})},'{"provider":"google"}',now())`);
 return {m,f,existing};
}
function paid(db,m,label,products,batches,upgrade=false,live=false){
 const id=randomUUID(),studentId=m.users[label].id,orderId='order_'+id.replaceAll('-',''),paymentId='pay_'+id.replaceAll('-','');
 const result=JSON.parse(db.query(as(studentId,`select public.prepare_v2_checkout('${id}',array[${products.map(literal)}],array[${batches.map(literal)}]::uuid[],array[${(live?batches:[]).map(literal)}]::uuid[],'Synthetic fixture','+919000000000',${upgrade})`)));
 db.query(as(null,`select public.claim_v2_checkout_order('${id}');select public.attach_v2_checkout_order('${id}','${orderId}')`,'service_role'));
 assert.equal(JSON.parse(db.query(as(null,`select public.fulfill_v2_checkout('${id}','${orderId}','${paymentId}',${result.amountPaise},'INR')`,'service_role'))).state,'fulfilled');
 const eventIds=['evt_'+id];db.query(as(null,`select public.record_v2_payment_event(${literal(eventIds[0])},'${'a'.repeat(64)}','${id}')`,'service_role'));
 return {id,studentId,orderId,paymentId,eventIds};
}
test('manifest accepts only unique generated staging identities and synthetic references',()=>{
 const m=makeManifest();assert.equal(Object.keys(m.users).length,20);assert.equal(Object.keys(m.courses).length,5);
 const real=structuredClone(m);real.users.full.email='existing@example.test';assert.throws(()=>validateManifest(real),/generated fixture identities/);
 const duplicate=structuredClone(m);duplicate.users.full.id=duplicate.users.individual.id;assert.throws(()=>validateManifest(duplicate),/Duplicate fixture identity/);
 const foreign=structuredClone(m);foreign.courses.quant.sessions[0].content.materials[0].url='https://private.example.test/existing.pdf';assert.throws(()=>validateManifest(foreign),/synthetic resource/);
 assert.throws(()=>cleanupSql(m,{baseline:{},checkouts:[]}),/recorded setup baseline/);
});
test('setup and exact payment/upgrade cleanup preserve baseline and original ledger',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {m,existing}=bootstrap(db);
 const receipt=JSON.parse(db.query(setupSql(m)));assert.equal(receipt.batches,5);assert.equal(receipt.qa_accounts,20);assert.equal(receipt.capacity_occupied,7);assert.equal(receipt.google_oauth_verified,false);
 assert.equal(db.query(`select count(*) from public.v2_live_registrations where batch_id='${m.courses.capacity.batchId}' and active`),'7');
 assert.equal(db.query(`select count(*) from public.v2_signup_candidates where student_id in(${Object.values(m.users).map(u=>literal(u.id))})`),'7');
 assert.equal(db.query(`select count(*) from public.v2_purchases where student_id='${m.users.expired.id}' and expires_at<now()`),'1');
 db.rejects(setupSql(m),/setup must not repeat/);
 assert.equal(db.query(`select is_active from public.profiles where id='${m.users.individual.id}'`),'f');
 const first=paid(db,m,'individual',['quant_crash'],[m.courses.quant.batchId],false,true);
 assert.equal(db.query(`select provenance from public.v2_live_registrations where student_id='${m.users.individual.id}'`),'verified_payment');
 assert.equal(db.query(`select is_active from public.profiles where id='${m.users.individual.id}'`),'t');
 const upgrade=paid(db,m,'individual',['quant_crash','verbal_crash'],[m.courses.quant.batchId,m.courses.verbal.batchId],true);
 db.query(as(m.users.individual.id,`select public.get_my_v2_learning_state('${m.courses.quant.batchId}');select public.mark_v2_learning_progress('${m.courses.quant.batchId}','${m.courses.quant.sessions[0].key}',null,'opened',1)`));
 db.rejects(cleanupSql(m,{baseline:receipt.baseline,checkouts:[first]}),/Untracked or changed checkout/);
 db.rejects(cleanupSql(m,{baseline:receipt.baseline,checkouts:[{...first,eventIds:[]},upgrade]}),/Untracked payment event/);
 const clean=JSON.parse(db.query(cleanupSql(m,{baseline:receipt.baseline,checkouts:[first,upgrade]})));
 assert.equal(clean.baseline_restored,true);assert.deepEqual(clean.fingerprint,receipt.baseline);
 assert.equal(db.query('select count(*) from public.v2_checkout_intents'),'0');assert.equal(db.query('select count(*) from public.v2_purchases'),'0');assert.equal(db.query('select count(*) from public.v2_purchase_upgrades'),'0');
 assert.equal(db.query(`select count(*) from public.v2_course_batches where id='${existing.id}'`),'1');
 assert.equal(db.query(`select count(*) from public.profiles where id in(${Object.values(m.users).map(u=>literal(u.id))}) and is_active`),'0');
 db.rejects(setupSql(m),/Fresh inactive signup candidates required/);
}));
test('cleanup rejects foreign batch activity, unknown purchases and ledger changes atomically',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {m,f,existing}=bootstrap(db),receipt=JSON.parse(db.query(setupSql(m))),cleanup=()=>cleanupSql(m,{baseline:receipt.baseline,checkouts:[]});
 const count=db.query('select count(*) from public.v2_course_batches');
 for(const table of ['v2_batch_enrollments','v2_live_registrations','v2_live_registration_audit']){
  db.query(`update public.${table} set actor_id='${f.admin}' where student_id='${m.users.capacity_1.id}'`);
  db.rejects(cleanup(),/foreign ownership/);
  assert.equal(db.query('select count(*) from public.v2_course_batches'),count);
  db.query(`update public.${table} set actor_id='${m.users.admin.id}' where student_id='${m.users.capacity_1.id}'`);
 }
 db.query(`update public.v2_live_session_mappings set actor_id='${f.admin}' where batch_id='${m.courses.quant.batchId}'`);
 db.rejects(cleanup(),/foreign ownership/);
 db.query(`update public.v2_live_session_mappings set actor_id='${m.users.admin.id}' where batch_id='${m.courses.quant.batchId}'`);
 db.query(`insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id) values('${m.courses.quant.batchId}','${f.admin}',true,1,'${f.admin}')`);
 db.rejects(cleanup(),/Foreign Student/);assert.equal(db.query('select count(*) from public.v2_course_batches'),count);
 db.query(`delete from public.v2_batch_enrollments where student_id='${f.admin}'`);
 db.query(`insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state) values('${m.users.unpaid.id}','${existing.id}','${existing.sessionKey}','session','opened')`);
 db.rejects(cleanup(),/escaped fixture activity/);db.query(`delete from public.v2_learning_progress where student_id='${m.users.unpaid.id}'`);
 db.query(`select public.grant_v2_purchase('${m.users.unpaid.id}',array['quant_crash'],'untracked-fixture-purchase',now(),(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,1000000,'INR')`);
 db.rejects(cleanup(),/Untracked purchase/);
 db.query("delete from public.v2_product_grants where purchase_id in(select id from public.v2_purchases where payment_reference='untracked-fixture-purchase');delete from public.v2_purchases where payment_reference='untracked-fixture-purchase'");
 db.query("update supabase_migrations.schema_migrations set name='changed'");db.rejects(cleanup(),/baseline changed/);assert.equal(db.query('select count(*) from public.v2_course_batches'),count);
 db.query("update supabase_migrations.schema_migrations set name='original_phase1'");assert.equal(JSON.parse(db.query(cleanup())).baseline_restored,true);
}));
test('setup rejects identity ownership, pre-existing activity and inventory mismatch',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {m,existing}=bootstrap(db);
 db.rejects(setupSql({...m,startDate:'2000-01-01'}),/must remain in the future/);
 db.query(`update auth.users set raw_user_meta_data='{}' where id='${m.users.full.id}'`);db.rejects(setupSql(m),/identity ownership mismatch/);
 db.query(`update auth.users set raw_user_meta_data=${json({phase3_qa_run:m.runId})} where id='${m.users.full.id}'`);
 db.query(`insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id) values('${existing.id}','${m.users.unpaid.id}',true,1,'${m.users.admin.id}')`);db.rejects(setupSql(m),/already has application activity/);
 db.query(`delete from public.v2_batch_enrollments where student_id='${m.users.unpaid.id}'`);
 db.rejects(setupSql({...m,expectedTableCount:m.expectedTableCount+1}),/inventory changed/);
 assert.equal(db.query(`select count(*) from public.v2_course_batches where id='${m.courses.quant.batchId}'`),'0');
}));
