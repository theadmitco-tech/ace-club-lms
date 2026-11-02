-- STAGING ONLY: eyphkkginlgoaxflauog. The dashboard project must be verified before execution.
-- This atomic packet adds Phase 4 only. Phase 1/2 ledger rows and all existing application records are preserved.
-- Recovery source SHA256: 76797990e51637732d2a938cc7aeded2785ed975fc79b6e791e9dfe5259a936c
rollback;
begin;
set local timezone='UTC';
set local statement_timeout='60s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase4_expected_rows on commit drop as select * from jsonb_to_recordset('[{"table":"course_template_events","rows":211,"md5":"16df6448268f32bb16ef48b33bf58675"},{"table":"course_template_resources","rows":70,"md5":"a6bf41039701c8123eece142c9fc6a96"},{"table":"course_template_revisions","rows":19,"md5":"22d2eb592008c1246493b0496fda04ff"},{"table":"course_template_sections","rows":31,"md5":"f92aa5d48a787346fc9f71a29330e534"},{"table":"course_templates","rows":4,"md5":"4d1d53fe9de01e055adbfa1300aee5b0"},{"table":"courses","rows":13,"md5":"d49397e6ca2c055f4338c51bc9648fa3"},{"table":"enrollments","rows":4,"md5":"c52228a514c2a00ba1ebce886f9ce7e0"},{"table":"master_materials","rows":13,"md5":"017adc9bf3281d55f664cee7119c71e4"},{"table":"master_practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_sessions","rows":31,"md5":"f17c8bcf3bc6f7252480c8a1dc28151b"},{"table":"master_worksheet_plans","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_worksheet_questions","rows":150,"md5":"3e87a15501a4b334a77d133f2ae90003"},{"table":"master_worksheet_session_rules","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"material_worksheet_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"materials","rows":74,"md5":"0d1c4a252de931898b86179408a6d557"},{"table":"mock_assessment_assignments","rows":7,"md5":"c8991d683e1fc9d7e3456a9a19bef5b5"},{"table":"mock_assessment_audit","rows":39,"md5":"31436407260a317f8dd1247e90fc9fcc"},{"table":"mock_assessment_items","rows":196,"md5":"5792d2ab8339b82d1d4c07662dbd1cb5"},{"table":"mock_assessment_sections","rows":13,"md5":"f5ccdd1c785888ef80f42be82f87405e"},{"table":"mock_assessment_versions","rows":6,"md5":"99e4de190cee849a1d20273ac363b561"},{"table":"mock_assessments","rows":5,"md5":"8efa3a08945ffee210591d3c8ad46375"},{"table":"mock_assignment_testers","rows":2,"md5":"3bf4cc223ad9e9a779ff5bcb9cbb32cf"},{"table":"mock_attempt_item_notes","rows":1,"md5":"c99adc47ce7ba60c1720c5dd910a0546"},{"table":"mock_attempt_items","rows":132,"md5":"37f6f567ea544f12ffa0b054903efc87"},{"table":"mock_attempt_sections","rows":10,"md5":"ef8371608b27659eec7d3eb0099a030a"},{"table":"mock_attempts","rows":4,"md5":"588e56a16a1ab1ce0252616fba611482"},{"table":"mock_import_items","rows":200,"md5":"1bd9ff44e1ae072033ae2d4c2c880eab"},{"table":"mock_imports","rows":8,"md5":"925b24ad77525eab924875b0d0051163"},{"table":"mock_media","rows":10,"md5":"af21364af1a736bfc115aeaec6367420"},{"table":"mock_operation_receipts","rows":135,"md5":"1a8c71fb2442305a9053f87492f1c3c0"},{"table":"mock_question_media","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"mock_question_options","rows":909,"md5":"10b09a504ad255366096f8a7e077a871"},{"table":"mock_question_revisions","rows":168,"md5":"6b0d69b88125ce2d964e3d3eebdf6350"},{"table":"mock_questions","rows":164,"md5":"91d6cc28e550f3e548ad6694850a9955"},{"table":"mock_responses","rows":132,"md5":"7d21093f16d7e60669977d79ae6fd730"},{"table":"mock_review_edits","rows":1,"md5":"e514be2613f46258e3f859e0cfeeb6e5"},{"table":"mock_source_namespace_members","rows":1,"md5":"8a361235be3dda5a6b5838d2d19a555c"},{"table":"mock_source_namespaces","rows":3,"md5":"b1965b90b59589cebb5155e23f8234d2"},{"table":"mock_stimuli","rows":26,"md5":"0bed07cdd3556db9517d62957c5f0426"},{"table":"mock_stimulus_media","rows":10,"md5":"113669a3d6a9c3ba2111dc26f477496c"},{"table":"mock_stimulus_revisions","rows":26,"md5":"ef365a15a542d51cbae31bf5afa7e93f"},{"table":"mock_topics","rows":84,"md5":"fe2704763ab5094a91a9e21324665b4b"},{"table":"payments","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"profiles","rows":10,"md5":"98de7831ca2176f6fc86dcf61c7a0f52"},{"table":"registrations","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"sessions","rows":251,"md5":"fddf08506487eef78815af4db2591d72"},{"table":"student_course_preferences","rows":1,"md5":"f1964e938f5907539c063075d33adb63"},{"table":"student_material_question_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"student_question_logs","rows":600,"md5":"423cf7b89db0653c73498045840a614c"},{"table":"student_worksheet_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_enrollments","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_meeting_revisions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_publication_revisions","rows":4,"md5":"02b664f595160da8250774d4ca7acef3"},{"table":"v2_content_asset_placements","rows":33,"md5":"d6059e45a3c72a15c8243f2398c8b813"},{"table":"v2_content_asset_replacements","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_content_imports","rows":1,"md5":"bdad478721b5697cdb5393ece6f51284"},{"table":"v2_course_batch_revisions","rows":4,"md5":"a5d99f821e2b47385e6acb5ac5d55f0d"},{"table":"v2_course_batches","rows":4,"md5":"05f9b8179b1a0a7c1c03e11b2e1fe625"},{"table":"v2_course_offerings","rows":4,"md5":"20d7dcd6cddc7e4a3d7d3ae629b43867"},{"table":"v2_course_template_revisions","rows":8,"md5":"b1bb73088d432a0783016c3457afd99f"},{"table":"v2_course_templates","rows":4,"md5":"5839f24b48da7f89ac6b4cc4f5026560"},{"table":"v2_live_class_completions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_live_registration_audit","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_live_registrations","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_price_versions","rows":4,"md5":"29f7278b543ff356a5a4b163747e2598"},{"table":"v2_product_grants","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_products","rows":4,"md5":"0ec545a7ee7c8dbd5500f8f781dd2cec"},{"table":"v2_publication_scope_requests","rows":1,"md5":"2d59e7885b30cdb293de5177f18aa50b"},{"table":"v2_published_meetings","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_purchases","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_shared_content_asset_revisions","rows":19,"md5":"62d37546f3cc376264b1eda5cce706b6"},{"table":"v2_shared_content_assets","rows":19,"md5":"9cb43ad9eafd2eeac9c553398c0e2efe"},{"table":"worksheet_daily_targets","rows":0,"md5":"d751713988987e9331980363e24189ce"}]'::jsonb) as t("table" text,rows bigint,md5 text);
create function pg_temp.phase4_assert_preserved() returns void language plpgsql as $$
declare t record;n bigint;h text;begin
 for t in select * from phase4_expected_rows order by "table" loop
  if to_regclass('public.'||quote_ident(t."table")) is null then raise exception 'Existing table missing: %',t."table";end if;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t."table") into n,h;
  if n<>t.rows or h<>t.md5 then raise exception 'Existing application data differs: %; transaction aborted',t."table";end if;
 end loop;
end;$$;

