-- STAGING ONLY: eyphkkginlgoaxflauog. The dashboard project must be verified before execution.
-- This atomic packet adds Phase 5 only. Phase 1/2 ledger rows and all existing application records are preserved.
-- Recovery source SHA256: d65e1aa47f6618c6fb70812e01ae868dfe71da50e2bf646267c9964bde943be8
rollback;
-- The previous dashboard export did not preserve numeric serialization.
do $superseded$ begin
 raise exception 'Superseded activation packet: a checksummed recovery export and successful regeneration are required';
end $superseded$;
begin;
set local timezone='UTC';
set local statement_timeout='60s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase5_expected_rows on commit drop as select * from jsonb_to_recordset('[{"table":"course_template_events","rows":211,"md5":"16df6448268f32bb16ef48b33bf58675"},{"table":"course_template_resources","rows":70,"md5":"a6bf41039701c8123eece142c9fc6a96"},{"table":"course_template_revisions","rows":19,"md5":"22d2eb592008c1246493b0496fda04ff"},{"table":"course_template_sections","rows":31,"md5":"f92aa5d48a787346fc9f71a29330e534"},{"table":"course_templates","rows":4,"md5":"4d1d53fe9de01e055adbfa1300aee5b0"},{"table":"courses","rows":13,"md5":"d49397e6ca2c055f4338c51bc9648fa3"},{"table":"enrollments","rows":4,"md5":"c52228a514c2a00ba1ebce886f9ce7e0"},{"table":"master_materials","rows":13,"md5":"017adc9bf3281d55f664cee7119c71e4"},{"table":"master_practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_sessions","rows":31,"md5":"f17c8bcf3bc6f7252480c8a1dc28151b"},{"table":"master_worksheet_plans","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_worksheet_questions","rows":150,"md5":"3e87a15501a4b334a77d133f2ae90003"},{"table":"master_worksheet_session_rules","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"material_worksheet_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"materials","rows":74,"md5":"0d1c4a252de931898b86179408a6d557"},{"table":"mock_assessment_assignments","rows":7,"md5":"c8991d683e1fc9d7e3456a9a19bef5b5"},{"table":"mock_assessment_audit","rows":39,"md5":"31436407260a317f8dd1247e90fc9fcc"},{"table":"mock_assessment_items","rows":196,"md5":"5792d2ab8339b82d1d4c07662dbd1cb5"},{"table":"mock_assessment_sections","rows":13,"md5":"f5ccdd1c785888ef80f42be82f87405e"},{"table":"mock_assessment_versions","rows":6,"md5":"99e4de190cee849a1d20273ac363b561"},{"table":"mock_assessments","rows":5,"md5":"8efa3a08945ffee210591d3c8ad46375"},{"table":"mock_assignment_testers","rows":2,"md5":"3bf4cc223ad9e9a779ff5bcb9cbb32cf"},{"table":"mock_attempt_item_notes","rows":1,"md5":"c99adc47ce7ba60c1720c5dd910a0546"},{"table":"mock_attempt_items","rows":132,"md5":"37f6f567ea544f12ffa0b054903efc87"},{"table":"mock_attempt_sections","rows":10,"md5":"ef8371608b27659eec7d3eb0099a030a"},{"table":"mock_attempts","rows":4,"md5":"588e56a16a1ab1ce0252616fba611482"},{"table":"mock_import_items","rows":200,"md5":"1bd9ff44e1ae072033ae2d4c2c880eab"},{"table":"mock_imports","rows":8,"md5":"925b24ad77525eab924875b0d0051163"},{"table":"mock_media","rows":10,"md5":"af21364af1a736bfc115aeaec6367420"},{"table":"mock_operation_receipts","rows":135,"md5":"1a8c71fb2442305a9053f87492f1c3c0"},{"table":"mock_question_media","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"mock_question_options","rows":909,"md5":"10b09a504ad255366096f8a7e077a871"},{"table":"mock_question_revisions","rows":168,"md5":"6b0d69b88125ce2d964e3d3eebdf6350"},{"table":"mock_questions","rows":164,"md5":"91d6cc28e550f3e548ad6694850a9955"},{"table":"mock_responses","rows":132,"md5":"7d21093f16d7e60669977d79ae6fd730"},{"table":"mock_review_edits","rows":1,"md5":"e514be2613f46258e3f859e0cfeeb6e5"},{"table":"mock_source_namespace_members","rows":1,"md5":"8a361235be3dda5a6b5838d2d19a555c"},{"table":"mock_source_namespaces","rows":3,"md5":"b1965b90b59589cebb5155e23f8234d2"},{"table":"mock_stimuli","rows":26,"md5":"0bed07cdd3556db9517d62957c5f0426"},{"table":"mock_stimulus_media","rows":10,"md5":"113669a3d6a9c3ba2111dc26f477496c"},{"table":"mock_stimulus_revisions","rows":26,"md5":"ef365a15a542d51cbae31bf5afa7e93f"},{"table":"mock_topics","rows":84,"md5":"fe2704763ab5094a91a9e21324665b4b"},{"table":"payments","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"profiles","rows":11,"md5":"b1b8f748eebd15776fc01fc03f103ff7"},{"table":"registrations","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"sessions","rows":251,"md5":"fddf08506487eef78815af4db2591d72"},{"table":"student_course_preferences","rows":1,"md5":"f1964e938f5907539c063075d33adb63"},{"table":"student_material_question_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"student_question_logs","rows":600,"md5":"423cf7b89db0653c73498045840a614c"},{"table":"student_worksheet_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_enrollments","rows":4,"md5":"7c1a5e04f5851c68d6305dd0d26d867b"},{"table":"v2_batch_meeting_revisions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_publication_revisions","rows":5,"md5":"9ff9c00552d485540e8bc032d74df21d"},{"table":"v2_content_asset_placements","rows":33,"md5":"d6059e45a3c72a15c8243f2398c8b813"},{"table":"v2_content_asset_replacements","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_content_imports","rows":1,"md5":"bdad478721b5697cdb5393ece6f51284"},{"table":"v2_course_batch_revisions","rows":5,"md5":"c89f726500d5bf5be5abba34b6751e77"},{"table":"v2_course_batches","rows":5,"md5":"baac543dfcc3e0ee7a112630990ea2c6"},{"table":"v2_course_offerings","rows":4,"md5":"20d7dcd6cddc7e4a3d7d3ae629b43867"},{"table":"v2_course_template_revisions","rows":9,"md5":"ab646d65bdb8cfc05fb86145046e1bea"},{"table":"v2_course_templates","rows":5,"md5":"825798a6f7d45175095325c667582290"},{"table":"v2_feedback_obligations","rows":2,"md5":"49b2529cdc26dd02c99d45d36b6677a4"},{"table":"v2_learning_progress","rows":8,"md5":"db0ad06ae51a469e7a17bd1030a68a19"},{"table":"v2_live_class_completions","rows":1,"md5":"6c69a2e36e1f727a967ccc79539c8654"},{"table":"v2_live_registration_audit","rows":2,"md5":"003749938f260371c45d17b89d11c2a8"},{"table":"v2_live_registrations","rows":2,"md5":"ae63d1d2be8f17b338c768d12ce8a764"},{"table":"v2_live_session_mapping_audit","rows":2,"md5":"ecca4f865391c287daeace82e36bf14c"},{"table":"v2_live_session_mappings","rows":2,"md5":"f3b77eac06138e25cdf05f6b5669be9d"},{"table":"v2_price_versions","rows":4,"md5":"29f7278b543ff356a5a4b163747e2598"},{"table":"v2_product_grants","rows":2,"md5":"7d12a50ba7188e9b88ccc08a6f5358b1"},{"table":"v2_products","rows":4,"md5":"0ec545a7ee7c8dbd5500f8f781dd2cec"},{"table":"v2_publication_scope_requests","rows":1,"md5":"2d59e7885b30cdb293de5177f18aa50b"},{"table":"v2_published_meetings","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_purchases","rows":2,"md5":"d2b7c044197391fde00ad07578f6abd8"},{"table":"v2_recording_watch_samples","rows":1,"md5":"a3196a37dd069d074ea253a2c27fb1a2"},{"table":"v2_recording_watch_sessions","rows":1,"md5":"ad078e41a4c28f04aa0852aecc4d906a"},{"table":"v2_session_feedback","rows":1,"md5":"5ea4cf4368f3f1e552089a655c5ac1a2"},{"table":"v2_shared_content_asset_revisions","rows":19,"md5":"62d37546f3cc376264b1eda5cce706b6"},{"table":"v2_shared_content_assets","rows":19,"md5":"9cb43ad9eafd2eeac9c553398c0e2efe"},{"table":"worksheet_daily_targets","rows":0,"md5":"d751713988987e9331980363e24189ce"}]'::jsonb) as t("table" text,rows bigint,md5 text);
create function pg_temp.phase5_assert_preserved() returns void language plpgsql as $$
declare t record;n bigint;h text;begin
 for t in select * from phase5_expected_rows order by "table" loop
  if to_regclass('public.'||quote_ident(t."table")) is null then raise exception 'Existing table missing: %',t."table";end if;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t."table") into n,h;
  if n<>t.rows or h<>t.md5 then raise exception 'Existing application data differs: %; transaction aborted',t."table";end if;
 end loop;
