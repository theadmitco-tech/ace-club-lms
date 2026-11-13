-- STAGING ONLY: eyphkkginlgoaxflauog. The operator verifies the dashboard project.
-- Atomic Phase 3 activation; no checkout, payment or course publication is performed.
-- Recovery SHA256: 4d55941637ad95f74c42813571bfb9c384d4afe7ed95bdf6e4616e8e254c5728
rollback;
begin;
set local timezone='UTC';
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase3_expected_rows on commit drop as
select * from jsonb_to_recordset('[{"table":"course_template_events","rows":211,"md5":"16df6448268f32bb16ef48b33bf58675"},{"table":"course_template_resources","rows":70,"md5":"a6bf41039701c8123eece142c9fc6a96"},{"table":"course_template_revisions","rows":19,"md5":"22d2eb592008c1246493b0496fda04ff"},{"table":"course_template_sections","rows":31,"md5":"f92aa5d48a787346fc9f71a29330e534"},{"table":"course_templates","rows":4,"md5":"4d1d53fe9de01e055adbfa1300aee5b0"},{"table":"courses","rows":13,"md5":"d49397e6ca2c055f4338c51bc9648fa3"},{"table":"enrollments","rows":4,"md5":"c52228a514c2a00ba1ebce886f9ce7e0"},{"table":"master_materials","rows":13,"md5":"017adc9bf3281d55f664cee7119c71e4"},{"table":"master_practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_sessions","rows":31,"md5":"f17c8bcf3bc6f7252480c8a1dc28151b"},{"table":"master_worksheet_plans","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"master_worksheet_questions","rows":150,"md5":"3e87a15501a4b334a77d133f2ae90003"},{"table":"master_worksheet_session_rules","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"material_worksheet_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"materials","rows":74,"md5":"0d1c4a252de931898b86179408a6d557"},{"table":"mock_assessment_assignments","rows":7,"md5":"c8991d683e1fc9d7e3456a9a19bef5b5"},{"table":"mock_assessment_audit","rows":39,"md5":"31436407260a317f8dd1247e90fc9fcc"},{"table":"mock_assessment_items","rows":196,"md5":"5792d2ab8339b82d1d4c07662dbd1cb5"},{"table":"mock_assessment_sections","rows":13,"md5":"f5ccdd1c785888ef80f42be82f87405e"},{"table":"mock_assessment_versions","rows":6,"md5":"99e4de190cee849a1d20273ac363b561"},{"table":"mock_assessments","rows":5,"md5":"8efa3a08945ffee210591d3c8ad46375"},{"table":"mock_assignment_testers","rows":2,"md5":"3bf4cc223ad9e9a779ff5bcb9cbb32cf"},{"table":"mock_attempt_item_notes","rows":1,"md5":"c99adc47ce7ba60c1720c5dd910a0546"},{"table":"mock_attempt_items","rows":132,"md5":"37f6f567ea544f12ffa0b054903efc87"},{"table":"mock_attempt_sections","rows":10,"md5":"ef8371608b27659eec7d3eb0099a030a"},{"table":"mock_attempts","rows":4,"md5":"588e56a16a1ab1ce0252616fba611482"},{"table":"mock_import_items","rows":200,"md5":"1bd9ff44e1ae072033ae2d4c2c880eab"},{"table":"mock_imports","rows":8,"md5":"925b24ad77525eab924875b0d0051163"},{"table":"mock_media","rows":10,"md5":"af21364af1a736bfc115aeaec6367420"},{"table":"mock_operation_receipts","rows":135,"md5":"1a8c71fb2442305a9053f87492f1c3c0"},{"table":"mock_question_media","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"mock_question_options","rows":909,"md5":"10b09a504ad255366096f8a7e077a871"},{"table":"mock_question_revisions","rows":168,"md5":"6b0d69b88125ce2d964e3d3eebdf6350"},{"table":"mock_questions","rows":164,"md5":"91d6cc28e550f3e548ad6694850a9955"},{"table":"mock_responses","rows":132,"md5":"7d21093f16d7e60669977d79ae6fd730"},{"table":"mock_review_edits","rows":1,"md5":"e514be2613f46258e3f859e0cfeeb6e5"},{"table":"mock_source_namespace_members","rows":1,"md5":"8a361235be3dda5a6b5838d2d19a555c"},{"table":"mock_source_namespaces","rows":3,"md5":"b1965b90b59589cebb5155e23f8234d2"},{"table":"mock_stimuli","rows":26,"md5":"0bed07cdd3556db9517d62957c5f0426"},{"table":"mock_stimulus_media","rows":10,"md5":"113669a3d6a9c3ba2111dc26f477496c"},{"table":"mock_stimulus_revisions","rows":26,"md5":"ef365a15a542d51cbae31bf5afa7e93f"},{"table":"mock_topics","rows":84,"md5":"fe2704763ab5094a91a9e21324665b4b"},{"table":"payments","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_attempts","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_questions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"practice_sets","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"profiles","rows":11,"md5":"b1b8f748eebd15776fc01fc03f103ff7"},{"table":"registrations","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"sessions","rows":251,"md5":"fddf08506487eef78815af4db2591d72"},{"table":"student_course_preferences","rows":1,"md5":"f1964e938f5907539c063075d33adb63"},{"table":"student_material_question_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"student_question_logs","rows":600,"md5":"d4f1a9408124f4f8c57b34bbd42c8cfb"},{"table":"student_worksheet_logs","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_enrollments","rows":4,"md5":"7c1a5e04f5851c68d6305dd0d26d867b"},{"table":"v2_batch_meeting_revisions","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_batch_publication_revisions","rows":5,"md5":"9ff9c00552d485540e8bc032d74df21d"},{"table":"v2_content_asset_placements","rows":33,"md5":"d6059e45a3c72a15c8243f2398c8b813"},{"table":"v2_content_asset_replacements","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_content_imports","rows":1,"md5":"bdad478721b5697cdb5393ece6f51284"},{"table":"v2_content_item_revisions","rows":1,"md5":"4bf3936414dc648478a58a527296115d"},{"table":"v2_content_items","rows":1,"md5":"9b6e31a273c22b016fba65e074ec965c"},{"table":"v2_content_publication_audit","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_course_batch_revisions","rows":5,"md5":"c89f726500d5bf5be5abba34b6751e77"},{"table":"v2_course_batches","rows":5,"md5":"baac543dfcc3e0ee7a112630990ea2c6"},{"table":"v2_course_offerings","rows":4,"md5":"20d7dcd6cddc7e4a3d7d3ae629b43867"},{"table":"v2_course_template_revisions","rows":9,"md5":"ab646d65bdb8cfc05fb86145046e1bea"},{"table":"v2_course_templates","rows":5,"md5":"825798a6f7d45175095325c667582290"},{"table":"v2_feedback_obligations","rows":2,"md5":"49b2529cdc26dd02c99d45d36b6677a4"},{"table":"v2_learning_progress","rows":25,"md5":"9e1404488c55c7410276d64d098da585"},{"table":"v2_live_class_completions","rows":1,"md5":"6c69a2e36e1f727a967ccc79539c8654"},{"table":"v2_live_registration_audit","rows":2,"md5":"003749938f260371c45d17b89d11c2a8"},{"table":"v2_live_registrations","rows":2,"md5":"ae63d1d2be8f17b338c768d12ce8a764"},{"table":"v2_live_session_mapping_audit","rows":2,"md5":"ecca4f865391c287daeace82e36bf14c"},{"table":"v2_live_session_mappings","rows":2,"md5":"f3b77eac06138e25cdf05f6b5669be9d"},{"table":"v2_price_versions","rows":4,"md5":"29f7278b543ff356a5a4b163747e2598"},{"table":"v2_product_grants","rows":2,"md5":"7d12a50ba7188e9b88ccc08a6f5358b1"},{"table":"v2_products","rows":4,"md5":"0ec545a7ee7c8dbd5500f8f781dd2cec"},{"table":"v2_publication_scope_requests","rows":1,"md5":"2d59e7885b30cdb293de5177f18aa50b"},{"table":"v2_published_meetings","rows":0,"md5":"d751713988987e9331980363e24189ce"},{"table":"v2_purchases","rows":2,"md5":"d2b7c044197391fde00ad07578f6abd8"},{"table":"v2_recording_watch_samples","rows":1,"md5":"5ab1a7b583b3ffc1615ba0d2d4a693dc"},{"table":"v2_recording_watch_sessions","rows":2,"md5":"74efeb3e8416fc857b854f17fa95bd4d"},{"table":"v2_session_feedback","rows":1,"md5":"5ea4cf4368f3f1e552089a655c5ac1a2"},{"table":"v2_shared_content_asset_revisions","rows":19,"md5":"62d37546f3cc376264b1eda5cce706b6"},{"table":"v2_shared_content_assets","rows":19,"md5":"9cb43ad9eafd2eeac9c553398c0e2efe"},{"table":"worksheet_daily_targets","rows":0,"md5":"d751713988987e9331980363e24189ce"}]'::jsonb) as t("table" text,rows bigint,md5 text);
create function pg_temp.phase3_assert_rows() returns void language plpgsql as $$
declare t record;n bigint;h text;begin
 for t in select * from phase3_expected_rows order by "table" loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t."table") into n,h;
  if n<>t.rows or h<>t.md5 then raise exception 'Existing application data differs: %; transaction aborted',t."table";end if;
 end loop;