do $phase4_preflight$ declare t record;r jsonb;p record;begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261018090000') then raise exception 'Phase 1 ledger missing';end if;
 if exists(select 1 from supabase_migrations.schema_migrations where version='20261102170000') then raise exception 'Phase 4 already recorded; use reconciliation instead';end if;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'9bd44028bf3ea54ee2f4954f2042e748' then raise exception 'Migration ledger differs from fresh recovery; reconcile before activation';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>78 then raise exception 'Application table inventory changed';end if;
 for t in select * from phase4_expected_rows order by "table" loop execute format('lock table public.%I in share mode',t."table");end loop;
 perform pg_temp.phase4_assert_preserved();
 for r in select value from jsonb_array_elements('[{"signature":"get_my_v2_batch_schedules()","sourceMd5":"b151b679ceed090553ccb9a5d06a39a6","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"get_my_v2_meeting(uuid,uuid)","sourceMd5":"22456120dce3677862078245852e9483","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"get_my_v2_published_course(uuid)","sourceMd5":"ed6fdee7291d7954c7fefd02fb70b0a6","configuration":["search_path=\"\""],"securityDefiner":true}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or to_jsonb(p.proconfig) is distinct from r->'configuration' then raise exception 'Existing delivery function changed: %',r->>'signature';end if;
 end loop;
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array['v2_learning_course_base','v2_learning_session_open','get_my_v2_learning_state','mark_v2_learning_progress','v2_add_feedback_obligation','v2_store_session_feedback','submit_v2_session_feedback','set_v2_live_session_mapping','list_v2_live_session_mappings','v2_completed_class_feedback','complete_v2_learning_live_class','v2_recording_player_supported','v2_learning_recording','begin_v2_recording_watch','record_v2_recording_sample','report_v2_recording_watched'])) then raise exception 'Unrecorded Phase 4 function exists';end if;
end;$phase4_preflight$;
-- Phase 4 adds caller-scoped learning state and section feedback guards.
-- Applied purchase, publication and legacy mock histories remain unchanged.

create table public.v2_learning_progress (
 student_id uuid not null references public.profiles(id), batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null, resource_key text not null, state text not null check(state in ('opened','read')),
 last_opened_at timestamptz not null default statement_timestamp(), read_at timestamptz,
 primary key(student_id,batch_id,session_key,resource_key)
);
create table public.v2_session_feedback (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 request_id uuid not null unique, confirmation_reference text not null unique, provider text not null default 'lms' check(provider='lms'), response jsonb not null, submitted_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key)
);
create table public.v2_feedback_obligations (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 session_title text not null, section text not null check(section in ('quant','verbal','di')),
 source text not null check(source in ('recording','live')), source_key uuid not null,
 publication_revision integer not null, created_at timestamptz not null default statement_timestamp(),
 feedback_id uuid references public.v2_session_feedback(id),
 unique(student_id,batch_id,session_key,source,source_key)
);
create index v2_feedback_pending_idx on public.v2_feedback_obligations(student_id,section) where feedback_id is null;
create table public.v2_live_session_mappings (
 batch_id uuid not null references public.v2_course_batches(id), event_key uuid not null,
 publication_revision integer not null, session_key uuid not null, actor_id uuid not null references public.profiles(id),
 updated_at timestamptz not null default statement_timestamp(), primary key(batch_id,event_key,publication_revision),
 foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision)
);
create table public.v2_live_session_mapping_audit (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null,event_key uuid not null,
 publication_revision integer not null,session_key uuid not null,actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default statement_timestamp()
);

-- The internal reader retains the reviewed Phase 2 authorization boundary.
create function public.v2_learning_course_base(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_product text; v_draft jsonb; v_sessions jsonb;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id
 where b.id=p_batch_id and e.student_id=auth.uid() and e.active;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>'state'<>'published' then return null; end if;
 select document into v_draft from public.v2_course_batch_revisions where batch_id=p_batch_id and revision=v_publication.batch_revision;
 select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',coalesce(nullif(s->>'title',''),'Course outline'),'section',s->'section','content',s->'content') order by n),'[]')
 into v_sessions from jsonb_array_elements(coalesce(v_draft->'sessions','[]')||coalesce((select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->'events') with ordinality item(e,ord) where e?'content'),'[]')) with ordinality item(s,n)
 where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>'section')
 or (v_product='full_course' and s->>'section'='programme' and public.can_access_v2_product('full_batch'));
 return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_publication.revision,'batchRevision',v_publication.batch_revision,
 'title',v_publication.document->'title','productCode',v_product,'sessions',v_sessions);
end; $$;
create function public.v2_learning_session_open(p_student uuid,p_batch uuid,p_session uuid,p_section text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.v2_feedback_obligations where student_id=p_student and section=p_section and feedback_id is null)
 or exists(select 1 from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and section=p_section and feedback_id is null);
$$;
create or replace function public.get_my_v2_published_course(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 return jsonb_set(v_course,'{sessions}',coalesce((select jsonb_agg(s order by n) from jsonb_array_elements(v_course->'sessions') with ordinality items(s,n)
 where public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>'key')::uuid,s->>'section')),'[]'));
end; $$;
create function public.get_my_v2_learning_state(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb; v_registered boolean; v_publication jsonb; v_revision integer;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 v_revision:=(v_course->>'publicationRevision')::integer;
 select exists(select 1 from public.v2_live_registrations where batch_id=p_batch_id and student_id=auth.uid() and active) into v_registered;
 select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id and revision=v_revision;
 return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_revision,
 'sessions',(select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',s->'title','section',s->'section',
 'locked',not public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>'key')::uuid,s->>'section')) order by n),'[]') from jsonb_array_elements(v_course->'sessions') with ordinality items(s,n)),
 'obligations',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'batchId',o.batch_id,'sessionKey',o.session_key,'sessionTitle',o.session_title,'section',o.section,'source',o.source,'eventKey',case when o.source='live' then o.source_key end,'createdAt',o.created_at) order by o.created_at,o.id),'[]')
 from public.v2_feedback_obligations o where o.student_id=auth.uid() and o.feedback_id is null and o.section in (select s->>'section' from jsonb_array_elements(v_course->'sessions') s)),
 'progress',(select coalesce(jsonb_agg(jsonb_build_object('sessionKey',p.session_key,'itemKey',case when p.resource_key<>'session' then p.resource_key end,'status',p.state,'lastOpenedAt',p.last_opened_at,'readAt',p.read_at) order by p.last_opened_at),'[]') from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and exists(select 1 from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p.session_key::text)),
 'lastSessionKey',(select p.session_key from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and p.resource_key='session' and exists(select 1 from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p.session_key::text and public.v2_learning_session_open(auth.uid(),p_batch_id,p.session_key,s->>'section')) order by p.last_opened_at desc limit 1),
 'liveRegistered',v_registered,'liveEvents',case when not v_registered then '[]'::jsonb else (
 select coalesce(jsonb_agg(jsonb_build_object('key',e->'key','title',e->'title','section',e->'section','startsAt',e->'startsAt','endsAt',e->'endsAt','completedAt',c.completed_at,'sessionKey',m.session_key) order by n),'[]')
 from jsonb_array_elements(v_publication->'events') with ordinality items(e,n)
 left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>'key')::uuid
 left join public.v2_live_session_mappings m on m.batch_id=p_batch_id and m.event_key=(e->>'key')::uuid and m.publication_revision=v_revision
 where e->>'kind'='live' and public.can_access_v2_product(public.v2_entitlement_product_code(v_course->>'productCode'),e->>'section')
 ) end);