end;$$;

do $phase5_preflight$ declare t record;r jsonb;p record;begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261018090000') then raise exception 'Phase 1 ledger missing';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261102170000') then raise exception 'Phase 4 ledger missing';end if;
 if exists(select 1 from supabase_migrations.schema_migrations where version in ('20261103090000','20261103091000')) then raise exception 'Phase 5 already recorded; use reconciliation instead';end if;
 if exists(select 1 from storage.buckets where id='v2-course-content') then raise exception 'Content bucket already exists; reconciliation required';end if;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'9c2bd2aed8c916eb0ec41333d7589d0b' then raise exception 'Migration ledger differs from fresh recovery; reconcile before activation';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>85 then raise exception 'Application table inventory changed';end if;
 for t in select * from phase5_expected_rows order by "table" loop execute format('lock table public.%I in share mode',t."table");end loop;
 perform pg_temp.phase5_assert_preserved();
 for r in select value from jsonb_array_elements('[{"signature":"get_my_v2_batch_schedules()","sourceMd5":"a9f185ccbf72bf650de4d1cfd63265f4","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"get_my_v2_meeting(uuid,uuid)","sourceMd5":"421d6f432047dcce09e4c8119dd2fe30","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"get_my_v2_published_course(uuid)","sourceMd5":"744f47cb6a5032bdc20e043ad20c0f9c","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"v2_learning_course_base(uuid)","sourceMd5":"62cd37689b87f98de97db95b3e88137d","configuration":["search_path=\"\""],"securityDefiner":true}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or to_jsonb(p.proconfig) is distinct from r->'configuration' then raise exception 'Existing delivery function changed: %',r->>'signature';end if;
 end loop;
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array['v2_content_key','v2_content_assert_admin','v2_content_validate','save_v2_content_item','v2_content_anchor','v2_compose_content','v2_content_scope','publish_v2_content_item','list_v2_content_workspace','v2_phase4_course_base','v2_content_placements','get_my_v2_content_placements','read_v2_content_preview'])) then raise exception 'Unrecorded Phase 5 function exists';end if;
end;$phase5_preflight$;
-- Independent content publication preserves original course revisions and learning records.