end;$$;
do $preflight$ declare t record;r jsonb;p record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version=any(array['20261113090000','20261113100000','20261113110000','20261102140000','20261102150000','20261102160000'])) then raise exception 'A Phase 3 migration exists; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103120000') then raise exception 'Phase 6 conflict repair required';end if;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'2c4fe4da8703a14c6fa3c50db076c912' then raise exception 'Migration ledger changed after recovery';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>88 then raise exception 'Application table inventory changed';end if;
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array['list_v2_sales_catalogue','v2_mark_signup_candidate','v2_invalidate_signup_candidate','v2_effective_purchase_products','get_my_v2_purchase_packages','v2_checkout_buyer_eligible','v2_live_occupied','list_v2_live_availability','prepare_v2_checkout','get_my_v2_checkouts','read_v2_checkout_service','find_v2_checkout_order','claim_v2_checkout_order','attach_v2_checkout_order','record_v2_payment_event','v2_enforce_live_capacity','fulfill_v2_checkout','list_v2_checkout_exceptions'])) then raise exception 'Unrecorded payment function exists';end if;
 if exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='z_v2_signup_candidate') then raise exception 'Unrecorded payment trigger exists';end if;
 for t in select * from phase3_expected_rows order by "table" loop execute format('lock table public.%I in share mode',t."table");end loop;
 perform pg_temp.phase3_assert_rows();
 for r in select value from jsonb_array_elements('[{"signature":"can_access_v2_product(text,text)","sourceMd5":"687a4bd263570466ff4b692ada88c160","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"get_my_v2_access()","sourceMd5":"eb78712d1aa452a37c5c6adea9ce348d","configuration":["search_path=\"\""],"securityDefiner":true},{"signature":"v2_student_has_product(uuid,text)","sourceMd5":"62047e82c2666dd58fb342c5f0285b0f","configuration":["search_path=\"\""],"securityDefiner":true}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or to_jsonb(p.proconfig) is distinct from r->'configuration' then raise exception 'Existing entitlement function changed: %',r->>'signature';end if;
 end loop;
end;$preflight$;
create temporary table phase3_original_functions on commit drop as select oid id from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table phase3_original_relations on commit drop as select oid id,relname name from pg_class where relnamespace='public'::regnamespace and relkind in('r','v','m','S');
create temporary table phase3_original_indexes on commit drop as select indexname name from pg_indexes where schemaname='public';
create temporary table phase3_original_triggers on commit drop as select oid id from pg_trigger where tgrelid in(select id from phase3_original_relations) or tgrelid='auth.users'::regclass;
create function pg_temp.phase3_original_metadata() returns jsonb language sql as $metadata$
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
  'definition',case when p.proname in ('can_access_v2_product','get_my_v2_access','v2_student_has_product') then null else pg_get_functiondef(p.oid) end,
  'acl',p.proacl::text,'owner',p.proowner,'definer',p.prosecdef,'configuration',p.proconfig,'volatility',p.provolatile,'language',p.prolang)
  order by p.oid::regprocedure::text) from pg_proc p join phase3_original_functions f on f.id=p.oid),
 'relations',(select jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl::text,'owner',c.relowner)
  order by c.relname) from pg_class c join phase3_original_relations r on r.id=c.oid),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where p.schemaname='public' and p.tablename in(select name from phase3_original_relations)),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname)
  from pg_constraint c where c.conrelid in(select id from phase3_original_relations)
  and not(c.conrelid='public.v2_live_registrations'::regclass and c.conname='v2_live_registrations_provenance_check')),
 'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public' and indexname in(select name from phase3_original_indexes)),
 'triggers',(select jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)
  order by t.tgrelid::regclass::text,t.tgname) from pg_trigger t join phase3_original_triggers x on x.id=t.oid)
);$metadata$;

create temporary table phase3_preserved_metadata on commit drop as select pg_temp.phase3_original_metadata() doc;
-- Public sales metadata projects only the latest published course revision.
-- Private materials, meetings, rosters and draft documents remain inaccessible.

create or replace function public.list_v2_sales_catalogue()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId', b.id,
    'publicationRevision', pub.revision,
    'productCode', b.product_code,
    'entitlementProductCode', p.code,
    'title', pub.document->>'title',
    'sections', to_jsonb(p.sections),
    'timeZone', 'Asia/Kolkata',
    'accessMonths', 6,
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
      'key', item->>'key', 'title', item->>'title', 'section', item->>'section'
    ) order by n) from jsonb_array_elements(coalesce(pub.document->'sessions','[]')) with ordinality s(item,n)), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'key', item->>'key', 'title', item->>'title', 'section', item->>'section',
      'kind', item->>'kind', 'startsAt', item->>'startsAt', 'endsAt', item->>'endsAt'
    ) order by n) from jsonb_array_elements(coalesce(pub.document->'events','[]')) with ordinality e(item,n)
      where item->>'kind'='live'), '[]'::jsonb)
  ) order by b.product_code, pub.document->>'title', b.id), '[]'::jsonb)
  from public.v2_course_batches b
  join lateral (
    select r.revision, r.document from public.v2_batch_publication_revisions r
    where r.batch_id=b.id order by r.revision desc limit 1
  ) pub on pub.document->>'state'='published'
  join public.v2_products p on p.code=public.v2_entitlement_product_code(b.product_code)
    and p.available_for_purchase;
$$;

revoke all on function public.list_v2_sales_catalogue() from public, anon, authenticated, service_role;
grant execute on function public.list_v2_sales_catalogue() to anon, authenticated;

-- Staging payment ledger. Provider verification remains a server-only responsibility.

create table public.v2_signup_candidates (
 student_id uuid primary key references auth.users(id), created_at timestamptz not null default statement_timestamp()
);
create function public.v2_mark_signup_candidate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'provider'='google' then
  insert into public.v2_signup_candidates(student_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end; $$;
create trigger z_v2_signup_candidate after insert on auth.users for each row execute function public.v2_mark_signup_candidate();
create function public.v2_invalidate_signup_candidate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.v2_signup_candidates where student_id=new.id;
 return new;
end; $$;
create trigger v2_signup_activation_guard after update of is_active,role on public.profiles for each row execute function public.v2_invalidate_signup_candidate();

create table public.v2_checkout_intents (
 id uuid primary key, student_id uuid not null references public.profiles(id),
 products text[] not null, batches jsonb not null, live_batches uuid[] not null,
 full_name text not null, whatsapp text not null, email text not null,
 amount_paise integer not null check(amount_paise>0), currency text not null check(currency='INR'),
 price_version_id uuid not null references public.v2_price_versions(id),
 base_purchase_id uuid references public.v2_purchases(id), previous_products text[],
 previous_price_version_id uuid references public.v2_price_versions(id),
 state text not null default 'prepared' check(state in ('prepared','creating','ready','fulfilled','review')),
 provider_order_id text unique, provider_payment_id text unique, purchase_id uuid references public.v2_purchases(id),
 created_at timestamptz not null default statement_timestamp(), hold_until timestamptz not null default statement_timestamp()+interval '15 minutes',
 verified_at timestamptz, fulfilled_at timestamptz, issue text,
 check((base_purchase_id is null)=(previous_products is null))
);
create index v2_checkout_student_idx on public.v2_checkout_intents(student_id,created_at);
create table public.v2_purchase_upgrades (
 checkout_id uuid primary key references public.v2_checkout_intents(id),
 purchase_id uuid not null references public.v2_purchases(id), products text[] not null,
 amount_paise integer not null check(amount_paise>0), confirmed_at timestamptz not null,
 revoked_at timestamptz
);
create table public.v2_payment_events (
 event_id text primary key, payload_sha256 text not null, checkout_id uuid not null references public.v2_checkout_intents(id),
 received_at timestamptz not null default statement_timestamp()
);
create function public.v2_effective_purchase_products(p_purchase uuid) returns text[] language sql stable security definer set search_path='' as $$
 select array_agg(distinct code order by code) from (
 select product_code code from public.v2_product_grants where purchase_id=p_purchase
 union select unnest(products) from public.v2_purchase_upgrades where purchase_id=p_purchase and revoked_at is null
 ) g;
$$;
create or replace function public.can_access_v2_product(p_product_code text,p_section text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role='student' and s.is_active and product.code=p_product_code
 and (p_section is null or p_section=any(product.sections))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create or replace function public.get_my_v2_access() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('product_code',code,'sections',sections,'expires_at',expires_at) order by code),'[]') from (
 select product.code,product.sections,max(p.expires_at) expires_at from public.profiles s
 join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role='student' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
 group by product.code,product.sections) a;
