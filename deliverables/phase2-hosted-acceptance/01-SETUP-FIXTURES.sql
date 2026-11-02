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

create temporary table phase2_qa_baseline on commit drop as select pg_temp.phase2_public_fingerprint() fingerprint;
do $$ declare v_request jsonb;v_preview jsonb;begin
 if exists(select 1 from public.v2_course_templates t join phase2_qa_courses q on q.template_id=t.id)
 or exists(select 1 from public.v2_purchases p join phase2_qa_users q on q.id=p.student_id)
 then raise exception 'QA fixtures already exist; setup must not repeat'; end if;
 perform public.grant_v2_purchase('1d0cd9f6-6831-4d1c-babe-52c9d6e7429c',array['quant_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:eligible',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['quant_crash'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('2cd192e6-f365-440f-ba1c-8212506c57d9',array['full_batch'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:full',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['full_batch'])->>'price_version_id')::uuid,(public.quote_v2_products(array['full_batch'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('0465a0db-a6a4-4004-9c0f-5acf10d0aed7',array['quant_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:unregistered',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['quant_crash'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('f23fdf9d-d6db-45ee-8c89-bd1886baf2c9',array['quant_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:expired',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['quant_crash'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('13342f35-9214-481e-8959-8b70c6b7d9b7',array['quant_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:revoked',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['quant_crash'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('c51ef1b7-380e-4c9b-b4e6-1e4652be265a',array['quant_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:inactive',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['quant_crash'])->>'amount_paise')::integer,'INR');
perform public.grant_v2_purchase('6c3ac735-ad59-478c-a104-264b66b65af4',array['di_crash'],'phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:wrong_subject',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['di_crash'])->>'price_version_id')::uuid,(public.quote_v2_products(array['di_crash'])->>'amount_paise')::integer,'INR');
 perform set_config('request.jwt.claim.sub','2df035e4-f406-4abf-9460-a3850e1a9b65',true);
 perform public.save_v2_template_draft('53167d09-aa3d-4681-8bb7-ed3b674e4f46','quant',0,'750df326-50d0-4d6d-a5e4-27e6990da44f','{"title":"Phase 2 QA quant","summary":"Synthetic acceptance fixture","durationDays":1,"sessions":[{"key":"a48e1381-c2e9-41a6-b40c-66448d91f665","title":"QA quant session","section":"quant","content":{"preSessionReads":[{"key":"58288117-243c-470d-947e-a1468ed6a416","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"fd3d9eac-0b58-4eee-bb4f-2e7ff0620f73","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"3b51c0ed-562e-4b81-a826-5097735387b7","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"e8db2547-d950-46f8-b498-add9f3fe3f7b","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}}],"events":[{"key":"86bec587-f635-4ed0-aa55-b5ef0083f610","title":"QA live class","section":"quant","kind":"live","dayOffset":0,"localStartTime":"19:00","durationMinutes":60,"capacity":8,"instructor":""}]}'::jsonb);
 v_request:='{"id":"72043717-d737-4524-8467-1b99550be2c7","templateId":"53167d09-aa3d-4681-8bb7-ed3b674e4f46","templateRevision":1,"expectedRevision":0,"requestId":"216fe730-7871-4468-8133-5b61fa6bfc36","title":"Phase 2 QA quant batch","startDate":"2026-11-10","timeZone":"Asia/Kolkata","events":null}'::jsonb;v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 perform public.save_v2_meeting_draft('{"batchId":"72043717-d737-4524-8467-1b99550be2c7","batchRevision":1,"expectedRevision":0,"requestId":"2538508f-446b-4013-a48f-5bed62929c68","links":[{"key":"86bec587-f635-4ed0-aa55-b5ef0083f610","url":"https://meet.google.com/abc-defg-hij"}]}'::jsonb);
 v_request:='{"batchId":"72043717-d737-4524-8467-1b99550be2c7","batchRevision":1,"expectedRevision":0,"requestId":"2a0492d6-e805-4d3e-9467-74432c010931","action":"publish"}'::jsonb;v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');
perform public.save_v2_template_draft('62186bcd-b613-473d-b9df-982cb3688001','verbal',0,'74a7d28d-d3db-4020-8ea6-f4d9eff562c5','{"title":"Phase 2 QA verbal","summary":"Synthetic acceptance fixture","durationDays":null,"sessions":[{"key":"1f3096d6-60a7-448b-abbb-76ad6dea0534","title":"QA verbal session","section":"verbal","content":{"preSessionReads":[{"key":"ae0d56d8-f5eb-4726-b459-0795eca2c8c5","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"1cf93f44-a18f-493b-8fff-c22bf455edd9","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"2b9d7c4a-895a-4070-bd7d-87458640e08e","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"99cb70f9-404d-48d3-8e61-99b2d7a2d248","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}}],"events":[]}'::jsonb);
 v_request:='{"id":"9933c0b2-789d-490e-919e-f15c84e17e42","templateId":"62186bcd-b613-473d-b9df-982cb3688001","templateRevision":1,"expectedRevision":0,"requestId":"dc3cda65-8044-4eb1-b820-124678330b43","title":"Phase 2 QA verbal batch","startDate":"","timeZone":"Asia/Kolkata","events":null}'::jsonb;v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 
 v_request:='{"batchId":"9933c0b2-789d-490e-919e-f15c84e17e42","batchRevision":1,"expectedRevision":0,"requestId":"4f3ff537-2b11-4cf5-9bdb-9e718da18f73","action":"publish"}'::jsonb;v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');
perform public.save_v2_template_draft('1e6a06f7-9708-411d-9609-f497465c971c','di',0,'80f052ae-9fce-486c-aad8-7182e4592789','{"title":"Phase 2 QA di","summary":"Synthetic acceptance fixture","durationDays":null,"sessions":[{"key":"367ce9aa-3860-4cf1-8e6c-edc467fa3cbc","title":"QA di session","section":"di","content":{"preSessionReads":[{"key":"820ce814-1f27-4f96-bf78-b111fdbcfad3","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"a538c11f-f0c2-4a10-81c5-48cb4aee2bfa","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"75dca217-dcce-4098-baaf-4843adde74ab","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"520c3068-1c78-4acc-9a0b-bd4bc353a15d","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}}],"events":[]}'::jsonb);
 v_request:='{"id":"137bf096-8e11-47db-b1e6-7dca0b8948be","templateId":"1e6a06f7-9708-411d-9609-f497465c971c","templateRevision":1,"expectedRevision":0,"requestId":"e5ffc7ff-fa14-43fa-a13b-b44711da90bb","title":"Phase 2 QA di batch","startDate":"","timeZone":"Asia/Kolkata","events":null}'::jsonb;v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 
 v_request:='{"batchId":"137bf096-8e11-47db-b1e6-7dca0b8948be","batchRevision":1,"expectedRevision":0,"requestId":"0e1454a4-4d81-4e53-9cf2-4c3cb56dc497","action":"publish"}'::jsonb;v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');
perform public.save_v2_template_draft('c7c3c9e2-a3b1-47e5-ac7d-8cc1106fa8ad','full_course',0,'a62a2d8f-bfe4-401b-bf7d-66ecd18b9932','{"title":"Phase 2 QA full_course","summary":"Synthetic acceptance fixture","durationDays":null,"sessions":[{"key":"142f4fdd-999e-4fb3-a699-c140c17cff0a","title":"QA full_course session","section":"quant","content":{"preSessionReads":[{"key":"2c339303-6777-4f1e-b0ac-e76b50d1a55b","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"9a58648c-1f4a-45a3-b05a-b44a56c0de59","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"1d958adb-83bf-44b8-8650-b1e903e27a53","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"e2533b1f-8b1b-4669-afd6-f29a24c8754d","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}},{"key":"39a58335-099a-4de0-9db4-c2056e0e7c11","title":"QA programme introduction","section":"programme","content":{"preSessionReads":[{"key":"2c339303-6777-4f1e-b0ac-e76b50d1a55b","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"9a58648c-1f4a-45a3-b05a-b44a56c0de59","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"1d958adb-83bf-44b8-8650-b1e903e27a53","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"e2533b1f-8b1b-4669-afd6-f29a24c8754d","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}}],"events":[]}'::jsonb);
 v_request:='{"id":"2c15c4e6-efa0-413b-8210-eadd46d07b43","templateId":"c7c3c9e2-a3b1-47e5-ac7d-8cc1106fa8ad","templateRevision":1,"expectedRevision":0,"requestId":"7f72d383-5a86-4bd4-808e-f5c2b279c69c","title":"Phase 2 QA full_course batch","startDate":"","timeZone":"Asia/Kolkata","events":null}'::jsonb;v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 
 v_request:='{"batchId":"2c15c4e6-efa0-413b-8210-eadd46d07b43","batchRevision":1,"expectedRevision":0,"requestId":"0772be53-ccf9-4416-8064-f0dedb4268fe","action":"publish"}'::jsonb;v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');
perform public.save_v2_template_draft('cace424b-a795-453e-865f-a2363ee3591d','quant',0,'e6dcfcbd-cfdb-4015-b3f5-2898f77f3ac0','{"title":"Phase 2 QA quant_draft","summary":"Synthetic acceptance fixture","durationDays":null,"sessions":[{"key":"47eb2e0d-1260-4509-98cf-6a87d68b39ab","title":"QA quant_draft session","section":"quant","content":{"preSessionReads":[{"key":"963e4aab-7dd3-4f31-8b0f-1cddbf5fe7b7","title":"QA exact preSessionReads title","url":"https://example.test/phase2/preSessionReads"}],"recordings":[{"key":"819ba488-3380-4171-afad-4d4051d0f786","title":"QA exact recordings title","url":"https://example.test/phase2/recordings"}],"postSessionReads":[{"key":"05d9e126-06f8-4619-8656-9683ffdfc1a7","title":"QA exact postSessionReads title","url":"https://example.test/phase2/postSessionReads"}],"materials":[{"key":"dab08384-8039-4bbe-a717-46646688de8c","title":"QA exact materials title","url":"https://example.test/phase2/materials"}]}}],"events":[]}'::jsonb);
 v_request:='{"id":"0b431774-9d63-4cd7-9f7e-4c2dab2047ca","templateId":"cace424b-a795-453e-865f-a2363ee3591d","templateRevision":1,"expectedRevision":0,"requestId":"f017ae6d-b998-4bc6-851d-00059dd8a915","title":"Phase 2 QA quant_draft batch","startDate":"","timeZone":"Asia/Kolkata","events":null}'::jsonb;v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 
 
 perform public.set_v2_batch_enrollment('72043717-d737-4524-8467-1b99550be2c7','1d0cd9f6-6831-4d1c-babe-52c9d6e7429c',true,0);
 perform public.set_v2_live_registration('72043717-d737-4524-8467-1b99550be2c7','1d0cd9f6-6831-4d1c-babe-52c9d6e7429c',true,0);
perform public.set_v2_batch_enrollment('72043717-d737-4524-8467-1b99550be2c7','0465a0db-a6a4-4004-9c0f-5acf10d0aed7',true,0);
 
perform public.set_v2_batch_enrollment('72043717-d737-4524-8467-1b99550be2c7','f23fdf9d-d6db-45ee-8c89-bd1886baf2c9',true,0);
 perform public.set_v2_live_registration('72043717-d737-4524-8467-1b99550be2c7','f23fdf9d-d6db-45ee-8c89-bd1886baf2c9',true,0);
perform public.set_v2_batch_enrollment('72043717-d737-4524-8467-1b99550be2c7','13342f35-9214-481e-8959-8b70c6b7d9b7',true,0);
 perform public.set_v2_live_registration('72043717-d737-4524-8467-1b99550be2c7','13342f35-9214-481e-8959-8b70c6b7d9b7',true,0);
perform public.set_v2_batch_enrollment('72043717-d737-4524-8467-1b99550be2c7','c51ef1b7-380e-4c9b-b4e6-1e4652be265a',true,0);
 perform public.set_v2_live_registration('72043717-d737-4524-8467-1b99550be2c7','c51ef1b7-380e-4c9b-b4e6-1e4652be265a',true,0);
 perform public.set_v2_batch_enrollment('2c15c4e6-efa0-413b-8210-eadd46d07b43','2cd192e6-f365-440f-ba1c-8212506c57d9',true,0);
 perform public.set_v2_batch_enrollment('137bf096-8e11-47db-b1e6-7dca0b8948be','6c3ac735-ad59-478c-a104-264b66b65af4',true,0);
 
 if not exists(select 1 from public.v2_course_batches b join lateral (select revision,batch_revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on true
   where b.id='2b19ea33-150c-5ddd-aae7-134831603408' and b.product_code='full_course' and b.template_id='78cf6e6c-748a-5dfe-a771-69fd0a119025'
   and p.document->>'state'='published' and p.revision=1 and p.batch_revision=1)
 then raise exception 'Reviewed real Full Course publication changed';end if;
 if exists(select 1 from public.v2_batch_enrollments where batch_id='2b19ea33-150c-5ddd-aae7-134831603408' and student_id='2cd192e6-f365-440f-ba1c-8212506c57d9')
 then raise exception 'Generated QA account already has a real-course enrollment';end if;
 perform public.set_v2_batch_enrollment('2b19ea33-150c-5ddd-aae7-134831603408','2cd192e6-f365-440f-ba1c-8212506c57d9',true,0);
 
end $$;
update public.v2_purchases set confirmed_at=statement_timestamp()-interval '7 months' where student_id='f23fdf9d-d6db-45ee-8c89-bd1886baf2c9' and payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:expired';
update public.v2_purchases set revoked_at=statement_timestamp() where student_id='13342f35-9214-481e-8959-8b70c6b7d9b7' and payment_reference='phase2-qa:307e2a9f-9265-45f9-9818-4ea52711684c:revoked';
update public.profiles set is_active=false where id='c51ef1b7-380e-4c9b-b4e6-1e4652be265a';
select jsonb_build_object('check','phase2_qa_fixture_setup','run_id','307e2a9f-9265-45f9-9818-4ea52711684c','qa_accounts',9,'batches',5,'purchases',7,'real_course_enrollments',1,'baseline',(select fingerprint from phase2_qa_baseline));
commit;