create table public.v2_content_items (
 id uuid primary key, draft_revision integer not null default 0,
 published_revision integer, visible boolean not null default false,
 deleted boolean not null default false, publication_version integer not null default 0
);
create table public.v2_content_item_revisions (
 item_id uuid not null references public.v2_content_items(id), revision integer not null,
 document jsonb not null, actor_id uuid not null references public.profiles(id), request_id uuid not null,
 created_at timestamptz not null default statement_timestamp(),
 primary key(item_id,revision),unique(actor_id,request_id)
);
create table public.v2_content_publication_audit (
 id uuid primary key, item_id uuid not null references public.v2_content_items(id),
 actor_id uuid not null references public.profiles(id), request jsonb not null,result jsonb not null,
 created_at timestamptz not null default statement_timestamp()
);
create function public.v2_content_key(p_id uuid,p_revision integer) returns uuid
language sql immutable set search_path='' as $$ select md5(p_id::text||':'||p_revision::text)::uuid $$;
create function public.v2_content_assert_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501';end if;
end;$$;
create function public.v2_content_validate(p_document jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t jsonb;d jsonb;s jsonb;kind text;seen text[]:='{}';identity text;item jsonb;
begin
 if jsonb_typeof(p_document) is distinct from 'object' or not p_document ?& array['title','kind','url','targets']
 or (select count(*) from jsonb_object_keys(p_document))<>4 then raise exception 'Invalid content fields' using errcode='22023';end if;
 kind:=p_document->>'kind';
 if kind not in ('heading','materials','recordings','preSessionReads','postSessionReads') or kind is null
 or jsonb_typeof(p_document->'title') is distinct from 'string' or length(p_document->>'title') not between 1 and 120
 or btrim(p_document->>'title')<>p_document->>'title' then raise exception 'Invalid content title or kind' using errcode='22023';end if;
 if kind='heading' then
  if p_document->'url' is distinct from 'null'::jsonb then raise exception 'Heading cannot contain a resource URL' using errcode='22023';end if;
 else
  item:=jsonb_build_object('key',gen_random_uuid(),'title',p_document->'title','url',p_document->'url');
  if not public.v2_session_content_valid(jsonb_build_object('materials',jsonb_build_array(item),'recordings','[]'::jsonb,'preSessionReads','[]'::jsonb,'postSessionReads','[]'::jsonb)) then raise exception 'Invalid content source' using errcode='22023';end if;
 end if;
 if jsonb_typeof(p_document->'targets') is distinct from 'array' or jsonb_array_length(p_document->'targets') not between 1 and 200 then raise exception 'Explicit content scope required' using errcode='22023';end if;
 for t in select value from jsonb_array_elements(p_document->'targets') loop
  if jsonb_typeof(t) is distinct from 'object' or not t ?& array['batchId','sessionKey','publicationRevision','placement','anchorKey','replaceKey','order']
   or (select count(*) from jsonb_object_keys(t))<>7
   or coalesce(t->>'batchId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(t->>'sessionKey','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(t->'publicationRevision') is distinct from 'number' or coalesce(t->>'publicationRevision','') !~ '^[1-9][0-9]{0,8}$'
   or jsonb_typeof(t->'order') is distinct from 'number' or coalesce(t->>'order','') !~ '^[0-9]{1,4}$'
   or t->>'placement' is null or t->>'placement' not in ('session','before_course','area_top','before_video','after_video','after_course')
  then raise exception 'Invalid content target' using errcode='22023';end if;
  identity:=(t->>'batchId')||':'||(t->>'sessionKey');
  if identity=any(seen) then raise exception 'Duplicate content target' using errcode='22023';end if;seen:=array_append(seen,identity);
  if kind in ('heading','recordings','materials') and t->>'placement'<>'session' then raise exception 'Only readings use the five additional placements' using errcode='22023';end if;
  perform 1 from public.v2_course_batches where id=(t->>'batchId')::uuid for share;
  select b.document into d from public.v2_batch_publication_revisions p
   join public.v2_course_batch_revisions b on b.batch_id=p.batch_id and b.revision=p.batch_revision
   where p.batch_id=(t->>'batchId')::uuid and p.revision=(t->>'publicationRevision')::integer
   and p.revision=(select max(revision) from public.v2_batch_publication_revisions where batch_id=p.batch_id)
   and p.document->>'state'='published';
  if d is null then raise exception 'Course publication changed; reload scope' using errcode='40001';end if;
  select value into s from jsonb_array_elements(coalesce(d->'sessions','[]')||coalesce(d->'events','[]')) where value->>'key'=t->>'sessionKey' and value?'content';
  if s is null then raise exception 'Target session unavailable' using errcode='22023';end if;
  if t->>'placement' in ('before_video','after_video') then
   if not exists(select 1 from jsonb_array_elements(public.v2_compose_content(jsonb_build_object('batchId',t->>'batchId','publicationRevision',t->'publicationRevision','sessions',jsonb_build_array(s)))#>'{sessions,0,content,recordings}') r where r->>'key'=t->>'anchorKey') and not exists(select 1 from jsonb_array_elements(s#>'{content,recordings}') r where r->>'key'=t->>'anchorKey') then raise exception 'Recording placement requires a current recording anchor' using errcode='22023';end if;
  elsif t->'anchorKey' is distinct from 'null'::jsonb then raise exception 'Unexpected recording anchor' using errcode='22023';end if;
  if t->'replaceKey' is distinct from 'null'::jsonb then
   if kind='heading' or not exists(select 1 from jsonb_array_elements(s->'content'->kind) r where r->>'key'=t->>'replaceKey') then raise exception 'Original replacement item unavailable' using errcode='22023';end if;
  end if;
 end loop;
end;$$;
create function public.save_v2_content_item(p_id uuid,p_expected_revision integer,p_request_id uuid,p_document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.v2_content_items%rowtype;r public.v2_content_item_revisions%rowtype;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483645 then raise exception 'Invalid draft request' using errcode='22023';end if;
 select * into r from public.v2_content_item_revisions where actor_id=auth.uid() and request_id=p_request_id;
 if found then
  if r.item_id<>p_id or r.revision<>p_expected_revision+1 or r.document<>p_document then raise exception 'Draft request token already used' using errcode='22023';end if;
  return jsonb_build_object('id',p_id,'revision',r.revision,'replayed',true);
 end if;
 perform public.v2_content_validate(p_document);
 if p_expected_revision=0 then insert into public.v2_content_items(id) values(p_id) on conflict do nothing;end if;
 select * into h from public.v2_content_items where id=p_id for update;
 if not found or h.draft_revision<>p_expected_revision or h.deleted then raise exception 'Draft changed; reload content' using errcode='40001';end if;
 insert into public.v2_content_item_revisions values(p_id,p_expected_revision+1,p_document,auth.uid(),p_request_id,statement_timestamp());
 update public.v2_content_items set draft_revision=p_expected_revision+1 where id=p_id;
 return jsonb_build_object('id',p_id,'revision',p_expected_revision+1,'replayed',false);
end;$$;
create function public.v2_content_anchor(p_batch uuid,p_session uuid,p_anchor uuid,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare r record;
begin
 if p_anchor is null then return null;end if;
 select i.id,v.revision,case when i.id=p_preview_id then p_preview_visible else i.visible end visible into r
 from public.v2_content_items i join public.v2_content_item_revisions v on v.item_id=i.id and v.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(v.document->'targets') t
 where v.document->>'kind'='recordings' and t->>'batchId'=p_batch::text and t->>'sessionKey'=p_session::text and t->>'replaceKey'=p_anchor::text;
 if found then return case when r.visible then public.v2_content_key(r.id,r.revision) else null end;end if;
 return p_anchor;
end;$$;
-- The composer reads only confirmed revisions unless an explicit Admin preview overrides one item.
create function public.v2_compose_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sessions jsonb:='[]';s jsonb;content jsonb;items jsonb;entry record;t jsonb;kind text;key uuid;title text;row jsonb;sort_items jsonb;idx integer;
begin
 if p_course is null then return null;end if;
 for s in select value from jsonb_array_elements(p_course->'sessions') loop
  content:=s->'content';title:=s->>'title';
  for kind in select unnest(array['materials','recordings','preSessionReads','postSessionReads','heading']) loop
   select coalesce(jsonb_agg(jsonb_build_object('item',v,'order',n*100)),'[]') into sort_items from jsonb_array_elements(coalesce(content->kind,'[]')) with ordinality a(v,n);
   for entry in select h.id,case when h.id=p_preview_id then p_preview_visible else h.visible end visible,r.revision,r.document
    from public.v2_content_items h join public.v2_content_item_revisions r on r.item_id=h.id
     and r.revision=case when h.id=p_preview_id then p_preview_revision else h.published_revision end
    where r.document->>'kind'=kind order by h.id loop
    select value into t from jsonb_array_elements(entry.document->'targets') where value->>'batchId'=p_course->>'batchId' and value->>'sessionKey'=s->>'key';
    if t is null or (t->>'publicationRevision')::integer<>(p_course->>'publicationRevision')::integer then continue;end if;
    if kind='heading' then if entry.visible then title:=entry.document->>'title';end if;continue;end if;
    if t->>'anchorKey' is not null and not exists(select 1 from jsonb_array_elements(content->'recordings') r where r->>'key'=public.v2_content_anchor((p_course->>'batchId')::uuid,(s->>'key')::uuid,(t->>'anchorKey')::uuid,p_preview_id,p_preview_revision,p_preview_visible)::text) then continue;end if;
    if t->>'replaceKey' is not null then
     select coalesce(jsonb_agg(v),'[]') into sort_items from jsonb_array_elements(sort_items) v where v#>>'{item,key}'<>t->>'replaceKey';
    end if;
    if entry.visible then
     key:=public.v2_content_key(entry.id,entry.revision);
     sort_items:=sort_items||jsonb_build_array(jsonb_build_object('order',(t->>'order')::integer,'item',jsonb_build_object('key',key,'title',entry.document->>'title','url',entry.document->>'url')));
    end if;
   end loop;
   if kind<>'heading' then
    select coalesce(jsonb_agg(v->'item' order by (v->>'order')::integer,v#>>'{item,key}'),'[]') into items from jsonb_array_elements(sort_items) v;
    content:=jsonb_set(content,array[kind],items);
   end if;
  end loop;
  sessions:=sessions||jsonb_build_array(jsonb_set(jsonb_set(s,'{content}',content),'{title}',to_jsonb(title)));
 end loop;
 return jsonb_set(p_course,'{sessions}',sessions);
end;$$;
create function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.v2_content_items%rowtype;d jsonb;t jsonb;other record;old jsonb;scope jsonb:='[]';course_title text;session_title text;fingerprint text;candidate jsonb;session jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_action is null or p_action not in ('publish','unpublish','delete') then raise exception 'Invalid publication action' using errcode='22023';end if;
 select * into h from public.v2_content_items where id=p_id;
 if not found or h.draft_revision is distinct from p_revision or h.deleted then raise exception 'Content revision changed' using errcode='40001';end if;
 select document into d from public.v2_content_item_revisions where item_id=p_id and revision=case when p_action='publish' then p_revision else coalesce(h.published_revision,p_revision) end;
 if p_action='publish' then perform public.v2_content_validate(d);end if;
 select document into old from public.v2_content_item_revisions where item_id=p_id and revision=h.published_revision;
 for t in select distinct value from jsonb_array_elements((d->'targets')||coalesce(old->'targets','[]')) loop
  select r.document->>'title' into course_title from public.v2_batch_publication_revisions r where batch_id=(t->>'batchId')::uuid order by revision desc limit 1;
  select s->>'title' into session_title from public.v2_course_batch_revisions b cross join lateral jsonb_array_elements(coalesce(b.document->'sessions','[]')||coalesce(b.document->'events','[]')) s
   where b.batch_id=(t->>'batchId')::uuid and b.revision=(select batch_revision from public.v2_batch_publication_revisions where batch_id=b.batch_id order by revision desc limit 1) and s->>'key'=t->>'sessionKey';
  scope:=scope||jsonb_build_array(t||jsonb_build_object('courseTitle',course_title,'sessionTitle',session_title));
  if p_action='publish' then
   for other in select r.document from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.published_revision where i.id<>p_id loop
    if exists(select 1 from jsonb_array_elements(other.document->'targets') x where x->>'batchId'=t->>'batchId' and x->>'sessionKey'=t->>'sessionKey'
     and ((d->>'kind'='heading' and other.document->>'kind'='heading') or (t->>'replaceKey' is not null and x->>'replaceKey'=t->>'replaceKey'))) then raise exception 'Another managed item owns this original target' using errcode='22023';end if;
   end loop;
  end if;
 end loop;
 if p_action='publish' then
  for t in select distinct jsonb_build_object('batchId',value->>'batchId') from jsonb_array_elements(d->'targets') loop
   candidate:=public.read_v2_content_preview((t->>'batchId')::uuid,p_id,p_revision);
   for session in select value from jsonb_array_elements(candidate#>'{course,sessions}') loop
    if not public.v2_session_content_valid(session->'content') then raise exception 'Resulting session exceeds content limits' using errcode='22023';end if;
   end loop;
  end loop;
 end if;
 select encode(sha256(convert_to(jsonb_build_object('head',to_jsonb(h),'document',d,'action',p_action,
 'heads',(select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]') from public.v2_content_items i),
 'publications',(select coalesce(jsonb_agg(to_jsonb(p) order by batch_id,revision),'[]') from public.v2_batch_publication_revisions p where p.batch_id in(select (x->>'batchId')::uuid from jsonb_array_elements(scope) x)))::text,'UTF8')),'hex') into fingerprint;
 return jsonb_build_object('id',p_id,'revision',p_revision,'action',p_action,'fingerprint',fingerprint,'targets',scope);
end;$$;
create function public.publish_v2_content_item(p_id uuid,p_revision integer,p_action text,p_request_id uuid,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare scope jsonb;input jsonb;saved public.v2_content_publication_audit%rowtype;result jsonb;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 input:=jsonb_build_object('id',p_id,'revision',p_revision,'action',p_action,'fingerprint',p_fingerprint);
 if p_request_id is null or coalesce(p_fingerprint,'')!~'^[0-9a-f]{64}$' then raise exception 'Reviewed scope required' using errcode='22023';end if;
 select * into saved from public.v2_content_publication_audit where id=p_request_id;
 if found then
  if saved.actor_id<>auth.uid() or saved.request<>input then raise exception 'Publication token already used' using errcode='22023';end if;return saved.result;
 end if;
 scope:=public.v2_content_scope(p_id,p_revision,p_action);
 if scope->>'fingerprint'<>p_fingerprint then raise exception 'Scope changed; review again' using errcode='40001';end if;
 update public.v2_content_items set published_revision=case when p_action='publish' then p_revision else published_revision end,
 visible=p_action='publish',deleted=p_action='delete',publication_version=publication_version+1 where id=p_id;
 result:=jsonb_build_object('id',p_id,'action',p_action,'confirmed',true);
 insert into public.v2_content_publication_audit values(p_request_id,p_id,auth.uid(),input,result,statement_timestamp());return result;
end;$$;
create function public.list_v2_content_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.v2_content_assert_admin();
 return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('document',r.document) order by r.created_at desc),'[]') from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision),
 'courses',(select coalesce(jsonb_agg(jsonb_build_object('batchId',b.id,'title',p.document->>'title','productCode',b.product_code,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]'),'anchors',public.v2_compose_content(jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]')))->'sessions') order by b.id),'[]')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions d on d.batch_id=b.id and d.revision=p.batch_revision));
end;$$;

create function public.v2_phase4_course_base(p_batch_id uuid)
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
create or replace function public.v2_learning_course_base(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.v2_compose_content(public.v2_phase4_course_base(p_batch_id));
$$;
create function public.v2_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',public.v2_content_key(i.id,r.revision),'sessionKey',t->>'sessionKey','placement',t->>'placement','anchorKey',public.v2_content_anchor((p_course->>'batchId')::uuid,(t->>'sessionKey')::uuid,(t->>'anchorKey')::uuid,p_preview_id,p_preview_revision,p_preview_visible),'order',(t->>'order')::integer) order by (t->>'order')::integer,i.id),'[]')
 from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(r.document->'targets') t
 where case when i.id=p_preview_id then p_preview_visible else i.visible end
 and t->>'batchId'=p_course->>'batchId' and (t->>'publicationRevision')::integer=(p_course->>'publicationRevision')::integer
 and exists(select 1 from jsonb_array_elements(p_course->'sessions') s cross join lateral jsonb_each(s->'content') k cross join lateral jsonb_array_elements(k.value) item
 where s->>'key'=t->>'sessionKey' and item->>'key'=public.v2_content_key(i.id,r.revision)::text);
$$;
create function public.get_my_v2_content_placements(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.v2_content_placements(public.get_my_v2_published_course(p_batch_id));
$$;
create function public.read_v2_content_preview(p_batch_id uuid,p_item_id uuid,p_revision integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;d jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_item_id is not null then
  select r.document into d from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision
  where i.id=p_item_id and i.draft_revision=p_revision and not i.deleted;
  if d is null or not exists(select 1 from jsonb_array_elements(d->'targets') t where t->>'batchId'=p_batch_id::text) then raise exception 'Preview revision unavailable' using errcode='40001';end if;
 end if;
 select jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'batchRevision',p.batch_revision,'title',p.document->>'title','productCode',b.product_code,'sessions',coalesce(r.document->'sessions','[]')) into c
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_batch_id;
 if c is null then raise exception 'Published course unavailable' using errcode='22023';end if;
 c:=public.v2_compose_content(c,p_item_id,p_revision);
 return jsonb_build_object('course',c,'placements',public.v2_content_placements(c,p_item_id,p_revision));
end;$$;
revoke all on function public.v2_content_key(uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_assert_admin() from public,anon,authenticated,service_role;
revoke all on function public.v2_content_validate(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.save_v2_content_item(uuid,integer,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_v2_content_item(uuid,integer,uuid,jsonb) to authenticated;
revoke all on function public.v2_compose_content(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_scope(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.v2_content_scope(uuid,integer,text) to authenticated;
revoke all on function public.publish_v2_content_item(uuid,integer,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.publish_v2_content_item(uuid,integer,text,uuid,text) to authenticated;
revoke all on function public.list_v2_content_workspace() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_content_workspace() to authenticated;
revoke all on function public.v2_phase4_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_placements(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_content_placements(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_content_placements(uuid) to authenticated;
revoke all on function public.read_v2_content_preview(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_content_preview(uuid,uuid,integer) to authenticated;
alter table public.v2_content_items enable row level security;
revoke all on public.v2_content_items from public,anon,authenticated,service_role;
alter table public.v2_content_item_revisions enable row level security;
revoke all on public.v2_content_item_revisions from public,anon,authenticated,service_role;
alter table public.v2_content_publication_audit enable row level security;
revoke all on public.v2_content_publication_audit from public,anon,authenticated,service_role;
revoke all on function public.v2_content_anchor(uuid,uuid,uuid,uuid,integer,boolean) from public,anon,authenticated,service_role;
-- Private content storage; existing buckets and policies retain their behavior.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('v2-course-content','v2-course-content',false,52428800,array['video/mp4','video/webm','application/pdf']);
-- Restrictive guards exclude the new bucket even when an older permissive policy is broad.
-- Upload tokens and server-authorized streaming use the service boundary.
create policy v2_private_content_no_browser_access on storage.objects as restrictive
for all to anon,authenticated using(bucket_id <> 'v2-course-content') with check(bucket_id <> 'v2-course-content');

select pg_temp.phase5_assert_preserved();
do $phase5_postflight$ declare t text;r jsonb;p record;role_name text;actual_roles jsonb;begin
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>88 then raise exception 'Unexpected table inventory after activation';end if;
 foreach t in array array['v2_content_items','v2_content_item_revisions','v2_content_publication_audit'] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relkind='r' and relrowsecurity) then raise exception 'Private table guard missing';end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected direct table privilege';end if;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements('[{"signature":"v2_content_key(uuid,integer)","sourceMd5":"f9b8815b14007802b8d30e2e466129bc","securityDefiner":false,"volatility":"i","roles":[]},{"signature":"v2_content_assert_admin()","sourceMd5":"3fcc77c3232275ae0e124ab6079318ec","securityDefiner":true,"volatility":"v","roles":[]},{"signature":"v2_content_validate(jsonb)","sourceMd5":"35c3a3f0f2064077f6c13065979d2a7f","securityDefiner":true,"volatility":"v","roles":[]},{"signature":"save_v2_content_item(uuid,integer,uuid,jsonb)","sourceMd5":"888d250cdc361db810c378c3ccd18e9d","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"v2_content_anchor(uuid,uuid,uuid,uuid,integer,boolean)","sourceMd5":"1faa45f87cbd2f979270cc3dd8e51727","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"v2_compose_content(jsonb,uuid,integer,boolean)","sourceMd5":"47ec511c6c453144370b3f5ecf05c7cb","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"v2_content_scope(uuid,integer,text)","sourceMd5":"8dbd6adf08b4f4d7a4a512a04291c7b1","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"publish_v2_content_item(uuid,integer,text,uuid,text)","sourceMd5":"1d8a44a54f456376a9f38e7816bd5029","securityDefiner":true,"volatility":"v","roles":["authenticated"]},{"signature":"list_v2_content_workspace()","sourceMd5":"2fef6002b5fdcf839d46af3212e16ba8","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"v2_phase4_course_base(uuid)","sourceMd5":"62cd37689b87f98de97db95b3e88137d","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"v2_learning_course_base(uuid)","sourceMd5":"a9d71c0810254c82662e530f61636041","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"v2_content_placements(jsonb,uuid,integer,boolean)","sourceMd5":"4ebc40aaafa29c945a3972df2955d3b2","securityDefiner":true,"volatility":"s","roles":[]},{"signature":"get_my_v2_content_placements(uuid)","sourceMd5":"eb38718cea283e6316f5cadb22e79eb6","securityDefiner":true,"volatility":"s","roles":["authenticated"]},{"signature":"read_v2_content_preview(uuid,uuid,integer)","sourceMd5":"0cb1fce29bb5a46b0309f48ce0f6dfa3","securityDefiner":true,"volatility":"s","roles":["authenticated"]}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or p.provolatile::text<>r->>'volatility' or p.proconfig is distinct from array['search_path=""'] then raise exception 'Function guard mismatch: %',r->>'signature';end if;
  select coalesce(jsonb_agg(v order by v),'[]') into actual_roles from unnest(array['anon','authenticated','service_role']) v where has_function_privilege(v,p.oid,'EXECUTE');
  if actual_roles<>r->'roles' then raise exception 'Unexpected function privileges: %',r->>'signature';end if;
 end loop;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'9c2bd2aed8c916eb0ec41333d7589d0b' then raise exception 'Prior migration ledger changed';end if;
end;$phase5_postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261103090000','add_v2_content_publishing',array['-- Independent content publication preserves original course revisions and learning records.
begin;
create table public.v2_content_items (
 id uuid primary key, draft_revision integer not null default 0,
 published_revision integer, visible boolean not null default false,
 deleted boolean not null default false, publication_version integer not null default 0
);
create table public.v2_content_item_revisions (
 item_id uuid not null references public.v2_content_items(id), revision integer not null,
 document jsonb not null, actor_id uuid not null references public.profiles(id), request_id uuid not null,
 created_at timestamptz not null default statement_timestamp(),
 primary key(item_id,revision),unique(actor_id,request_id)
);
create table public.v2_content_publication_audit (
 id uuid primary key, item_id uuid not null references public.v2_content_items(id),
 actor_id uuid not null references public.profiles(id), request jsonb not null,result jsonb not null,
 created_at timestamptz not null default statement_timestamp()
);
create function public.v2_content_key(p_id uuid,p_revision integer) returns uuid
language sql immutable set search_path='''' as $$ select md5(p_id::text||'':''||p_revision::text)::uuid $$;
create function public.v2_content_assert_admin() returns void language plpgsql security definer set search_path='''' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role=''admin'' and is_active for share;
 if not found then raise exception ''Active Admin access required'' using errcode=''42501'';end if;
end;$$;
create function public.v2_content_validate(p_document jsonb) returns void language plpgsql security definer set search_path='''' as $$
declare t jsonb;d jsonb;s jsonb;kind text;seen text[]:=''{}'';identity text;item jsonb;
begin
 if jsonb_typeof(p_document) is distinct from ''object'' or not p_document ?& array[''title'',''kind'',''url'',''targets'']
 or (select count(*) from jsonb_object_keys(p_document))<>4 then raise exception ''Invalid content fields'' using errcode=''22023'';end if;
 kind:=p_document->>''kind'';
 if kind not in (''heading'',''materials'',''recordings'',''preSessionReads'',''postSessionReads'') or kind is null
 or jsonb_typeof(p_document->''title'') is distinct from ''string'' or length(p_document->>''title'') not between 1 and 120
 or btrim(p_document->>''title'')<>p_document->>''title'' then raise exception ''Invalid content title or kind'' using errcode=''22023'';end if;
 if kind=''heading'' then
  if p_document->''url'' is distinct from ''null''::jsonb then raise exception ''Heading cannot contain a resource URL'' using errcode=''22023'';end if;
 else
  item:=jsonb_build_object(''key'',gen_random_uuid(),''title'',p_document->''title'',''url'',p_document->''url'');
  if not public.v2_session_content_valid(jsonb_build_object(''materials'',jsonb_build_array(item),''recordings'',''[]''::jsonb,''preSessionReads'',''[]''::jsonb,''postSessionReads'',''[]''::jsonb)) then raise exception ''Invalid content source'' using errcode=''22023'';end if;
 end if;
 if jsonb_typeof(p_document->''targets'') is distinct from ''array'' or jsonb_array_length(p_document->''targets'') not between 1 and 200 then raise exception ''Explicit content scope required'' using errcode=''22023'';end if;
 for t in select value from jsonb_array_elements(p_document->''targets'') loop
  if jsonb_typeof(t) is distinct from ''object'' or not t ?& array[''batchId'',''sessionKey'',''publicationRevision'',''placement'',''anchorKey'',''replaceKey'',''order'']
   or (select count(*) from jsonb_object_keys(t))<>7
   or coalesce(t->>''batchId'','''') !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
   or coalesce(t->>''sessionKey'','''') !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
   or jsonb_typeof(t->''publicationRevision'') is distinct from ''number'' or coalesce(t->>''publicationRevision'','''') !~ ''^[1-9][0-9]{0,8}$''
   or jsonb_typeof(t->''order'') is distinct from ''number'' or coalesce(t->>''order'','''') !~ ''^[0-9]{1,4}$''
   or t->>''placement'' is null or t->>''placement'' not in (''session'',''before_course'',''area_top'',''before_video'',''after_video'',''after_course'')
  then raise exception ''Invalid content target'' using errcode=''22023'';end if;
  identity:=(t->>''batchId'')||'':''||(t->>''sessionKey'');
  if identity=any(seen) then raise exception ''Duplicate content target'' using errcode=''22023'';end if;seen:=array_append(seen,identity);
  if kind in (''heading'',''recordings'',''materials'') and t->>''placement''<>''session'' then raise exception ''Only readings use the five additional placements'' using errcode=''22023'';end if;
  perform 1 from public.v2_course_batches where id=(t->>''batchId'')::uuid for share;
  select b.document into d from public.v2_batch_publication_revisions p
   join public.v2_course_batch_revisions b on b.batch_id=p.batch_id and b.revision=p.batch_revision
   where p.batch_id=(t->>''batchId'')::uuid and p.revision=(t->>''publicationRevision'')::integer
   and p.revision=(select max(revision) from public.v2_batch_publication_revisions where batch_id=p.batch_id)
   and p.document->>''state''=''published'';
  if d is null then raise exception ''Course publication changed; reload scope'' using errcode=''40001'';end if;
  select value into s from jsonb_array_elements(coalesce(d->''sessions'',''[]'')||coalesce(d->''events'',''[]'')) where value->>''key''=t->>''sessionKey'' and value?''content'';
  if s is null then raise exception ''Target session unavailable'' using errcode=''22023'';end if;
  if t->>''placement'' in (''before_video'',''after_video'') then
   if not exists(select 1 from jsonb_array_elements(public.v2_compose_content(jsonb_build_object(''batchId'',t->>''batchId'',''publicationRevision'',t->''publicationRevision'',''sessions'',jsonb_build_array(s)))#>''{sessions,0,content,recordings}'') r where r->>''key''=t->>''anchorKey'') and not exists(select 1 from jsonb_array_elements(s#>''{content,recordings}'') r where r->>''key''=t->>''anchorKey'') then raise exception ''Recording placement requires a current recording anchor'' using errcode=''22023'';end if;
  elsif t->''anchorKey'' is distinct from ''null''::jsonb then raise exception ''Unexpected recording anchor'' using errcode=''22023'';end if;
  if t->''replaceKey'' is distinct from ''null''::jsonb then
   if kind=''heading'' or not exists(select 1 from jsonb_array_elements(s->''content''->kind) r where r->>''key''=t->>''replaceKey'') then raise exception ''Original replacement item unavailable'' using errcode=''22023'';end if;
  end if;
 end loop;
end;$$;
create function public.save_v2_content_item(p_id uuid,p_expected_revision integer,p_request_id uuid,p_document jsonb) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare h public.v2_content_items%rowtype;r public.v2_content_item_revisions%rowtype;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended(''v2-content-publishing'',0));
 if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483645 then raise exception ''Invalid draft request'' using errcode=''22023'';end if;
 select * into r from public.v2_content_item_revisions where actor_id=auth.uid() and request_id=p_request_id;
 if found then
  if r.item_id<>p_id or r.revision<>p_expected_revision+1 or r.document<>p_document then raise exception ''Draft request token already used'' using errcode=''22023'';end if;
  return jsonb_build_object(''id'',p_id,''revision'',r.revision,''replayed'',true);
 end if;
 perform public.v2_content_validate(p_document);
 if p_expected_revision=0 then insert into public.v2_content_items(id) values(p_id) on conflict do nothing;end if;
 select * into h from public.v2_content_items where id=p_id for update;
 if not found or h.draft_revision<>p_expected_revision or h.deleted then raise exception ''Draft changed; reload content'' using errcode=''40001'';end if;
 insert into public.v2_content_item_revisions values(p_id,p_expected_revision+1,p_document,auth.uid(),p_request_id,statement_timestamp());
 update public.v2_content_items set draft_revision=p_expected_revision+1 where id=p_id;
 return jsonb_build_object(''id'',p_id,''revision'',p_expected_revision+1,''replayed'',false);
end;$$;
create function public.v2_content_anchor(p_batch uuid,p_session uuid,p_anchor uuid,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns uuid language plpgsql stable security definer set search_path='''' as $$
declare r record;
begin
 if p_anchor is null then return null;end if;
 select i.id,v.revision,case when i.id=p_preview_id then p_preview_visible else i.visible end visible into r
 from public.v2_content_items i join public.v2_content_item_revisions v on v.item_id=i.id and v.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(v.document->''targets'') t
 where v.document->>''kind''=''recordings'' and t->>''batchId''=p_batch::text and t->>''sessionKey''=p_session::text and t->>''replaceKey''=p_anchor::text;
 if found then return case when r.visible then public.v2_content_key(r.id,r.revision) else null end;end if;
 return p_anchor;
end;$$;
-- The composer reads only confirmed revisions unless an explicit Admin preview overrides one item.
create function public.v2_compose_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare sessions jsonb:=''[]'';s jsonb;content jsonb;items jsonb;entry record;t jsonb;kind text;key uuid;title text;row jsonb;sort_items jsonb;idx integer;
begin
 if p_course is null then return null;end if;
 for s in select value from jsonb_array_elements(p_course->''sessions'') loop
  content:=s->''content'';title:=s->>''title'';
  for kind in select unnest(array[''materials'',''recordings'',''preSessionReads'',''postSessionReads'',''heading'']) loop
   select coalesce(jsonb_agg(jsonb_build_object(''item'',v,''order'',n*100)),''[]'') into sort_items from jsonb_array_elements(coalesce(content->kind,''[]'')) with ordinality a(v,n);
   for entry in select h.id,case when h.id=p_preview_id then p_preview_visible else h.visible end visible,r.revision,r.document
    from public.v2_content_items h join public.v2_content_item_revisions r on r.item_id=h.id
     and r.revision=case when h.id=p_preview_id then p_preview_revision else h.published_revision end
    where r.document->>''kind''=kind order by h.id loop
    select value into t from jsonb_array_elements(entry.document->''targets'') where value->>''batchId''=p_course->>''batchId'' and value->>''sessionKey''=s->>''key'';
    if t is null or (t->>''publicationRevision'')::integer<>(p_course->>''publicationRevision'')::integer then continue;end if;
    if kind=''heading'' then if entry.visible then title:=entry.document->>''title'';end if;continue;end if;
    if t->>''anchorKey'' is not null and not exists(select 1 from jsonb_array_elements(content->''recordings'') r where r->>''key''=public.v2_content_anchor((p_course->>''batchId'')::uuid,(s->>''key'')::uuid,(t->>''anchorKey'')::uuid,p_preview_id,p_preview_revision,p_preview_visible)::text) then continue;end if;
    if t->>''replaceKey'' is not null then
     select coalesce(jsonb_agg(v),''[]'') into sort_items from jsonb_array_elements(sort_items) v where v#>>''{item,key}''<>t->>''replaceKey'';
    end if;
    if entry.visible then
     key:=public.v2_content_key(entry.id,entry.revision);
     sort_items:=sort_items||jsonb_build_array(jsonb_build_object(''order'',(t->>''order'')::integer,''item'',jsonb_build_object(''key'',key,''title'',entry.document->>''title'',''url'',entry.document->>''url'')));
    end if;
   end loop;
   if kind<>''heading'' then
    select coalesce(jsonb_agg(v->''item'' order by (v->>''order'')::integer,v#>>''{item,key}''),''[]'') into items from jsonb_array_elements(sort_items) v;
    content:=jsonb_set(content,array[kind],items);
   end if;
  end loop;
  sessions:=sessions||jsonb_build_array(jsonb_set(jsonb_set(s,''{content}'',content),''{title}'',to_jsonb(title)));
 end loop;
 return jsonb_set(p_course,''{sessions}'',sessions);
end;$$;
create function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare h public.v2_content_items%rowtype;d jsonb;t jsonb;other record;old jsonb;scope jsonb:=''[]'';course_title text;session_title text;fingerprint text;candidate jsonb;session jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_action is null or p_action not in (''publish'',''unpublish'',''delete'') then raise exception ''Invalid publication action'' using errcode=''22023'';end if;
 select * into h from public.v2_content_items where id=p_id;
 if not found or h.draft_revision is distinct from p_revision or h.deleted then raise exception ''Content revision changed'' using errcode=''40001'';end if;
 select document into d from public.v2_content_item_revisions where item_id=p_id and revision=case when p_action=''publish'' then p_revision else coalesce(h.published_revision,p_revision) end;
 if p_action=''publish'' then perform public.v2_content_validate(d);end if;
 select document into old from public.v2_content_item_revisions where item_id=p_id and revision=h.published_revision;
 for t in select distinct value from jsonb_array_elements((d->''targets'')||coalesce(old->''targets'',''[]'')) loop
  select r.document->>''title'' into course_title from public.v2_batch_publication_revisions r where batch_id=(t->>''batchId'')::uuid order by revision desc limit 1;
  select s->>''title'' into session_title from public.v2_course_batch_revisions b cross join lateral jsonb_array_elements(coalesce(b.document->''sessions'',''[]'')||coalesce(b.document->''events'',''[]'')) s
   where b.batch_id=(t->>''batchId'')::uuid and b.revision=(select batch_revision from public.v2_batch_publication_revisions where batch_id=b.batch_id order by revision desc limit 1) and s->>''key''=t->>''sessionKey'';
  scope:=scope||jsonb_build_array(t||jsonb_build_object(''courseTitle'',course_title,''sessionTitle'',session_title));
  if p_action=''publish'' then
   for other in select r.document from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.published_revision where i.id<>p_id loop
    if exists(select 1 from jsonb_array_elements(other.document->''targets'') x where x->>''batchId''=t->>''batchId'' and x->>''sessionKey''=t->>''sessionKey''
     and ((d->>''kind''=''heading'' and other.document->>''kind''=''heading'') or (t->>''replaceKey'' is not null and x->>''replaceKey''=t->>''replaceKey''))) then raise exception ''Another managed item owns this original target'' using errcode=''22023'';end if;
   end loop;
  end if;
 end loop;
 if p_action=''publish'' then
  for t in select distinct jsonb_build_object(''batchId'',value->>''batchId'') from jsonb_array_elements(d->''targets'') loop
   candidate:=public.read_v2_content_preview((t->>''batchId'')::uuid,p_id,p_revision);
   for session in select value from jsonb_array_elements(candidate#>''{course,sessions}'') loop
    if not public.v2_session_content_valid(session->''content'') then raise exception ''Resulting session exceeds content limits'' using errcode=''22023'';end if;
   end loop;
  end loop;
 end if;
 select encode(sha256(convert_to(jsonb_build_object(''head'',to_jsonb(h),''document'',d,''action'',p_action,
 ''heads'',(select coalesce(jsonb_agg(to_jsonb(i) order by id),''[]'') from public.v2_content_items i),
 ''publications'',(select coalesce(jsonb_agg(to_jsonb(p) order by batch_id,revision),''[]'') from public.v2_batch_publication_revisions p where p.batch_id in(select (x->>''batchId'')::uuid from jsonb_array_elements(scope) x)))::text,''UTF8'')),''hex'') into fingerprint;
 return jsonb_build_object(''id'',p_id,''revision'',p_revision,''action'',p_action,''fingerprint'',fingerprint,''targets'',scope);
end;$$;
create function public.publish_v2_content_item(p_id uuid,p_revision integer,p_action text,p_request_id uuid,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare scope jsonb;input jsonb;saved public.v2_content_publication_audit%rowtype;result jsonb;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended(''v2-content-publishing'',0));
 input:=jsonb_build_object(''id'',p_id,''revision'',p_revision,''action'',p_action,''fingerprint'',p_fingerprint);
 if p_request_id is null or coalesce(p_fingerprint,'''')!~''^[0-9a-f]{64}$'' then raise exception ''Reviewed scope required'' using errcode=''22023'';end if;
 select * into saved from public.v2_content_publication_audit where id=p_request_id;
 if found then
  if saved.actor_id<>auth.uid() or saved.request<>input then raise exception ''Publication token already used'' using errcode=''22023'';end if;return saved.result;
 end if;
 scope:=public.v2_content_scope(p_id,p_revision,p_action);
 if scope->>''fingerprint''<>p_fingerprint then raise exception ''Scope changed; review again'' using errcode=''40001'';end if;
 update public.v2_content_items set published_revision=case when p_action=''publish'' then p_revision else published_revision end,
 visible=p_action=''publish'',deleted=p_action=''delete'',publication_version=publication_version+1 where id=p_id;
 result:=jsonb_build_object(''id'',p_id,''action'',p_action,''confirmed'',true);
 insert into public.v2_content_publication_audit values(p_request_id,p_id,auth.uid(),input,result,statement_timestamp());return result;
end;$$;
create function public.list_v2_content_workspace() returns jsonb language plpgsql stable security definer set search_path='''' as $$
begin
 perform public.v2_content_assert_admin();
 return jsonb_build_object(''items'',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object(''document'',r.document) order by r.created_at desc),''[]'') from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision),
 ''courses'',(select coalesce(jsonb_agg(jsonb_build_object(''batchId'',b.id,''title'',p.document->>''title'',''productCode'',b.product_code,''publicationRevision'',p.revision,''sessions'',coalesce(d.document->''sessions'',''[]''),''anchors'',public.v2_compose_content(jsonb_build_object(''batchId'',b.id,''publicationRevision'',p.revision,''sessions'',coalesce(d.document->''sessions'',''[]'')))->''sessions'') order by b.id),''[]'')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>''state''=''published''
 join public.v2_course_batch_revisions d on d.batch_id=b.id and d.revision=p.batch_revision));
end;$$;

create function public.v2_phase4_course_base(p_batch_id uuid)
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
create or replace function public.v2_learning_course_base(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='''' as $$
 select public.v2_compose_content(public.v2_phase4_course_base(p_batch_id));
$$;
create function public.v2_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''key'',public.v2_content_key(i.id,r.revision),''sessionKey'',t->>''sessionKey'',''placement'',t->>''placement'',''anchorKey'',public.v2_content_anchor((p_course->>''batchId'')::uuid,(t->>''sessionKey'')::uuid,(t->>''anchorKey'')::uuid,p_preview_id,p_preview_revision,p_preview_visible),''order'',(t->>''order'')::integer) order by (t->>''order'')::integer,i.id),''[]'')
 from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(r.document->''targets'') t
 where case when i.id=p_preview_id then p_preview_visible else i.visible end
 and t->>''batchId''=p_course->>''batchId'' and (t->>''publicationRevision'')::integer=(p_course->>''publicationRevision'')::integer
 and exists(select 1 from jsonb_array_elements(p_course->''sessions'') s cross join lateral jsonb_each(s->''content'') k cross join lateral jsonb_array_elements(k.value) item
 where s->>''key''=t->>''sessionKey'' and item->>''key''=public.v2_content_key(i.id,r.revision)::text);
$$;
create function public.get_my_v2_content_placements(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='''' as $$
 select public.v2_content_placements(public.get_my_v2_published_course(p_batch_id));
$$;
create function public.read_v2_content_preview(p_batch_id uuid,p_item_id uuid,p_revision integer) returns jsonb
language plpgsql stable security definer set search_path='''' as $$
declare c jsonb;d jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_item_id is not null then
  select r.document into d from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision
  where i.id=p_item_id and i.draft_revision=p_revision and not i.deleted;
  if d is null or not exists(select 1 from jsonb_array_elements(d->''targets'') t where t->>''batchId''=p_batch_id::text) then raise exception ''Preview revision unavailable'' using errcode=''40001'';end if;
 end if;
 select jsonb_build_object(''batchId'',b.id,''publicationRevision'',p.revision,''batchRevision'',p.batch_revision,''title'',p.document->>''title'',''productCode'',b.product_code,''sessions'',coalesce(r.document->''sessions'',''[]'')) into c
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>''state''=''published''
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_batch_id;
 if c is null then raise exception ''Published course unavailable'' using errcode=''22023'';end if;
 c:=public.v2_compose_content(c,p_item_id,p_revision);
 return jsonb_build_object(''course'',c,''placements'',public.v2_content_placements(c,p_item_id,p_revision));
end;$$;
revoke all on function public.v2_content_key(uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_assert_admin() from public,anon,authenticated,service_role;
revoke all on function public.v2_content_validate(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.save_v2_content_item(uuid,integer,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_v2_content_item(uuid,integer,uuid,jsonb) to authenticated;
revoke all on function public.v2_compose_content(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_scope(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.v2_content_scope(uuid,integer,text) to authenticated;
revoke all on function public.publish_v2_content_item(uuid,integer,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.publish_v2_content_item(uuid,integer,text,uuid,text) to authenticated;
revoke all on function public.list_v2_content_workspace() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_content_workspace() to authenticated;
revoke all on function public.v2_phase4_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_placements(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_content_placements(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_content_placements(uuid) to authenticated;
revoke all on function public.read_v2_content_preview(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_content_preview(uuid,uuid,integer) to authenticated;
alter table public.v2_content_items enable row level security;
revoke all on public.v2_content_items from public,anon,authenticated,service_role;
alter table public.v2_content_item_revisions enable row level security;
revoke all on public.v2_content_item_revisions from public,anon,authenticated,service_role;
alter table public.v2_content_publication_audit enable row level security;
revoke all on public.v2_content_publication_audit from public,anon,authenticated,service_role;
revoke all on function public.v2_content_anchor(uuid,uuid,uuid,uuid,integer,boolean) from public,anon,authenticated,service_role;
commit;
']);
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261103091000','add_v2_private_content_storage',array['-- Private content storage; existing buckets and policies retain their behavior.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(''v2-course-content'',''v2-course-content'',false,52428800,array[''video/mp4'',''video/webm'',''application/pdf'']);
-- Restrictive guards exclude the new bucket even when an older permissive policy is broad.
-- Upload tokens and server-authorized streaming use the service boundary.
create policy v2_private_content_no_browser_access on storage.objects as restrictive
for all to anon,authenticated using(bucket_id <> ''v2-course-content'') with check(bucket_id <> ''v2-course-content'');
commit;
']);
do $storage_guards$ begin
 if not exists(select 1 from storage.buckets where id='v2-course-content' and not public and file_size_limit=52428800 and allowed_mime_types=array['video/mp4','video/webm','application/pdf']) then raise exception 'Private content bucket configuration mismatch';end if;
 if not exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='v2_private_content_no_browser_access' and not polpermissive) then raise exception 'Private storage restriction missing';end if;
end;$storage_guards$;
notify pgrst,'reload schema';
select jsonb_build_object('check','phase5_activation','migrationVersion','20261103090000','sourceSha256','b4ccac5d81fa4e55cb5bf0a5dd7a84de81f135fc514a1d51206977793435edb4',
 'existingApplicationTables',85,'existingRowsPreserved',true,'phase1LedgerPreserved',true,'newPrivateTables',3,'functionsVerified',14,'phase3Activated',false,'hostedAcceptance','separate','privateStorageBucket',true,'storageMigrationSha256','14ce35774ae0d305145b1bf16feb6d4aa2732d4d57049450f109331654e13f24') as result;
commit;
