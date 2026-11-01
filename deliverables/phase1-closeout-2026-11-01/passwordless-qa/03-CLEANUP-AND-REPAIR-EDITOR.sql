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

-- Execute after the browser/API tests; leaves Auth account deletion to the agent.
-- Match BOTH exact payment reference and generated owner; no broad prefix deletion.
delete from public.v2_product_grants g using public.v2_purchases p,phase1_qa_plan q
 where g.purchase_id=p.id and p.payment_reference=q.reference and p.student_id=q.student_id;
delete from public.v2_purchases p using phase1_qa_plan q
 where p.payment_reference=q.reference and p.student_id=q.student_id;

-- Phase 1 legacy compatibility repair; no original migration or ledger changes.
-- First prove exact QA purchase cleanup restored the operator's 60-table baseline.
create temporary table phase1_repair_baseline as select pg_temp.phase1_public_fingerprint() as value;
do $$ begin
 if (select value from phase1_repair_baseline) <> '{"md5":"37f717bc66b73f46bb8b85822e02bd01","table_count":60}'::jsonb
 then raise exception 'Public-data baseline differs. Transaction rolled back; do not bypass this guard.'; end if;
end $$;
create temporary table phase1_editor_added_columns as
 select name from unnest(array['question_type','di_question_type','answer_mode','stimulus_group_key','stimulus_title','stimulus_text','stimulus_data','content_format','admin_notes']) name
 where not exists(select 1 from pg_attribute where attrelid='public.master_practice_questions'::regclass and attname=name and not attisdropped);
-- Upgrade universal session questions with richer GMAT rendering metadata.
-- Run this once in Supabase SQL Editor. Existing questions are preserved.

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'problem_solving'
CHECK (
  question_type IN (
    'problem_solving',
    'data_sufficiency',
    'critical_reasoning',
    'reading_comprehension',
    'data_insights'
  )
);

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS di_question_type TEXT
CHECK (
  di_question_type IS NULL OR di_question_type IN (
    'data_sufficiency',
    'multi_source_reasoning',
    'table_analysis',
    'graphics_interpretation',
    'two_part_analysis'
  )
);

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS answer_mode TEXT NOT NULL DEFAULT 'single_choice'
CHECK (answer_mode IN ('single_choice', 'multi_select', 'numeric', 'two_part', 'dropdown'));

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_group_key TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_title TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_text TEXT;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS stimulus_data JSONB;

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'plain'
CHECK (content_format IN ('plain', 'markdown'));

ALTER TABLE public.master_practice_questions
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS master_practice_questions_type_idx
  ON public.master_practice_questions(question_type, di_question_type);

CREATE INDEX IF NOT EXISTS master_practice_questions_stimulus_group_idx
  ON public.master_practice_questions(master_practice_set_id, stimulus_group_key)
  WHERE stimulus_group_key IS NOT NULL;


create or replace function pg_temp.phase1_compat_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; aggregate_hashes text := ''; tables_count integer := 0; omitted text[];
begin
 select coalesce(array_agg(name),'{}'::text[]) into omitted from phase1_editor_added_columns;
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='master_practice_questions' then
   execute format('select md5(coalesce(string_agg(md5((to_jsonb(r)-$1)::text), '''' order by md5((to_jsonb(r)-$1)::text)), '''')) from public.%I r',t.tablename) into h using omitted;
  else
   execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',t.tablename) into h;
  end if;
  aggregate_hashes := aggregate_hashes || t.tablename || ':' || h || ';'; tables_count := tables_count+1;
 end loop;
 return jsonb_build_object('table_count',tables_count,'md5',md5(aggregate_hashes));
end $$;
do $$ begin
 if pg_temp.phase1_compat_fingerprint() <> (select value from phase1_repair_baseline)
 then raise exception 'Existing column values changed. Transaction rolled back.'; end if;
end $$;
notify pgrst, 'reload schema';
select jsonb_build_object('check','phase1_cleanup_and_legacy_editor_repair',
 'run_id','7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719',
 'remaining_fixture_purchases',(select count(*) from public.v2_purchases p join phase1_qa_plan q on p.payment_reference=q.reference and p.student_id=q.student_id),
 'after_purchase_cleanup',(select value from phase1_repair_baseline),
 'baseline_restored',true,'existing_column_values_preserved',true,
 'added_columns',(select coalesce(jsonb_agg(name order by name),'[]'::jsonb) from phase1_editor_added_columns),
 'after_additive_schema_repair',pg_temp.phase1_public_fingerprint(),
 'original_phase1_migration_reapplied',false,'phase2_activated',false);
commit;