$$;
create or replace function public.v2_student_has_product(p_student uuid,p_product text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 where s.id=p_student and s.role='student' and s.is_active
 and public.v2_entitlement_product_code(p_product)=any(public.v2_effective_purchase_products(p.id))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create function public.get_my_v2_purchase_packages() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'products',public.v2_effective_purchase_products(p.id),'expiresAt',p.expires_at) order by p.id),'[]')
 from public.v2_purchases p join public.profiles s on s.id=p.student_id where s.id=auth.uid() and s.role='student' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
$$;
create function public.v2_checkout_buyer_eligible(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join auth.users u on u.id=s.id where s.id=p_student and s.role='student'
 and u.email_confirmed_at is not null and u.raw_app_meta_data->>'provider'='google'
 and (s.is_active or exists(select 1 from public.v2_signup_candidates c where c.student_id=s.id)));
$$;
create function public.v2_live_occupied(p_batch uuid,p_exclude uuid default null) returns integer language sql stable security definer set search_path='' as $$
 select count(distinct student_id)::integer from (
 select student_id from public.v2_live_registrations where batch_id=p_batch and active
 union all select student_id from public.v2_checkout_intents where p_batch=any(live_batches)
 and state in ('prepared','creating','ready') and hold_until>statement_timestamp() and id is distinct from p_exclude
 ) places;
$$;
create function public.list_v2_live_availability() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('batchId',item->>'batchId','placesRemaining',greatest(0,8-public.v2_live_occupied((item->>'batchId')::uuid)),'capacity',8)),'[]')
 from jsonb_array_elements(public.list_v2_sales_catalogue()) item where jsonb_array_length(item->'events')>0;
$$;

create function public.prepare_v2_checkout(p_id uuid,p_products text[],p_batch_ids uuid[],p_live_ids uuid[],p_name text,p_whatsapp text,p_upgrade boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_student uuid:=auth.uid(); v_codes text[]; v_old public.v2_checkout_intents%rowtype;
 v_quote jsonb; v_prior_quote jsonb; v_base public.v2_purchases%rowtype; v_current text[]; v_count integer;
 v_batch uuid; v_item jsonb; v_batches jsonb:='[]'; v_mapped text[]:='{}'; v_amount integer; v_email text;
begin
 if v_student is null then raise exception 'Verified Google sign-in required' using errcode='42501'; end if;
 perform 1 from public.profiles where id=v_student for update;
 if not public.v2_checkout_buyer_eligible(v_student) then raise exception 'Student checkout is unavailable for this account' using errcode='42501'; end if;
 if p_id is null or p_upgrade is null or length(btrim(p_name)) not between 1 and 120 or p_name is null
 or p_whatsapp is null or p_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Name and international WhatsApp number required' using errcode='22023'; end if;
 select product_codes into v_codes from public.v2_purchase_shape(p_products);
 if p_batch_ids is null or cardinality(p_batch_ids)<>cardinality(v_codes) or p_live_ids is null
 or cardinality(p_live_ids)>cardinality(p_batch_ids) or not p_live_ids<@p_batch_ids
 or cardinality(p_batch_ids)<>(select count(distinct x) from unnest(p_batch_ids) x)
 or cardinality(p_live_ids)<>(select count(distinct x) from unnest(p_live_ids) x) then raise exception 'Invalid batch selection' using errcode='22023'; end if;
 select * into v_old from public.v2_checkout_intents where id=p_id;
 if found then
  if v_old.student_id<>v_student or v_old.products<>v_codes or v_old.live_batches<>(select coalesce(array_agg(x order by x),'{}') from unnest(p_live_ids) x)
   or (v_old.base_purchase_id is not null)<>p_upgrade or v_old.full_name<>btrim(p_name) or v_old.whatsapp<>p_whatsapp
   or (select array_agg((x->>'batchId')::uuid order by x->>'batchId') from jsonb_array_elements(v_old.batches) x)<>(select array_agg(x order by x) from unnest(p_batch_ids) x)
  then raise exception 'Checkout identifier already used' using errcode='22023'; end if;
  return jsonb_build_object('id',v_old.id,'amountPaise',v_old.amount_paise,'currency',v_old.currency,'state',v_old.state,'holdUntil',v_old.hold_until);
 end if;
 if exists(select 1 from public.v2_checkout_intents where student_id=v_student and state in ('prepared','creating','ready') and hold_until>statement_timestamp()) then
  raise exception 'An active checkout already exists; resume it or wait for its expiry' using errcode='22023'; end if;
 if (select count(*) from public.v2_checkout_intents where student_id=v_student and created_at>statement_timestamp()-interval '1 day')>=20 then raise exception 'Checkout limit reached' using errcode='22023'; end if;
 v_quote:=public.quote_v2_products(v_codes); v_amount:=(v_quote->>'amount_paise')::integer;
 select count(*) into v_count from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
 if p_upgrade then
  if v_count<>1 or 'full_batch'=any(v_codes) then raise exception 'Exactly one active individual package required' using errcode='22023'; end if;
  select * into v_base from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) for update;
  v_current:=public.v2_effective_purchase_products(v_base.id);
  if 'full_batch'=any(v_current) or not v_current<@v_codes or cardinality(v_current)>=cardinality(v_codes) then raise exception 'A larger individual package is required' using errcode='22023'; end if;
  v_prior_quote:=public.quote_v2_products(v_current); v_amount:=v_amount-(v_prior_quote->>'amount_paise')::integer;
  if v_amount<=0 then raise exception 'Upgrade price unavailable' using errcode='22023'; end if;
 elsif exists(select 1 from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&v_codes) then
  raise exception 'Selected access is already active; use an eligible upgrade' using errcode='22023';
 end if;
 for v_batch in select x from unnest(p_batch_ids) x order by x loop
  perform 1 from public.v2_course_batches where id=v_batch for update;
  select x into v_item from jsonb_array_elements(public.list_v2_sales_catalogue()) x where x->>'batchId'=v_batch::text;
  if v_item is null then raise exception 'Published batch unavailable' using errcode='22023'; end if;
  v_mapped:=array_append(v_mapped,v_item->>'entitlementProductCode');
  if v_batch=any(p_live_ids) then
   if not exists(select 1 from jsonb_array_elements(v_item->'events') e where (e->>'endsAt')::timestamptz>statement_timestamp()) then raise exception 'Upcoming live batch required' using errcode='22023'; end if;
   if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=v_student and active)
   and public.v2_live_occupied(v_batch)>=8 then raise exception 'Live batch is full' using errcode='22023'; end if;
  end if;
  v_batches:=v_batches||jsonb_build_array(jsonb_build_object('batchId',v_batch,'publicationRevision',v_item->'publicationRevision'));
 end loop;
 if (select array_agg(x order by x) from unnest(v_mapped) x)<>v_codes then raise exception 'Batches must match selected products exactly' using errcode='22023'; end if;
 select lower(email) into v_email from auth.users where id=v_student;
 insert into public.v2_checkout_intents(id,student_id,products,batches,live_batches,full_name,whatsapp,email,amount_paise,currency,price_version_id,base_purchase_id,previous_products,previous_price_version_id)
 values(p_id,v_student,v_codes,v_batches,(select coalesce(array_agg(x order by x),'{}') from unnest(p_live_ids) x),btrim(p_name),p_whatsapp,v_email,v_amount,'INR',(v_quote->>'price_version_id')::uuid,v_base.id,v_current,(v_prior_quote->>'price_version_id')::uuid);
 return jsonb_build_object('id',p_id,'amountPaise',v_amount,'currency','INR','state','prepared','holdUntil',statement_timestamp()+interval '15 minutes','expiresAt',v_base.expires_at);