end; $$;
create function public.mark_v2_learning_progress(p_batch_id uuid,p_session_key uuid,p_item_key uuid,p_state text,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_course jsonb; v_session jsonb; v_resource text;
begin
 if p_state is null or p_state not in ('opened','read') then raise exception 'Invalid progress state' using errcode='22023'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 v_course:=public.get_my_v2_published_course(p_batch_id);
 if v_course is null or (v_course->>'publicationRevision')::integer is distinct from p_publication_revision then raise exception 'Published course unavailable' using errcode='42501'; end if;
 select s into v_session from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p_session_key::text;
 if v_session is null then raise exception 'Session unavailable' using errcode='42501'; end if;
 if p_item_key is null then
  if p_state<>'opened' then raise exception 'Session progress is visual opening only' using errcode='22023'; end if;
  v_resource:='session';
 else
  if not exists(select 1 from jsonb_array_elements(v_session#>'{content,preSessionReads}') i where i->>'key'=p_item_key::text) then raise exception 'Published pre-read required' using errcode='22023'; end if;
  v_resource:=p_item_key::text;
 end if;
 insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state,read_at)
 values(auth.uid(),p_batch_id,p_session_key,v_resource,p_state,case when p_state='read' then statement_timestamp() end)
 on conflict(student_id,batch_id,session_key,resource_key) do update set last_opened_at=statement_timestamp(),
 state=case when public.v2_learning_progress.state='read' then 'read' else excluded.state end,
 read_at=coalesce(public.v2_learning_progress.read_at,excluded.read_at);
 return jsonb_build_object('saved',true);
end; $$;
create function public.v2_add_feedback_obligation(p_student uuid,p_batch uuid,p_session uuid,p_title text,p_section text,p_source text,p_key uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_feedback uuid;
begin
 select id into v_feedback from public.v2_session_feedback where student_id=p_student and batch_id=p_batch and session_key=p_session;
 insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision,feedback_id)
 values(p_student,p_batch,p_session,p_title,p_section,p_source,p_key,p_revision,v_feedback)
 on conflict(student_id,batch_id,session_key,source,source_key) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and source=p_source and source_key=p_key; end if;
 return v_id;
end; $$;
create function public.v2_store_session_feedback(p_obligation_id uuid,p_student_id uuid,p_request_id uuid,p_response jsonb,p_event_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.v2_feedback_obligations%rowtype; v_saved public.v2_session_feedback%rowtype; v_live boolean;
begin
 perform 1 from public.profiles where id=p_student_id for update;
 if not found then raise exception 'Feedback owner unavailable' using errcode='42501'; end if;
 select * into o from public.v2_feedback_obligations where id=p_obligation_id and student_id=p_student_id for update;
 if not found then raise exception 'Feedback obligation unavailable' using errcode='42501'; end if;
 if p_request_id is null or p_event_id is null or length(p_event_id) not between 1 and 200 or p_response is null or jsonb_typeof(p_response)<>'object'
 or not p_response ?& array['usefulness','clarity','comment','attendance'] or (select count(*) from jsonb_object_keys(p_response))<>4
 or (p_response->>'attendance'='missed' and (p_response->'usefulness'<>'null'::jsonb or p_response->'clarity'<>'null'::jsonb))
 or (p_response->>'attendance'<>'missed' and (jsonb_typeof(p_response->'usefulness')<>'number' or jsonb_typeof(p_response->'clarity')<>'number' or p_response->>'usefulness' !~ '^[1-5]$' or p_response->>'clarity' !~ '^[1-5]$'))
 or jsonb_typeof(p_response->'comment')<>'string' or length(p_response->>'comment')>4000
 or jsonb_typeof(p_response->'attendance')<>'string' or p_response->>'attendance' not in ('attended','missed','recording') then raise exception 'Invalid feedback response' using errcode='22023'; end if;
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception 'Feedback was already submitted; reload the session' using errcode='40001'; end if;
  return jsonb_build_object('submitted',true,'replayed',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and source='live') into v_live;
 if (v_live and p_response->>'attendance'='recording') or (not v_live and p_response->>'attendance'<>'recording') then raise exception 'Feedback attendance context changed; reload the session' using errcode='40001'; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object('submitted',true,'replayed',false);
end; $$;
-- The temporary LMS form records caller-authored feedback; no external verification is claimed.
create function public.submit_v2_session_feedback(p_obligation_id uuid,p_request_id uuid,p_response jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role='student' and is_active for update;
 if not found then raise exception 'Active Student access required' using errcode='42501'; end if;
 return public.v2_store_session_feedback(p_obligation_id,auth.uid(),p_request_id,p_response,'lms:'||p_request_id::text);
end; $$;
create function public.set_v2_live_session_mapping(p_batch_id uuid,p_event_key uuid,p_session_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_session jsonb;
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform 1 from public.v2_course_batches where id=p_batch_id for update;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.revision is distinct from p_publication_revision or v_publication.document->>'state'<>'published' then raise exception 'Publication changed; reload the class list' using errcode='40001'; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
 select s into v_session from jsonb_array_elements(v_publication.document->'sessions') s where s->>'key'=p_session_key::text;
 if v_event is null or v_session is null or v_event->>'section' is distinct from v_session->>'section' then raise exception 'A published session in the live class subject is required' using errcode='22023'; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then raise exception 'Completed class mappings are immutable' using errcode='22023'; end if;
 if exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision and session_key=p_session_key) then return jsonb_build_object('saved',true,'replayed',true); end if;
 insert into public.v2_live_session_mappings(batch_id,event_key,publication_revision,session_key,actor_id)
 values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid())
 on conflict(batch_id,event_key,publication_revision) do update set session_key=excluded.session_key,actor_id=excluded.actor_id,updated_at=statement_timestamp();
 insert into public.v2_live_session_mapping_audit(batch_id,event_key,publication_revision,session_key,actor_id) values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid());
 return jsonb_build_object('saved',true,'replayed',false);
end; $$;
create function public.list_v2_live_session_mappings(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('eventKey',event_key,'sessionKey',session_key,'publicationRevision',publication_revision) order by publication_revision,event_key),'[]') from public.v2_live_session_mappings where batch_id=p_batch_id);
end; $$;
create function public.v2_completed_class_feedback() returns trigger language plpgsql security definer set search_path='' as $$
declare v_mapping public.v2_live_session_mappings%rowtype; v_session jsonb; v_product text; v_student uuid;
begin
 select * into v_mapping from public.v2_live_session_mappings where batch_id=new.batch_id and event_key=new.event_key and publication_revision=new.publication_revision;
 if not found then return new; end if;
 select s into v_session from public.v2_batch_publication_revisions p, lateral jsonb_array_elements(p.document->'sessions') s
 where p.batch_id=new.batch_id and p.revision=new.publication_revision and s->>'key'=v_mapping.session_key::text;
 select product_code into v_product from public.v2_course_batches where id=new.batch_id;
 for v_student in select r.student_id from public.v2_live_registrations r join public.v2_batch_enrollments e on e.batch_id=r.batch_id and e.student_id=r.student_id
 where r.batch_id=new.batch_id and r.active and e.active order by r.student_id loop
  perform 1 from public.profiles where id=v_student for update;
  if public.v2_student_has_product(v_student,v_product) then
   perform public.v2_add_feedback_obligation(v_student,new.batch_id,v_mapping.session_key,v_session->>'title',v_session->>'section','live',new.event_key,new.publication_revision);
  end if;
 end loop;
 return new;
end; $$;
create trigger v2_live_completion_feedback after insert on public.v2_live_class_completions for each row execute function public.v2_completed_class_feedback();
create function public.complete_v2_learning_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if not exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision) then raise exception 'A reviewed course-session mapping is required before completion' using errcode='22023'; end if;
 return public.complete_v2_live_class(p_batch_id,p_event_key,p_publication_revision);
end; $$;

-- Meeting delivery remains independently guarded by registration and paid access.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text; v_session uuid;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
 join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active where b.id=p_batch_id;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>'state'<>'published' then return null; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>'section') then return null; end if;
 select session_key into v_session from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=v_publication.revision;
 if not public.v2_learning_session_open(auth.uid(),p_batch_id,v_session,v_event->>'section') then return null; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
 select l->>'url' into v_url from public.v2_published_meetings p join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
 lateral jsonb_array_elements(m.request->'links') l where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>'key'=p_event_key::text;
 if v_url is null then return null; end if;
 return jsonb_build_object('batchId',p_batch_id,'eventKey',p_event_key,'url',v_url,'publicationRevision',v_publication.revision);
