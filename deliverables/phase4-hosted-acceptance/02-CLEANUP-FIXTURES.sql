-- STAGING ONLY: https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql/new
-- The dashboard project must match the designated staging project before execution.
-- Only exact generated QA identities and fixture IDs belong to this run.
begin;
set local statement_timeout='60s';set local lock_timeout='3s';
create temporary table phase4_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase4_qa_users values ('admin','408e4cb0-3fd6-4587-a07b-db40b1196215','ace-p4-admin-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('full','a3c95186-db55-42a5-a8bc-d5942f5d44ad','ace-p4-full-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('quant','bed201b9-3110-465b-9101-e5cc954d9a36','ace-p4-quant-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('unregistered','fbd0e57c-0ae1-4159-b841-c72992d48349','ace-p4-unregistered-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('expired','c74df4dd-6a5f-4e8a-ba91-2219873edfda','ace-p4-expired-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('revoked','21c33585-b164-46a3-8e44-db6e385de863','ace-p4-revoked-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('inactive','f54e3783-bc93-4e06-bdd2-4e0c026232dc','ace-p4-inactive-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('wrong_subject','0ac8f807-91cc-419f-901f-168aeef4305a','ace-p4-wrong_subject-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid'),('empty','4e15949c-040d-4e71-b1ca-d96f3af130b0','ace-p4-empty-a56891e7-5197-41ca-afa6-e5a45e0003c7@example.invalid');
create temporary table phase4_qa_courses(label text primary key,template_id uuid unique,batch_id uuid unique) on commit drop;
insert into phase4_qa_courses values ('full_course','b5fec5ca-5fb4-4912-ae8e-0a0fc97123a5','64503e0d-abb2-476d-b7fa-d48e548de0d1'),('quant','948f2a37-e70f-4e89-980a-fd21ac7e3f9a','f5062afc-05b4-4694-b6e1-759abfcee94f');
do $$begin
 if (select count(*) from phase4_qa_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase4_qa_run'='a56891e7-5197-41ca-afa6-e5a45e0003c7')<>9 then raise exception 'QA account ownership mismatch';end if;
 if (select count(*) from phase4_qa_users q join public.profiles p on p.id=q.id and p.email=q.email and p.role=case when q.label='admin' then 'admin' else 'student' end)<>9 then raise exception 'QA profile ownership mismatch';end if;
 if to_regprocedure('public.submit_v2_session_feedback(uuid,uuid,jsonb)') is null then raise exception 'Phase 4 activation is required';end if;
end $$;
do $$begin
 if not exists(select 1 from public.v2_course_batches b join lateral(select document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true where b.id='2b19ea33-150c-5ddd-aae7-134831603408' and b.product_code='full_course' and p.document->>'state'='published') then raise exception 'The designated existing Full Course must remain published';end if;
end $$;
create or replace function pg_temp.phase4_public_fingerprint() returns jsonb language plpgsql as $$
declare t record;h text;hashes text:='';n integer:=0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in(select id from phase4_qa_users);
  else execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'excluded_generated_profiles',9);
end $$;

do $$declare v_table text;v_foreign boolean;begin
 if '27145d216badf73e85ee4a42930499a2' !~ '^[0-9a-f]{32}$' then raise exception 'Recorded setup baseline required';end if;
 if exists(select 1 from public.v2_course_template_revisions r join phase4_qa_courses q on q.template_id=r.template_id where r.actor_id<>'408e4cb0-3fd6-4587-a07b-db40b1196215')
 or exists(select 1 from public.v2_course_batch_revisions r join phase4_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'408e4cb0-3fd6-4587-a07b-db40b1196215')
 or exists(select 1 from public.v2_batch_publication_revisions r join phase4_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'408e4cb0-3fd6-4587-a07b-db40b1196215') then raise exception 'Fixture revisions have unexpected ownership';end if;
 if exists(select 1 from public.v2_purchases p where p.student_id in(select id from phase4_qa_users) and not((p.student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:full') or (p.student_id='bed201b9-3110-465b-9101-e5cc954d9a36' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:quant') or (p.student_id='fbd0e57c-0ae1-4159-b841-c72992d48349' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:unregistered') or (p.student_id='c74df4dd-6a5f-4e8a-ba91-2219873edfda' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:expired') or (p.student_id='21c33585-b164-46a3-8e44-db6e385de863' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:revoked') or (p.student_id='f54e3783-bc93-4e06-bdd2-4e0c026232dc' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:inactive') or (p.student_id='0ac8f807-91cc-419f-901f-168aeef4305a' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:wrong_subject'))) then raise exception 'Generated accounts contain unexpected purchases';end if;
 if exists(select 1 from public.v2_batch_enrollments e where e.batch_id in(select batch_id from phase4_qa_courses) and e.student_id not in(select id from phase4_qa_users)) then raise exception 'Fixture batch contains a non-fixture Student';end if;
 if exists(select 1 from public.v2_learning_progress p where p.student_id in(select id from phase4_qa_users) and p.batch_id not in(select batch_id from phase4_qa_courses) and not(p.batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and p.student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad'))
 or exists(select 1 from public.v2_feedback_obligations o where o.student_id in(select id from phase4_qa_users) and o.batch_id not in(select batch_id from phase4_qa_courses)) then raise exception 'QA learning activity escaped fixture scope';end if;
 foreach v_table in array array['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_recording_watch_sessions','v2_live_registrations'] loop
  execute format('select exists(select 1 from public.%I where batch_id in(select batch_id from phase4_qa_courses) and student_id not in(select id from phase4_qa_users))',v_table) into v_foreign;
  if v_foreign then raise exception 'Fixture learning data contains a non-fixture Student';end if;
 end loop;
foreach v_table in array array['v2_batch_enrollments','v2_learning_progress','v2_recording_watch_sessions'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase4_qa_users) and student_id<>$2)',v_table) into v_foreign using '2b19ea33-150c-5ddd-aae7-134831603408'::uuid,'a3c95186-db55-42a5-a8bc-d5942f5d44ad'::uuid;
 if v_foreign then raise exception 'Unexpected QA identity used the existing course';end if;
 end loop;
 foreach v_table in array array['v2_live_registrations','v2_feedback_obligations','v2_session_feedback'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase4_qa_users))',v_table) into v_foreign using '2b19ea33-150c-5ddd-aae7-134831603408'::uuid;
 if v_foreign then raise exception 'Existing-course QA scope exceeded read-only learning checks';end if;
 end loop;
end $$;
-- Only the generated Full Course QA identity loses its temporary learning state and enrollment.
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and w.student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad';
delete from public.v2_recording_watch_sessions where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad';
delete from public.v2_learning_progress where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad';
delete from public.v2_batch_enrollments where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad';
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_recording_watch_sessions where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_feedback_obligations where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_session_feedback where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_learning_progress where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_live_session_mapping_audit where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_live_session_mappings where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_live_registration_audit where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_live_registrations where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_live_class_completions where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_published_meetings where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_batch_enrollments where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_batch_publication_revisions where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_batch_meeting_revisions where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_course_batch_revisions where batch_id in(select batch_id from phase4_qa_courses);
delete from public.v2_course_batches where id in(select batch_id from phase4_qa_courses);
delete from public.v2_course_template_revisions where template_id in(select template_id from phase4_qa_courses);
delete from public.v2_course_templates where id in(select template_id from phase4_qa_courses);
delete from public.v2_product_grants g using public.v2_purchases p where g.purchase_id=p.id and ((p.student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:full') or (p.student_id='bed201b9-3110-465b-9101-e5cc954d9a36' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:quant') or (p.student_id='fbd0e57c-0ae1-4159-b841-c72992d48349' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:unregistered') or (p.student_id='c74df4dd-6a5f-4e8a-ba91-2219873edfda' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:expired') or (p.student_id='21c33585-b164-46a3-8e44-db6e385de863' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:revoked') or (p.student_id='f54e3783-bc93-4e06-bdd2-4e0c026232dc' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:inactive') or (p.student_id='0ac8f807-91cc-419f-901f-168aeef4305a' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:wrong_subject'));
delete from public.v2_purchases p where (p.student_id='a3c95186-db55-42a5-a8bc-d5942f5d44ad' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:full') or (p.student_id='bed201b9-3110-465b-9101-e5cc954d9a36' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:quant') or (p.student_id='fbd0e57c-0ae1-4159-b841-c72992d48349' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:unregistered') or (p.student_id='c74df4dd-6a5f-4e8a-ba91-2219873edfda' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:expired') or (p.student_id='21c33585-b164-46a3-8e44-db6e385de863' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:revoked') or (p.student_id='f54e3783-bc93-4e06-bdd2-4e0c026232dc' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:inactive') or (p.student_id='0ac8f807-91cc-419f-901f-168aeef4305a' and p.payment_reference='phase4-qa:a56891e7-5197-41ca-afa6-e5a45e0003c7:wrong_subject');
do $$begin
 if pg_temp.phase4_public_fingerprint()->>'md5'<>'27145d216badf73e85ee4a42930499a2' then raise exception 'Existing public data fingerprint changed; cleanup rolled back';end if;
end $$;
select jsonb_build_object('check','phase4_qa_fixture_cleanup','run_id','a56891e7-5197-41ca-afa6-e5a45e0003c7','baseline_restored',true,'fingerprint',pg_temp.phase4_public_fingerprint());
commit;