end; $$;

create function public.get_my_v2_checkouts() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'products',c.products,'batches',c.batches,'liveBatches',c.live_batches,'amountPaise',c.amount_paise,'currency',c.currency,'state',c.state,'holdUntil',c.hold_until,'createdAt',c.created_at,'confirmedAt',c.verified_at,'expiresAt',p.expires_at,'upgrade',c.base_purchase_id is not null) order by c.created_at desc),'[]')
 from (select * from public.v2_checkout_intents where student_id=auth.uid() order by created_at desc limit 20) c
 left join public.v2_purchases p on p.id=c.purchase_id;
$$;
create function public.read_v2_checkout_service(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(c) from public.v2_checkout_intents c where id=p_id;
$$;
create function public.find_v2_checkout_order(p_order text) returns uuid language sql stable security definer set search_path='' as $$
 select id from public.v2_checkout_intents where provider_order_id=p_order;
$$;
create function public.claim_v2_checkout_order(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.v2_checkout_intents set state='creating' where id=p_id and state='prepared' and hold_until>statement_timestamp();
 return found;
end; $$;
create function public.attach_v2_checkout_order(p_id uuid,p_order text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_order is null or p_order !~ '^order_[A-Za-z0-9]+$' then raise exception 'Invalid provider order'; end if;
 update public.v2_checkout_intents set state='ready',provider_order_id=p_order where id=p_id and state='creating' and provider_order_id is null;
 if not found and not exists(select 1 from public.v2_checkout_intents where id=p_id and provider_order_id=p_order) then raise exception 'Order cannot be attached'; end if;
end; $$;
create function public.record_v2_payment_event(p_event text,p_hash text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_event is null or length(p_event) not between 1 and 200 or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid event'; end if;
 insert into public.v2_payment_events(event_id,payload_sha256,checkout_id) values(p_event,p_hash,p_id) on conflict do nothing;
 if not exists(select 1 from public.v2_payment_events where event_id=p_event and payload_sha256=p_hash and checkout_id=p_id) then raise exception 'Event replay mismatch'; end if;
end; $$;

-- Table access is deliberately unavailable even to the service role; narrow RPCs own transitions.
alter table public.v2_signup_candidates enable row level security;
alter table public.v2_checkout_intents enable row level security;
alter table public.v2_purchase_upgrades enable row level security;
alter table public.v2_payment_events enable row level security;
revoke all on public.v2_signup_candidates,public.v2_checkout_intents,public.v2_purchase_upgrades,public.v2_payment_events from public,anon,authenticated,service_role;
revoke all on function public.v2_mark_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_invalidate_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_effective_purchase_products(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_checkout_buyer_eligible(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_live_occupied(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_purchase_packages() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_purchase_packages() to authenticated;
revoke all on function public.list_v2_live_availability() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_availability() to anon,authenticated;
revoke all on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) to authenticated;
revoke all on function public.get_my_v2_checkouts() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_checkouts() to authenticated;
revoke all on function public.read_v2_checkout_service(uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_checkout_service(uuid) to service_role;
revoke all on function public.find_v2_checkout_order(text) from public,anon,authenticated,service_role;
grant execute on function public.find_v2_checkout_order(text) to service_role;
revoke all on function public.claim_v2_checkout_order(uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_v2_checkout_order(uuid) to service_role;
revoke all on function public.attach_v2_checkout_order(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.attach_v2_checkout_order(uuid,text) to service_role;
revoke all on function public.record_v2_payment_event(text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_payment_event(text,text,uuid) to service_role;

-- Capture confirmation and enrollment commit together; failed transitions retain an exception for review.

alter table public.v2_live_registrations drop constraint v2_live_registrations_provenance_check;
alter table public.v2_live_registrations add constraint v2_live_registrations_provenance_check check(provenance in ('admin_manual','verified_payment'));
create function public.v2_enforce_live_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_occupied integer;
begin
 if new.active then
  perform 1 from public.v2_course_batches where id=new.batch_id for update;
  select count(distinct student_id) into v_occupied from (
   select student_id from public.v2_live_registrations where batch_id=new.batch_id and active and student_id<>new.student_id
   union all select student_id from public.v2_checkout_intents where new.batch_id=any(live_batches)
   and student_id<>new.student_id and state in ('prepared','creating','ready') and hold_until>statement_timestamp()
  ) places;
  if v_occupied>=8 then raise exception 'Live batch is full' using errcode='22023'; end if;
 end if;
 return new;
end; $$;
create trigger v2_live_capacity before insert or update on public.v2_live_registrations for each row execute function public.v2_enforce_live_capacity();

create function public.fulfill_v2_checkout(p_id uuid,p_order text,p_payment text,p_amount integer,p_currency text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.v2_checkout_intents%rowtype; v_base public.v2_purchases%rowtype;
 v_batch uuid; v_entry jsonb; v_pub public.v2_batch_publication_revisions%rowtype; v_revision integer; v_purchase uuid;
begin
 select student_id into c.student_id from public.v2_checkout_intents where id=p_id;
 if not found then raise exception 'Checkout unavailable'; end if;
 perform 1 from public.profiles where id=c.student_id for update;
 select * into strict c from public.v2_checkout_intents where id=p_id for update;
 if p_order is null or p_order is distinct from c.provider_order_id or p_amount is distinct from c.amount_paise or p_currency is distinct from c.currency
 or p_payment is null or p_payment !~ '^pay_[A-Za-z0-9]+$' then raise exception 'Verified payment does not match checkout'; end if;
 if c.provider_payment_id is not null and c.provider_payment_id<>p_payment then raise exception 'Checkout already has a different captured payment'; end if;
 if c.state='fulfilled' then return jsonb_build_object('state','fulfilled','id',c.id,'replayed',true); end if;
 if c.state not in ('ready','review') then raise exception 'Checkout is not ready'; end if;
 update public.v2_checkout_intents set provider_payment_id=p_payment,verified_at=coalesce(verified_at,statement_timestamp()) where id=c.id returning * into c;
 begin
  if not public.v2_checkout_buyer_eligible(c.student_id) then raise exception 'Account no longer eligible'; end if;
  if c.base_purchase_id is not null then
   select * into strict v_base from public.v2_purchases where id=c.base_purchase_id for update;
   if v_base.student_id<>c.student_id or not public.v2_access_window_contains(v_base.confirmed_at,v_base.expires_at,v_base.revoked_at,statement_timestamp())
    or public.v2_effective_purchase_products(v_base.id) is distinct from c.previous_products
    or (select count(*) from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()))<>1
   then raise exception 'Upgrade eligibility changed'; end if;
  elsif exists(select 1 from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&c.products) then
   raise exception 'Purchased access is already active';
  end if;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>'batchId' loop
   v_batch:=(v_entry->>'batchId')::uuid;
   perform 1 from public.v2_course_batches where id=v_batch for update;
   select * into v_pub from public.v2_batch_publication_revisions where batch_id=v_batch order by revision desc limit 1;
   if v_pub.document->>'state' is distinct from 'published' or v_pub.revision is distinct from (v_entry->>'publicationRevision')::integer then raise exception 'Publication changed'; end if;
   if v_batch=any(c.live_batches) then
    if not exists(select 1 from jsonb_array_elements(v_pub.document->'events') e where e->>'kind'='live' and (e->>'endsAt')::timestamptz>statement_timestamp()) then raise exception 'Live batch ended'; end if;
    if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active)
     and public.v2_live_occupied(v_batch,c.id)>=8 then raise exception 'Live batch is full'; end if;
   end if;
  end loop;
  if c.base_purchase_id is null then
   v_purchase:=public.grant_v2_purchase(c.student_id,c.products,'razorpay_test:'||p_payment,c.verified_at,c.price_version_id,c.amount_paise,c.currency);
  else
   v_purchase:=c.base_purchase_id;
   insert into public.v2_purchase_upgrades(checkout_id,purchase_id,products,amount_paise,confirmed_at)
   values(c.id,v_purchase,c.products,c.amount_paise,c.verified_at);
  end if;
  -- Only a newly marked signup may be activated; existing disabled accounts are excluded above.
  update public.profiles set is_active=true,full_name=c.full_name where id=c.student_id and not is_active;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>'batchId' loop
   v_batch:=(v_entry->>'batchId')::uuid;
   insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id)
    values(v_batch,c.student_id,true,1,c.student_id)
    on conflict(batch_id,student_id) do update set active=true,revision=public.v2_batch_enrollments.revision+1,actor_id=c.student_id,updated_at=statement_timestamp();
   if v_batch=any(c.live_batches) and not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active) then
    insert into public.v2_live_registrations(batch_id,student_id,active,provenance,revision,actor_id)
     values(v_batch,c.student_id,true,'verified_payment',1,c.student_id)
     on conflict(batch_id,student_id) do update set active=true,provenance='verified_payment',revision=public.v2_live_registrations.revision+1,actor_id=c.student_id,updated_at=statement_timestamp()
     returning revision into v_revision;
    insert into public.v2_live_registration_audit(batch_id,student_id,revision,active,actor_id) values(v_batch,c.student_id,v_revision,true,c.student_id);
   end if;
  end loop;
  update public.v2_checkout_intents set state='fulfilled',purchase_id=v_purchase,fulfilled_at=statement_timestamp(),issue=null where id=c.id;
 exception when others then
  -- The subtransaction rolls back all grants, activation and enrollment before recording review state.
  update public.v2_checkout_intents set state='review',issue='fulfillment_conflict' where id=c.id;
  return jsonb_build_object('state','review','id',c.id,'replayed',false);
 end;
 return jsonb_build_object('state','fulfilled','id',c.id,'replayed',false);
end; $$;
create function public.list_v2_checkout_exceptions() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'state',state,'amountPaise',amount_paise,'products',products,'createdAt',created_at,'issue',issue) order by created_at),'[]')
 from public.v2_checkout_intents where state='review' or (state in ('creating','ready') and hold_until<=statement_timestamp()));
end; $$;
revoke all on function public.v2_enforce_live_capacity(),public.fulfill_v2_checkout(uuid,text,text,integer,text),public.list_v2_checkout_exceptions() from public,anon,authenticated,service_role;
grant execute on function public.fulfill_v2_checkout(uuid,text,text,integer,text) to service_role;
grant execute on function public.list_v2_checkout_exceptions() to authenticated;

do $postflight$ declare r jsonb;p record;t text;role_name text;roles jsonb;begin
 perform pg_temp.phase3_assert_rows();
 if pg_temp.phase3_original_metadata() is distinct from (select doc from phase3_preserved_metadata) then raise exception 'Original schema/security metadata changed outside the reviewed scope';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>92 then raise exception 'Unexpected table count';end if;
 foreach t in array array['v2_signup_candidates','v2_checkout_intents','v2_purchase_upgrades','v2_payment_events'] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relkind='r' and relrowsecurity) then raise exception 'Payment table RLS missing';end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected direct payment table privilege';end if;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements('[{"roles":["service_role"],"language":"plpgsql","signature":"attach_v2_checkout_order(uuid,text)","sourceMd5":"08a6e0aca021c1af164d2d50a4ed82e9","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated","service_role"],"language":"sql","signature":"can_access_v2_product(text,text)","sourceMd5":"3b1bd0ab7afd2c020813cc39488e3840","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["service_role"],"language":"plpgsql","signature":"claim_v2_checkout_order(uuid)","sourceMd5":"33b97e5e88c30b608a5d9c6cfed2869f","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["service_role"],"language":"sql","signature":"find_v2_checkout_order(text)","sourceMd5":"22bb161752d739c17f864d1db501fb7f","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["service_role"],"language":"plpgsql","signature":"fulfill_v2_checkout(uuid,text,text,integer,text)","sourceMd5":"3858386043217ade64d2d3d5c613aae3","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated","service_role"],"language":"sql","signature":"get_my_v2_access()","sourceMd5":"958cde8346c0bed1ef59b8c14efb1c74","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated"],"language":"sql","signature":"get_my_v2_checkouts()","sourceMd5":"593554054ca3161b02933d1b7031b968","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated"],"language":"sql","signature":"get_my_v2_purchase_packages()","sourceMd5":"edebfa4557a52a5ca84da68f8bd96953","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated"],"language":"plpgsql","signature":"list_v2_checkout_exceptions()","sourceMd5":"ae561a3f1fd04dce80229eae2b73c8f9","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["anon","authenticated"],"language":"sql","signature":"list_v2_live_availability()","sourceMd5":"e7d8cef0b93057376e3aee73b219a49c","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["anon","authenticated"],"language":"sql","signature":"list_v2_sales_catalogue()","sourceMd5":"9050282f753d41fb701cb8642d50c464","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["authenticated"],"language":"plpgsql","signature":"prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean)","sourceMd5":"98810316eac29fc9dea36f7a38836d3a","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["service_role"],"language":"sql","signature":"read_v2_checkout_service(uuid)","sourceMd5":"121b26265b25fbc4dfdb344c353bba43","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":["service_role"],"language":"plpgsql","signature":"record_v2_payment_event(text,text,uuid)","sourceMd5":"d900baa4b9d0d9aaece813969dffb8f8","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"sql","signature":"v2_checkout_buyer_eligible(uuid)","sourceMd5":"954c7327c80c409c922a479315ba926f","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"sql","signature":"v2_effective_purchase_products(uuid)","sourceMd5":"f96f50764243e419bf86973c18a29ac7","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"plpgsql","signature":"v2_enforce_live_capacity()","sourceMd5":"0c901a6b5dc527194551e5a948c1e6cf","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"plpgsql","signature":"v2_invalidate_signup_candidate()","sourceMd5":"52492d552a6b1c5de019713ebb0bdda4","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"sql","signature":"v2_live_occupied(uuid,uuid)","sourceMd5":"2364a6b4c77e28c843e2c67b756265b7","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"plpgsql","signature":"v2_mark_signup_candidate()","sourceMd5":"374ff17d3c8a65485eb19af6587f96ed","volatility":"v","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true},{"roles":[],"language":"sql","signature":"v2_student_has_product(uuid,text)","sourceMd5":"bd2866f0e4ce799017e345e8f6041d9a","volatility":"s","configuration":["search_path=\"\""],"publicExecute":false,"securityDefiner":true}]'::jsonb) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean
   or to_jsonb(p.proconfig) is distinct from r->'configuration' or p.provolatile::text<>r->>'volatility'
   or (select lanname from pg_language where oid=p.prolang)<>r->>'language' then raise exception 'Payment routine mismatch: %',r->>'signature';end if;
  select coalesce(jsonb_agg(v order by v),'[]') into roles from unnest(array['anon','authenticated','service_role']) v where has_function_privilege(v,p.oid,'EXECUTE');
  if roles<>r->'roles' or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'Payment routine privilege mismatch: %',r->>'signature';end if;
 end loop;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>'2c4fe4da8703a14c6fa3c50db076c912' then raise exception 'Original migration ledger changed';end if;
end;$postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261113090000','add_v2_sales_catalogue',array['-- Public sales metadata projects only the latest published course revision.
-- Private materials, meetings, rosters and draft documents remain inaccessible.
begin;

create or replace function public.list_v2_sales_catalogue()
returns jsonb language sql stable security definer set search_path = '''' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    ''batchId'', b.id,
    ''publicationRevision'', pub.revision,
    ''productCode'', b.product_code,
    ''entitlementProductCode'', p.code,
    ''title'', pub.document->>''title'',
    ''sections'', to_jsonb(p.sections),
    ''timeZone'', ''Asia/Kolkata'',
    ''accessMonths'', 6,
    ''sessions'', coalesce((select jsonb_agg(jsonb_build_object(
      ''key'', item->>''key'', ''title'', item->>''title'', ''section'', item->>''section''
    ) order by n) from jsonb_array_elements(coalesce(pub.document->''sessions'',''[]'')) with ordinality s(item,n)), ''[]''::jsonb),
    ''events'', coalesce((select jsonb_agg(jsonb_build_object(
      ''key'', item->>''key'', ''title'', item->>''title'', ''section'', item->>''section'',
      ''kind'', item->>''kind'', ''startsAt'', item->>''startsAt'', ''endsAt'', item->>''endsAt''
    ) order by n) from jsonb_array_elements(coalesce(pub.document->''events'',''[]'')) with ordinality e(item,n)
      where item->>''kind''=''live''), ''[]''::jsonb)
  ) order by b.product_code, pub.document->>''title'', b.id), ''[]''::jsonb)
  from public.v2_course_batches b
  join lateral (
    select r.revision, r.document from public.v2_batch_publication_revisions r
    where r.batch_id=b.id order by r.revision desc limit 1
  ) pub on pub.document->>''state''=''published''
  join public.v2_products p on p.code=public.v2_entitlement_product_code(b.product_code)
    and p.available_for_purchase;
$$;

revoke all on function public.list_v2_sales_catalogue() from public, anon, authenticated, service_role;
grant execute on function public.list_v2_sales_catalogue() to anon, authenticated;
commit;
']);
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261113100000','add_v2_checkout_ledger',array['-- Staging payment ledger. Provider verification remains a server-only responsibility.
begin;
create table public.v2_signup_candidates (
 student_id uuid primary key references auth.users(id), created_at timestamptz not null default statement_timestamp()
);
create function public.v2_mark_signup_candidate() returns trigger language plpgsql security definer set search_path='''' as $$
begin
 if new.raw_app_meta_data->>''provider''=''google'' then
  insert into public.v2_signup_candidates(student_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end; $$;
create trigger z_v2_signup_candidate after insert on auth.users for each row execute function public.v2_mark_signup_candidate();
create function public.v2_invalidate_signup_candidate() returns trigger language plpgsql security definer set search_path='''' as $$
begin
 delete from public.v2_signup_candidates where student_id=new.id;
 return new;
end; $$;
create trigger v2_signup_activation_guard after update of is_active,role on public.profiles for each row execute function public.v2_invalidate_signup_candidate();

create table public.v2_checkout_intents (
 id uuid primary key, student_id uuid not null references public.profiles(id),
 products text[] not null, batches jsonb not null, live_batches uuid[] not null,
 full_name text not null, whatsapp text not null, email text not null,
 amount_paise integer not null check(amount_paise>0), currency text not null check(currency=''INR''),
 price_version_id uuid not null references public.v2_price_versions(id),
 base_purchase_id uuid references public.v2_purchases(id), previous_products text[],
 previous_price_version_id uuid references public.v2_price_versions(id),
 state text not null default ''prepared'' check(state in (''prepared'',''creating'',''ready'',''fulfilled'',''review'')),
 provider_order_id text unique, provider_payment_id text unique, purchase_id uuid references public.v2_purchases(id),
 created_at timestamptz not null default statement_timestamp(), hold_until timestamptz not null default statement_timestamp()+interval ''15 minutes'',
 verified_at timestamptz, fulfilled_at timestamptz, issue text,
 check((base_purchase_id is null)=(previous_products is null))
);
create index v2_checkout_student_idx on public.v2_checkout_intents(student_id,created_at);
create table public.v2_purchase_upgrades (
 checkout_id uuid primary key references public.v2_checkout_intents(id),
 purchase_id uuid not null references public.v2_purchases(id), products text[] not null,
 amount_paise integer not null check(amount_paise>0), confirmed_at timestamptz not null,
 revoked_at timestamptz
);
create table public.v2_payment_events (
 event_id text primary key, payload_sha256 text not null, checkout_id uuid not null references public.v2_checkout_intents(id),
 received_at timestamptz not null default statement_timestamp()
);
create function public.v2_effective_purchase_products(p_purchase uuid) returns text[] language sql stable security definer set search_path='''' as $$
 select array_agg(distinct code order by code) from (
 select product_code code from public.v2_product_grants where purchase_id=p_purchase
 union select unnest(products) from public.v2_purchase_upgrades where purchase_id=p_purchase and revoked_at is null
 ) g;
$$;
create or replace function public.can_access_v2_product(p_product_code text,p_section text default null)
returns boolean language sql stable security definer set search_path='''' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role=''student'' and s.is_active and product.code=p_product_code
 and (p_section is null or p_section=any(product.sections))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create or replace function public.get_my_v2_access() returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''product_code'',code,''sections'',sections,''expires_at'',expires_at) order by code),''[]'') from (
 select product.code,product.sections,max(p.expires_at) expires_at from public.profiles s
 join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role=''student'' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
 group by product.code,product.sections) a;
$$;
create or replace function public.v2_student_has_product(p_student uuid,p_product text) returns boolean language sql stable security definer set search_path='''' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 where s.id=p_student and s.role=''student'' and s.is_active
 and public.v2_entitlement_product_code(p_product)=any(public.v2_effective_purchase_products(p.id))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create function public.get_my_v2_purchase_packages() returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''id'',p.id,''products'',public.v2_effective_purchase_products(p.id),''expiresAt'',p.expires_at) order by p.id),''[]'')
 from public.v2_purchases p join public.profiles s on s.id=p.student_id where s.id=auth.uid() and s.role=''student'' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