end; $$;
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('batchId',b.id,'batchRevision',r.batch_revision,'revision',r.revision,'state','published',
 'productCode',b.product_code,'title',r.document->'title','sections',r.document->'sections','timeZone',r.document->'timeZone',
 'liveRegistrationLimit',case when coalesce(l.active,false) then r.document->'liveRegistrationLimit' else 'null'::jsonb end,
 'events',coalesce((select jsonb_agg(jsonb_build_object('key',ev.value->'key','title',ev.value->'title','section',ev.value->'section','kind',ev.value->'kind','startsAt',ev.value->'startsAt','endsAt',ev.value->'endsAt','instructor',ev.value->'instructor') order by ev.ordinality)
 from jsonb_array_elements(r.document->'events') with ordinality ev(value,ordinality)
 where ev.value->>'kind'<>'live' or coalesce(l.active,false)),'[]'))
 ||case when r.document?'sessions' then jsonb_build_object('sessions',coalesce((select jsonb_agg(jsonb_build_object('key',s.value->'key','title',s.value->'title','section',s.value->'section') order by s.n) from jsonb_array_elements(r.document->'sessions') with ordinality s(value,n)),'[]')) else '{}'::jsonb end order by b.id),'[]')
 from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
 join lateral(select batch_revision,revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) r on true
 left join public.v2_live_registrations l on l.batch_id=b.id and l.student_id=auth.uid()
 where e.student_id=auth.uid() and e.active and r.document->>'state'='published' and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;
create table public.v2_recording_watch_sessions (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id),batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null,recording_key uuid not null,publication_revision integer not null,url_hash text not null,
 duration_seconds integer,last_position numeric,last_seen_at timestamptz,last_playing boolean not null default false,
 covered int8multirange not null default '{}',created_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key,recording_key,publication_revision)
);
create table public.v2_recording_watch_samples (
 watch_id uuid not null references public.v2_recording_watch_sessions(id),request_id uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default statement_timestamp(),primary key(watch_id,request_id)
);
create function public.v2_recording_player_supported(p_url text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_url ~* '^https://(www\.|m\.)?(youtube\.com/(watch\?|embed/|shorts/)|youtube-nocookie\.com/embed/|youtu\.be/)'
 or p_url ~* '^https://[^[:space:]]+\.(mp4|webm|ogg)([?#][^[:space:]]*)?$',false);
