-- STAGING ONLY: https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql/new
-- The dashboard project must match the designated staging project before execution.
-- Only exact generated QA identities and fixture IDs belong to this run.
begin;
set local statement_timeout='60s';set local lock_timeout='3s';
create temporary table phase5_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase5_qa_users values ('admin','a260283f-eb26-467a-b991-e804272b69f2','ace-p5-admin-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('full','a49ac1d2-f572-4267-8eed-2acf1e3e81e8','ace-p5-full-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('quant','067d771f-aa64-4b6a-8f3d-8ddda62d81fb','ace-p5-quant-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('unregistered','2df4bd46-52eb-44ab-9948-52c66bb8fddd','ace-p5-unregistered-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('expired','e6256780-5fc0-4ff3-be33-887484404ad3','ace-p5-expired-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('revoked','4f3ea3b5-3ebb-46a7-9e8b-1851012f9518','ace-p5-revoked-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('inactive','015a5ae4-5052-487c-9549-2f889d464b8d','ace-p5-inactive-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('wrong_subject','073cccfc-f93b-4c94-bd5b-58b1abe91ee2','ace-p5-wrong_subject-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid'),('empty','52632b7c-b5f2-4e0d-9c7d-7c5284e890d6','ace-p5-empty-93a9ab13-1986-4124-9370-ea86b4355823@example.invalid');
create temporary table phase5_qa_courses(label text primary key,template_id uuid unique,batch_id uuid unique) on commit drop;
insert into phase5_qa_courses values ('full_course','20842f75-fa34-4ebb-b086-60040f169cf2','9b20c149-1d04-40ca-be48-fd8f7344b7be'),('quant','780f6990-22ce-4f23-af53-dd03f0449ec7','0d212e74-967d-4155-a097-60f025454a77');
do $$begin
 if (select count(*) from phase5_qa_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase5_qa_run'='93a9ab13-1986-4124-9370-ea86b4355823')<>9 then raise exception 'QA account ownership mismatch';end if;
 if (select count(*) from phase5_qa_users q join public.profiles p on p.id=q.id and p.email=q.email and p.role=case when q.label='admin' then 'admin' else 'student' end)<>9 then raise exception 'QA profile ownership mismatch';end if;
 if to_regprocedure('public.save_v2_content_item(uuid,integer,uuid,jsonb)') is null then raise exception 'Phase 5 activation is required';end if;
end $$;
do $$begin
 if not exists(select 1 from public.v2_course_batches b join lateral(select document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true where b.id='2b19ea33-150c-5ddd-aae7-134831603408' and b.product_code='full_course' and p.document->>'state'='published') then raise exception 'The designated existing Full Course must remain published';end if;
end $$;
create or replace function pg_temp.phase5_public_fingerprint() returns jsonb language plpgsql as $$
declare t record;h text;hashes text:='';n integer:=0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in(select id from phase5_qa_users);
  else execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'excluded_generated_profiles',9);
end $$;

create temporary table phase5_qa_content(id uuid primary key) on commit drop;
insert into phase5_qa_content values ('1b8f1049-d23e-4590-9ed8-9750e5671dee'),('9e541beb-2d4b-46a0-bff6-c8dbe8e23aae'),('6fc88c01-ef99-44c2-be0c-6f0184e63fff'),('8893680f-3da0-4c4d-ab74-d82ac16a0945'),('c5a8ff27-8a75-4a5f-a138-53bdfeffe571'),('b7bf5640-27c4-421b-9195-40155cb513fd'),('ecd3079a-8503-4602-92ff-c08cc2ee6599'),('84f003e4-6f3d-4a02-8713-e56004876818'),('cc603279-01b8-4c1f-af65-646be833db76'),('ebe0b471-ca96-4bee-8417-819ee8bd2c75'),('1ee0ed6e-d130-4dfc-b314-41fe2d46f15c');
do $$begin
 if exists(select 1 from public.v2_content_item_revisions r join phase5_qa_content q on q.id=r.item_id where r.actor_id<>'a260283f-eb26-467a-b991-e804272b69f2')
 or exists(select 1 from public.v2_content_publication_audit r join phase5_qa_content q on q.id=r.item_id where r.actor_id<>'a260283f-eb26-467a-b991-e804272b69f2')
 or exists(select 1 from public.v2_content_item_revisions r join phase5_qa_content q on q.id=r.item_id cross join lateral jsonb_array_elements(r.document->'targets') t where (t->>'batchId')::uuid not in(select batch_id from phase5_qa_courses)) then raise exception 'Generated content ownership or scope mismatch';end if;
end $$;
delete from public.v2_content_publication_audit where item_id in(select id from phase5_qa_content);
delete from public.v2_content_item_revisions where item_id in(select id from phase5_qa_content);
delete from public.v2_content_items where id in(select id from phase5_qa_content);
do $$declare v_table text;v_foreign boolean;begin
 if 'ac53ab317feeb1386221ee45fd623932' !~ '^[0-9a-f]{32}$' then raise exception 'Recorded setup baseline required';end if;
 if exists(select 1 from public.v2_course_template_revisions r join phase5_qa_courses q on q.template_id=r.template_id where r.actor_id<>'a260283f-eb26-467a-b991-e804272b69f2')
 or exists(select 1 from public.v2_course_batch_revisions r join phase5_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'a260283f-eb26-467a-b991-e804272b69f2')
 or exists(select 1 from public.v2_batch_publication_revisions r join phase5_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'a260283f-eb26-467a-b991-e804272b69f2') then raise exception 'Fixture revisions have unexpected ownership';end if;
 if exists(select 1 from public.v2_purchases p where p.student_id in(select id from phase5_qa_users) and not((p.student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:full') or (p.student_id='067d771f-aa64-4b6a-8f3d-8ddda62d81fb' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:quant') or (p.student_id='2df4bd46-52eb-44ab-9948-52c66bb8fddd' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:unregistered') or (p.student_id='e6256780-5fc0-4ff3-be33-887484404ad3' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:expired') or (p.student_id='4f3ea3b5-3ebb-46a7-9e8b-1851012f9518' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:revoked') or (p.student_id='015a5ae4-5052-487c-9549-2f889d464b8d' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:inactive') or (p.student_id='073cccfc-f93b-4c94-bd5b-58b1abe91ee2' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:wrong_subject'))) then raise exception 'Generated accounts contain unexpected purchases';end if;
 if exists(select 1 from public.v2_batch_enrollments e where e.batch_id in(select batch_id from phase5_qa_courses) and e.student_id not in(select id from phase5_qa_users)) then raise exception 'Fixture batch contains a non-fixture Student';end if;
 if exists(select 1 from public.v2_learning_progress p where p.student_id in(select id from phase5_qa_users) and p.batch_id not in(select batch_id from phase5_qa_courses) and not(p.batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and p.student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8'))
 or exists(select 1 from public.v2_feedback_obligations o where o.student_id in(select id from phase5_qa_users) and o.batch_id not in(select batch_id from phase5_qa_courses)) then raise exception 'QA learning activity escaped fixture scope';end if;
 foreach v_table in array array['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_recording_watch_sessions','v2_live_registrations'] loop
  execute format('select exists(select 1 from public.%I where batch_id in(select batch_id from phase5_qa_courses) and student_id not in(select id from phase5_qa_users))',v_table) into v_foreign;
  if v_foreign then raise exception 'Fixture learning data contains a non-fixture Student';end if;
 end loop;
foreach v_table in array array['v2_batch_enrollments','v2_learning_progress','v2_recording_watch_sessions'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase5_qa_users) and student_id<>$2)',v_table) into v_foreign using '2b19ea33-150c-5ddd-aae7-134831603408'::uuid,'a49ac1d2-f572-4267-8eed-2acf1e3e81e8'::uuid;
 if v_foreign then raise exception 'Unexpected QA identity used the existing course';end if;
 end loop;
 foreach v_table in array array['v2_live_registrations','v2_feedback_obligations','v2_session_feedback'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase5_qa_users))',v_table) into v_foreign using '2b19ea33-150c-5ddd-aae7-134831603408'::uuid;
 if v_foreign then raise exception 'Existing-course QA scope exceeded read-only learning checks';end if;
 end loop;
end $$;
-- Only the generated Full Course QA identity loses its temporary learning state and enrollment.
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and w.student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8';
delete from public.v2_recording_watch_sessions where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8';
delete from public.v2_learning_progress where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8';
delete from public.v2_batch_enrollments where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8';
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_recording_watch_sessions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_feedback_obligations where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_session_feedback where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_learning_progress where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_session_mapping_audit where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_session_mappings where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_registration_audit where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_registrations where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_class_completions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_published_meetings where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_enrollments where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_publication_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_meeting_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_batch_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_batches where id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_template_revisions where template_id in(select template_id from phase5_qa_courses);
delete from public.v2_course_templates where id in(select template_id from phase5_qa_courses);
delete from public.v2_product_grants g using public.v2_purchases p where g.purchase_id=p.id and ((p.student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:full') or (p.student_id='067d771f-aa64-4b6a-8f3d-8ddda62d81fb' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:quant') or (p.student_id='2df4bd46-52eb-44ab-9948-52c66bb8fddd' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:unregistered') or (p.student_id='e6256780-5fc0-4ff3-be33-887484404ad3' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:expired') or (p.student_id='4f3ea3b5-3ebb-46a7-9e8b-1851012f9518' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:revoked') or (p.student_id='015a5ae4-5052-487c-9549-2f889d464b8d' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:inactive') or (p.student_id='073cccfc-f93b-4c94-bd5b-58b1abe91ee2' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:wrong_subject'));
delete from public.v2_purchases p where (p.student_id='a49ac1d2-f572-4267-8eed-2acf1e3e81e8' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:full') or (p.student_id='067d771f-aa64-4b6a-8f3d-8ddda62d81fb' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:quant') or (p.student_id='2df4bd46-52eb-44ab-9948-52c66bb8fddd' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:unregistered') or (p.student_id='e6256780-5fc0-4ff3-be33-887484404ad3' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:expired') or (p.student_id='4f3ea3b5-3ebb-46a7-9e8b-1851012f9518' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:revoked') or (p.student_id='015a5ae4-5052-487c-9549-2f889d464b8d' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:inactive') or (p.student_id='073cccfc-f93b-4c94-bd5b-58b1abe91ee2' and p.payment_reference='phase5-qa:93a9ab13-1986-4124-9370-ea86b4355823:wrong_subject');
do $$begin
 if pg_temp.phase5_public_fingerprint()->>'md5'<>'ac53ab317feeb1386221ee45fd623932' then raise exception 'Existing public data fingerprint changed; cleanup rolled back';end if;
end $$;
select jsonb_build_object('check','phase5_qa_fixture_cleanup','run_id','93a9ab13-1986-4124-9370-ea86b4355823','baseline_restored',true,'fingerprint',pg_temp.phase5_public_fingerprint());
commit;