$$;
create function public.v2_checkout_buyer_eligible(p_student uuid) returns boolean language sql stable security definer set search_path='''' as $$
 select exists(select 1 from public.profiles s join auth.users u on u.id=s.id where s.id=p_student and s.role=''student''
 and u.email_confirmed_at is not null and u.raw_app_meta_data->>''provider''=''google''
 and (s.is_active or exists(select 1 from public.v2_signup_candidates c where c.student_id=s.id)));
$$;
create function public.v2_live_occupied(p_batch uuid,p_exclude uuid default null) returns integer language sql stable security definer set search_path='''' as $$
 select count(distinct student_id)::integer from (
 select student_id from public.v2_live_registrations where batch_id=p_batch and active
 union all select student_id from public.v2_checkout_intents where p_batch=any(live_batches)
 and state in (''prepared'',''creating'',''ready'') and hold_until>statement_timestamp() and id is distinct from p_exclude
 ) places;
$$;
create function public.list_v2_live_availability() returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''batchId'',item->>''batchId'',''placesRemaining'',greatest(0,8-public.v2_live_occupied((item->>''batchId'')::uuid)),''capacity'',8)),''[]'')
 from jsonb_array_elements(public.list_v2_sales_catalogue()) item where jsonb_array_length(item->''events'')>0;
