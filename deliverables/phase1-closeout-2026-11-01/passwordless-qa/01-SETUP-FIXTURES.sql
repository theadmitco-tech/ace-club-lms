-- STAGING ONLY: https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql/new
-- Verify the project in the dashboard; SQL cannot establish hosted project identity.
-- Dedicated QA run 7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719; never changes existing accounts or migrations.
begin;
set local statement_timeout='30s';
set local lock_timeout='2s';
create temporary table phase1_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase1_qa_users values ('q','c36b3151-97df-4550-89c7-246e0ea03591'::uuid,'ace-p1-q-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('v','d9f64530-b5a4-4846-99d7-1af268cfd998'::uuid,'ace-p1-v-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('d','f6045463-bb95-49f2-aacf-12e127d27bf9'::uuid,'ace-p1-d-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('qv','1d78a71d-6c25-4a57-9b12-0412b3f0f139'::uuid,'ace-p1-qv-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('qd','95c14e5b-45e6-42d9-82b1-2295464b6f5e'::uuid,'ace-p1-qd-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('vd','e920c10d-ba5c-4fa7-90cc-6fcd929f2d50'::uuid,'ace-p1-vd-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('qvd','e45ab928-1ca3-47ff-b574-936f158cb90a'::uuid,'ace-p1-qvd-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('full','38f8b41c-024b-473d-8b88-f001f2822d3f'::uuid,'ace-p1-full-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('expired','2ef8b710-1826-4757-ae30-79689404a14f'::uuid,'ace-p1-expired-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('revoked','a3f6791f-1425-43c6-89be-4766ef9e9d65'::uuid,'ace-p1-revoked-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('inactive','a21adcf2-0e80-4782-87a5-b7453734a03e'::uuid,'ace-p1-inactive-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('multiple','4308e326-83f8-47db-b261-15a9ea972c53'::uuid,'ace-p1-multiple-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('mixed','44a7b2dc-d184-4329-9437-01ed1c99b4fa'::uuid,'ace-p1-mixed-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('empty','09ab51ba-ca6e-494f-ab6d-e519fe420e5e'::uuid,'ace-p1-empty-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid'),
('admin','6fbd6b9f-2731-4c03-91f6-9fb0c3c0c1a1'::uuid,'ace-p1-admin-7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719@example.invalid');
do $$ begin
  if (select count(*) from phase1_qa_users q join auth.users u on u.id=q.id
      and u.email=q.email and u.raw_user_meta_data->>'phase1_qa_run'='7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719') <> 15
  then raise exception 'QA ownership check failed. Stop; do not substitute existing accounts.'; end if;
  if (select count(*) from phase1_qa_users q join public.profiles p on p.id=q.id and p.email=q.email
      and p.role=case when q.label='admin' then 'admin' else 'student' end
      and p.is_active=(q.label<>'inactive')) <> 15
  then raise exception 'QA profile state does not match the prepared run.'; end if;
end $$;
create temporary table phase1_qa_plan(label text,student_id uuid,product_codes text[],reference text unique,state text,amount integer) on commit drop;
insert into phase1_qa_plan values ('q','c36b3151-97df-4550-89c7-246e0ea03591'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:q:0','active',1000000),
('v','d9f64530-b5a4-4846-99d7-1af268cfd998'::uuid,array['verbal_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:v:0','active',1000000),
('d','f6045463-bb95-49f2-aacf-12e127d27bf9'::uuid,array['di_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:d:0','active',1000000),
('qv','1d78a71d-6c25-4a57-9b12-0412b3f0f139'::uuid,array['quant_crash','verbal_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:qv:0','active',1800000),
('qd','95c14e5b-45e6-42d9-82b1-2295464b6f5e'::uuid,array['quant_crash','di_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:qd:0','active',1800000),
('vd','e920c10d-ba5c-4fa7-90cc-6fcd929f2d50'::uuid,array['verbal_crash','di_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:vd:0','active',1800000),
('qvd','e45ab928-1ca3-47ff-b574-936f158cb90a'::uuid,array['quant_crash','verbal_crash','di_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:qvd:0','active',2500000),
('full','38f8b41c-024b-473d-8b88-f001f2822d3f'::uuid,array['full_batch']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:full:0','active',2500000),
('expired','2ef8b710-1826-4757-ae30-79689404a14f'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:expired:0','expired',1000000),
('revoked','a3f6791f-1425-43c6-89be-4766ef9e9d65'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:revoked:0','revoked',1000000),
('inactive','a21adcf2-0e80-4782-87a5-b7453734a03e'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:inactive:0','inactive',1000000),
('multiple','4308e326-83f8-47db-b261-15a9ea972c53'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:multiple:0','active',1000000),
('multiple','4308e326-83f8-47db-b261-15a9ea972c53'::uuid,array['verbal_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:multiple:1','active',1000000),
('mixed','44a7b2dc-d184-4329-9437-01ed1c99b4fa'::uuid,array['quant_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:mixed:0','expired',1000000),
('mixed','44a7b2dc-d184-4329-9437-01ed1c99b4fa'::uuid,array['verbal_crash']::text[],'phase1-qa:7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719:mixed:1','active',1000000);

-- Privacy-safe fingerprint: only hashes/counts leave the database, never row values.
create or replace function pg_temp.phase1_public_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; aggregate_hashes text := ''; tables_count integer := 0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',t.tablename) into h;
  aggregate_hashes := aggregate_hashes || t.tablename || ':' || h || ';'; tables_count := tables_count+1;
 end loop;
 return jsonb_build_object('table_count',tables_count,'md5',md5(aggregate_hashes));
end $$;

create temporary table phase1_qa_baseline on commit drop as select pg_temp.phase1_public_fingerprint() as fingerprint;
do $$ begin
 if (select count(*) from supabase_migrations.schema_migrations where version='20261018090000')<>1
 then raise exception 'Original Phase 1 migration ledger entry missing or ambiguous. Do not rerun migration.'; end if;
 if exists(select 1 from public.v2_purchases p join phase1_qa_plan q on p.payment_reference=q.reference)
 then raise exception 'This fixture run already has purchases. Stop; do not repeat setup.'; end if;
 if exists(select 1 from phase1_qa_plan p where (public.quote_v2_products(p.product_codes)->>'amount_paise')::integer<>p.amount)
 then raise exception 'Configured prices differ from approved tiers. Stop before fixture writes.'; end if;
end $$;
create temporary table phase1_qa_created on commit drop as
 select p.label,p.state,public.grant_v2_purchase(p.student_id,p.product_codes,p.reference,
 statement_timestamp()-interval '1 second',(q.quote->>'price_version_id')::uuid,p.amount,'INR') as purchase_id
 from phase1_qa_plan p cross join lateral (select public.quote_v2_products(p.product_codes) as quote) q;
-- Only synthetic purchases created above are adjusted to exercise these states.
update public.v2_purchases p set confirmed_at=statement_timestamp()-interval '7 months'
 from phase1_qa_created q where q.purchase_id=p.id and q.state='expired';
update public.v2_purchases p set revoked_at=statement_timestamp()
 from phase1_qa_created q where q.purchase_id=p.id and q.state='revoked';
select jsonb_build_object('check','phase1_qa_fixture_setup','run_id','7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719',
 'purchase_count',(select count(*) from phase1_qa_created),'qa_account_count',15,
 'baseline_before_purchases',(select fingerprint from phase1_qa_baseline),
 'states',(select jsonb_agg(jsonb_build_object('label',label,'state',state) order by label,state) from phase1_qa_created));
commit;
