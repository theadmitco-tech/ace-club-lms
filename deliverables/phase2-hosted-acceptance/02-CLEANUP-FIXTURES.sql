-- STAGING ONLY: https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql/new
-- The dashboard project must match the staging project before execution.
-- Exact generated QA accounts and IDs only; no existing records are fixture targets.
begin;
set local statement_timeout='60s';
set local lock_timeout='3s';
create temporary table phase2_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase2_qa_users values ('admin','2df035e4-f406-4abf-9460-a3850e1a9b65'::uuid,'ace-p2-admin-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('eligible','1d0cd9f6-6831-4d1c-babe-52c9d6e7429c'::uuid,'ace-p2-eligible-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('empty','18fda033-4c39-499b-a7b2-ceb598d7f679'::uuid,'ace-p2-empty-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('expired','f23fdf9d-d6db-45ee-8c89-bd1886baf2c9'::uuid,'ace-p2-expired-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('full','2cd192e6-f365-440f-ba1c-8212506c57d9'::uuid,'ace-p2-full-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('inactive','c51ef1b7-380e-4c9b-b4e6-1e4652be265a'::uuid,'ace-p2-inactive-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('revoked','13342f35-9214-481e-8959-8b70c6b7d9b7'::uuid,'ace-p2-revoked-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('unregistered','0465a0db-a6a4-4004-9c0f-5acf10d0aed7'::uuid,'ace-p2-unregistered-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid'),
('wrong_subject','6c3ac735-ad59-478c-a104-264b66b65af4'::uuid,'ace-p2-wrong_subject-307e2a9f-9265-45f9-9818-4ea52711684c@example.invalid');
create temporary table phase2_qa_courses(label text primary key,template_id uuid unique,batch_id uuid unique) on commit drop;
insert into phase2_qa_courses values ('quant','53167d09-aa3d-4681-8bb7-ed3b674e4f46'::uuid,'72043717-d737-4524-8467-1b99550be2c7'::uuid),
('verbal','62186bcd-b613-473d-b9df-982cb3688001'::uuid,'9933c0b2-789d-490e-919e-f15c84e17e42'::uuid),
('di','1e6a06f7-9708-411d-9609-f497465c971c'::uuid,'137bf096-8e11-47db-b1e6-7dca0b8948be'::uuid),
('full_course','c7c3c9e2-a3b1-47e5-ac7d-8cc1106fa8ad'::uuid,'2c15c4e6-efa0-413b-8210-eadd46d07b43'::uuid),
('quant_draft','cace424b-a795-453e-865f-a2363ee3591d'::uuid,'0b431774-9d63-4cd7-9f7e-4c2dab2047ca'::uuid);
do $$ begin
 if (select count(*) from phase2_qa_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase2_qa_run'='307e2a9f-9265-45f9-9818-4ea52711684c')<>9
 then raise exception 'QA account ownership mismatch'; end if;
 if (select count(*) from phase2_qa_users q join public.profiles p on p.id=q.id and p.email=q.email and p.role=case when q.label='admin' then 'admin' else 'student' end)<>9
 then raise exception 'QA profile ownership mismatch'; end if;
end $$;
create or replace function pg_temp.phase2_public_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; hashes text:=''; n integer:=0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then
   select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in (select id from phase2_qa_users);
  else
   execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;
  end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'excluded_generated_profiles',9);
end $$;

-- The exact baseline from setup is required before cleanup can commit.
do $$ begin
 if 'd960200e147961964330031a3762eb4a' !~ '^[0-9a-f]{32}$' then raise exception 'Recorded setup baseline required'; end if;
 if exists(select 1 from public.v2_course_template_revisions r join phase2_qa_courses q on q.template_id=r.template_id where r.actor_id<>'2df035e4-f406-4abf-9460-a3850e1a9b65')
 or exists(select 1 from public.v2_course_batch_revisions r join phase2_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'2df035e4-f406-4abf-9460-a3850e1a9b65')
 or exists(select 1 from public.v2_batch_publication_revisions r join phase2_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'2df035e4-f406-4abf-9460-a3850e1a9b65')
 then raise exception 'Fixture revisions have unexpected ownership'; end if;
 if exists(select 1 from public.v2_publication_scope_requests r,lateral jsonb_array_elements(r.result) d where r.actor_id='2df035e4-f406-4abf-9460-a3850e1a9b65' and not exists(select 1 from phase2_qa_courses q where q.batch_id=(d->>'batchId')::uuid))
 then raise exception 'Publication scope contains non-fixture batches'; end if;
end $$;
-- Exact generated Student enrollment only; the existing course and its publication remain unchanged.
delete from public.v2_batch_enrollments where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='2cd192e6-f365-440f-ba1c-8212506c57d9' and actor_id='2df035e4-f406-4abf-9460-a3850e1a9b65';
delete from public.v2_publication_scope_requests where actor_id='2df035e4-f406-4abf-9460-a3850e1a9b65';
delete from public.v2_live_registration_audit where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_live_registrations where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_live_class_completions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_published_meetings where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_enrollments where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_publication_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_batch_meeting_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_batch_revisions where batch_id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_batches where id in(select batch_id from phase2_qa_courses);
delete from public.v2_course_template_revisions where template_id in(select template_id from phase2_qa_courses);
delete from public.v2_course_templates where id in(select template_id from phase2_qa_courses);
delete from public.v2_product_grants g using public.v2_purchases p where g.purchase_id=p.id and ((p.student_id='1d0cd9f6-6831-4d1c-babe-52c9d6e7429c' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:eligible') or (p.student_id='2cd192e6-f365-440f-ba1c-8212506c57d9' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:full') or (p.student_id='0465a0db-a6a4-4004-9c0f-5acf10d0aed7' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:unregistered') or (p.student_id='f23fdf9d-d6db-45ee-8c89-bd1886baf2c9' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:expired') or (p.student_id='13342f35-9214-481e-8959-8b70c6b7d9b7' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:revoked') or (p.student_id='c51ef1b7-380e-4c9b-b4e6-1e4652be265a' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:inactive') or (p.student_id='6c3ac735-ad59-478c-a104-264b66b65af4' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:wrong_subject'));
delete from public.v2_purchases p where (p.student_id='1d0cd9f6-6831-4d1c-babe-52c9d6e7429c' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:eligible') or (p.student_id='2cd192e6-f365-440f-ba1c-8212506c57d9' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:full') or (p.student_id='0465a0db-a6a4-4004-9c0f-5acf10d0aed7' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:unregistered') or (p.student_id='f23fdf9d-d6db-45ee-8c89-bd1886baf2c9' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:expired') or (p.student_id='13342f35-9214-481e-8959-8b70c6b7d9b7' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:revoked') or (p.student_id='c51ef1b7-380e-4c9b-b4e6-1e4652be265a' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:inactive') or (p.student_id='6c3ac735-ad59-478c-a104-264b66b65af4' and p.payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:wrong_subject');
do $$ begin
 if pg_temp.phase2_public_fingerprint()->>'md5'<>'d960200e147961964330031a3762eb4a' then raise exception 'Existing public data fingerprint changed; cleanup rolled back'; end if;
end $$;
select jsonb_build_object('check','phase2_qa_fixture_cleanup','run_id','307e2a9f-9265-45f9-9818-4ea52711684c','baseline_restored',true,'fingerprint',pg_temp.phase2_public_fingerprint());
commit;