$$;

create function public.prepare_v2_checkout(p_id uuid,p_products text[],p_batch_ids uuid[],p_live_ids uuid[],p_name text,p_whatsapp text,p_upgrade boolean default false)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_student uuid:=auth.uid(); v_codes text[]; v_old public.v2_checkout_intents%rowtype;
 v_quote jsonb; v_prior_quote jsonb; v_base public.v2_purchases%rowtype; v_current text[]; v_count integer;
 v_batch uuid; v_item jsonb; v_batches jsonb:=''[]''; v_mapped text[]:=''{}''; v_amount integer; v_email text;
begin
 if v_student is null then raise exception ''Verified Google sign-in required'' using errcode=''42501''; end if;
 perform 1 from public.profiles where id=v_student for update;
 if not public.v2_checkout_buyer_eligible(v_student) then raise exception ''Student checkout is unavailable for this account'' using errcode=''42501''; end if;
 if p_id is null or p_upgrade is null or length(btrim(p_name)) not between 1 and 120 or p_name is null
 or p_whatsapp is null or p_whatsapp !~ ''^\+[1-9][0-9]{7,14}$'' then raise exception ''Name and international WhatsApp number required'' using errcode=''22023''; end if;
 select product_codes into v_codes from public.v2_purchase_shape(p_products);
 if p_batch_ids is null or cardinality(p_batch_ids)<>cardinality(v_codes) or p_live_ids is null
 or cardinality(p_live_ids)>cardinality(p_batch_ids) or not p_live_ids<@p_batch_ids
 or cardinality(p_batch_ids)<>(select count(distinct x) from unnest(p_batch_ids) x)
 or cardinality(p_live_ids)<>(select count(distinct x) from unnest(p_live_ids) x) then raise exception ''Invalid batch selection'' using errcode=''22023''; end if;
 select * into v_old from public.v2_checkout_intents where id=p_id;
 if found then
  if v_old.student_id<>v_student or v_old.products<>v_codes or v_old.live_batches<>(select coalesce(array_agg(x order by x),''{}'') from unnest(p_live_ids) x)
   or (v_old.base_purchase_id is not null)<>p_upgrade or v_old.full_name<>btrim(p_name) or v_old.whatsapp<>p_whatsapp
   or (select array_agg((x->>''batchId'')::uuid order by x->>''batchId'') from jsonb_array_elements(v_old.batches) x)<>(select array_agg(x order by x) from unnest(p_batch_ids) x)
  then raise exception ''Checkout identifier already used'' using errcode=''22023''; end if;
  return jsonb_build_object(''id'',v_old.id,''amountPaise'',v_old.amount_paise,''currency'',v_old.currency,''state'',v_old.state,''holdUntil'',v_old.hold_until);
 end if;
 if exists(select 1 from public.v2_checkout_intents where student_id=v_student and state in (''prepared'',''creating'',''ready'') and hold_until>statement_timestamp()) then
  raise exception ''An active checkout already exists; resume it or wait for its expiry'' using errcode=''22023''; end if;
 if (select count(*) from public.v2_checkout_intents where student_id=v_student and created_at>statement_timestamp()-interval ''1 day'')>=20 then raise exception ''Checkout limit reached'' using errcode=''22023''; end if;
 v_quote:=public.quote_v2_products(v_codes); v_amount:=(v_quote->>''amount_paise'')::integer;
 select count(*) into v_count from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
 if p_upgrade then
  if v_count<>1 or ''full_batch''=any(v_codes) then raise exception ''Exactly one active individual package required'' using errcode=''22023''; end if;
  select * into v_base from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) for update;
  v_current:=public.v2_effective_purchase_products(v_base.id);
  if ''full_batch''=any(v_current) or not v_current<@v_codes or cardinality(v_current)>=cardinality(v_codes) then raise exception ''A larger individual package is required'' using errcode=''22023''; end if;
  v_prior_quote:=public.quote_v2_products(v_current); v_amount:=v_amount-(v_prior_quote->>''amount_paise'')::integer;
  if v_amount<=0 then raise exception ''Upgrade price unavailable'' using errcode=''22023''; end if;
 elsif exists(select 1 from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&v_codes) then
  raise exception ''Selected access is already active; use an eligible upgrade'' using errcode=''22023'';
 end if;
 for v_batch in select x from unnest(p_batch_ids) x order by x loop
  perform 1 from public.v2_course_batches where id=v_batch for update;
  select x into v_item from jsonb_array_elements(public.list_v2_sales_catalogue()) x where x->>''batchId''=v_batch::text;
  if v_item is null then raise exception ''Published batch unavailable'' using errcode=''22023''; end if;
  v_mapped:=array_append(v_mapped,v_item->>''entitlementProductCode'');
  if v_batch=any(p_live_ids) then
   if not exists(select 1 from jsonb_array_elements(v_item->''events'') e where (e->>''endsAt'')::timestamptz>statement_timestamp()) then raise exception ''Upcoming live batch required'' using errcode=''22023''; end if;
   if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=v_student and active)
   and public.v2_live_occupied(v_batch)>=8 then raise exception ''Live batch is full'' using errcode=''22023''; end if;
  end if;
  v_batches:=v_batches||jsonb_build_array(jsonb_build_object(''batchId'',v_batch,''publicationRevision'',v_item->''publicationRevision''));
 end loop;
 if (select array_agg(x order by x) from unnest(v_mapped) x)<>v_codes then raise exception ''Batches must match selected products exactly'' using errcode=''22023''; end if;
 select lower(email) into v_email from auth.users where id=v_student;
 insert into public.v2_checkout_intents(id,student_id,products,batches,live_batches,full_name,whatsapp,email,amount_paise,currency,price_version_id,base_purchase_id,previous_products,previous_price_version_id)
 values(p_id,v_student,v_codes,v_batches,(select coalesce(array_agg(x order by x),''{}'') from unnest(p_live_ids) x),btrim(p_name),p_whatsapp,v_email,v_amount,''INR'',(v_quote->>''price_version_id'')::uuid,v_base.id,v_current,(v_prior_quote->>''price_version_id'')::uuid);
 return jsonb_build_object(''id'',p_id,''amountPaise'',v_amount,''currency'',''INR'',''state'',''prepared'',''holdUntil'',statement_timestamp()+interval ''15 minutes'',''expiresAt'',v_base.expires_at);
