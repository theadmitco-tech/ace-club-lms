import assert from 'node:assert/strict';
import test from 'node:test';
import {withDisposablePostgres} from './helpers/disposable-postgres.mjs';
import {preparePhase3Database,as} from './helpers/v2-phase3-fixture.mjs';

test('public V2 catalogue exposes published sales metadata only',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {query,apply,rejects}=db;const {batch,publish}=preparePhase3Database(db);
 const quant=batch('quant',true),full=batch('full_course'),hidden=batch('di');publish(quant);publish(full);
 const baseline=()=>query("select jsonb_build_object('purchases',(select jsonb_agg(to_jsonb(p)) from public.v2_purchases p),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p),'publications',(select jsonb_agg(to_jsonb(p) order by batch_id,revision) from public.v2_batch_publication_revisions p))");
 const before=baseline();apply('20261113090000_add_v2_sales_catalogue.sql');assert.equal(baseline(),before);
 const read=()=>JSON.parse(query(as(null,'select public.list_v2_sales_catalogue()','anon')));
 let rows=read();assert.equal(rows.length,2);assert.ok(!rows.some(x=>x.batchId===hidden.id));
 const q=rows.find(x=>x.batchId===quant.id);assert.equal(q.entitlementProductCode,'quant_crash');assert.equal(q.accessMonths,6);assert.equal(q.sessions[0].title,'Public outline heading');assert.equal(q.events[0].startsAt,'2027-01-10T13:30:00.000Z');assert.equal(rows.find(x=>x.batchId===full.id).entitlementProductCode,'full_batch');
 assert.doesNotMatch(JSON.stringify(rows),/private\.example|Protected resource|Private draft|actor|requestId|fingerprint|instructor/);
 query(`update public.v2_batch_publication_revisions set document=document||'{"privateMeet":"https://meet.google.com/abc-defg-hij","futureSecret":"never-expose"}'::jsonb where batch_id='${quant.id}'`);
 assert.doesNotMatch(JSON.stringify(read()),/meet.google|never-expose/);
 rejects(as(null,'select * from public.v2_course_batch_revisions','anon'),/permission denied/);
 rejects(as(null,'select * from public.v2_live_registrations','anon'),/permission denied/);
 publish(quant,1,'unpublish');rows=read();assert.equal(rows.length,1);assert.equal(rows[0].batchId,full.id);
 query("update public.v2_products set available_for_purchase=false where code='full_batch'");assert.deepEqual(read(),[]);
}));
