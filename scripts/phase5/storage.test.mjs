import test from 'node:test';
import assert from 'node:assert/strict';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
test('private bucket excludes browser reads and writes despite broad older policies',()=>withDisposablePostgres(async({query,apply,rejects})=>{
 query(`create role anon;create role authenticated;create role service_role bypassrls;create schema storage;grant usage on schema storage to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id integer,bucket_id text);alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
 create policy old_permissive on storage.objects for all to anon,authenticated using(true) with check(true);
 insert into storage.buckets values('existing','existing',false,1000,array['text/plain']);insert into storage.objects values(1,'existing'),(2,'v2-course-content');`);
 apply('20261103091000_add_v2_private_content_storage.sql');
 for(const role of ['anon','authenticated']){
  assert.equal(query(`set role ${role};select count(*) from storage.objects where bucket_id='v2-course-content';reset role`),'0');
  assert.equal(query(`set role ${role};select count(*) from storage.objects where bucket_id='existing';reset role`),'1');
  rejects(`set role ${role};insert into storage.objects values(3,'v2-course-content');`,/row-level security/);
 }
 assert.equal(query("set role service_role;select count(*) from storage.objects where bucket_id='v2-course-content';reset role"),'1');
 assert.equal(query("select public from storage.buckets where id='v2-course-content'"),'f');
 assert.equal(query("select file_size_limit from storage.buckets where id='existing'"),'1000');
}));