end; $$;

create function public.get_my_v2_checkouts() returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''id'',c.id,''products'',c.products,''batches'',c.batches,''liveBatches'',c.live_batches,''amountPaise'',c.amount_paise,''currency'',c.currency,''state'',c.state,''holdUntil'',c.hold_until,''createdAt'',c.created_at,''confirmedAt'',c.verified_at,''expiresAt'',p.expires_at,''upgrade'',c.base_purchase_id is not null) order by c.created_at desc),''[]'')
 from (select * from public.v2_checkout_intents where student_id=auth.uid() order by created_at desc limit 20) c
 left join public.v2_purchases p on p.id=c.purchase_id;
$$;
create function public.read_v2_checkout_service(p_id uuid) returns jsonb language sql stable security definer set search_path='''' as $$
 select to_jsonb(c) from public.v2_checkout_intents c where id=p_id;
$$;
create function public.find_v2_checkout_order(p_order text) returns uuid language sql stable security definer set search_path='''' as $$
 select id from public.v2_checkout_intents where provider_order_id=p_order;
$$;
create function public.claim_v2_checkout_order(p_id uuid) returns boolean language plpgsql security definer set search_path='''' as $$
begin
 update public.v2_checkout_intents set state=''creating'' where id=p_id and state=''prepared'' and hold_until>statement_timestamp();
 return found;
end; $$;
create function public.attach_v2_checkout_order(p_id uuid,p_order text) returns void language plpgsql security definer set search_path='''' as $$
begin
 if p_order is null or p_order !~ ''^order_[A-Za-z0-9]+$'' then raise exception ''Invalid provider order''; end if;
 update public.v2_checkout_intents set state=''ready'',provider_order_id=p_order where id=p_id and state=''creating'' and provider_order_id is null;
 if not found and not exists(select 1 from public.v2_checkout_intents where id=p_id and provider_order_id=p_order) then raise exception ''Order cannot be attached''; end if;
end; $$;
create function public.record_v2_payment_event(p_event text,p_hash text,p_id uuid) returns void language plpgsql security definer set search_path='''' as $$
begin
 if p_event is null or length(p_event) not between 1 and 200 or p_hash is null or p_hash !~ ''^[0-9a-f]{64}$'' then raise exception ''Invalid event''; end if;
 insert into public.v2_payment_events(event_id,payload_sha256,checkout_id) values(p_event,p_hash,p_id) on conflict do nothing;
 if not exists(select 1 from public.v2_payment_events where event_id=p_event and payload_sha256=p_hash and checkout_id=p_id) then raise exception ''Event replay mismatch''; end if;
end; $$;

-- Table access is deliberately unavailable even to the service role; narrow RPCs own transitions.
alter table public.v2_signup_candidates enable row level security;
alter table public.v2_checkout_intents enable row level security;
alter table public.v2_purchase_upgrades enable row level security;
alter table public.v2_payment_events enable row level security;
revoke all on public.v2_signup_candidates,public.v2_checkout_intents,public.v2_purchase_upgrades,public.v2_payment_events from public,anon,authenticated,service_role;
revoke all on function public.v2_mark_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_invalidate_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_effective_purchase_products(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_checkout_buyer_eligible(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_live_occupied(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_purchase_packages() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_purchase_packages() to authenticated;
revoke all on function public.list_v2_live_availability() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_availability() to anon,authenticated;
revoke all on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) to authenticated;
revoke all on function public.get_my_v2_checkouts() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_checkouts() to authenticated;
revoke all on function public.read_v2_checkout_service(uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_checkout_service(uuid) to service_role;
revoke all on function public.find_v2_checkout_order(text) from public,anon,authenticated,service_role;
grant execute on function public.find_v2_checkout_order(text) to service_role;
revoke all on function public.claim_v2_checkout_order(uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_v2_checkout_order(uuid) to service_role;
revoke all on function public.attach_v2_checkout_order(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.attach_v2_checkout_order(uuid,text) to service_role;
revoke all on function public.record_v2_payment_event(text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_payment_event(text,text,uuid) to service_role;
commit;
']);
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261113110000','add_v2_payment_fulfillment',array['-- Capture confirmation and enrollment commit together; failed transitions retain an exception for review.
begin;
alter table public.v2_live_registrations drop constraint v2_live_registrations_provenance_check;
alter table public.v2_live_registrations add constraint v2_live_registrations_provenance_check check(provenance in (''admin_manual'',''verified_payment''));
create function public.v2_enforce_live_capacity() returns trigger language plpgsql security definer set search_path='''' as $$
declare v_occupied integer;
begin
 if new.active then
  perform 1 from public.v2_course_batches where id=new.batch_id for update;
  select count(distinct student_id) into v_occupied from (
   select student_id from public.v2_live_registrations where batch_id=new.batch_id and active and student_id<>new.student_id
   union all select student_id from public.v2_checkout_intents where new.batch_id=any(live_batches)
   and student_id<>new.student_id and state in (''prepared'',''creating'',''ready'') and hold_until>statement_timestamp()
  ) places;
  if v_occupied>=8 then raise exception ''Live batch is full'' using errcode=''22023''; end if;
 end if;
 return new;