$$;
create function public.v2_learning_recording(p_batch uuid,p_session uuid,p_recording uuid,p_revision integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb; v_session jsonb; v_recording jsonb;
begin
 v_course:=public.get_my_v2_published_course(p_batch);
 if v_course is null or (v_course->>'publicationRevision')::integer is distinct from p_revision then raise exception 'Published recording unavailable' using errcode='42501'; end if;
 select s into v_session from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p_session::text;
 if v_session is null or v_session->>'section' not in ('quant','verbal','di') then raise exception 'Subject recording required' using errcode='22023'; end if;
 select r into v_recording from jsonb_array_elements(v_session#>'{content,recordings}') r where r->>'key'=p_recording::text;
 if v_recording is null then raise exception 'Published recording unavailable' using errcode='42501'; end if;
 return jsonb_build_object('url',v_recording->'url','section',v_session->'section','sessionTitle',v_session->'title');
end; $$;
create function public.begin_v2_recording_watch(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_recording jsonb; w public.v2_recording_watch_sessions%rowtype; v_seconds numeric;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if not public.v2_recording_player_supported(v_recording->>'url') then raise exception 'Player observation is unavailable for this recording' using errcode='22023'; end if;
 insert into public.v2_recording_watch_sessions(student_id,batch_id,session_key,recording_key,publication_revision,url_hash)
 values(auth.uid(),p_batch_id,p_session_key,p_recording_key,p_publication_revision,encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')) on conflict do nothing;
 select * into strict w from public.v2_recording_watch_sessions where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and recording_key=p_recording_key and publication_revision=p_publication_revision;
 if w.url_hash<>encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex') then raise exception 'Recording changed; reload the published session' using errcode='40001'; end if;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 return jsonb_build_object('watchId',w.id,'thresholdPercent',80,'watchedSeconds',v_seconds,'durationSeconds',w.duration_seconds,
 'due',exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and source='recording' and source_key=p_recording_key and feedback_id is null));
end; $$;
create function public.record_v2_recording_sample(p_watch_id uuid,p_request_id uuid,p_position_seconds numeric,p_duration_seconds numeric,p_playing boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.v2_recording_watch_sessions%rowtype; v_recording jsonb; v_input jsonb; v_saved public.v2_recording_watch_samples%rowtype;
 v_elapsed numeric; v_seconds numeric; v_result jsonb; v_due boolean; v_start bigint; v_end bigint;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into w from public.v2_recording_watch_sessions where id=p_watch_id and student_id=auth.uid() for update;
 if not found then raise exception 'Recording observation unavailable' using errcode='42501'; end if;
 v_recording:=public.v2_learning_recording(w.batch_id,w.session_key,w.recording_key,w.publication_revision);
 if encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')<>w.url_hash then raise exception 'Recording changed; reload the session' using errcode='40001'; end if;
 if p_request_id is null or p_position_seconds is null or p_duration_seconds is null or p_playing is null
 or p_position_seconds::text in ('NaN','Infinity','-Infinity') or p_duration_seconds::text in ('NaN','Infinity','-Infinity')
 or p_duration_seconds<1 or p_duration_seconds>43200 or p_position_seconds<0 or p_position_seconds>p_duration_seconds+1
 then raise exception 'Invalid player observation' using errcode='22023'; end if;
 v_input:=jsonb_build_object('position',p_position_seconds,'duration',p_duration_seconds,'playing',p_playing);
 select * into v_saved from public.v2_recording_watch_samples where watch_id=w.id and request_id=p_request_id;
 if found then
  if v_saved.request<>v_input then raise exception 'Observation request was already used' using errcode='22023'; end if;
  return v_saved.result;
 end if;
 if w.duration_seconds is not null and abs(w.duration_seconds-p_duration_seconds)>2 then raise exception 'Recording duration changed' using errcode='22023'; end if;
 w.duration_seconds:=coalesce(w.duration_seconds,ceil(p_duration_seconds)::integer);
 v_elapsed:=extract(epoch from statement_timestamp()-w.last_seen_at);
 if w.last_playing and w.last_position is not null and v_elapsed between 0.5 and 20
 and p_position_seconds>w.last_position and p_position_seconds-w.last_position<=v_elapsed*2+1 then
  -- Millisecond intervals preserve fractional continuity; overlapping playback adds no duplicate credit.
  v_start:=floor(w.last_position*1000)::bigint;v_end:=least(floor(p_position_seconds*1000)::bigint,w.duration_seconds::bigint*1000);
  if v_end>v_start then w.covered:=w.covered+int8multirange(int8range(v_start,v_end,'[)')); end if;
 end if;
 update public.v2_recording_watch_sessions set duration_seconds=w.duration_seconds,last_position=p_position_seconds,last_seen_at=statement_timestamp(),last_playing=p_playing,covered=w.covered where id=w.id;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 if v_seconds*100>=w.duration_seconds*80 then
  perform public.v2_add_feedback_obligation(auth.uid(),w.batch_id,w.session_key,v_recording->>'sessionTitle',v_recording->>'section','recording',w.recording_key,w.publication_revision);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=w.batch_id and session_key=w.session_key and source='recording' and source_key=w.recording_key and feedback_id is null) into v_due;
 v_result:=jsonb_build_object('due',v_due,'watchedSeconds',v_seconds,'thresholdPercent',80);
 insert into public.v2_recording_watch_samples(watch_id,request_id,request,result) values(w.id,p_request_id,v_input,v_result);
 return v_result;
end; $$;
create function public.report_v2_recording_watched(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_recording jsonb; v_id uuid;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if public.v2_recording_player_supported(v_recording->>'url') then raise exception 'Supported players require playback observations' using errcode='22023'; end if;
 v_id:=public.v2_add_feedback_obligation(auth.uid(),p_batch_id,p_session_key,v_recording->>'sessionTitle',v_recording->>'section','recording',p_recording_key,p_publication_revision);
 return jsonb_build_object('due',exists(select 1 from public.v2_feedback_obligations where id=v_id and feedback_id is null),'obligationId',v_id);
end; $$;
alter table public.v2_learning_progress enable row level security;
revoke all on public.v2_learning_progress from public,anon,authenticated,service_role;
alter table public.v2_session_feedback enable row level security;
revoke all on public.v2_session_feedback from public,anon,authenticated,service_role;
alter table public.v2_feedback_obligations enable row level security;
revoke all on public.v2_feedback_obligations from public,anon,authenticated,service_role;
alter table public.v2_live_session_mappings enable row level security;
revoke all on public.v2_live_session_mappings from public,anon,authenticated,service_role;
alter table public.v2_live_session_mapping_audit enable row level security;
revoke all on public.v2_live_session_mapping_audit from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_sessions enable row level security;
revoke all on public.v2_recording_watch_sessions from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_samples enable row level security;
revoke all on public.v2_recording_watch_samples from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_session_open(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_learning_state(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_learning_state(uuid) to authenticated;
revoke all on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) to authenticated;
revoke all on function public.v2_add_feedback_obligation(uuid,uuid,uuid,text,text,text,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_store_session_feedback(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.submit_v2_session_feedback(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.submit_v2_session_feedback(uuid,uuid,jsonb) to authenticated;
revoke all on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.list_v2_live_session_mappings(uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_session_mappings(uuid) to authenticated;
revoke all on function public.v2_completed_class_feedback() from public,anon,authenticated,service_role;
revoke all on function public.complete_v2_learning_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.complete_v2_learning_live_class(uuid,uuid,integer) to authenticated;
revoke all on function public.v2_recording_player_supported(text) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_recording(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) to authenticated;
revoke all on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() to authenticated;

select pg_temp.phase4_assert_preserved();
do $phase4_postflight$ declare t text;r jsonb;p record;role_name text;actual_roles jsonb;begin
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>85 then raise exception 'Unexpected table inventory after activation';end if;
 foreach t in array array['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_live_session_mappings','v2_live_session_mapping_audit','v2_recording_watch_sessions','v2_recording_watch_samples'] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relkind='r' and relrowsecurity) then raise exception 'Private table guard missing';end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected direct table privilege';end if;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements('[{"signature":"v2_learning_course_base(uuid)","sourceMd5":"62cd37689b87f98de97db95b3e88137d","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"v2_learning_session_open(uuid,uuid,uuid,text)","sourceMd5":"00a6b946d419b715b4253d374f48c514","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"get_my_v2_published_course(uuid)","sourceMd5":"744f47cb6a5032bdc20e043ad20c0f9c","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"get_my_v2_learning_state(uuid)","sourceMd5":"a98db6d8efe34f662f84c8875f23f8cf","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"mark_v2_learning_progress(uuid,uuid,uuid,text,integer)","sourceMd5":"48a448ea8488e2f00d507934876ceae9","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"v2_add_feedback_obligation(uuid,uuid,uuid,text,text,text,uuid,integer)","sourceMd5":"a352877fbc52bae8040fae94c95b147a","securityDefiner":true,"volatility":"v","roles":[]},{"signature":"v2_store_session_feedback(uuid,uuid,uuid,jsonb,text)","sourceMd5":"17396fefc3f9e71f1759fd82ad205e88","securityDefiner":true,"volatility":"v","roles":[]},{"signature":"submit_v2_session_feedback(uuid,uuid,jsonb)","sourceMd5":"c7b1811f8924df6441fee4e5df871f1d","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"set_v2_live_session_mapping(uuid,uuid,uuid,integer)","sourceMd5":"6b841c0cb819a2bdaedc797bc06f9dbc","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"list_v2_live_session_mappings(uuid)","sourceMd5":"0b76b4b4bd84ae893cf0f84b3a4e9a2a","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"v2_completed_class_feedback()","sourceMd5":"d25a3631d71f377211f4efb32f568ee8","securityDefiner":true,"volatility":"v","roles":[]},{"signature":"complete_v2_learning_live_class(uuid,uuid,integer)","sourceMd5":"2049fd16022942635981da2b9ba7dfe0","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"get_my_v2_meeting(uuid,uuid)","sourceMd5":"421d6f432047dcce09e4c8119dd2fe30","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"get_my_v2_batch_schedules()","sourceMd5":"a9f185ccbf72bf650de4d1cfd63265f4","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"v2_recording_player_supported(text)","sourceMd5":"e2e5702937c882d868486301706f529f","securityDefiner":false,"volatility":"i","roles":[]},{"signature":"v2_learning_recording(uuid,uuid,uuid,integer)","sourceMd5":"899a2683ad58987f97a8110755477cc0","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"begin_v2_recording_watch(uuid,uuid,uuid,integer)","sourceMd5":"2c5bdc2ca7e07b21842d134631653259","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean)","sourceMd5":"4f9130871c8e964e30cf3ad72e5918df","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"report_v2_recording_watched(uuid,uuid,uuid,integer)","sourceMd5":"c87f54807c6f8e3e759d10eb00415b61","securityDefiner":true,"volatility":"v","roles":["authenticated"]}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or p.provolatile::text<>r->>'volatility' or p.proconfig is distinct from array['search_path=""'] then raise exception 'Function guard mismatch: %',r->>'signature';end if;
  select coalesce(jsonb_agg(v order by v),'[]') into actual_roles from unnest(array['anon','authenticated','service_role']) v where has_function_privilege(v,p.oid,'EXECUTE');
  if actual_roles<>r->'roles' then raise exception 'Unexpected function privileges: %',r->>'signature';end if;
 end loop;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'9bd44028bf3ea54ee2f4954f2042e748' then raise exception 'Prior migration ledger changed';end if;
end;$phase4_postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261102170000','add_v2_learning_feedback',array['-- Phase 4 adds caller-scoped learning state and section feedback guards.
-- Applied purchase, publication and legacy mock histories remain unchanged.
begin;
create table public.v2_learning_progress (
 student_id uuid not null references public.profiles(id), batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null, resource_key text not null, state text not null check(state in (''opened'',''read'')),
 last_opened_at timestamptz not null default statement_timestamp(), read_at timestamptz,
 primary key(student_id,batch_id,session_key,resource_key)
);
create table public.v2_session_feedback (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 request_id uuid not null unique, confirmation_reference text not null unique, provider text not null default ''lms'' check(provider=''lms''), response jsonb not null, submitted_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key)
);
create table public.v2_feedback_obligations (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 session_title text not null, section text not null check(section in (''quant'',''verbal'',''di'')),
 source text not null check(source in (''recording'',''live'')), source_key uuid not null,
 publication_revision integer not null, created_at timestamptz not null default statement_timestamp(),
 feedback_id uuid references public.v2_session_feedback(id),
 unique(student_id,batch_id,session_key,source,source_key)
);
create index v2_feedback_pending_idx on public.v2_feedback_obligations(student_id,section) where feedback_id is null;
create table public.v2_live_session_mappings (
 batch_id uuid not null references public.v2_course_batches(id), event_key uuid not null,
 publication_revision integer not null, session_key uuid not null, actor_id uuid not null references public.profiles(id),
 updated_at timestamptz not null default statement_timestamp(), primary key(batch_id,event_key,publication_revision),
 foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision)
);
create table public.v2_live_session_mapping_audit (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null,event_key uuid not null,
 publication_revision integer not null,session_key uuid not null,actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default statement_timestamp()
);

-- The internal reader retains the reviewed Phase 2 authorization boundary.
create function public.v2_learning_course_base(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_product text; v_draft jsonb; v_sessions jsonb;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id
 where b.id=p_batch_id and e.student_id=auth.uid() and e.active;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>''state''<>''published'' then return null; end if;
 select document into v_draft from public.v2_course_batch_revisions where batch_id=p_batch_id and revision=v_publication.batch_revision;
 select coalesce(jsonb_agg(jsonb_build_object(''key'',s->''key'',''title'',coalesce(nullif(s->>''title'',''''),''Course outline''),''section'',s->''section'',''content'',s->''content'') order by n),''[]'')
 into v_sessions from jsonb_array_elements(coalesce(v_draft->''sessions'',''[]'')||coalesce((select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->''events'') with ordinality item(e,ord) where e?''content''),''[]'')) with ordinality item(s,n)
 where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>''section'')
 or (v_product=''full_course'' and s->>''section''=''programme'' and public.can_access_v2_product(''full_batch''));
 return jsonb_build_object(''batchId'',p_batch_id,''publicationRevision'',v_publication.revision,''batchRevision'',v_publication.batch_revision,
 ''title'',v_publication.document->''title'',''productCode'',v_product,''sessions'',v_sessions);
end; $$;
create function public.v2_learning_session_open(p_student uuid,p_batch uuid,p_session uuid,p_section text)
returns boolean language sql stable security definer set search_path='''' as $$
 select not exists(select 1 from public.v2_feedback_obligations where student_id=p_student and section=p_section and feedback_id is null)
 or exists(select 1 from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and section=p_section and feedback_id is null);
$$;
create or replace function public.get_my_v2_published_course(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_course jsonb;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 return jsonb_set(v_course,''{sessions}'',coalesce((select jsonb_agg(s order by n) from jsonb_array_elements(v_course->''sessions'') with ordinality items(s,n)
 where public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>''key'')::uuid,s->>''section'')),''[]''));
end; $$;
create function public.get_my_v2_learning_state(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_course jsonb; v_registered boolean; v_publication jsonb; v_revision integer;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 v_revision:=(v_course->>''publicationRevision'')::integer;
 select exists(select 1 from public.v2_live_registrations where batch_id=p_batch_id and student_id=auth.uid() and active) into v_registered;
 select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id and revision=v_revision;
 return jsonb_build_object(''batchId'',p_batch_id,''publicationRevision'',v_revision,
 ''sessions'',(select coalesce(jsonb_agg(jsonb_build_object(''key'',s->''key'',''title'',s->''title'',''section'',s->''section'',
 ''locked'',not public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>''key'')::uuid,s->>''section'')) order by n),''[]'') from jsonb_array_elements(v_course->''sessions'') with ordinality items(s,n)),
 ''obligations'',(select coalesce(jsonb_agg(jsonb_build_object(''id'',o.id,''batchId'',o.batch_id,''sessionKey'',o.session_key,''sessionTitle'',o.session_title,''section'',o.section,''source'',o.source,''eventKey'',case when o.source=''live'' then o.source_key end,''createdAt'',o.created_at) order by o.created_at,o.id),''[]'')
 from public.v2_feedback_obligations o where o.student_id=auth.uid() and o.feedback_id is null and o.section in (select s->>''section'' from jsonb_array_elements(v_course->''sessions'') s)),
 ''progress'',(select coalesce(jsonb_agg(jsonb_build_object(''sessionKey'',p.session_key,''itemKey'',case when p.resource_key<>''session'' then p.resource_key end,''status'',p.state,''lastOpenedAt'',p.last_opened_at,''readAt'',p.read_at) order by p.last_opened_at),''[]'') from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and exists(select 1 from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p.session_key::text)),
 ''lastSessionKey'',(select p.session_key from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and p.resource_key=''session'' and exists(select 1 from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p.session_key::text and public.v2_learning_session_open(auth.uid(),p_batch_id,p.session_key,s->>''section'')) order by p.last_opened_at desc limit 1),
 ''liveRegistered'',v_registered,''liveEvents'',case when not v_registered then ''[]''::jsonb else (
 select coalesce(jsonb_agg(jsonb_build_object(''key'',e->''key'',''title'',e->''title'',''section'',e->''section'',''startsAt'',e->''startsAt'',''endsAt'',e->''endsAt'',''completedAt'',c.completed_at,''sessionKey'',m.session_key) order by n),''[]'')
 from jsonb_array_elements(v_publication->''events'') with ordinality items(e,n)
 left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>''key'')::uuid
 left join public.v2_live_session_mappings m on m.batch_id=p_batch_id and m.event_key=(e->>''key'')::uuid and m.publication_revision=v_revision
 where e->>''kind''=''live'' and public.can_access_v2_product(public.v2_entitlement_product_code(v_course->>''productCode''),e->>''section'')
 ) end);
end; $$;
create function public.mark_v2_learning_progress(p_batch_id uuid,p_session_key uuid,p_item_key uuid,p_state text,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_course jsonb; v_session jsonb; v_resource text;
begin
 if p_state is null or p_state not in (''opened'',''read'') then raise exception ''Invalid progress state'' using errcode=''22023''; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 v_course:=public.get_my_v2_published_course(p_batch_id);
 if v_course is null or (v_course->>''publicationRevision'')::integer is distinct from p_publication_revision then raise exception ''Published course unavailable'' using errcode=''42501''; end if;
 select s into v_session from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p_session_key::text;
 if v_session is null then raise exception ''Session unavailable'' using errcode=''42501''; end if;
 if p_item_key is null then
  if p_state<>''opened'' then raise exception ''Session progress is visual opening only'' using errcode=''22023''; end if;
  v_resource:=''session'';
 else
  if not exists(select 1 from jsonb_array_elements(v_session#>''{content,preSessionReads}'') i where i->>''key''=p_item_key::text) then raise exception ''Published pre-read required'' using errcode=''22023''; end if;
  v_resource:=p_item_key::text;
 end if;
 insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state,read_at)
 values(auth.uid(),p_batch_id,p_session_key,v_resource,p_state,case when p_state=''read'' then statement_timestamp() end)
 on conflict(student_id,batch_id,session_key,resource_key) do update set last_opened_at=statement_timestamp(),
 state=case when public.v2_learning_progress.state=''read'' then ''read'' else excluded.state end,
 read_at=coalesce(public.v2_learning_progress.read_at,excluded.read_at);
 return jsonb_build_object(''saved'',true);
end; $$;
create function public.v2_add_feedback_obligation(p_student uuid,p_batch uuid,p_session uuid,p_title text,p_section text,p_source text,p_key uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='''' as $$
declare v_id uuid; v_feedback uuid;
begin
 select id into v_feedback from public.v2_session_feedback where student_id=p_student and batch_id=p_batch and session_key=p_session;
 insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision,feedback_id)
 values(p_student,p_batch,p_session,p_title,p_section,p_source,p_key,p_revision,v_feedback)
 on conflict(student_id,batch_id,session_key,source,source_key) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and source=p_source and source_key=p_key; end if;
 return v_id;
end; $$;
create function public.v2_store_session_feedback(p_obligation_id uuid,p_student_id uuid,p_request_id uuid,p_response jsonb,p_event_id text)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare o public.v2_feedback_obligations%rowtype; v_saved public.v2_session_feedback%rowtype; v_live boolean;
begin
 perform 1 from public.profiles where id=p_student_id for update;
 if not found then raise exception ''Feedback owner unavailable'' using errcode=''42501''; end if;
 select * into o from public.v2_feedback_obligations where id=p_obligation_id and student_id=p_student_id for update;
 if not found then raise exception ''Feedback obligation unavailable'' using errcode=''42501''; end if;
 if p_request_id is null or p_event_id is null or length(p_event_id) not between 1 and 200 or p_response is null or jsonb_typeof(p_response)<>''object''
 or not p_response ?& array[''usefulness'',''clarity'',''comment'',''attendance''] or (select count(*) from jsonb_object_keys(p_response))<>4
 or (p_response->>''attendance''=''missed'' and (p_response->''usefulness''<>''null''::jsonb or p_response->''clarity''<>''null''::jsonb))
 or (p_response->>''attendance''<>''missed'' and (jsonb_typeof(p_response->''usefulness'')<>''number'' or jsonb_typeof(p_response->''clarity'')<>''number'' or p_response->>''usefulness'' !~ ''^[1-5]$'' or p_response->>''clarity'' !~ ''^[1-5]$''))
 or jsonb_typeof(p_response->''comment'')<>''string'' or length(p_response->>''comment'')>4000
 or jsonb_typeof(p_response->''attendance'')<>''string'' or p_response->>''attendance'' not in (''attended'',''missed'',''recording'') then raise exception ''Invalid feedback response'' using errcode=''22023''; end if;
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception ''Feedback was already submitted; reload the session'' using errcode=''40001''; end if;
  return jsonb_build_object(''submitted'',true,''replayed'',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and source=''live'') into v_live;
 if (v_live and p_response->>''attendance''=''recording'') or (not v_live and p_response->>''attendance''<>''recording'') then raise exception ''Feedback attendance context changed; reload the session'' using errcode=''40001''; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object(''submitted'',true,''replayed'',false);
end; $$;
-- The temporary LMS form records caller-authored feedback; no external verification is claimed.
create function public.submit_v2_session_feedback(p_obligation_id uuid,p_request_id uuid,p_response jsonb)
returns jsonb language plpgsql security definer set search_path='''' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role=''student'' and is_active for update;
 if not found then raise exception ''Active Student access required'' using errcode=''42501''; end if;
 return public.v2_store_session_feedback(p_obligation_id,auth.uid(),p_request_id,p_response,''lms:''||p_request_id::text);
end; $$;
create function public.set_v2_live_session_mapping(p_batch_id uuid,p_event_key uuid,p_session_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_session jsonb;
begin
 perform 1 from public.profiles where id=auth.uid() and role=''admin'' and is_active for share;
 if not found then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 perform 1 from public.v2_course_batches where id=p_batch_id for update;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.revision is distinct from p_publication_revision or v_publication.document->>''state''<>''published'' then raise exception ''Publication changed; reload the class list'' using errcode=''40001''; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->''events'') e where e->>''key''=p_event_key::text and e->>''kind''=''live'';
 select s into v_session from jsonb_array_elements(v_publication.document->''sessions'') s where s->>''key''=p_session_key::text;
 if v_event is null or v_session is null or v_event->>''section'' is distinct from v_session->>''section'' then raise exception ''A published session in the live class subject is required'' using errcode=''22023''; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then raise exception ''Completed class mappings are immutable'' using errcode=''22023''; end if;
 if exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision and session_key=p_session_key) then return jsonb_build_object(''saved'',true,''replayed'',true); end if;
 insert into public.v2_live_session_mappings(batch_id,event_key,publication_revision,session_key,actor_id)
 values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid())
 on conflict(batch_id,event_key,publication_revision) do update set session_key=excluded.session_key,actor_id=excluded.actor_id,updated_at=statement_timestamp();
 insert into public.v2_live_session_mapping_audit(batch_id,event_key,publication_revision,session_key,actor_id) values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid());
 return jsonb_build_object(''saved'',true,''replayed'',false);
end; $$;
create function public.list_v2_live_session_mappings(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
begin
 if not public.is_portal_admin() then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(''eventKey'',event_key,''sessionKey'',session_key,''publicationRevision'',publication_revision) order by publication_revision,event_key),''[]'') from public.v2_live_session_mappings where batch_id=p_batch_id);
end; $$;
create function public.v2_completed_class_feedback() returns trigger language plpgsql security definer set search_path='''' as $$
declare v_mapping public.v2_live_session_mappings%rowtype; v_session jsonb; v_product text; v_student uuid;
begin
 select * into v_mapping from public.v2_live_session_mappings where batch_id=new.batch_id and event_key=new.event_key and publication_revision=new.publication_revision;
 if not found then return new; end if;
 select s into v_session from public.v2_batch_publication_revisions p, lateral jsonb_array_elements(p.document->''sessions'') s
 where p.batch_id=new.batch_id and p.revision=new.publication_revision and s->>''key''=v_mapping.session_key::text;
 select product_code into v_product from public.v2_course_batches where id=new.batch_id;
 for v_student in select r.student_id from public.v2_live_registrations r join public.v2_batch_enrollments e on e.batch_id=r.batch_id and e.student_id=r.student_id
 where r.batch_id=new.batch_id and r.active and e.active order by r.student_id loop
  perform 1 from public.profiles where id=v_student for update;
  if public.v2_student_has_product(v_student,v_product) then
   perform public.v2_add_feedback_obligation(v_student,new.batch_id,v_mapping.session_key,v_session->>''title'',v_session->>''section'',''live'',new.event_key,new.publication_revision);
  end if;
 end loop;
 return new;
end; $$;
create trigger v2_live_completion_feedback after insert on public.v2_live_class_completions for each row execute function public.v2_completed_class_feedback();
create function public.complete_v2_learning_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='''' as $$
begin
 if not public.is_portal_admin() then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 if not exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision) then raise exception ''A reviewed course-session mapping is required before completion'' using errcode=''22023''; end if;
 return public.complete_v2_live_class(p_batch_id,p_event_key,p_publication_revision);
end; $$;

-- Meeting delivery remains independently guarded by registration and paid access.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text; v_session uuid;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
 join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active where b.id=p_batch_id;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>''state''<>''published'' then return null; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->''events'') e where e->>''key''=p_event_key::text and e->>''kind''=''live'';
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>''section'') then return null; end if;
 select session_key into v_session from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=v_publication.revision;
 if not public.v2_learning_session_open(auth.uid(),p_batch_id,v_session,v_event->>''section'') then return null; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
 select l->>''url'' into v_url from public.v2_published_meetings p join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
 lateral jsonb_array_elements(m.request->''links'') l where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>''key''=p_event_key::text;
 if v_url is null then return null; end if;
 return jsonb_build_object(''batchId'',p_batch_id,''eventKey'',p_event_key,''url'',v_url,''publicationRevision'',v_publication.revision);
end; $$;
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''batchId'',b.id,''batchRevision'',r.batch_revision,''revision'',r.revision,''state'',''published'',
 ''productCode'',b.product_code,''title'',r.document->''title'',''sections'',r.document->''sections'',''timeZone'',r.document->''timeZone'',
 ''liveRegistrationLimit'',case when coalesce(l.active,false) then r.document->''liveRegistrationLimit'' else ''null''::jsonb end,
 ''events'',coalesce((select jsonb_agg(jsonb_build_object(''key'',ev.value->''key'',''title'',ev.value->''title'',''section'',ev.value->''section'',''kind'',ev.value->''kind'',''startsAt'',ev.value->''startsAt'',''endsAt'',ev.value->''endsAt'',''instructor'',ev.value->''instructor'') order by ev.ordinality)
 from jsonb_array_elements(r.document->''events'') with ordinality ev(value,ordinality)
 where ev.value->>''kind''<>''live'' or coalesce(l.active,false)),''[]''))
 ||case when r.document?''sessions'' then jsonb_build_object(''sessions'',coalesce((select jsonb_agg(jsonb_build_object(''key'',s.value->''key'',''title'',s.value->''title'',''section'',s.value->''section'') order by s.n) from jsonb_array_elements(r.document->''sessions'') with ordinality s(value,n)),''[]'')) else ''{}''::jsonb end order by b.id),''[]'')
 from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
 join lateral(select batch_revision,revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) r on true
 left join public.v2_live_registrations l on l.batch_id=b.id and l.student_id=auth.uid()
 where e.student_id=auth.uid() and e.active and r.document->>''state''=''published'' and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;
create table public.v2_recording_watch_sessions (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id),batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null,recording_key uuid not null,publication_revision integer not null,url_hash text not null,
 duration_seconds integer,last_position numeric,last_seen_at timestamptz,last_playing boolean not null default false,
 covered int8multirange not null default ''{}'',created_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key,recording_key,publication_revision)
);
create table public.v2_recording_watch_samples (
 watch_id uuid not null references public.v2_recording_watch_sessions(id),request_id uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default statement_timestamp(),primary key(watch_id,request_id)
);
create function public.v2_recording_player_supported(p_url text) returns boolean language sql immutable set search_path='''' as $$
 select coalesce(p_url ~* ''^https://(www\.|m\.)?(youtube\.com/(watch\?|embed/|shorts/)|youtube-nocookie\.com/embed/|youtu\.be/)''
 or p_url ~* ''^https://[^[:space:]]+\.(mp4|webm|ogg)([?#][^[:space:]]*)?$'',false);
$$;
create function public.v2_learning_recording(p_batch uuid,p_session uuid,p_recording uuid,p_revision integer) returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_course jsonb; v_session jsonb; v_recording jsonb;
begin
 v_course:=public.get_my_v2_published_course(p_batch);
 if v_course is null or (v_course->>''publicationRevision'')::integer is distinct from p_revision then raise exception ''Published recording unavailable'' using errcode=''42501''; end if;
 select s into v_session from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p_session::text;
 if v_session is null or v_session->>''section'' not in (''quant'',''verbal'',''di'') then raise exception ''Subject recording required'' using errcode=''22023''; end if;
 select r into v_recording from jsonb_array_elements(v_session#>''{content,recordings}'') r where r->>''key''=p_recording::text;
 if v_recording is null then raise exception ''Published recording unavailable'' using errcode=''42501''; end if;
 return jsonb_build_object(''url'',v_recording->''url'',''section'',v_session->''section'',''sessionTitle'',v_session->''title'');
end; $$;
create function public.begin_v2_recording_watch(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_recording jsonb; w public.v2_recording_watch_sessions%rowtype; v_seconds numeric;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if not public.v2_recording_player_supported(v_recording->>''url'') then raise exception ''Player observation is unavailable for this recording'' using errcode=''22023''; end if;
 insert into public.v2_recording_watch_sessions(student_id,batch_id,session_key,recording_key,publication_revision,url_hash)
 values(auth.uid(),p_batch_id,p_session_key,p_recording_key,p_publication_revision,encode(sha256(convert_to(v_recording->>''url'',''UTF8'')),''hex'')) on conflict do nothing;
 select * into strict w from public.v2_recording_watch_sessions where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and recording_key=p_recording_key and publication_revision=p_publication_revision;
 if w.url_hash<>encode(sha256(convert_to(v_recording->>''url'',''UTF8'')),''hex'') then raise exception ''Recording changed; reload the published session'' using errcode=''40001''; end if;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 return jsonb_build_object(''watchId'',w.id,''thresholdPercent'',80,''watchedSeconds'',v_seconds,''durationSeconds'',w.duration_seconds,
 ''due'',exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and source=''recording'' and source_key=p_recording_key and feedback_id is null));
end; $$;
create function public.record_v2_recording_sample(p_watch_id uuid,p_request_id uuid,p_position_seconds numeric,p_duration_seconds numeric,p_playing boolean)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare w public.v2_recording_watch_sessions%rowtype; v_recording jsonb; v_input jsonb; v_saved public.v2_recording_watch_samples%rowtype;
 v_elapsed numeric; v_seconds numeric; v_result jsonb; v_due boolean; v_start bigint; v_end bigint;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into w from public.v2_recording_watch_sessions where id=p_watch_id and student_id=auth.uid() for update;
 if not found then raise exception ''Recording observation unavailable'' using errcode=''42501''; end if;
 v_recording:=public.v2_learning_recording(w.batch_id,w.session_key,w.recording_key,w.publication_revision);
 if encode(sha256(convert_to(v_recording->>''url'',''UTF8'')),''hex'')<>w.url_hash then raise exception ''Recording changed; reload the session'' using errcode=''40001''; end if;
 if p_request_id is null or p_position_seconds is null or p_duration_seconds is null or p_playing is null
 or p_position_seconds::text in (''NaN'',''Infinity'',''-Infinity'') or p_duration_seconds::text in (''NaN'',''Infinity'',''-Infinity'')
 or p_duration_seconds<1 or p_duration_seconds>43200 or p_position_seconds<0 or p_position_seconds>p_duration_seconds+1
 then raise exception ''Invalid player observation'' using errcode=''22023''; end if;
 v_input:=jsonb_build_object(''position'',p_position_seconds,''duration'',p_duration_seconds,''playing'',p_playing);
 select * into v_saved from public.v2_recording_watch_samples where watch_id=w.id and request_id=p_request_id;
 if found then
  if v_saved.request<>v_input then raise exception ''Observation request was already used'' using errcode=''22023''; end if;
  return v_saved.result;
 end if;
 if w.duration_seconds is not null and abs(w.duration_seconds-p_duration_seconds)>2 then raise exception ''Recording duration changed'' using errcode=''22023''; end if;
 w.duration_seconds:=coalesce(w.duration_seconds,ceil(p_duration_seconds)::integer);
 v_elapsed:=extract(epoch from statement_timestamp()-w.last_seen_at);
 if w.last_playing and w.last_position is not null and v_elapsed between 0.5 and 20
 and p_position_seconds>w.last_position and p_position_seconds-w.last_position<=v_elapsed*2+1 then
  -- Millisecond intervals preserve fractional continuity; overlapping playback adds no duplicate credit.
  v_start:=floor(w.last_position*1000)::bigint;v_end:=least(floor(p_position_seconds*1000)::bigint,w.duration_seconds::bigint*1000);
  if v_end>v_start then w.covered:=w.covered+int8multirange(int8range(v_start,v_end,''[)'')); end if;
 end if;
 update public.v2_recording_watch_sessions set duration_seconds=w.duration_seconds,last_position=p_position_seconds,last_seen_at=statement_timestamp(),last_playing=p_playing,covered=w.covered where id=w.id;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 if v_seconds*100>=w.duration_seconds*80 then
  perform public.v2_add_feedback_obligation(auth.uid(),w.batch_id,w.session_key,v_recording->>''sessionTitle'',v_recording->>''section'',''recording'',w.recording_key,w.publication_revision);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=w.batch_id and session_key=w.session_key and source=''recording'' and source_key=w.recording_key and feedback_id is null) into v_due;
 v_result:=jsonb_build_object(''due'',v_due,''watchedSeconds'',v_seconds,''thresholdPercent'',80);
 insert into public.v2_recording_watch_samples(watch_id,request_id,request,result) values(w.id,p_request_id,v_input,v_result);
 return v_result;
end; $$;
create function public.report_v2_recording_watched(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_recording jsonb; v_id uuid;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if public.v2_recording_player_supported(v_recording->>''url'') then raise exception ''Supported players require playback observations'' using errcode=''22023''; end if;
 v_id:=public.v2_add_feedback_obligation(auth.uid(),p_batch_id,p_session_key,v_recording->>''sessionTitle'',v_recording->>''section'',''recording'',p_recording_key,p_publication_revision);
 return jsonb_build_object(''due'',exists(select 1 from public.v2_feedback_obligations where id=v_id and feedback_id is null),''obligationId'',v_id);
end; $$;
alter table public.v2_learning_progress enable row level security;
revoke all on public.v2_learning_progress from public,anon,authenticated,service_role;
alter table public.v2_session_feedback enable row level security;
revoke all on public.v2_session_feedback from public,anon,authenticated,service_role;
alter table public.v2_feedback_obligations enable row level security;
revoke all on public.v2_feedback_obligations from public,anon,authenticated,service_role;
alter table public.v2_live_session_mappings enable row level security;
revoke all on public.v2_live_session_mappings from public,anon,authenticated,service_role;
alter table public.v2_live_session_mapping_audit enable row level security;
revoke all on public.v2_live_session_mapping_audit from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_sessions enable row level security;
revoke all on public.v2_recording_watch_sessions from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_samples enable row level security;
revoke all on public.v2_recording_watch_samples from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_session_open(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_learning_state(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_learning_state(uuid) to authenticated;
revoke all on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) to authenticated;
revoke all on function public.v2_add_feedback_obligation(uuid,uuid,uuid,text,text,text,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_store_session_feedback(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.submit_v2_session_feedback(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.submit_v2_session_feedback(uuid,uuid,jsonb) to authenticated;
revoke all on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.list_v2_live_session_mappings(uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_session_mappings(uuid) to authenticated;
revoke all on function public.v2_completed_class_feedback() from public,anon,authenticated,service_role;
revoke all on function public.complete_v2_learning_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.complete_v2_learning_live_class(uuid,uuid,integer) to authenticated;
revoke all on function public.v2_recording_player_supported(text) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_recording(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) to authenticated;
revoke all on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() to authenticated;
commit;
']);
notify pgrst,'reload schema';
select jsonb_build_object('check','phase4_activation','migrationVersion','20261102170000','sourceSha256','edaa5148af61d151ea4d59436929db652fbb5fc6c3bdeba0d7c2711b0af4f958',
 'existingApplicationTables',78,'existingRowsPreserved',true,'phase1LedgerPreserved',true,'newPrivateTables',7,'functionsVerified',19,'phase3Activated',false,'hostedAcceptance','separate') as result;
commit;