end; $$;
create trigger v2_live_capacity before insert or update on public.v2_live_registrations for each row execute function public.v2_enforce_live_capacity();

create function public.fulfill_v2_checkout(p_id uuid,p_order text,p_payment text,p_amount integer,p_currency text)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare c public.v2_checkout_intents%rowtype; v_base public.v2_purchases%rowtype;
 v_batch uuid; v_entry jsonb; v_pub public.v2_batch_publication_revisions%rowtype; v_revision integer; v_purchase uuid;
begin
 select student_id into c.student_id from public.v2_checkout_intents where id=p_id;
 if not found then raise exception ''Checkout unavailable''; end if;
 perform 1 from public.profiles where id=c.student_id for update;
 select * into strict c from public.v2_checkout_intents where id=p_id for update;
 if p_order is null or p_order is distinct from c.provider_order_id or p_amount is distinct from c.amount_paise or p_currency is distinct from c.currency
 or p_payment is null or p_payment !~ ''^pay_[A-Za-z0-9]+$'' then raise exception ''Verified payment does not match checkout''; end if;
 if c.provider_payment_id is not null and c.provider_payment_id<>p_payment then raise exception ''Checkout already has a different captured payment''; end if;
 if c.state=''fulfilled'' then return jsonb_build_object(''state'',''fulfilled'',''id'',c.id,''replayed'',true); end if;
 if c.state not in (''ready'',''review'') then raise exception ''Checkout is not ready''; end if;
 update public.v2_checkout_intents set provider_payment_id=p_payment,verified_at=coalesce(verified_at,statement_timestamp()) where id=c.id returning * into c;
 begin
  if not public.v2_checkout_buyer_eligible(c.student_id) then raise exception ''Account no longer eligible''; end if;
  if c.base_purchase_id is not null then
   select * into strict v_base from public.v2_purchases where id=c.base_purchase_id for update;
   if v_base.student_id<>c.student_id or not public.v2_access_window_contains(v_base.confirmed_at,v_base.expires_at,v_base.revoked_at,statement_timestamp())
    or public.v2_effective_purchase_products(v_base.id) is distinct from c.previous_products
    or (select count(*) from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()))<>1
   then raise exception ''Upgrade eligibility changed''; end if;
  elsif exists(select 1 from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&c.products) then
   raise exception ''Purchased access is already active'';
  end if;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>''batchId'' loop
   v_batch:=(v_entry->>''batchId'')::uuid;
   perform 1 from public.v2_course_batches where id=v_batch for update;
   select * into v_pub from public.v2_batch_publication_revisions where batch_id=v_batch order by revision desc limit 1;
   if v_pub.document->>''state'' is distinct from ''published'' or v_pub.revision is distinct from (v_entry->>''publicationRevision'')::integer then raise exception ''Publication changed''; end if;
   if v_batch=any(c.live_batches) then
    if not exists(select 1 from jsonb_array_elements(v_pub.document->''events'') e where e->>''kind''=''live'' and (e->>''endsAt'')::timestamptz>statement_timestamp()) then raise exception ''Live batch ended''; end if;
    if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active)
     and public.v2_live_occupied(v_batch,c.id)>=8 then raise exception ''Live batch is full''; end if;
   end if;
  end loop;
  if c.base_purchase_id is null then
   v_purchase:=public.grant_v2_purchase(c.student_id,c.products,''razorpay_test:''||p_payment,c.verified_at,c.price_version_id,c.amount_paise,c.currency);
  else
   v_purchase:=c.base_purchase_id;
   insert into public.v2_purchase_upgrades(checkout_id,purchase_id,products,amount_paise,confirmed_at)
   values(c.id,v_purchase,c.products,c.amount_paise,c.verified_at);
  end if;
  -- Only a newly marked signup may be activated; existing disabled accounts are excluded above.
  update public.profiles set is_active=true,full_name=c.full_name where id=c.student_id and not is_active;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>''batchId'' loop
   v_batch:=(v_entry->>''batchId'')::uuid;
   insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id)
    values(v_batch,c.student_id,true,1,c.student_id)
    on conflict(batch_id,student_id) do update set active=true,revision=public.v2_batch_enrollments.revision+1,actor_id=c.student_id,updated_at=statement_timestamp();
   if v_batch=any(c.live_batches) and not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active) then
    insert into public.v2_live_registrations(batch_id,student_id,active,provenance,revision,actor_id)
     values(v_batch,c.student_id,true,''verified_payment'',1,c.student_id)
     on conflict(batch_id,student_id) do update set active=true,provenance=''verified_payment'',revision=public.v2_live_registrations.revision+1,actor_id=c.student_id,updated_at=statement_timestamp()
     returning revision into v_revision;
    insert into public.v2_live_registration_audit(batch_id,student_id,revision,active,actor_id) values(v_batch,c.student_id,v_revision,true,c.student_id);
   end if;
  end loop;
  update public.v2_checkout_intents set state=''fulfilled'',purchase_id=v_purchase,fulfilled_at=statement_timestamp(),issue=null where id=c.id;
 exception when others then
  -- The subtransaction rolls back all grants, activation and enrollment before recording review state.
  update public.v2_checkout_intents set state=''review'',issue=''fulfillment_conflict'' where id=c.id;
  return jsonb_build_object(''state'',''review'',''id'',c.id,''replayed'',false);
 end;
 return jsonb_build_object(''state'',''fulfilled'',''id'',c.id,''replayed'',false);
end; $$;
create function public.list_v2_checkout_exceptions() returns jsonb language plpgsql stable security definer set search_path='''' as $$
begin
 if not public.is_portal_admin() then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(''id'',id,''state'',state,''amountPaise'',amount_paise,''products'',products,''createdAt'',created_at,''issue'',issue) order by created_at),''[]'')
 from public.v2_checkout_intents where state=''review'' or (state in (''creating'',''ready'') and hold_until<=statement_timestamp()));
end; $$;
revoke all on function public.v2_enforce_live_capacity(),public.fulfill_v2_checkout(uuid,text,text,integer,text),public.list_v2_checkout_exceptions() from public,anon,authenticated,service_role;
grant execute on function public.fulfill_v2_checkout(uuid,text,text,integer,text) to service_role;
grant execute on function public.list_v2_checkout_exceptions() to authenticated;
commit;
']);
notify pgrst,'reload schema';
select jsonb_build_object('check','phase3_activation','migrationVersions',to_jsonb(array['20261113090000','20261113100000','20261113110000']),
 'existingApplicationTables',88,'newPrivateTables',4,'functionsVerified',21,
 'existingRowsPreserved',true,'originalLedgerPreserved',true,'originalSecurityMetadataPreserved',true,
 'paymentsTaken',false,'checkoutEnabled',false,'hostedAcceptance','separate');
commit;
