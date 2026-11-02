-- Operator copy for the verified staging project and recorded application recovery rehearsal.
-- Source body and guards match sql-editor/02-apply-all-ten-if-absent.sql; only acknowledgements are completed.
-- Full Supabase recovery is not claimed; live view/sequence comparisons remain mandatory.
-- Migration snapshot based on PR #24 commit 3226b9b1d768441492aeb8a4b5348d0ea11dbec0; source SHA256 values are pinned in ../activation-manifest.json.
-- New migration bodies may postdate that base; the manifest does not claim an exact final source commit.
-- STAGING ONLY: eyphkkginlgoaxflauog. Production execution is prohibited.
-- ALL-TEN-MISSING PATH ONLY. Existing Phase 2 objects/ledger cause a hard stop.
-- Preflight 00/01 and a fresh successful backup/restore rehearsal precede application.
-- The two acknowledgement values are completed only after those external checks pass.
-- These acknowledgements do not independently establish database identity/recovery.
-- The ten source SQL bodies are unchanged except their transaction boundaries
-- are replaced by ONE atomic transaction containing all ten ledger inserts.
-- The entire file executes as one transaction. Any error requires ROLLBACK.
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $ace_gate$
declare
  verified_project_ref text := 'eyphkkginlgoaxflauog';
  backup_restore_evidence text := 'Application recovery report: deliverables/phase2-completion-2026-11-02/application-recovery-report.json; snapshot SHA256 a521b6c8cf9e8e0a36df7af4c500c157b8b559fb1a7863c68115234e0b3f6ac9; 60 public tables and 3781 rows restored in UTC; current view definitions remain subject to the atomic archive-reference guard; full Supabase recovery is excluded.';
  t text;
begin
  if verified_project_ref <> 'eyphkkginlgoaxflauog' then
    raise exception 'Verify staging dashboard identity before application';
  end if;
  if backup_restore_evidence = 'REPLACE_WITH_BACKUP_RESTORE_EVIDENCE'
    or length(btrim(backup_restore_evidence)) < 10 then
    raise exception 'Record fresh backup and successful disposable restore-rehearsal evidence first';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Migration ledger missing; inspect before proceeding';
  end if;
  perform pg_advisory_xact_lock(20261028,24);
end;
$ace_gate$;
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $ace_preconditions$
declare t text;
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; reconcile without rerunning Phase 1';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000','20261102100000','20261102110000','20261102120000','20261102130000']::text[])) then
    raise exception 'A Phase 2 version is already recorded; inspect definitions and prepare only the reconciled missing set';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_content_asset_placements','v2_content_asset_replacements','v2_content_imports','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates','v2_live_class_completions','v2_live_registration_audit','v2_live_registrations','v2_publication_scope_requests','v2_published_meetings','v2_shared_content_asset_revisions','v2_shared_content_assets']::text[] loop
    if to_regclass('public.'||t) is not null then raise exception 'Existing Phase 2 object: %; stop for drift review',t; end if;
  end loop;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array['apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[])) then
    raise exception 'Existing Phase 2 routine; stop for drift review';
  end if;
  foreach t in array array['v2_price_versions','v2_product_grants','v2_products','v2_purchases','profiles']::text[] loop
    if to_regclass('public.'||t) is null then raise exception 'Missing dependency: %',t; end if;
  end loop;
  if to_regprocedure('public.is_portal_admin()') is null then raise exception 'Missing Admin authorization dependency'; end if;
end;
$ace_preconditions$;
-- Archive-reference definitions are compared with the current database here.
-- Their presence in the manifest alone is not fresh staging verification.
do $ace_recovery_schema_guard$
declare
  expected_views jsonb := '{"worksheet_question_catalog": "afbcbf74ed26ac711e97fa832bccd93b", "worksheet_question_log_catalog": "c55468134700b8fe3d37277edf568515"}'::jsonb;
  actual_views jsonb;
begin
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='m') then
    raise exception 'Unexpected public materialized view; recovery metadata requires review';
  end if;
  select coalesce(jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true))),'{}')
    into actual_views from pg_class where relnamespace='public'::regnamespace and relkind='v';
  if actual_views is distinct from expected_views then
    raise exception 'Current public view definitions differ from the recovered archive reference; application stopped before migration writes';
  end if;
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='S') then
    raise exception 'Unexpected public sequence; recovery metadata requires review';
  end if;
end;
$ace_recovery_schema_guard$;

create temporary table ace_recovery_schema_before on commit drop as select jsonb_build_object(
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
    'definition_md5',md5(pg_get_viewdef(oid,true)),'acl',relacl::text,'options',reloptions)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind in ('v','m')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind='S')
) as fingerprint;
create temporary table ace_existing_before (
  table_name text primary key, row_count bigint not null, row_md5 text not null
) on commit drop;
do $ace_existing_baseline$
declare t record; n bigint; h text;
begin
  for t in select c.relname from pg_class c where c.relnamespace='public'::regnamespace
    and c.relkind='r' order by c.relname loop
    execute format('lock table public.%I in share mode',t.relname);
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from public.%I r',t.relname) into n,h;
    insert into ace_existing_before values(t.relname,n,h);
  end loop;
end;
$ace_existing_baseline$;

create temporary table ace_phase1_before on commit drop as select jsonb_build_object(
  'earlier_ledger', (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'[]'))
    from supabase_migrations.schema_migrations m where version <> all(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000','20261102100000','20261102110000','20261102120000','20261102130000']::text[])),
  'phase1_tables', (select md5(jsonb_agg(jsonb_build_object('name',relname,'rls',relrowsecurity,
    'acl',relacl::text) order by relname)::text) from pg_class
    where relnamespace='public'::regnamespace and relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_columns', (select md5(jsonb_agg(to_jsonb(c) order by table_name,ordinal_position)::text)
    from information_schema.columns c where table_schema='public' and table_name=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_constraints', (select md5(jsonb_agg(jsonb_build_object('name',c.conname,
    'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname)::text)
    from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relnamespace='public'::regnamespace and t.relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_indexes', (select md5(jsonb_agg(to_jsonb(i) order by tablename,indexname)::text)
    from pg_indexes i where schemaname='public' and tablename=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_policies', (select md5(jsonb_agg(to_jsonb(p) order by tablename,policyname)::text)
    from pg_policies p where schemaname='public' and tablename=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_triggers', (select md5(jsonb_agg(jsonb_build_object('name',t.tgname,
    'definition',pg_get_triggerdef(t.oid)) order by t.tgrelid,t.tgname)::text)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal
      and c.relnamespace='public'::regnamespace and c.relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_routines', (select md5(jsonb_agg(jsonb_build_object('name',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'acl',proacl::text) order by oid::regprocedure::text)::text)
    from pg_proc where pronamespace='public'::regnamespace and proname=any(array['can_access_v2_product','get_my_v2_access','grant_v2_purchase','quote_v2_products','reject_v2_price_rewrite','v2_access_window_contains','v2_purchase_shape']::text[])),
  'v2_price_versions', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_price_versions t),'v2_product_grants', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_product_grants t),'v2_products', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_products t),'v2_purchases', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_purchases t)
) as fingerprint;

-- BEGIN APPROVED SOURCE: 20261019090000_add_v2_template_drafts.sql
-- Phase 2 draft authoring only. No curriculum is seeded and no batch is published.
-- Shared-environment application requires separate migration approval.

-- Canonical Phase 2 offerings. The accepted Phase 1 ledger is immutable here;
-- entitlement_product_code is the sole compatibility boundary to its stored IDs.
create table if not exists public.v2_course_offerings (
  code text primary key,
  name text not null,
  sections text[] not null,
  entitlement_product_code text not null unique references public.v2_products(code) on delete restrict,
  constraint v2_course_offering_scope check (
    (code='full_course' and name='Full Course' and sections=array['quant','verbal','di'] and entitlement_product_code='full_batch')
    or (code='quant' and name='Quant' and sections=array['quant'] and entitlement_product_code='quant_crash')
    or (code='verbal' and name='Verbal' and sections=array['verbal'] and entitlement_product_code='verbal_crash')
    or (code='di' and name='DI' and sections=array['di'] and entitlement_product_code='di_crash')
  )
);
alter table public.v2_course_offerings enable row level security;
revoke all on public.v2_course_offerings from public,anon,authenticated,service_role;
grant select on public.v2_course_offerings to authenticated;
drop policy if exists v2_course_offering_admin_read on public.v2_course_offerings;
create policy v2_course_offering_admin_read on public.v2_course_offerings for select to authenticated using (public.is_portal_admin());
insert into public.v2_course_offerings(code,name,sections,entitlement_product_code) values
  ('full_course','Full Course',array['quant','verbal','di'],'full_batch'),
  ('quant','Quant',array['quant'],'quant_crash'),
  ('verbal','Verbal',array['verbal'],'verbal_crash'),
  ('di','DI',array['di'],'di_crash')
on conflict (code) do nothing;
create or replace function public.v2_entitlement_product_code(p_course text)
returns text language sql stable security definer set search_path='' as $$
  select entitlement_product_code from public.v2_course_offerings where code=p_course;
$$;
revoke all on function public.v2_entitlement_product_code(text) from public,anon,authenticated,service_role;


create table if not exists public.v2_course_templates (
  id uuid primary key,
  product_code text not null references public.v2_course_offerings(code) on delete restrict,
  latest_revision integer not null check (latest_revision >= 0),
  unique (id, product_code)
);

create table if not exists public.v2_course_template_revisions (
  template_id uuid not null,
  product_code text not null,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (template_id, revision),
  unique (actor_id, request_id),
  foreign key (template_id, product_code) references public.v2_course_templates(id, product_code) on delete restrict
);

-- The temporary revision zero exists only inside the creation transaction.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.v2_course_templates'::regclass and conname = 'v2_template_current_revision') then
    alter table public.v2_course_templates add constraint v2_template_current_revision
      foreign key (id, latest_revision) references public.v2_course_template_revisions(template_id, revision)
      deferrable initially deferred;
  end if;
end $$;

alter table public.v2_course_templates enable row level security;
alter table public.v2_course_template_revisions enable row level security;
revoke all on public.v2_course_templates, public.v2_course_template_revisions from public, anon, authenticated, service_role;
grant select on public.v2_course_templates, public.v2_course_template_revisions to authenticated;
drop policy if exists v2_template_admin_read on public.v2_course_templates;
create policy v2_template_admin_read on public.v2_course_templates for select to authenticated
  using (public.is_portal_admin());
drop policy if exists v2_template_revision_admin_read on public.v2_course_template_revisions;
create policy v2_template_revision_admin_read on public.v2_course_template_revisions for select to authenticated
  using (public.is_portal_admin());

create or replace function public.v2_session_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_kind text; v_item jsonb; v_ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 4 or not (p_content ?& array['materials','recordings','preSessionReads','postSessionReads']) then return false; end if;
  foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
    if jsonb_typeof(p_content->v_kind) is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_content->v_kind)>50 then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->v_kind) loop
      if jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_object_keys(v_item))<>3 or not (v_item ?& array['key','title','url']) then return false; end if;
      if jsonb_typeof(v_item->'key') is distinct from 'string'
        or (v_item->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (v_item->>'key')=any(v_ids)
        or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') not between 1 and 120
        or v_item->>'title'<>btrim(v_item->>'title',E' \t\n\r\f\013')
        or jsonb_typeof(v_item->'url') is distinct from 'string' or length(v_item->>'url')>2048
        or (v_item->>'url') !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$'
        then return false; end if;
      v_ids:=array_append(v_ids,v_item->>'key');
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_session_content_valid(jsonb) from public,anon,authenticated,service_role;

-- Course structure is independent of the optional live-event schedule.
create or replace function public.v2_course_sessions_valid(p_sessions jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare v_session jsonb; v_ids text[]:=array[]::text[];
begin
  if p_sections is null or jsonb_typeof(p_sessions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sessions)>100 then return false; end if;
  for v_session in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(v_session) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_session))<>4 or not(v_session ?& array['key','title','section','content']) then return false; end if;
    if jsonb_typeof(v_session->'key') is distinct from 'string'
      or v_session->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_session->>'key')=any(v_ids)
      or jsonb_typeof(v_session->'title') is distinct from 'string'
      or length(v_session->>'title') not between 1 and 120
      or v_session->>'title'<>btrim(v_session->>'title',E' \t\n\r\f\013')
      or jsonb_typeof(v_session->'section') is distinct from 'string'
      or not((v_session->>'section')=any(p_sections))
      or not public.v2_session_content_valid(v_session->'content') then return false; end if;
    v_ids:=array_append(v_ids,v_session->>'key');
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_course_sessions_valid(jsonb,text[]) from public,anon,authenticated,service_role;

create or replace function public.v2_template_document_valid(p_document jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_event jsonb;
  v_keys text[] := array[]::text[];
  v_days integer;
  v_end integer;
begin
  if jsonb_typeof(p_document) is distinct from 'object' or p_sections is null then return false; end if;
  if (select count(*) from jsonb_object_keys(p_document)) <> 4
    or not (p_document ?& array['title', 'summary', 'durationDays', 'events']) then return false; end if;
  if jsonb_typeof(p_document->'title') is distinct from 'string'
    or length(p_document->>'title') not between 1 and 120
    or p_document->>'title' <> btrim(p_document->>'title', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'summary') is distinct from 'string'
    or length(p_document->>'summary') > 2000
    or p_document->>'summary' <> btrim(p_document->>'summary', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'durationDays') is distinct from 'number'
    or (p_document->>'durationDays') !~ '^[0-9]{1,3}$'
    or jsonb_typeof(p_document->'events') is distinct from 'array' then return false; end if;
  v_days := (p_document->>'durationDays')::integer;
  if v_days not between 1 and 366 or jsonb_array_length(p_document->'events') > 100 then return false; end if;
  for v_event in select value from jsonb_array_elements(p_document->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (8 + case when v_event ? 'content' then 1 else 0 end)
      or not (v_event ?& array['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor']) then return false; end if;
    if v_event ? 'content' and not public.v2_session_content_valid(v_event->'content') then return false; end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_event->>'key') = any(v_keys)
      or jsonb_typeof(v_event->'title') is distinct from 'string'
      or length(v_event->>'title') not between 1 and 120
      or v_event->>'title' <> btrim(v_event->>'title', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'section') is distinct from 'string'
      or not ((v_event->>'section') = any(p_sections))
      or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then return false; end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if jsonb_typeof(v_event->'dayOffset') is distinct from 'number'
      or (v_event->>'dayOffset') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'durationMinutes') is distinct from 'number'
      or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number'
      or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if (v_event->>'dayOffset')::integer not between 0 and v_days - 1
      or (v_event->>'durationMinutes')::integer not between 15 and 720
      or (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    v_end := (v_event->>'dayOffset')::integer * 1440
      + split_part(v_event->>'localStartTime', ':', 1)::integer * 60
      + split_part(v_event->>'localStartTime', ':', 2)::integer
      + (v_event->>'durationMinutes')::integer;
    if v_end > v_days * 1440 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.save_v2_template_draft(
  p_id uuid, p_product_code text, p_expected_revision integer, p_request_id uuid, p_document jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_head public.v2_course_templates%rowtype;
  v_saved public.v2_course_template_revisions%rowtype;
  v_sections text[];
begin
  -- Serialize deactivation against this write; session claims cannot supply role.
  perform 1 from public.profiles where id = v_actor and role = 'admin' and is_active = true for share;
  if not found then raise exception 'Active Admin access required' using errcode = '42501'; end if;
  if p_id is null or p_request_id is null or p_expected_revision is null
    or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid template request' using errcode = '22023';
  end if;
  select sections into v_sections from public.v2_course_offerings where code = p_product_code;
  if not found or not public.v2_template_document_valid(p_document, v_sections) then
    raise exception 'Invalid template document or product scope' using errcode = '22023';
  end if;

  -- A retry token is scoped to the authenticated actor, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || p_request_id::text, 0));
  select * into v_saved from public.v2_course_template_revisions
    where actor_id = v_actor and request_id = p_request_id;
  if found then
    if v_saved.template_id <> p_id or v_saved.product_code <> p_product_code
      or v_saved.revision <> p_expected_revision + 1 or v_saved.document <> p_document then
      raise exception 'Request token belongs to a different submission' using errcode = '22023';
    end if;
    return jsonb_build_object('template', jsonb_build_object('id', p_id, 'productCode', p_product_code,
      'revision', v_saved.revision, 'document', v_saved.document), 'replayed', true);
  end if;

  if p_expected_revision = 0 then
    insert into public.v2_course_templates(id, product_code, latest_revision) values (p_id, p_product_code, 0)
      on conflict (id) do nothing;
  end if;
  select * into v_head from public.v2_course_templates where id = p_id for update;
  if not found then raise exception 'Template revision changed' using errcode = '40001'; end if;
  if v_head.product_code <> p_product_code then
    raise exception 'Template product cannot change' using errcode = '22023';
  end if;
  if v_head.latest_revision <> p_expected_revision then
    raise exception 'Template revision changed' using errcode = '40001';
  end if;
  insert into public.v2_course_template_revisions(template_id, product_code, revision, document, request_id, actor_id)
    values (p_id, p_product_code, p_expected_revision + 1, p_document, p_request_id, v_actor);
  update public.v2_course_templates set latest_revision = p_expected_revision + 1 where id = p_id;
  return jsonb_build_object('template', jsonb_build_object('id', p_id, 'productCode', p_product_code,
    'revision', p_expected_revision + 1, 'document', p_document), 'replayed', false);
end;
$$;

create or replace function public.list_v2_template_drafts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'productCode', t.product_code,
    'revision', r.revision, 'document', r.document) order by r.created_at desc, t.id), '[]'::jsonb)
    from public.v2_course_templates t join public.v2_course_template_revisions r
      on r.template_id = t.id and r.revision = t.latest_revision);
end;
$$;

revoke all on function public.v2_template_document_valid(jsonb, text[]) from public, anon, authenticated, service_role;
revoke all on function public.save_v2_template_draft(uuid, text, integer, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.list_v2_template_drafts() from public, anon, authenticated, service_role;
grant execute on function public.save_v2_template_draft(uuid, text, integer, uuid, jsonb) to authenticated;
grant execute on function public.list_v2_template_drafts() to authenticated;


-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261019090000','add_v2_template_drafts',array[$ace_source$-- Phase 2 draft authoring only. No curriculum is seeded and no batch is published.
-- Shared-environment application requires separate migration approval.

-- Canonical Phase 2 offerings. The accepted Phase 1 ledger is immutable here;
-- entitlement_product_code is the sole compatibility boundary to its stored IDs.
create table if not exists public.v2_course_offerings (
  code text primary key,
  name text not null,
  sections text[] not null,
  entitlement_product_code text not null unique references public.v2_products(code) on delete restrict,
  constraint v2_course_offering_scope check (
    (code='full_course' and name='Full Course' and sections=array['quant','verbal','di'] and entitlement_product_code='full_batch')
    or (code='quant' and name='Quant' and sections=array['quant'] and entitlement_product_code='quant_crash')
    or (code='verbal' and name='Verbal' and sections=array['verbal'] and entitlement_product_code='verbal_crash')
    or (code='di' and name='DI' and sections=array['di'] and entitlement_product_code='di_crash')
  )
);
alter table public.v2_course_offerings enable row level security;
revoke all on public.v2_course_offerings from public,anon,authenticated,service_role;
grant select on public.v2_course_offerings to authenticated;
drop policy if exists v2_course_offering_admin_read on public.v2_course_offerings;
create policy v2_course_offering_admin_read on public.v2_course_offerings for select to authenticated using (public.is_portal_admin());
insert into public.v2_course_offerings(code,name,sections,entitlement_product_code) values
  ('full_course','Full Course',array['quant','verbal','di'],'full_batch'),
  ('quant','Quant',array['quant'],'quant_crash'),
  ('verbal','Verbal',array['verbal'],'verbal_crash'),
  ('di','DI',array['di'],'di_crash')
on conflict (code) do nothing;
create or replace function public.v2_entitlement_product_code(p_course text)
returns text language sql stable security definer set search_path='' as $$
  select entitlement_product_code from public.v2_course_offerings where code=p_course;
$$;
revoke all on function public.v2_entitlement_product_code(text) from public,anon,authenticated,service_role;


create table if not exists public.v2_course_templates (
  id uuid primary key,
  product_code text not null references public.v2_course_offerings(code) on delete restrict,
  latest_revision integer not null check (latest_revision >= 0),
  unique (id, product_code)
);

create table if not exists public.v2_course_template_revisions (
  template_id uuid not null,
  product_code text not null,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (template_id, revision),
  unique (actor_id, request_id),
  foreign key (template_id, product_code) references public.v2_course_templates(id, product_code) on delete restrict
);

-- The temporary revision zero exists only inside the creation transaction.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.v2_course_templates'::regclass and conname = 'v2_template_current_revision') then
    alter table public.v2_course_templates add constraint v2_template_current_revision
      foreign key (id, latest_revision) references public.v2_course_template_revisions(template_id, revision)
      deferrable initially deferred;
  end if;
end $$;

alter table public.v2_course_templates enable row level security;
alter table public.v2_course_template_revisions enable row level security;
revoke all on public.v2_course_templates, public.v2_course_template_revisions from public, anon, authenticated, service_role;
grant select on public.v2_course_templates, public.v2_course_template_revisions to authenticated;
drop policy if exists v2_template_admin_read on public.v2_course_templates;
create policy v2_template_admin_read on public.v2_course_templates for select to authenticated
  using (public.is_portal_admin());
drop policy if exists v2_template_revision_admin_read on public.v2_course_template_revisions;
create policy v2_template_revision_admin_read on public.v2_course_template_revisions for select to authenticated
  using (public.is_portal_admin());

create or replace function public.v2_session_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_kind text; v_item jsonb; v_ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 4 or not (p_content ?& array['materials','recordings','preSessionReads','postSessionReads']) then return false; end if;
  foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
    if jsonb_typeof(p_content->v_kind) is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_content->v_kind)>50 then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->v_kind) loop
      if jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_object_keys(v_item))<>3 or not (v_item ?& array['key','title','url']) then return false; end if;
      if jsonb_typeof(v_item->'key') is distinct from 'string'
        or (v_item->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (v_item->>'key')=any(v_ids)
        or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') not between 1 and 120
        or v_item->>'title'<>btrim(v_item->>'title',E' \t\n\r\f\013')
        or jsonb_typeof(v_item->'url') is distinct from 'string' or length(v_item->>'url')>2048
        or (v_item->>'url') !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$'
        then return false; end if;
      v_ids:=array_append(v_ids,v_item->>'key');
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_session_content_valid(jsonb) from public,anon,authenticated,service_role;

-- Course structure is independent of the optional live-event schedule.
create or replace function public.v2_course_sessions_valid(p_sessions jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare v_session jsonb; v_ids text[]:=array[]::text[];
begin
  if p_sections is null or jsonb_typeof(p_sessions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sessions)>100 then return false; end if;
  for v_session in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(v_session) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_session))<>4 or not(v_session ?& array['key','title','section','content']) then return false; end if;
    if jsonb_typeof(v_session->'key') is distinct from 'string'
      or v_session->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_session->>'key')=any(v_ids)
      or jsonb_typeof(v_session->'title') is distinct from 'string'
      or length(v_session->>'title') not between 1 and 120
      or v_session->>'title'<>btrim(v_session->>'title',E' \t\n\r\f\013')
      or jsonb_typeof(v_session->'section') is distinct from 'string'
      or not((v_session->>'section')=any(p_sections))
      or not public.v2_session_content_valid(v_session->'content') then return false; end if;
    v_ids:=array_append(v_ids,v_session->>'key');
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_course_sessions_valid(jsonb,text[]) from public,anon,authenticated,service_role;

create or replace function public.v2_template_document_valid(p_document jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_event jsonb;
  v_keys text[] := array[]::text[];
  v_days integer;
  v_end integer;
begin
  if jsonb_typeof(p_document) is distinct from 'object' or p_sections is null then return false; end if;
  if (select count(*) from jsonb_object_keys(p_document)) <> 4
    or not (p_document ?& array['title', 'summary', 'durationDays', 'events']) then return false; end if;
  if jsonb_typeof(p_document->'title') is distinct from 'string'
    or length(p_document->>'title') not between 1 and 120
    or p_document->>'title' <> btrim(p_document->>'title', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'summary') is distinct from 'string'
    or length(p_document->>'summary') > 2000
    or p_document->>'summary' <> btrim(p_document->>'summary', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'durationDays') is distinct from 'number'
    or (p_document->>'durationDays') !~ '^[0-9]{1,3}$'
    or jsonb_typeof(p_document->'events') is distinct from 'array' then return false; end if;
  v_days := (p_document->>'durationDays')::integer;
  if v_days not between 1 and 366 or jsonb_array_length(p_document->'events') > 100 then return false; end if;
  for v_event in select value from jsonb_array_elements(p_document->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (8 + case when v_event ? 'content' then 1 else 0 end)
      or not (v_event ?& array['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor']) then return false; end if;
    if v_event ? 'content' and not public.v2_session_content_valid(v_event->'content') then return false; end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_event->>'key') = any(v_keys)
      or jsonb_typeof(v_event->'title') is distinct from 'string'
      or length(v_event->>'title') not between 1 and 120
      or v_event->>'title' <> btrim(v_event->>'title', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'section') is distinct from 'string'
      or not ((v_event->>'section') = any(p_sections))
      or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then return false; end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if jsonb_typeof(v_event->'dayOffset') is distinct from 'number'
      or (v_event->>'dayOffset') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'durationMinutes') is distinct from 'number'
      or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number'
      or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if (v_event->>'dayOffset')::integer not between 0 and v_days - 1
      or (v_event->>'durationMinutes')::integer not between 15 and 720
      or (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    v_end := (v_event->>'dayOffset')::integer * 1440
      + split_part(v_event->>'localStartTime', ':', 1)::integer * 60
      + split_part(v_event->>'localStartTime', ':', 2)::integer
      + (v_event->>'durationMinutes')::integer;
    if v_end > v_days * 1440 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.save_v2_template_draft(
  p_id uuid, p_product_code text, p_expected_revision integer, p_request_id uuid, p_document jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_head public.v2_course_templates%rowtype;
  v_saved public.v2_course_template_revisions%rowtype;
  v_sections text[];
begin
  -- Serialize deactivation against this write; session claims cannot supply role.
  perform 1 from public.profiles where id = v_actor and role = 'admin' and is_active = true for share;
  if not found then raise exception 'Active Admin access required' using errcode = '42501'; end if;
  if p_id is null or p_request_id is null or p_expected_revision is null
    or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid template request' using errcode = '22023';
  end if;
  select sections into v_sections from public.v2_course_offerings where code = p_product_code;
  if not found or not public.v2_template_document_valid(p_document, v_sections) then
    raise exception 'Invalid template document or product scope' using errcode = '22023';
  end if;

  -- A retry token is scoped to the authenticated actor, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || p_request_id::text, 0));
  select * into v_saved from public.v2_course_template_revisions
    where actor_id = v_actor and request_id = p_request_id;
  if found then
    if v_saved.template_id <> p_id or v_saved.product_code <> p_product_code
      or v_saved.revision <> p_expected_revision + 1 or v_saved.document <> p_document then
      raise exception 'Request token belongs to a different submission' using errcode = '22023';
    end if;
    return jsonb_build_object('template', jsonb_build_object('id', p_id, 'productCode', p_product_code,
      'revision', v_saved.revision, 'document', v_saved.document), 'replayed', true);
  end if;

  if p_expected_revision = 0 then
    insert into public.v2_course_templates(id, product_code, latest_revision) values (p_id, p_product_code, 0)
      on conflict (id) do nothing;
  end if;
  select * into v_head from public.v2_course_templates where id = p_id for update;
  if not found then raise exception 'Template revision changed' using errcode = '40001'; end if;
  if v_head.product_code <> p_product_code then
    raise exception 'Template product cannot change' using errcode = '22023';
  end if;
  if v_head.latest_revision <> p_expected_revision then
    raise exception 'Template revision changed' using errcode = '40001';
  end if;
  insert into public.v2_course_template_revisions(template_id, product_code, revision, document, request_id, actor_id)
    values (p_id, p_product_code, p_expected_revision + 1, p_document, p_request_id, v_actor);
  update public.v2_course_templates set latest_revision = p_expected_revision + 1 where id = p_id;
  return jsonb_build_object('template', jsonb_build_object('id', p_id, 'productCode', p_product_code,
    'revision', p_expected_revision + 1, 'document', p_document), 'replayed', false);
end;
$$;

create or replace function public.list_v2_template_drafts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'productCode', t.product_code,
    'revision', r.revision, 'document', r.document) order by r.created_at desc, t.id), '[]'::jsonb)
    from public.v2_course_templates t join public.v2_course_template_revisions r
      on r.template_id = t.id and r.revision = t.latest_revision);
end;
$$;

revoke all on function public.v2_template_document_valid(jsonb, text[]) from public, anon, authenticated, service_role;
revoke all on function public.save_v2_template_draft(uuid, text, integer, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.list_v2_template_drafts() from public, anon, authenticated, service_role;
grant execute on function public.save_v2_template_draft(uuid, text, integer, uuid, jsonb) to authenticated;
grant execute on function public.list_v2_template_drafts() to authenticated;

$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261019100000_add_v2_batch_drafts.sql
-- Independent draft schedules only. Shared migration application needs approval.

create table if not exists public.v2_course_batches (
  id uuid primary key,
  template_id uuid not null,
  template_revision integer not null,
  product_code text not null,
  latest_revision integer not null check (latest_revision >= 0),
  state text not null default 'draft' check (state = 'draft'),
  foreign key (template_id, template_revision) references public.v2_course_template_revisions(template_id, revision) on delete restrict,
  foreign key (template_id, product_code) references public.v2_course_templates(id, product_code) on delete restrict
);
create table if not exists public.v2_course_batch_revisions (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  unique (actor_id, request_id)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.v2_course_batches'::regclass and conname='v2_batch_current_revision') then
    alter table public.v2_course_batches add constraint v2_batch_current_revision
      foreign key (id, latest_revision) references public.v2_course_batch_revisions(batch_id, revision)
      deferrable initially deferred;
  end if;
end $$;

alter table public.v2_course_batches enable row level security;
alter table public.v2_course_batch_revisions enable row level security;
revoke all on public.v2_course_batches, public.v2_course_batch_revisions from public, anon, authenticated, service_role;
grant select on public.v2_course_batches, public.v2_course_batch_revisions to authenticated;
drop policy if exists v2_batch_admin_read on public.v2_course_batches;
create policy v2_batch_admin_read on public.v2_course_batches for select to authenticated using (public.is_portal_admin());
drop policy if exists v2_batch_revision_admin_read on public.v2_course_batch_revisions;
create policy v2_batch_revision_admin_read on public.v2_course_batch_revisions for select to authenticated using (public.is_portal_admin());

create or replace function public.v2_batch_date(p_value text)
returns date language plpgsql immutable set search_path = '' as $$
declare v_date date;
begin
  if p_value is null or p_value !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid schedule date' using errcode='22023';
  end if;
  begin
    v_date := p_value::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'Invalid schedule date' using errcode='22023';
  end;
  if to_char(v_date, 'YYYY-MM-DD') <> p_value then raise exception 'Invalid schedule date' using errcode='22023'; end if;
  return v_date;
end;
$$;

create or replace function public.assert_v2_batch_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_event jsonb; v_keys text[] := array[]::text[]; v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid batch request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 9
    or not (p_request ?& array['id','templateId','templateRevision','expectedRevision','requestId','title','startDate','timeZone','events']) then
    raise exception 'Invalid batch fields' using errcode='22023';
  end if;
  foreach v_field in array array['id','templateId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or (p_request->>v_field) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid batch identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['templateRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or (p_request->>v_field) !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid batch revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or (p_request->>'templateRevision')::numeric not between 1 and 2147483647 then
    raise exception 'Invalid batch revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'title') is distinct from 'string' or length(p_request->>'title') not between 1 and 120
    or p_request->>'title' <> btrim(p_request->>'title', E' \t\n\r\f\013')
    or p_request->>'timeZone' is distinct from 'Asia/Kolkata'
    or jsonb_typeof(p_request->'startDate') is distinct from 'string' then
    raise exception 'Invalid batch title or time zone' using errcode='22023';
  end if;
  perform public.v2_batch_date(p_request->>'startDate');
  if (p_request->>'expectedRevision')::integer = 0 then
    if p_request->'events' <> 'null'::jsonb then raise exception 'New batch events must come from the template' using errcode='22023'; end if;
    return;
  end if;
  if jsonb_typeof(p_request->'events') is distinct from 'array' then raise exception 'Invalid batch events' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'events') not between 1 and 100 then raise exception 'Invalid batch events' using errcode='22023'; end if;
  for v_event in select value from jsonb_array_elements(p_request->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then raise exception 'Invalid batch event' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> 6
      or not (v_event ?& array['key','localDate','localStartTime','durationMinutes','instructor','capacity']) then
      raise exception 'Invalid batch event fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_event->>'key' = any(v_keys)
      or jsonb_typeof(v_event->'localDate') is distinct from 'string'
      or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013') then
      raise exception 'Invalid batch event values' using errcode='22023';
    end if;
    v_keys := array_append(v_keys, v_event->>'key');
    perform public.v2_batch_date(v_event->>'localDate');
    if jsonb_typeof(v_event->'durationMinutes') is distinct from 'number' or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
    if (v_event->>'durationMinutes')::integer not between 15 and 720 or (v_event->>'capacity')::integer not between 1 and 1000 then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
  end loop;
end;
$$;

-- Private pure projection: no inserts, updates, locks or generated identities.
create or replace function public.build_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer;
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>'id')::uuid) then
      raise exception 'Batch revision changed' using errcode='40001';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>'templateId')::uuid and t.latest_revision=(p_request->>'templateRevision')::integer;
    if not found then raise exception 'Template revision changed' using errcode='40001'; end if;
    if jsonb_array_length(v_source->'events') = 0 then
      raise exception 'A live schedule requires a template with planned events' using errcode='22023';
    end if;
  else
    select * into v_head from public.v2_course_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='40001'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>'startDate' <> p_request->>'startDate' then
      raise exception 'Template anchor date cannot change; edit event dates instead' using errcode='22023';
    end if;
    if jsonb_array_length(v_source->'events') <> jsonb_array_length(p_request->'events') then
      raise exception 'Draft event identities must be preserved' using errcode='22023';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_source->'events') loop
    if v_revision = 0 then
      v_date := public.v2_batch_date(p_request->>'startDate') + (v_event->>'dayOffset')::integer;
      v_edit := jsonb_build_object('key',v_event->>'key','localDate',to_char(v_date,'YYYY-MM-DD'),
        'localStartTime',v_event->>'localStartTime','durationMinutes',v_event->'durationMinutes',
        'instructor',v_event->>'instructor','capacity',v_event->'capacity');
    else
      select value into v_edit from jsonb_array_elements(p_request->'events') where value->>'key'=v_event->>'key';
      if not found then raise exception 'Draft event identities must be preserved' using errcode='22023'; end if;
    end if;
    if v_event ? 'content' then v_edit := v_edit || jsonb_build_object('content',v_event->'content'); end if;
    v_date := public.v2_batch_date(v_edit->>'localDate');
    v_start := (v_date + (v_edit->>'localStartTime')::time) at time zone 'Asia/Kolkata';
    v_end := v_start + make_interval(mins => (v_edit->>'durationMinutes')::integer);
    v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section',
      'startsAt',to_char(v_start at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endsAt',to_char(v_end at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end loop;
  return jsonb_build_object('id',p_request->>'id','productCode',v_product,'templateId',p_request->>'templateId',
    'templateRevision',p_request->'templateRevision','revision',v_revision+1,'state','draft',
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events);
end;
$$;

create or replace function public.preview_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_draft jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_draft := public.build_v2_batch_draft(p_request);
  return jsonb_build_object('draft',v_draft,'fingerprint',md5(v_draft::text));
end;
$$;

create or replace function public.save_v2_batch_draft(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_draft jsonb; v_saved public.v2_course_batch_revisions%rowtype;
  v_id uuid; v_token uuid; v_expected integer;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_batch_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then raise exception 'Review the schedule before saving' using errcode='22023'; end if;
  v_id := (p_request->>'id')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-batch-request:' || v_actor::text || ':' || v_token::text, 0));
  select * into v_saved from public.v2_course_batch_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('draft',v_saved.document,'replayed',true);
  end if;
  -- Lock order is request, batch, then source template for initial creation.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text, 0));
  if v_expected = 0 then
    perform 1 from public.v2_course_templates where id=(p_request->>'templateId')::uuid for share;
  else
    perform 1 from public.v2_course_batches where id=v_id for update;
  end if;
  v_draft := public.build_v2_batch_draft(p_request);
  -- This checksum binds confirmation to the reviewed projection. It is not an
  -- authorization token; active Admin identity and all data are revalidated.
  if md5(v_draft::text) <> p_fingerprint then raise exception 'The reviewed schedule changed' using errcode='40001'; end if;
  if v_expected = 0 then
    insert into public.v2_course_batches(id,template_id,template_revision,product_code,latest_revision)
      values (v_id,(p_request->>'templateId')::uuid,(p_request->>'templateRevision')::integer,v_draft->>'productCode',0);
  end if;
  insert into public.v2_course_batch_revisions(batch_id,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,v_expected+1,v_draft,p_request,p_fingerprint,v_token,v_actor);
  update public.v2_course_batches set latest_revision=v_expected+1 where id=v_id;
  return jsonb_build_object('draft',v_draft,'replayed',false);
end;
$$;

create or replace function public.list_v2_batch_drafts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(r.document order by r.created_at desc,b.id),'[]'::jsonb)
    from public.v2_course_batches b join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.state='draft');
end;
$$;

revoke all on function public.v2_batch_date(text), public.assert_v2_batch_request(jsonb), public.build_v2_batch_draft(jsonb),
  public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts() to authenticated;


-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261019100000','add_v2_batch_drafts',array[$ace_source$-- Independent draft schedules only. Shared migration application needs approval.

create table if not exists public.v2_course_batches (
  id uuid primary key,
  template_id uuid not null,
  template_revision integer not null,
  product_code text not null,
  latest_revision integer not null check (latest_revision >= 0),
  state text not null default 'draft' check (state = 'draft'),
  foreign key (template_id, template_revision) references public.v2_course_template_revisions(template_id, revision) on delete restrict,
  foreign key (template_id, product_code) references public.v2_course_templates(id, product_code) on delete restrict
);
create table if not exists public.v2_course_batch_revisions (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  unique (actor_id, request_id)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.v2_course_batches'::regclass and conname='v2_batch_current_revision') then
    alter table public.v2_course_batches add constraint v2_batch_current_revision
      foreign key (id, latest_revision) references public.v2_course_batch_revisions(batch_id, revision)
      deferrable initially deferred;
  end if;
end $$;

alter table public.v2_course_batches enable row level security;
alter table public.v2_course_batch_revisions enable row level security;
revoke all on public.v2_course_batches, public.v2_course_batch_revisions from public, anon, authenticated, service_role;
grant select on public.v2_course_batches, public.v2_course_batch_revisions to authenticated;
drop policy if exists v2_batch_admin_read on public.v2_course_batches;
create policy v2_batch_admin_read on public.v2_course_batches for select to authenticated using (public.is_portal_admin());
drop policy if exists v2_batch_revision_admin_read on public.v2_course_batch_revisions;
create policy v2_batch_revision_admin_read on public.v2_course_batch_revisions for select to authenticated using (public.is_portal_admin());

create or replace function public.v2_batch_date(p_value text)
returns date language plpgsql immutable set search_path = '' as $$
declare v_date date;
begin
  if p_value is null or p_value !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid schedule date' using errcode='22023';
  end if;
  begin
    v_date := p_value::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'Invalid schedule date' using errcode='22023';
  end;
  if to_char(v_date, 'YYYY-MM-DD') <> p_value then raise exception 'Invalid schedule date' using errcode='22023'; end if;
  return v_date;
end;
$$;

create or replace function public.assert_v2_batch_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_event jsonb; v_keys text[] := array[]::text[]; v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid batch request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 9
    or not (p_request ?& array['id','templateId','templateRevision','expectedRevision','requestId','title','startDate','timeZone','events']) then
    raise exception 'Invalid batch fields' using errcode='22023';
  end if;
  foreach v_field in array array['id','templateId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or (p_request->>v_field) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid batch identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['templateRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or (p_request->>v_field) !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid batch revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or (p_request->>'templateRevision')::numeric not between 1 and 2147483647 then
    raise exception 'Invalid batch revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'title') is distinct from 'string' or length(p_request->>'title') not between 1 and 120
    or p_request->>'title' <> btrim(p_request->>'title', E' \t\n\r\f\013')
    or p_request->>'timeZone' is distinct from 'Asia/Kolkata'
    or jsonb_typeof(p_request->'startDate') is distinct from 'string' then
    raise exception 'Invalid batch title or time zone' using errcode='22023';
  end if;
  perform public.v2_batch_date(p_request->>'startDate');
  if (p_request->>'expectedRevision')::integer = 0 then
    if p_request->'events' <> 'null'::jsonb then raise exception 'New batch events must come from the template' using errcode='22023'; end if;
    return;
  end if;
  if jsonb_typeof(p_request->'events') is distinct from 'array' then raise exception 'Invalid batch events' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'events') not between 1 and 100 then raise exception 'Invalid batch events' using errcode='22023'; end if;
  for v_event in select value from jsonb_array_elements(p_request->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then raise exception 'Invalid batch event' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> 6
      or not (v_event ?& array['key','localDate','localStartTime','durationMinutes','instructor','capacity']) then
      raise exception 'Invalid batch event fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_event->>'key' = any(v_keys)
      or jsonb_typeof(v_event->'localDate') is distinct from 'string'
      or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013') then
      raise exception 'Invalid batch event values' using errcode='22023';
    end if;
    v_keys := array_append(v_keys, v_event->>'key');
    perform public.v2_batch_date(v_event->>'localDate');
    if jsonb_typeof(v_event->'durationMinutes') is distinct from 'number' or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
    if (v_event->>'durationMinutes')::integer not between 15 and 720 or (v_event->>'capacity')::integer not between 1 and 1000 then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
  end loop;
end;
$$;

-- Private pure projection: no inserts, updates, locks or generated identities.
create or replace function public.build_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer;
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>'id')::uuid) then
      raise exception 'Batch revision changed' using errcode='40001';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>'templateId')::uuid and t.latest_revision=(p_request->>'templateRevision')::integer;
    if not found then raise exception 'Template revision changed' using errcode='40001'; end if;
    if jsonb_array_length(v_source->'events') = 0 then
      raise exception 'A live schedule requires a template with planned events' using errcode='22023';
    end if;
  else
    select * into v_head from public.v2_course_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='40001'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>'startDate' <> p_request->>'startDate' then
      raise exception 'Template anchor date cannot change; edit event dates instead' using errcode='22023';
    end if;
    if jsonb_array_length(v_source->'events') <> jsonb_array_length(p_request->'events') then
      raise exception 'Draft event identities must be preserved' using errcode='22023';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_source->'events') loop
    if v_revision = 0 then
      v_date := public.v2_batch_date(p_request->>'startDate') + (v_event->>'dayOffset')::integer;
      v_edit := jsonb_build_object('key',v_event->>'key','localDate',to_char(v_date,'YYYY-MM-DD'),
        'localStartTime',v_event->>'localStartTime','durationMinutes',v_event->'durationMinutes',
        'instructor',v_event->>'instructor','capacity',v_event->'capacity');
    else
      select value into v_edit from jsonb_array_elements(p_request->'events') where value->>'key'=v_event->>'key';
      if not found then raise exception 'Draft event identities must be preserved' using errcode='22023'; end if;
    end if;
    if v_event ? 'content' then v_edit := v_edit || jsonb_build_object('content',v_event->'content'); end if;
    v_date := public.v2_batch_date(v_edit->>'localDate');
    v_start := (v_date + (v_edit->>'localStartTime')::time) at time zone 'Asia/Kolkata';
    v_end := v_start + make_interval(mins => (v_edit->>'durationMinutes')::integer);
    v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section',
      'startsAt',to_char(v_start at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endsAt',to_char(v_end at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end loop;
  return jsonb_build_object('id',p_request->>'id','productCode',v_product,'templateId',p_request->>'templateId',
    'templateRevision',p_request->'templateRevision','revision',v_revision+1,'state','draft',
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events);
end;
$$;

create or replace function public.preview_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_draft jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_draft := public.build_v2_batch_draft(p_request);
  return jsonb_build_object('draft',v_draft,'fingerprint',md5(v_draft::text));
end;
$$;

create or replace function public.save_v2_batch_draft(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_draft jsonb; v_saved public.v2_course_batch_revisions%rowtype;
  v_id uuid; v_token uuid; v_expected integer;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_batch_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then raise exception 'Review the schedule before saving' using errcode='22023'; end if;
  v_id := (p_request->>'id')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-batch-request:' || v_actor::text || ':' || v_token::text, 0));
  select * into v_saved from public.v2_course_batch_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('draft',v_saved.document,'replayed',true);
  end if;
  -- Lock order is request, batch, then source template for initial creation.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text, 0));
  if v_expected = 0 then
    perform 1 from public.v2_course_templates where id=(p_request->>'templateId')::uuid for share;
  else
    perform 1 from public.v2_course_batches where id=v_id for update;
  end if;
  v_draft := public.build_v2_batch_draft(p_request);
  -- This checksum binds confirmation to the reviewed projection. It is not an
  -- authorization token; active Admin identity and all data are revalidated.
  if md5(v_draft::text) <> p_fingerprint then raise exception 'The reviewed schedule changed' using errcode='40001'; end if;
  if v_expected = 0 then
    insert into public.v2_course_batches(id,template_id,template_revision,product_code,latest_revision)
      values (v_id,(p_request->>'templateId')::uuid,(p_request->>'templateRevision')::integer,v_draft->>'productCode',0);
  end if;
  insert into public.v2_course_batch_revisions(batch_id,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,v_expected+1,v_draft,p_request,p_fingerprint,v_token,v_actor);
  update public.v2_course_batches set latest_revision=v_expected+1 where id=v_id;
  return jsonb_build_object('draft',v_draft,'replayed',false);
end;
$$;

create or replace function public.list_v2_batch_drafts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(r.document order by r.created_at desc,b.id),'[]'::jsonb)
    from public.v2_course_batches b join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.state='draft');
end;
$$;

revoke all on function public.v2_batch_date(text), public.assert_v2_batch_request(jsonb), public.build_v2_batch_draft(jsonb),
  public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts() to authenticated;

$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261019110000_add_v2_private_meeting_drafts.sql
-- Private Admin meeting drafts only. No student join or publication path.

create table if not exists public.v2_batch_meeting_revisions (
  batch_id uuid not null,
  batch_revision integer not null,
  revision integer not null check (revision > 0),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  foreign key (batch_id, batch_revision) references public.v2_course_batch_revisions(batch_id, revision) on delete restrict,
  unique (actor_id, request_id)
);
alter table public.v2_batch_meeting_revisions enable row level security;
revoke all on public.v2_batch_meeting_revisions from public, anon, authenticated, service_role;
grant select on public.v2_batch_meeting_revisions to authenticated;
drop policy if exists v2_meeting_admin_read on public.v2_batch_meeting_revisions;
create policy v2_meeting_admin_read on public.v2_batch_meeting_revisions for select to authenticated using (public.is_portal_admin());

create or replace function public.assert_v2_meeting_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text; v_link jsonb; v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid meeting request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','links']) then
    raise exception 'Invalid meeting fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid meeting identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid meeting revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646 then
    raise exception 'Invalid meeting revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'links') is distinct from 'array' then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'links') not between 1 and 100 then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  for v_link in select value from jsonb_array_elements(p_request->'links') loop
    if jsonb_typeof(v_link) is distinct from 'object' then raise exception 'Invalid meeting link' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_link)) <> 2 or not (v_link ?& array['key','url']) then
      raise exception 'Invalid meeting link fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_link->'key') is distinct from 'string'
      or length(v_link->>'key') <> 36
      or v_link->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_link->>'key' = any(v_keys) then raise exception 'Invalid meeting event' using errcode='22023'; end if;
    v_keys := array_append(v_keys,v_link->>'key');
    if v_link->'url' <> 'null'::jsonb then
      if jsonb_typeof(v_link->'url') is distinct from 'string'
        or length(v_link->>'url') <> 36
        or v_link->>'url' !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
        raise exception 'Invalid meeting URL' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.read_v2_meeting_draft(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch jsonb; v_links jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select r.document into v_batch from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.id=p_batch_id and b.state='draft';
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_batch_meeting_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if found then
    v_links := v_saved.request->'links';
    if jsonb_array_length(v_links) <> jsonb_array_length(v_batch->'events') or exists (
      select 1 from jsonb_array_elements(v_links) l where not exists (
        select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key'
      )
    ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  else
    select jsonb_agg(jsonb_build_object('key',e->>'key','url',null) order by ordinal)
      into v_links from jsonb_array_elements(v_batch->'events') with ordinality as items(e,ordinal);
  end if;
  return jsonb_build_object('batch',v_batch,'revision',coalesce(v_saved.revision,0),'links',v_links);
end;
$$;

create or replace function public.save_v2_meeting_draft(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_expected integer; v_current integer;
  v_head public.v2_course_batches%rowtype; v_batch jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_meeting_request(p_request);
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-meeting-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_meeting_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request then raise exception 'Request token belongs to a different submission' using errcode='22023'; end if;
    return jsonb_build_object('batchId',v_id,'batchRevision',v_saved.batch_revision,'revision',v_saved.revision,'replayed',true);
  end if;
  -- Sharing the batch row lock serializes meeting saves with schedule edits.
  select * into v_head from public.v2_course_batches where id=v_id for update;
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  if v_head.state <> 'draft' then raise exception 'Only draft meeting details can be changed here' using errcode='22023'; end if;
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='40001'; end if;
  select document into v_batch from public.v2_course_batch_revisions where batch_id=v_id and revision=v_head.latest_revision;
  if jsonb_array_length(p_request->'links') <> jsonb_array_length(v_batch->'events') or exists (
    select 1 from jsonb_array_elements(p_request->'links') l where not exists (
      select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key'
    )
  ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  insert into public.v2_batch_meeting_revisions(batch_id,batch_revision,revision,request,request_id,actor_id)
    values (v_id,v_head.latest_revision,v_expected+1,p_request,v_token,v_actor);
  return jsonb_build_object('batchId',v_id,'batchRevision',v_head.latest_revision,'revision',v_expected+1,'replayed',false);
end;
$$;

revoke all on function public.assert_v2_meeting_request(jsonb), public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261019110000','add_v2_private_meeting_drafts',array[$ace_source$-- Private Admin meeting drafts only. No student join or publication path.

create table if not exists public.v2_batch_meeting_revisions (
  batch_id uuid not null,
  batch_revision integer not null,
  revision integer not null check (revision > 0),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  foreign key (batch_id, batch_revision) references public.v2_course_batch_revisions(batch_id, revision) on delete restrict,
  unique (actor_id, request_id)
);
alter table public.v2_batch_meeting_revisions enable row level security;
revoke all on public.v2_batch_meeting_revisions from public, anon, authenticated, service_role;
grant select on public.v2_batch_meeting_revisions to authenticated;
drop policy if exists v2_meeting_admin_read on public.v2_batch_meeting_revisions;
create policy v2_meeting_admin_read on public.v2_batch_meeting_revisions for select to authenticated using (public.is_portal_admin());

create or replace function public.assert_v2_meeting_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text; v_link jsonb; v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid meeting request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','links']) then
    raise exception 'Invalid meeting fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid meeting identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid meeting revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646 then
    raise exception 'Invalid meeting revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'links') is distinct from 'array' then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'links') not between 1 and 100 then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  for v_link in select value from jsonb_array_elements(p_request->'links') loop
    if jsonb_typeof(v_link) is distinct from 'object' then raise exception 'Invalid meeting link' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_link)) <> 2 or not (v_link ?& array['key','url']) then
      raise exception 'Invalid meeting link fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_link->'key') is distinct from 'string'
      or length(v_link->>'key') <> 36
      or v_link->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_link->>'key' = any(v_keys) then raise exception 'Invalid meeting event' using errcode='22023'; end if;
    v_keys := array_append(v_keys,v_link->>'key');
    if v_link->'url' <> 'null'::jsonb then
      if jsonb_typeof(v_link->'url') is distinct from 'string'
        or length(v_link->>'url') <> 36
        or v_link->>'url' !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
        raise exception 'Invalid meeting URL' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.read_v2_meeting_draft(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch jsonb; v_links jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select r.document into v_batch from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.id=p_batch_id and b.state='draft';
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_batch_meeting_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if found then
    v_links := v_saved.request->'links';
    if jsonb_array_length(v_links) <> jsonb_array_length(v_batch->'events') or exists (
      select 1 from jsonb_array_elements(v_links) l where not exists (
        select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key'
      )
    ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  else
    select jsonb_agg(jsonb_build_object('key',e->>'key','url',null) order by ordinal)
      into v_links from jsonb_array_elements(v_batch->'events') with ordinality as items(e,ordinal);
  end if;
  return jsonb_build_object('batch',v_batch,'revision',coalesce(v_saved.revision,0),'links',v_links);
end;
$$;

create or replace function public.save_v2_meeting_draft(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_expected integer; v_current integer;
  v_head public.v2_course_batches%rowtype; v_batch jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_meeting_request(p_request);
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-meeting-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_meeting_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request then raise exception 'Request token belongs to a different submission' using errcode='22023'; end if;
    return jsonb_build_object('batchId',v_id,'batchRevision',v_saved.batch_revision,'revision',v_saved.revision,'replayed',true);
  end if;
  -- Sharing the batch row lock serializes meeting saves with schedule edits.
  select * into v_head from public.v2_course_batches where id=v_id for update;
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  if v_head.state <> 'draft' then raise exception 'Only draft meeting details can be changed here' using errcode='22023'; end if;
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='40001'; end if;
  select document into v_batch from public.v2_course_batch_revisions where batch_id=v_id and revision=v_head.latest_revision;
  if jsonb_array_length(p_request->'links') <> jsonb_array_length(v_batch->'events') or exists (
    select 1 from jsonb_array_elements(p_request->'links') l where not exists (
      select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key'
    )
  ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  insert into public.v2_batch_meeting_revisions(batch_id,batch_revision,revision,request,request_id,actor_id)
    values (v_id,v_head.latest_revision,v_expected+1,p_request,v_token,v_actor);
  return jsonb_build_object('batchId',v_id,'batchRevision',v_head.latest_revision,'revision',v_expected+1,'replayed',false);
end;
$$;

revoke all on function public.assert_v2_meeting_request(jsonb), public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) to authenticated;
$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261020090000_add_v2_outline_schedules.sql
-- Approved A1: preserve historical drafts and permit undated non-live outline items.
-- No existing rows are rewritten. Shared application requires separate approval.

create or replace function public.v2_template_document_valid(p_document jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_event jsonb;
  v_keys text[] := array[]::text[];
  v_days integer;
  v_end integer;
begin
  if jsonb_typeof(p_document) is distinct from 'object' or p_sections is null then return false; end if;
  if (select count(*) from jsonb_object_keys(p_document)) <> (4 + case when p_document ? 'sessions' then 1 else 0 end)
    or not (p_document ?& array['title', 'summary', 'durationDays', 'events']) then return false; end if;
  if jsonb_typeof(p_document->'title') is distinct from 'string'
    or length(p_document->>'title') not between 1 and 120
    or p_document->>'title' <> btrim(p_document->>'title', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'summary') is distinct from 'string'
    or length(p_document->>'summary') > 2000
    or p_document->>'summary' <> btrim(p_document->>'summary', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'durationDays') not in ('number','null')
    or (p_document->>'durationDays') !~ '^[0-9]{1,3}$'
    or jsonb_typeof(p_document->'events') is distinct from 'array' then return false; end if;
  if p_document ? 'sessions' then
    if not public.v2_course_sessions_valid(p_document->'sessions',p_sections) then return false; end if;
    select coalesce(array_agg(value->>'key'),array[]::text[]) into v_keys from jsonb_array_elements(p_document->'sessions');
  end if;
  v_days := (p_document->>'durationDays')::integer;
  if v_days not between 1 and 366 or jsonb_array_length(p_document->'events') > 100 then return false; end if;
  for v_event in select value from jsonb_array_elements(p_document->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (8 + case when v_event ? 'kind' then 1 else 0 end + case when v_event ? 'content' then 1 else 0 end)
      or not (v_event ?& array['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor']) then return false; end if;
    if p_document ? 'sessions' and v_event->>'kind'='outline' then return false; end if;
    if v_event ? 'content' and not public.v2_session_content_valid(v_event->'content') then return false; end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_event->>'key') = any(v_keys)
      or jsonb_typeof(v_event->'title') is distinct from 'string'
      or length(v_event->>'title') not between (case when v_event->>'kind'='outline' then 0 else 1 end) and 120
      or v_event->>'title' <> btrim(v_event->>'title', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'section') is distinct from 'string'
      or not ((v_event->>'section') = any(p_sections))

      then return false; end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if v_event ? 'kind' and (jsonb_typeof(v_event->'kind') is distinct from 'string' or v_event->>'kind' not in ('live','outline')) then return false; end if;
    if jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    if v_event->>'kind'='outline' then
      if v_event->'dayOffset' <> 'null'::jsonb or v_event->'localStartTime' <> 'null'::jsonb or v_event->'durationMinutes' <> 'null'::jsonb then return false; end if;
      continue;
    end if;
    if jsonb_typeof(v_event->'localStartTime') is distinct from 'string' or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false; end if;
    if jsonb_typeof(v_event->'dayOffset') is distinct from 'number'
      or (v_event->>'dayOffset') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'durationMinutes') is distinct from 'number'
      or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number'
      or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if v_days is null then return false; end if;
    if (v_event->>'dayOffset')::integer not between 0 and v_days - 1
      or (v_event->>'durationMinutes')::integer not between 15 and 720
      or (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    v_end := (v_event->>'dayOffset')::integer * 1440
      + split_part(v_event->>'localStartTime', ':', 1)::integer * 60
      + split_part(v_event->>'localStartTime', ':', 2)::integer
      + (v_event->>'durationMinutes')::integer;
    if v_end > v_days * 1440 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.assert_v2_batch_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_event jsonb; v_keys text[] := array[]::text[]; v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid batch request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> (9 + case when p_request ? 'sessions' then 1 else 0 end)
    or not (p_request ?& array['id','templateId','templateRevision','expectedRevision','requestId','title','startDate','timeZone','events']) then
    raise exception 'Invalid batch fields' using errcode='22023';
  end if;
  foreach v_field in array array['id','templateId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or (p_request->>v_field) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid batch identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['templateRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or (p_request->>v_field) !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid batch revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or (p_request->>'templateRevision')::numeric not between 1 and 2147483647 then
    raise exception 'Invalid batch revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'title') is distinct from 'string' or length(p_request->>'title') not between 1 and 120
    or p_request->>'title' <> btrim(p_request->>'title', E' \t\n\r\f\013')
    or p_request->>'timeZone' is distinct from 'Asia/Kolkata'
    or jsonb_typeof(p_request->'startDate') is distinct from 'string' then
    raise exception 'Invalid batch title or time zone' using errcode='22023';
  end if;
  if p_request->>'startDate' <> '' then perform public.v2_batch_date(p_request->>'startDate'); end if;
  if (p_request->>'expectedRevision')::integer = 0 then
    if p_request ? 'sessions' then raise exception 'New batch content must come from the template' using errcode='22023'; end if;
    if p_request->'events' <> 'null'::jsonb then raise exception 'New batch events must come from the template' using errcode='22023'; end if;
    return;
  end if;
  if jsonb_typeof(p_request->'events') is distinct from 'array' then raise exception 'Invalid batch events' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'events') not between 0 and 100 then raise exception 'Invalid batch events' using errcode='22023'; end if;
  for v_event in select value from jsonb_array_elements(p_request->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then raise exception 'Invalid batch event' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (6 + case when v_event ? 'kind' then 1 else 0 end)
      or not (v_event ?& array['key','localDate','localStartTime','durationMinutes','instructor','capacity']) then
      raise exception 'Invalid batch event fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_event->>'key' = any(v_keys)

      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013') then
      raise exception 'Invalid batch event values' using errcode='22023';
    end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if v_event ? 'kind' and (jsonb_typeof(v_event->'kind') is distinct from 'string' or v_event->>'kind' not in ('live','outline')) then raise exception 'Invalid event kind' using errcode='22023'; end if;
    if jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then raise exception 'Invalid historical capacity' using errcode='22023'; end if;
    if (v_event->>'capacity')::integer not between 1 and 1000 then raise exception 'Invalid historical capacity' using errcode='22023'; end if;
    if v_event->>'kind'='outline' then
      if v_event->'localDate' <> 'null'::jsonb or v_event->'localStartTime' <> 'null'::jsonb or v_event->'durationMinutes' <> 'null'::jsonb then raise exception 'Invalid outline timing' using errcode='22023'; end if;
      continue;
    end if;
    if jsonb_typeof(v_event->'localDate') is distinct from 'string' or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid live timing' using errcode='22023'; end if;
    perform public.v2_batch_date(v_event->>'localDate');
    if jsonb_typeof(v_event->'durationMinutes') is distinct from 'number' or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
    if (v_event->>'durationMinutes')::integer not between 15 and 720 or (v_event->>'capacity')::integer not between 0 and 1000 then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
  end loop;
end;
$$;

-- Private pure projection: no inserts, updates, locks or generated identities.
create or replace function public.build_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer; v_sessions jsonb; v_sections text[];
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>'id')::uuid) then
      raise exception 'Batch revision changed' using errcode='40001';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>'templateId')::uuid and t.latest_revision=(p_request->>'templateRevision')::integer;
    if not found then raise exception 'Template revision changed' using errcode='40001'; end if;

  else
    select * into v_head from public.v2_course_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='40001'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>'startDate' <> p_request->>'startDate' then
      raise exception 'Template anchor date cannot change; edit event dates instead' using errcode='22023';
    end if;
    if jsonb_array_length(v_source->'events') <> jsonb_array_length(p_request->'events') then
      raise exception 'Draft event identities must be preserved' using errcode='22023';
    end if;
  end if;
  v_sessions := case when p_request ? 'sessions' then p_request->'sessions' else v_source->'sessions' end;
  if v_sessions is not null then
    select sections into v_sections from public.v2_course_offerings where code=v_product;
    if not public.v2_course_sessions_valid(v_sessions,v_sections) then raise exception 'Invalid course sessions or content scope' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(v_sessions) s join jsonb_array_elements(v_source->'events') e on s->>'key'=e->>'key') then
      raise exception 'Course session and live event identifiers must be distinct' using errcode='22023';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_source->'events') loop
    if v_revision = 0 and v_event->>'kind'='outline' then
      v_edit := jsonb_build_object('key',v_event->>'key','kind','outline','localDate',null,'localStartTime',null,
        'durationMinutes',null,'instructor',v_event->>'instructor','capacity',v_event->'capacity');
    elsif v_revision = 0 then
      v_date := public.v2_batch_date(p_request->>'startDate') + (v_event->>'dayOffset')::integer;
      v_edit := jsonb_build_object('key',v_event->>'key','localDate',to_char(v_date,'YYYY-MM-DD'),
        'localStartTime',v_event->>'localStartTime','durationMinutes',v_event->'durationMinutes',
        'instructor',v_event->>'instructor','capacity',v_event->'capacity')
        || case when v_event ? 'kind' then jsonb_build_object('kind',v_event->>'kind') else '{}'::jsonb end;
    else
      select value into v_edit from jsonb_array_elements(p_request->'events') where value->>'key'=v_event->>'key';
      if not found then raise exception 'Draft event identities must be preserved' using errcode='22023'; end if;
    end if;
    if v_event ? 'content' then v_edit := v_edit || jsonb_build_object('content',v_event->'content'); end if;
    -- Item type belongs to the source snapshot. Rescheduling cannot turn a
    -- blank outline into a live event without a separately reviewed content edit.
    if coalesce(v_edit->>'kind','live') <> coalesce(v_event->>'kind','live') then raise exception 'Event kind must be preserved' using errcode='22023'; end if;
    if v_edit->>'kind'='outline' then
      v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section','startsAt',null,'endsAt',null));
      continue;
    end if;
    v_date := public.v2_batch_date(v_edit->>'localDate');
    v_start := (v_date + (v_edit->>'localStartTime')::time) at time zone 'Asia/Kolkata';
    v_end := v_start + make_interval(mins => (v_edit->>'durationMinutes')::integer);
    v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section',
      'startsAt',to_char(v_start at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endsAt',to_char(v_end at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end loop;
  return jsonb_build_object('id',p_request->>'id','productCode',v_product,'templateId',p_request->>'templateId',
    'templateRevision',p_request->'templateRevision','revision',v_revision+1,'state','draft',
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events)
    || case when v_sessions is not null then jsonb_build_object('sessions',v_sessions) else '{}'::jsonb end;
end;
$$;

revoke all on function public.v2_template_document_valid(jsonb,text[]), public.assert_v2_batch_request(jsonb), public.build_v2_batch_draft(jsonb)
  from public, anon, authenticated, service_role;
create or replace function public.assert_v2_meeting_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text; v_link jsonb; v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid meeting request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','links']) then
    raise exception 'Invalid meeting fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid meeting identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid meeting revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646 then
    raise exception 'Invalid meeting revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'links') is distinct from 'array' then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'links') not between 0 and 100 then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  for v_link in select value from jsonb_array_elements(p_request->'links') loop
    if jsonb_typeof(v_link) is distinct from 'object' then raise exception 'Invalid meeting link' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_link)) <> 2 or not (v_link ?& array['key','url']) then
      raise exception 'Invalid meeting link fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_link->'key') is distinct from 'string'
      or length(v_link->>'key') <> 36
      or v_link->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_link->>'key' = any(v_keys) then raise exception 'Invalid meeting event' using errcode='22023'; end if;
    v_keys := array_append(v_keys,v_link->>'key');
    if v_link->'url' <> 'null'::jsonb then
      if jsonb_typeof(v_link->'url') is distinct from 'string'
        or length(v_link->>'url') <> 36
        or v_link->>'url' !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
        raise exception 'Invalid meeting URL' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.read_v2_meeting_draft(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch jsonb; v_links jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select r.document into v_batch from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.id=p_batch_id and b.state='draft';
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_batch_meeting_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if found then
    v_links := v_saved.request->'links';
    if jsonb_array_length(v_links) <> (select count(*) from jsonb_array_elements(v_batch->'events') e where coalesce(e->>'kind','live') <> 'outline') or exists (
      select 1 from jsonb_array_elements(v_links) l where not exists (
        select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key' and coalesce(e->>'kind','live') <> 'outline'
      )
    ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  else
    select coalesce(jsonb_agg(jsonb_build_object('key',e->>'key','url',null) order by ordinal),'[]'::jsonb)
      into v_links from jsonb_array_elements(v_batch->'events') with ordinality as items(e,ordinal) where coalesce(e->>'kind','live') <> 'outline';
  end if;
  return jsonb_build_object('batch',v_batch,'revision',coalesce(v_saved.revision,0),'links',v_links);
end;
$$;

create or replace function public.save_v2_meeting_draft(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_expected integer; v_current integer;
  v_head public.v2_course_batches%rowtype; v_batch jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_meeting_request(p_request);
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-meeting-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_meeting_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request then raise exception 'Request token belongs to a different submission' using errcode='22023'; end if;
    return jsonb_build_object('batchId',v_id,'batchRevision',v_saved.batch_revision,'revision',v_saved.revision,'replayed',true);
  end if;
  -- Sharing the batch row lock serializes meeting saves with schedule edits.
  select * into v_head from public.v2_course_batches where id=v_id for update;
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  if v_head.state <> 'draft' then raise exception 'Only draft meeting details can be changed here' using errcode='22023'; end if;
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='40001'; end if;
  select document into v_batch from public.v2_course_batch_revisions where batch_id=v_id and revision=v_head.latest_revision;
  if jsonb_array_length(p_request->'links') <> (select count(*) from jsonb_array_elements(v_batch->'events') e where coalesce(e->>'kind','live') <> 'outline') or exists (
    select 1 from jsonb_array_elements(p_request->'links') l where not exists (
      select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key' and coalesce(e->>'kind','live') <> 'outline'
    )
  ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  insert into public.v2_batch_meeting_revisions(batch_id,batch_revision,revision,request,request_id,actor_id)
    values (v_id,v_head.latest_revision,v_expected+1,p_request,v_token,v_actor);
  return jsonb_build_object('batchId',v_id,'batchRevision',v_head.latest_revision,'revision',v_expected+1,'replayed',false);
end;
$$;

revoke all on function public.assert_v2_meeting_request(jsonb), public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261020090000','add_v2_outline_schedules',array[$ace_source$-- Approved A1: preserve historical drafts and permit undated non-live outline items.
-- No existing rows are rewritten. Shared application requires separate approval.

create or replace function public.v2_template_document_valid(p_document jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_event jsonb;
  v_keys text[] := array[]::text[];
  v_days integer;
  v_end integer;
begin
  if jsonb_typeof(p_document) is distinct from 'object' or p_sections is null then return false; end if;
  if (select count(*) from jsonb_object_keys(p_document)) <> (4 + case when p_document ? 'sessions' then 1 else 0 end)
    or not (p_document ?& array['title', 'summary', 'durationDays', 'events']) then return false; end if;
  if jsonb_typeof(p_document->'title') is distinct from 'string'
    or length(p_document->>'title') not between 1 and 120
    or p_document->>'title' <> btrim(p_document->>'title', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'summary') is distinct from 'string'
    or length(p_document->>'summary') > 2000
    or p_document->>'summary' <> btrim(p_document->>'summary', E' \t\n\r\f\013')
    or jsonb_typeof(p_document->'durationDays') not in ('number','null')
    or (p_document->>'durationDays') !~ '^[0-9]{1,3}$'
    or jsonb_typeof(p_document->'events') is distinct from 'array' then return false; end if;
  if p_document ? 'sessions' then
    if not public.v2_course_sessions_valid(p_document->'sessions',p_sections) then return false; end if;
    select coalesce(array_agg(value->>'key'),array[]::text[]) into v_keys from jsonb_array_elements(p_document->'sessions');
  end if;
  v_days := (p_document->>'durationDays')::integer;
  if v_days not between 1 and 366 or jsonb_array_length(p_document->'events') > 100 then return false; end if;
  for v_event in select value from jsonb_array_elements(p_document->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (8 + case when v_event ? 'kind' then 1 else 0 end + case when v_event ? 'content' then 1 else 0 end)
      or not (v_event ?& array['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor']) then return false; end if;
    if p_document ? 'sessions' and v_event->>'kind'='outline' then return false; end if;
    if v_event ? 'content' and not public.v2_session_content_valid(v_event->'content') then return false; end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_event->>'key') = any(v_keys)
      or jsonb_typeof(v_event->'title') is distinct from 'string'
      or length(v_event->>'title') not between (case when v_event->>'kind'='outline' then 0 else 1 end) and 120
      or v_event->>'title' <> btrim(v_event->>'title', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013')
      or jsonb_typeof(v_event->'section') is distinct from 'string'
      or not ((v_event->>'section') = any(p_sections))

      then return false; end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if v_event ? 'kind' and (jsonb_typeof(v_event->'kind') is distinct from 'string' or v_event->>'kind' not in ('live','outline')) then return false; end if;
    if jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    if v_event->>'kind'='outline' then
      if v_event->'dayOffset' <> 'null'::jsonb or v_event->'localStartTime' <> 'null'::jsonb or v_event->'durationMinutes' <> 'null'::jsonb then return false; end if;
      continue;
    end if;
    if jsonb_typeof(v_event->'localStartTime') is distinct from 'string' or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false; end if;
    if jsonb_typeof(v_event->'dayOffset') is distinct from 'number'
      or (v_event->>'dayOffset') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'durationMinutes') is distinct from 'number'
      or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number'
      or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then return false; end if;
    if v_days is null then return false; end if;
    if (v_event->>'dayOffset')::integer not between 0 and v_days - 1
      or (v_event->>'durationMinutes')::integer not between 15 and 720
      or (v_event->>'capacity')::integer not between 1 and 1000 then return false; end if;
    v_end := (v_event->>'dayOffset')::integer * 1440
      + split_part(v_event->>'localStartTime', ':', 1)::integer * 60
      + split_part(v_event->>'localStartTime', ':', 2)::integer
      + (v_event->>'durationMinutes')::integer;
    if v_end > v_days * 1440 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.assert_v2_batch_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_event jsonb; v_keys text[] := array[]::text[]; v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid batch request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> (9 + case when p_request ? 'sessions' then 1 else 0 end)
    or not (p_request ?& array['id','templateId','templateRevision','expectedRevision','requestId','title','startDate','timeZone','events']) then
    raise exception 'Invalid batch fields' using errcode='22023';
  end if;
  foreach v_field in array array['id','templateId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or (p_request->>v_field) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid batch identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['templateRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or (p_request->>v_field) !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid batch revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or (p_request->>'templateRevision')::numeric not between 1 and 2147483647 then
    raise exception 'Invalid batch revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'title') is distinct from 'string' or length(p_request->>'title') not between 1 and 120
    or p_request->>'title' <> btrim(p_request->>'title', E' \t\n\r\f\013')
    or p_request->>'timeZone' is distinct from 'Asia/Kolkata'
    or jsonb_typeof(p_request->'startDate') is distinct from 'string' then
    raise exception 'Invalid batch title or time zone' using errcode='22023';
  end if;
  if p_request->>'startDate' <> '' then perform public.v2_batch_date(p_request->>'startDate'); end if;
  if (p_request->>'expectedRevision')::integer = 0 then
    if p_request ? 'sessions' then raise exception 'New batch content must come from the template' using errcode='22023'; end if;
    if p_request->'events' <> 'null'::jsonb then raise exception 'New batch events must come from the template' using errcode='22023'; end if;
    return;
  end if;
  if jsonb_typeof(p_request->'events') is distinct from 'array' then raise exception 'Invalid batch events' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'events') not between 0 and 100 then raise exception 'Invalid batch events' using errcode='22023'; end if;
  for v_event in select value from jsonb_array_elements(p_request->'events') loop
    if jsonb_typeof(v_event) is distinct from 'object' then raise exception 'Invalid batch event' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (6 + case when v_event ? 'kind' then 1 else 0 end)
      or not (v_event ?& array['key','localDate','localStartTime','durationMinutes','instructor','capacity']) then
      raise exception 'Invalid batch event fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_event->'key') is distinct from 'string'
      or (v_event->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_event->>'key' = any(v_keys)

      or jsonb_typeof(v_event->'instructor') is distinct from 'string'
      or length(v_event->>'instructor') > 120
      or v_event->>'instructor' <> btrim(v_event->>'instructor', E' \t\n\r\f\013') then
      raise exception 'Invalid batch event values' using errcode='22023';
    end if;
    v_keys := array_append(v_keys, v_event->>'key');
    if v_event ? 'kind' and (jsonb_typeof(v_event->'kind') is distinct from 'string' or v_event->>'kind' not in ('live','outline')) then raise exception 'Invalid event kind' using errcode='22023'; end if;
    if jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then raise exception 'Invalid historical capacity' using errcode='22023'; end if;
    if (v_event->>'capacity')::integer not between 1 and 1000 then raise exception 'Invalid historical capacity' using errcode='22023'; end if;
    if v_event->>'kind'='outline' then
      if v_event->'localDate' <> 'null'::jsonb or v_event->'localStartTime' <> 'null'::jsonb or v_event->'durationMinutes' <> 'null'::jsonb then raise exception 'Invalid outline timing' using errcode='22023'; end if;
      continue;
    end if;
    if jsonb_typeof(v_event->'localDate') is distinct from 'string' or jsonb_typeof(v_event->'localStartTime') is distinct from 'string'
      or (v_event->>'localStartTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid live timing' using errcode='22023'; end if;
    perform public.v2_batch_date(v_event->>'localDate');
    if jsonb_typeof(v_event->'durationMinutes') is distinct from 'number' or (v_event->>'durationMinutes') !~ '^[0-9]{1,3}$'
      or jsonb_typeof(v_event->'capacity') is distinct from 'number' or (v_event->>'capacity') !~ '^[0-9]{1,4}$' then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
    if (v_event->>'durationMinutes')::integer not between 15 and 720 or (v_event->>'capacity')::integer not between 0 and 1000 then
      raise exception 'Invalid batch event duration or capacity' using errcode='22023';
    end if;
  end loop;
end;
$$;

-- Private pure projection: no inserts, updates, locks or generated identities.
create or replace function public.build_v2_batch_draft(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer; v_sessions jsonb; v_sections text[];
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>'id')::uuid) then
      raise exception 'Batch revision changed' using errcode='40001';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>'templateId')::uuid and t.latest_revision=(p_request->>'templateRevision')::integer;
    if not found then raise exception 'Template revision changed' using errcode='40001'; end if;

  else
    select * into v_head from public.v2_course_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='40001'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>'startDate' <> p_request->>'startDate' then
      raise exception 'Template anchor date cannot change; edit event dates instead' using errcode='22023';
    end if;
    if jsonb_array_length(v_source->'events') <> jsonb_array_length(p_request->'events') then
      raise exception 'Draft event identities must be preserved' using errcode='22023';
    end if;
  end if;
  v_sessions := case when p_request ? 'sessions' then p_request->'sessions' else v_source->'sessions' end;
  if v_sessions is not null then
    select sections into v_sections from public.v2_course_offerings where code=v_product;
    if not public.v2_course_sessions_valid(v_sessions,v_sections) then raise exception 'Invalid course sessions or content scope' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(v_sessions) s join jsonb_array_elements(v_source->'events') e on s->>'key'=e->>'key') then
      raise exception 'Course session and live event identifiers must be distinct' using errcode='22023';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_source->'events') loop
    if v_revision = 0 and v_event->>'kind'='outline' then
      v_edit := jsonb_build_object('key',v_event->>'key','kind','outline','localDate',null,'localStartTime',null,
        'durationMinutes',null,'instructor',v_event->>'instructor','capacity',v_event->'capacity');
    elsif v_revision = 0 then
      v_date := public.v2_batch_date(p_request->>'startDate') + (v_event->>'dayOffset')::integer;
      v_edit := jsonb_build_object('key',v_event->>'key','localDate',to_char(v_date,'YYYY-MM-DD'),
        'localStartTime',v_event->>'localStartTime','durationMinutes',v_event->'durationMinutes',
        'instructor',v_event->>'instructor','capacity',v_event->'capacity')
        || case when v_event ? 'kind' then jsonb_build_object('kind',v_event->>'kind') else '{}'::jsonb end;
    else
      select value into v_edit from jsonb_array_elements(p_request->'events') where value->>'key'=v_event->>'key';
      if not found then raise exception 'Draft event identities must be preserved' using errcode='22023'; end if;
    end if;
    if v_event ? 'content' then v_edit := v_edit || jsonb_build_object('content',v_event->'content'); end if;
    -- Item type belongs to the source snapshot. Rescheduling cannot turn a
    -- blank outline into a live event without a separately reviewed content edit.
    if coalesce(v_edit->>'kind','live') <> coalesce(v_event->>'kind','live') then raise exception 'Event kind must be preserved' using errcode='22023'; end if;
    if v_edit->>'kind'='outline' then
      v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section','startsAt',null,'endsAt',null));
      continue;
    end if;
    v_date := public.v2_batch_date(v_edit->>'localDate');
    v_start := (v_date + (v_edit->>'localStartTime')::time) at time zone 'Asia/Kolkata';
    v_end := v_start + make_interval(mins => (v_edit->>'durationMinutes')::integer);
    v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object('title',v_event->>'title','section',v_event->>'section',
      'startsAt',to_char(v_start at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endsAt',to_char(v_end at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end loop;
  return jsonb_build_object('id',p_request->>'id','productCode',v_product,'templateId',p_request->>'templateId',
    'templateRevision',p_request->'templateRevision','revision',v_revision+1,'state','draft',
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events)
    || case when v_sessions is not null then jsonb_build_object('sessions',v_sessions) else '{}'::jsonb end;
end;
$$;

revoke all on function public.v2_template_document_valid(jsonb,text[]), public.assert_v2_batch_request(jsonb), public.build_v2_batch_draft(jsonb)
  from public, anon, authenticated, service_role;
create or replace function public.assert_v2_meeting_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text; v_link jsonb; v_keys text[] := array[]::text[];
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid meeting request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','links']) then
    raise exception 'Invalid meeting fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string'
      or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid meeting identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid meeting revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646 then
    raise exception 'Invalid meeting revision' using errcode='22023';
  end if;
  if jsonb_typeof(p_request->'links') is distinct from 'array' then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  if jsonb_array_length(p_request->'links') not between 0 and 100 then raise exception 'Invalid meeting links' using errcode='22023'; end if;
  for v_link in select value from jsonb_array_elements(p_request->'links') loop
    if jsonb_typeof(v_link) is distinct from 'object' then raise exception 'Invalid meeting link' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(v_link)) <> 2 or not (v_link ?& array['key','url']) then
      raise exception 'Invalid meeting link fields' using errcode='22023';
    end if;
    if jsonb_typeof(v_link->'key') is distinct from 'string'
      or length(v_link->>'key') <> 36
      or v_link->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_link->>'key' = any(v_keys) then raise exception 'Invalid meeting event' using errcode='22023'; end if;
    v_keys := array_append(v_keys,v_link->>'key');
    if v_link->'url' <> 'null'::jsonb then
      if jsonb_typeof(v_link->'url') is distinct from 'string'
        or length(v_link->>'url') <> 36
        or v_link->>'url' !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
        raise exception 'Invalid meeting URL' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.read_v2_meeting_draft(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch jsonb; v_links jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select r.document into v_batch from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.id=p_batch_id and b.state='draft';
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_batch_meeting_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if found then
    v_links := v_saved.request->'links';
    if jsonb_array_length(v_links) <> (select count(*) from jsonb_array_elements(v_batch->'events') e where coalesce(e->>'kind','live') <> 'outline') or exists (
      select 1 from jsonb_array_elements(v_links) l where not exists (
        select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key' and coalesce(e->>'kind','live') <> 'outline'
      )
    ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  else
    select coalesce(jsonb_agg(jsonb_build_object('key',e->>'key','url',null) order by ordinal),'[]'::jsonb)
      into v_links from jsonb_array_elements(v_batch->'events') with ordinality as items(e,ordinal) where coalesce(e->>'kind','live') <> 'outline';
  end if;
  return jsonb_build_object('batch',v_batch,'revision',coalesce(v_saved.revision,0),'links',v_links);
end;
$$;

create or replace function public.save_v2_meeting_draft(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_expected integer; v_current integer;
  v_head public.v2_course_batches%rowtype; v_batch jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_meeting_request(p_request);
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  v_expected := (p_request->>'expectedRevision')::integer;
  perform pg_advisory_xact_lock(hashtextextended('v2-meeting-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_meeting_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request then raise exception 'Request token belongs to a different submission' using errcode='22023'; end if;
    return jsonb_build_object('batchId',v_id,'batchRevision',v_saved.batch_revision,'revision',v_saved.revision,'replayed',true);
  end if;
  -- Sharing the batch row lock serializes meeting saves with schedule edits.
  select * into v_head from public.v2_course_batches where id=v_id for update;
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  if v_head.state <> 'draft' then raise exception 'Only draft meeting details can be changed here' using errcode='22023'; end if;
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='40001'; end if;
  select document into v_batch from public.v2_course_batch_revisions where batch_id=v_id and revision=v_head.latest_revision;
  if jsonb_array_length(p_request->'links') <> (select count(*) from jsonb_array_elements(v_batch->'events') e where coalesce(e->>'kind','live') <> 'outline') or exists (
    select 1 from jsonb_array_elements(p_request->'links') l where not exists (
      select 1 from jsonb_array_elements(v_batch->'events') e where e->>'key'=l->>'key' and coalesce(e->>'kind','live') <> 'outline'
    )
  ) then raise exception 'Meeting event identities changed' using errcode='22023'; end if;
  insert into public.v2_batch_meeting_revisions(batch_id,batch_revision,revision,request,request_id,actor_id)
    values (v_id,v_head.latest_revision,v_expected+1,p_request,v_token,v_actor);
  return jsonb_build_object('batchId',v_id,'batchRevision',v_head.latest_revision,'revision',v_expected+1,'replayed',false);
end;
$$;

revoke all on function public.assert_v2_meeting_request(jsonb), public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.read_v2_meeting_draft(uuid), public.save_v2_meeting_draft(jsonb) to authenticated;
$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261020100000_add_v2_batch_publication.sql
-- Admin-only immutable schedule publication. Student eligibility and the public
-- registration catalogue remain undecided; no Student/anon reader is granted.
-- Publication neither changes purchases nor exposes private meeting drafts.

create table if not exists public.v2_batch_publication_revisions (
  batch_id uuid not null,
  batch_revision integer not null,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  unique (actor_id, request_id),
  foreign key (batch_id, batch_revision)
    references public.v2_course_batch_revisions(batch_id, revision) on delete restrict
);
alter table public.v2_batch_publication_revisions enable row level security;
revoke all on public.v2_batch_publication_revisions from public, anon, authenticated, service_role;
grant select on public.v2_batch_publication_revisions to authenticated;
drop policy if exists v2_publication_admin_read on public.v2_batch_publication_revisions;
create policy v2_publication_admin_read on public.v2_batch_publication_revisions
  for select to authenticated using (public.is_portal_admin());

create or replace function public.assert_v2_publication_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid publication request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','action']) then
    raise exception 'Invalid publication fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string' or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid publication identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid publication revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or p_request->>'action' is null or p_request->>'action' not in ('publish','unpublish') then
    raise exception 'Invalid publication values' using errcode='22023';
  end if;
end;
$$;

create or replace function public.build_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_draft jsonb; v_previous jsonb; v_sections text[]; v_current integer;
  v_event jsonb; v_events jsonb := '[]'; v_live boolean := false; v_sessions jsonb;
begin
  perform public.assert_v2_publication_request(p_request);
  select r.document, p.sections into v_draft, v_sections from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    join public.v2_course_offerings p on p.code=b.product_code
    where b.id=(p_request->>'batchId')::uuid and b.latest_revision=(p_request->>'batchRevision')::integer;
  if not found then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select document,revision into v_previous,v_current from public.v2_batch_publication_revisions
    where batch_id=(p_request->>'batchId')::uuid order by revision desc limit 1;
  if coalesce(v_current,0) <> (p_request->>'expectedRevision')::integer then
    raise exception 'Publication revision changed' using errcode='40001';
  end if;
  if p_request->>'action'='unpublish' and coalesce(v_previous->>'state','') <> 'published' then
    raise exception 'Only a published batch can be unpublished' using errcode='22023';
  end if;
  for v_event in select value from jsonb_array_elements(v_draft->'events') loop
    if coalesce(v_event->>'kind','live')='live' then
      if nullif(v_event->>'title','') is null or v_event->>'startsAt' is null or v_event->>'endsAt' is null then
        raise exception 'Live sessions require a topic and exact schedule' using errcode='22023';
      end if;
      v_live := true;
    end if;
    -- Explicit projection excludes historical per-event capacity and any future
    -- private draft metadata. No meeting table is queried.
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'key',v_event->>'key','title',v_event->>'title','section',v_event->>'section',
      'kind',coalesce(v_event->>'kind','live'),'startsAt',v_event->'startsAt',
      'endsAt',v_event->'endsAt','instructor',v_event->>'instructor'));
  end loop;
  -- Publish course headings independently from live events. Private content is
  -- pinned by batch_revision and stays in the Admin-only course revision.
  if v_draft ? 'sessions' then
    select coalesce(jsonb_agg(jsonb_build_object('key',value->>'key','title',value->>'title','section',value->>'section') order by n),'[]'::jsonb)
      into v_sessions from jsonb_array_elements(v_draft->'sessions') with ordinality as item(value,n);
  end if;
  return jsonb_build_object('batchId',p_request->>'batchId','batchRevision',p_request->'batchRevision',
    'revision',coalesce(v_current,0)+1,'state',case when p_request->>'action'='publish' then 'published' else 'unpublished' end,
    'productCode',v_draft->>'productCode','title',v_draft->>'title','sections',to_jsonb(v_sections),
    'timeZone','Asia/Kolkata','liveRegistrationLimit',case when v_live then 8 else null end,'events',v_events)
    || case when v_sessions is not null then jsonb_build_object('sessions',v_sessions) else '{}'::jsonb end;
end;
$$;

create or replace function public.preview_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_document jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_document := public.build_v2_batch_publication(p_request);
  return jsonb_build_object('document',v_document,'fingerprint',md5(v_document::text));
end;
$$;

create or replace function public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_document jsonb;
  v_saved public.v2_batch_publication_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_publication_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'Review publication before confirmation' using errcode='22023';
  end if;
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('v2-publication-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_publication_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('document',v_saved.document,'replayed',true);
  end if;
  -- Same batch lock order as draft saves. Recheck both the draft revision and
  -- publication revision after the lock so stale previews cannot win a race.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text,0));
  perform 1 from public.v2_course_batches where id=v_id for update;
  v_document := public.build_v2_batch_publication(p_request);
  if md5(v_document::text) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='40001'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$$;

create or replace function public.list_v2_batch_publications()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(document order by batch_id),'[]'::jsonb) from (
    select distinct on (batch_id) batch_id,document from public.v2_batch_publication_revisions order by batch_id,revision desc
  ) latest);
end;
$$;

revoke all on function public.assert_v2_publication_request(jsonb), public.build_v2_batch_publication(jsonb),
  public.preview_v2_batch_publication(jsonb), public.save_v2_batch_publication(jsonb,text), public.list_v2_batch_publications()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_v2_batch_publication(jsonb), public.save_v2_batch_publication(jsonb,text), public.list_v2_batch_publications() to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261020100000','add_v2_batch_publication',array[$ace_source$-- Admin-only immutable schedule publication. Student eligibility and the public
-- registration catalogue remain undecided; no Student/anon reader is granted.
-- Publication neither changes purchases nor exposes private meeting drafts.

create table if not exists public.v2_batch_publication_revisions (
  batch_id uuid not null,
  batch_revision integer not null,
  revision integer not null check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  unique (actor_id, request_id),
  foreign key (batch_id, batch_revision)
    references public.v2_course_batch_revisions(batch_id, revision) on delete restrict
);
alter table public.v2_batch_publication_revisions enable row level security;
revoke all on public.v2_batch_publication_revisions from public, anon, authenticated, service_role;
grant select on public.v2_batch_publication_revisions to authenticated;
drop policy if exists v2_publication_admin_read on public.v2_batch_publication_revisions;
create policy v2_publication_admin_read on public.v2_batch_publication_revisions
  for select to authenticated using (public.is_portal_admin());

create or replace function public.assert_v2_publication_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_field text;
begin
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid publication request' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 5
    or not (p_request ?& array['batchId','batchRevision','expectedRevision','requestId','action']) then
    raise exception 'Invalid publication fields' using errcode='22023';
  end if;
  foreach v_field in array array['batchId','requestId'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'string' or length(p_request->>v_field) <> 36
      or p_request->>v_field !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid publication identifier' using errcode='22023';
    end if;
  end loop;
  foreach v_field in array array['batchRevision','expectedRevision'] loop
    if jsonb_typeof(p_request->v_field) is distinct from 'number' or p_request->>v_field !~ '^[0-9]{1,10}$' then
      raise exception 'Invalid publication revision' using errcode='22023';
    end if;
  end loop;
  if (p_request->>'batchRevision')::numeric not between 1 and 2147483647
    or (p_request->>'expectedRevision')::numeric not between 0 and 2147483646
    or p_request->>'action' is null or p_request->>'action' not in ('publish','unpublish') then
    raise exception 'Invalid publication values' using errcode='22023';
  end if;
end;
$$;

create or replace function public.build_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_draft jsonb; v_previous jsonb; v_sections text[]; v_current integer;
  v_event jsonb; v_events jsonb := '[]'; v_live boolean := false; v_sessions jsonb;
begin
  perform public.assert_v2_publication_request(p_request);
  select r.document, p.sections into v_draft, v_sections from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    join public.v2_course_offerings p on p.code=b.product_code
    where b.id=(p_request->>'batchId')::uuid and b.latest_revision=(p_request->>'batchRevision')::integer;
  if not found then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select document,revision into v_previous,v_current from public.v2_batch_publication_revisions
    where batch_id=(p_request->>'batchId')::uuid order by revision desc limit 1;
  if coalesce(v_current,0) <> (p_request->>'expectedRevision')::integer then
    raise exception 'Publication revision changed' using errcode='40001';
  end if;
  if p_request->>'action'='unpublish' and coalesce(v_previous->>'state','') <> 'published' then
    raise exception 'Only a published batch can be unpublished' using errcode='22023';
  end if;
  for v_event in select value from jsonb_array_elements(v_draft->'events') loop
    if coalesce(v_event->>'kind','live')='live' then
      if nullif(v_event->>'title','') is null or v_event->>'startsAt' is null or v_event->>'endsAt' is null then
        raise exception 'Live sessions require a topic and exact schedule' using errcode='22023';
      end if;
      v_live := true;
    end if;
    -- Explicit projection excludes historical per-event capacity and any future
    -- private draft metadata. No meeting table is queried.
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'key',v_event->>'key','title',v_event->>'title','section',v_event->>'section',
      'kind',coalesce(v_event->>'kind','live'),'startsAt',v_event->'startsAt',
      'endsAt',v_event->'endsAt','instructor',v_event->>'instructor'));
  end loop;
  -- Publish course headings independently from live events. Private content is
  -- pinned by batch_revision and stays in the Admin-only course revision.
  if v_draft ? 'sessions' then
    select coalesce(jsonb_agg(jsonb_build_object('key',value->>'key','title',value->>'title','section',value->>'section') order by n),'[]'::jsonb)
      into v_sessions from jsonb_array_elements(v_draft->'sessions') with ordinality as item(value,n);
  end if;
  return jsonb_build_object('batchId',p_request->>'batchId','batchRevision',p_request->'batchRevision',
    'revision',coalesce(v_current,0)+1,'state',case when p_request->>'action'='publish' then 'published' else 'unpublished' end,
    'productCode',v_draft->>'productCode','title',v_draft->>'title','sections',to_jsonb(v_sections),
    'timeZone','Asia/Kolkata','liveRegistrationLimit',case when v_live then 8 else null end,'events',v_events)
    || case when v_sessions is not null then jsonb_build_object('sessions',v_sessions) else '{}'::jsonb end;
end;
$$;

create or replace function public.preview_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_document jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_document := public.build_v2_batch_publication(p_request);
  return jsonb_build_object('document',v_document,'fingerprint',md5(v_document::text));
end;
$$;

create or replace function public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_document jsonb;
  v_saved public.v2_batch_publication_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_publication_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'Review publication before confirmation' using errcode='22023';
  end if;
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('v2-publication-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_publication_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('document',v_saved.document,'replayed',true);
  end if;
  -- Same batch lock order as draft saves. Recheck both the draft revision and
  -- publication revision after the lock so stale previews cannot win a race.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text,0));
  perform 1 from public.v2_course_batches where id=v_id for update;
  v_document := public.build_v2_batch_publication(p_request);
  if md5(v_document::text) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='40001'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$$;

create or replace function public.list_v2_batch_publications()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(document order by batch_id),'[]'::jsonb) from (
    select distinct on (batch_id) batch_id,document from public.v2_batch_publication_revisions order by batch_id,revision desc
  ) latest);
end;
$$;

revoke all on function public.assert_v2_publication_request(jsonb), public.build_v2_batch_publication(jsonb),
  public.preview_v2_batch_publication(jsonb), public.save_v2_batch_publication(jsonb,text), public.list_v2_batch_publications()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_v2_batch_publication(jsonb), public.save_v2_batch_publication(jsonb,text), public.list_v2_batch_publications() to authenticated;
$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261025100000_add_v2_enrolled_schedules.sql
-- Proposed migration: local rehearsal only. Enrollment controls schedule visibility;
-- it neither purchases access nor allocates a paid live-course registration.

create table if not exists public.v2_batch_enrollments (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  revision integer not null check (revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, student_id)
);
create index if not exists v2_batch_enrollments_student_idx
  on public.v2_batch_enrollments(student_id, batch_id) where active;
alter table public.v2_batch_enrollments enable row level security;
revoke all on public.v2_batch_enrollments from public, anon, authenticated, service_role;
grant select on public.v2_batch_enrollments to authenticated;
drop policy if exists v2_enrollment_admin_read on public.v2_batch_enrollments;
create policy v2_enrollment_admin_read on public.v2_batch_enrollments
  for select to authenticated using (public.is_portal_admin());

-- Private helper: never accepts an arbitrary student ID through a public RPC.
create or replace function public.v2_student_has_product(p_student uuid, p_product text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles s
    join public.v2_purchases p on p.student_id=s.id
    join public.v2_product_grants g on g.purchase_id=p.id
    where s.id=p_student and s.role='student' and s.is_active
      and g.product_code=public.v2_entitlement_product_code(p_product)
      and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
  );
$$;

create or replace function public.list_v2_batch_enrollment_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_product text;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(e.active,false),'revision',coalesce(e.revision,0),
    'eligible',public.v2_student_has_product(s.id,v_product)
  ) order by s.full_name,s.id),'[]'::jsonb)
    from public.profiles s left join public.v2_batch_enrollments e on e.student_id=s.id and e.batch_id=p_batch_id
    where e.student_id is not null or public.v2_student_has_product(s.id,v_product));
end;
$$;

-- Optimistic concurrency: an interrupted confirmation is resolved by reloading
-- the roster. A stale retry must never undo a subsequent removal or enrollment.
create or replace function public.set_v2_batch_enrollment(
  p_batch_id uuid, p_student_id uuid, p_active boolean, p_expected_revision integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_product text; v_revision integer;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid enrollment request' using errcode='22023';
  end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('v2-enrollment:'||p_batch_id::text||':'||p_student_id::text,0));
  select revision into v_revision from public.v2_batch_enrollments where batch_id=p_batch_id and student_id=p_student_id for update;
  if coalesce(v_revision,0) <> p_expected_revision then raise exception 'Enrollment changed; reload the roster' using errcode='40001'; end if;
  if p_active and not public.v2_student_has_product(p_student_id,v_product) then
    raise exception 'Active Student product access required' using errcode='22023';
  end if;
  if not p_active and v_revision is null then raise exception 'Enrollment unavailable' using errcode='22023'; end if;
  insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id)
    values(p_batch_id,p_student_id,p_active,p_expected_revision+1,auth.uid())
    on conflict (batch_id,student_id) do update set active=excluded.active,revision=excluded.revision,
      actor_id=excluded.actor_id,updated_at=statement_timestamp();
  return jsonb_build_object('batchId',p_batch_id,'studentId',p_student_id,'active',p_active,'revision',p_expected_revision+1);
end;
$$;

-- No caller-supplied student identifier. Latest publication is selected BEFORE
-- filtering state, so unpublishing cannot resurrect an older published revision.
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId',b.id,'batchRevision',r.batch_revision,'revision',r.revision,'state','published',
    'productCode',b.product_code,'title',r.document->'title','sections',r.document->'sections',
    'timeZone',r.document->'timeZone','liveRegistrationLimit',r.document->'liveRegistrationLimit',
    'events',coalesce((select jsonb_agg(jsonb_build_object(
      'key',ev.value->'key','title',ev.value->'title','section',ev.value->'section','kind',ev.value->'kind',
      'startsAt',ev.value->'startsAt','endsAt',ev.value->'endsAt','instructor',ev.value->'instructor'
    ) order by ev.ordinality) from jsonb_array_elements(r.document->'events') with ordinality ev(value,ordinality)),'[]'::jsonb)
  ) || case when r.document ? 'sessions' then jsonb_build_object('sessions',
    coalesce((select jsonb_agg(jsonb_build_object('key',s.value->'key','title',s.value->'title','section',s.value->'section') order by s.n)
      from jsonb_array_elements(r.document->'sessions') with ordinality s(value,n)),'[]'::jsonb)) else '{}'::jsonb end
    order by b.id),'[]'::jsonb)
  from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
  join lateral (select batch_revision,revision,document from public.v2_batch_publication_revisions
    where batch_id=b.id order by revision desc limit 1) r on true
  where e.student_id=auth.uid() and e.active and r.document->>'state'='published'
    and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;

revoke all on function public.v2_student_has_product(uuid,text),
  public.list_v2_batch_enrollment_options(uuid),public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),
  public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_batch_enrollment_options(uuid),
  public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),public.get_my_v2_batch_schedules() to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261025100000','add_v2_enrolled_schedules',array[$ace_source$-- Proposed migration: local rehearsal only. Enrollment controls schedule visibility;
-- it neither purchases access nor allocates a paid live-course registration.

create table if not exists public.v2_batch_enrollments (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  revision integer not null check (revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, student_id)
);
create index if not exists v2_batch_enrollments_student_idx
  on public.v2_batch_enrollments(student_id, batch_id) where active;
alter table public.v2_batch_enrollments enable row level security;
revoke all on public.v2_batch_enrollments from public, anon, authenticated, service_role;
grant select on public.v2_batch_enrollments to authenticated;
drop policy if exists v2_enrollment_admin_read on public.v2_batch_enrollments;
create policy v2_enrollment_admin_read on public.v2_batch_enrollments
  for select to authenticated using (public.is_portal_admin());

-- Private helper: never accepts an arbitrary student ID through a public RPC.
create or replace function public.v2_student_has_product(p_student uuid, p_product text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles s
    join public.v2_purchases p on p.student_id=s.id
    join public.v2_product_grants g on g.purchase_id=p.id
    where s.id=p_student and s.role='student' and s.is_active
      and g.product_code=public.v2_entitlement_product_code(p_product)
      and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
  );
$$;

create or replace function public.list_v2_batch_enrollment_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_product text;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(e.active,false),'revision',coalesce(e.revision,0),
    'eligible',public.v2_student_has_product(s.id,v_product)
  ) order by s.full_name,s.id),'[]'::jsonb)
    from public.profiles s left join public.v2_batch_enrollments e on e.student_id=s.id and e.batch_id=p_batch_id
    where e.student_id is not null or public.v2_student_has_product(s.id,v_product));
end;
$$;

-- Optimistic concurrency: an interrupted confirmation is resolved by reloading
-- the roster. A stale retry must never undo a subsequent removal or enrollment.
create or replace function public.set_v2_batch_enrollment(
  p_batch_id uuid, p_student_id uuid, p_active boolean, p_expected_revision integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_product text; v_revision integer;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid enrollment request' using errcode='22023';
  end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('v2-enrollment:'||p_batch_id::text||':'||p_student_id::text,0));
  select revision into v_revision from public.v2_batch_enrollments where batch_id=p_batch_id and student_id=p_student_id for update;
  if coalesce(v_revision,0) <> p_expected_revision then raise exception 'Enrollment changed; reload the roster' using errcode='40001'; end if;
  if p_active and not public.v2_student_has_product(p_student_id,v_product) then
    raise exception 'Active Student product access required' using errcode='22023';
  end if;
  if not p_active and v_revision is null then raise exception 'Enrollment unavailable' using errcode='22023'; end if;
  insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id)
    values(p_batch_id,p_student_id,p_active,p_expected_revision+1,auth.uid())
    on conflict (batch_id,student_id) do update set active=excluded.active,revision=excluded.revision,
      actor_id=excluded.actor_id,updated_at=statement_timestamp();
  return jsonb_build_object('batchId',p_batch_id,'studentId',p_student_id,'active',p_active,'revision',p_expected_revision+1);
end;
$$;

-- No caller-supplied student identifier. Latest publication is selected BEFORE
-- filtering state, so unpublishing cannot resurrect an older published revision.
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId',b.id,'batchRevision',r.batch_revision,'revision',r.revision,'state','published',
    'productCode',b.product_code,'title',r.document->'title','sections',r.document->'sections',
    'timeZone',r.document->'timeZone','liveRegistrationLimit',r.document->'liveRegistrationLimit',
    'events',coalesce((select jsonb_agg(jsonb_build_object(
      'key',ev.value->'key','title',ev.value->'title','section',ev.value->'section','kind',ev.value->'kind',
      'startsAt',ev.value->'startsAt','endsAt',ev.value->'endsAt','instructor',ev.value->'instructor'
    ) order by ev.ordinality) from jsonb_array_elements(r.document->'events') with ordinality ev(value,ordinality)),'[]'::jsonb)
  ) || case when r.document ? 'sessions' then jsonb_build_object('sessions',
    coalesce((select jsonb_agg(jsonb_build_object('key',s.value->'key','title',s.value->'title','section',s.value->'section') order by s.n)
      from jsonb_array_elements(r.document->'sessions') with ordinality s(value,n)),'[]'::jsonb)) else '{}'::jsonb end
    order by b.id),'[]'::jsonb)
  from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
  join lateral (select batch_revision,revision,document from public.v2_batch_publication_revisions
    where batch_id=b.id order by revision desc limit 1) r on true
  where e.student_id=auth.uid() and e.active and r.document->>'state'='published'
    and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;

revoke all on function public.v2_student_has_product(uuid,text),
  public.list_v2_batch_enrollment_options(uuid),public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),
  public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_batch_enrollment_options(uuid),
  public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),public.get_my_v2_batch_schedules() to authenticated;
$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261102100000_add_v2_programme_content.sql
-- Full Course programme content remains undated and separate from subject grants.
create or replace function public.v2_course_sessions_valid(p_sessions jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare v_session jsonb; v_ids text[]:=array[]::text[];
begin
  if p_sections is null or jsonb_typeof(p_sessions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sessions)>100 then return false; end if;
  for v_session in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(v_session) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_session))<>4 or not(v_session ?& array['key','title','section','content']) then return false; end if;
    if jsonb_typeof(v_session->'key') is distinct from 'string'
      or v_session->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_session->>'key')=any(v_ids)
      or jsonb_typeof(v_session->'title') is distinct from 'string'
      or length(v_session->>'title') not between 1 and 120
      or v_session->>'title'<>btrim(v_session->>'title',E' \t\n\r\f\013')
      or jsonb_typeof(v_session->'section') is distinct from 'string'
      or not((v_session->>'section')=any(p_sections)
        or ((v_session->>'section')='programme' and p_sections=array['quant','verbal','di']))
      or not public.v2_session_content_valid(v_session->'content') then return false; end if;
    v_ids:=array_append(v_ids,v_session->>'key');
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_course_sessions_valid(jsonb,text[]) from public,anon,authenticated,service_role;

create or replace function public.v2_session_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_kind text; v_item jsonb; v_ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 4 or not (p_content ?& array['materials','recordings','preSessionReads','postSessionReads']) then return false; end if;
  foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
    if jsonb_typeof(p_content->v_kind) is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_content->v_kind)>50 then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->v_kind) loop
      if jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_object_keys(v_item))<>3 or not (v_item ?& array['key','title','url']) then return false; end if;
      if jsonb_typeof(v_item->'key') is distinct from 'string'
        or (v_item->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (v_item->>'key')=any(v_ids)
        or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') not between 1 and 120
        or v_item->>'title'<>btrim(v_item->>'title',E' \t\n\r\f\013')
        or jsonb_typeof(v_item->'url') is distinct from 'string' or length(v_item->>'url')>2048
        or not ((v_item->>'url') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or (v_item->>'url') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
        then return false; end if;
      v_ids:=array_append(v_ids,v_item->>'key');
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_session_content_valid(jsonb) from public,anon,authenticated,service_role;


-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261102100000','add_v2_programme_content',array[$ace_source$-- Full Course programme content remains undated and separate from subject grants.
create or replace function public.v2_course_sessions_valid(p_sessions jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare v_session jsonb; v_ids text[]:=array[]::text[];
begin
  if p_sections is null or jsonb_typeof(p_sessions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sessions)>100 then return false; end if;
  for v_session in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(v_session) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_session))<>4 or not(v_session ?& array['key','title','section','content']) then return false; end if;
    if jsonb_typeof(v_session->'key') is distinct from 'string'
      or v_session->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_session->>'key')=any(v_ids)
      or jsonb_typeof(v_session->'title') is distinct from 'string'
      or length(v_session->>'title') not between 1 and 120
      or v_session->>'title'<>btrim(v_session->>'title',E' \t\n\r\f\013')
      or jsonb_typeof(v_session->'section') is distinct from 'string'
      or not((v_session->>'section')=any(p_sections)
        or ((v_session->>'section')='programme' and p_sections=array['quant','verbal','di']))
      or not public.v2_session_content_valid(v_session->'content') then return false; end if;
    v_ids:=array_append(v_ids,v_session->>'key');
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_course_sessions_valid(jsonb,text[]) from public,anon,authenticated,service_role;

create or replace function public.v2_session_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_kind text; v_item jsonb; v_ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 4 or not (p_content ?& array['materials','recordings','preSessionReads','postSessionReads']) then return false; end if;
  foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
    if jsonb_typeof(p_content->v_kind) is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_content->v_kind)>50 then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->v_kind) loop
      if jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_object_keys(v_item))<>3 or not (v_item ?& array['key','title','url']) then return false; end if;
      if jsonb_typeof(v_item->'key') is distinct from 'string'
        or (v_item->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (v_item->>'key')=any(v_ids)
        or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') not between 1 and 120
        or v_item->>'title'<>btrim(v_item->>'title',E' \t\n\r\f\013')
        or jsonb_typeof(v_item->'url') is distinct from 'string' or length(v_item->>'url')>2048
        or not ((v_item->>'url') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or (v_item->>'url') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
        then return false; end if;
      v_ids:=array_append(v_ids,v_item->>'key');
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_session_content_valid(jsonb) from public,anon,authenticated,service_role;

$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261102110000_add_v2_student_delivery.sql
-- Published course delivery, explicit live registration and class completion.
-- These transitions do not create payments, attendance or feedback submissions.

create table if not exists public.v2_published_meetings (
  batch_id uuid not null,
  publication_revision integer not null,
  meeting_revision integer not null,
  primary key(batch_id, publication_revision),
  foreign key(batch_id, publication_revision) references public.v2_batch_publication_revisions(batch_id, revision) on delete restrict,
  foreign key(batch_id, meeting_revision) references public.v2_batch_meeting_revisions(batch_id, revision) on delete restrict
);
create table if not exists public.v2_live_registrations (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  provenance text not null default 'admin_manual' check(provenance='admin_manual'),
  revision integer not null check(revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id)
);
create table if not exists public.v2_live_registration_audit (
  batch_id uuid not null,
  student_id uuid not null,
  revision integer not null,
  active boolean not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id, revision),
  foreign key(batch_id,student_id) references public.v2_live_registrations(batch_id,student_id) on delete restrict
);
create table if not exists public.v2_live_class_completions (
  batch_id uuid not null,
  event_key uuid not null,
  publication_revision integer not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default statement_timestamp(),
  primary key(batch_id,event_key),
  foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision) on delete restrict
);

alter table public.v2_published_meetings enable row level security;
alter table public.v2_live_registrations enable row level security;
alter table public.v2_live_registration_audit enable row level security;
alter table public.v2_live_class_completions enable row level security;
revoke all on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions from public,anon,authenticated,service_role;
grant select on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions to authenticated;
drop policy if exists v2_published_meetings_admin on public.v2_published_meetings;
create policy v2_published_meetings_admin on public.v2_published_meetings for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registrations_admin on public.v2_live_registrations;
create policy v2_live_registrations_admin on public.v2_live_registrations for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registration_audit_admin on public.v2_live_registration_audit;
create policy v2_live_registration_audit_admin on public.v2_live_registration_audit for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_completions_admin on public.v2_live_class_completions;
create policy v2_live_completions_admin on public.v2_live_class_completions for select to authenticated using(public.is_portal_admin());

-- Only a meeting revision matching the reviewed batch revision is published.
-- Editing a draft after publication never changes an already published link.
create or replace function public.pin_v2_published_meetings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.document->>'state'='published' then
    insert into public.v2_published_meetings(batch_id,publication_revision,meeting_revision)
      select new.batch_id,new.revision,m.revision from public.v2_batch_meeting_revisions m
      where m.batch_id=new.batch_id and m.batch_revision=new.batch_revision
      order by m.revision desc limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists v2_pin_published_meetings on public.v2_batch_publication_revisions;
create trigger v2_pin_published_meetings after insert on public.v2_batch_publication_revisions
  for each row execute function public.pin_v2_published_meetings();

create or replace function public.get_my_v2_published_course(p_batch_id uuid)
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
  -- Projection excludes draft metadata. Both modern sessions and historical
  -- outline content retain their published order and independently edited titles.
  select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',coalesce(nullif(s->>'title',''),'Course outline'),'section',s->'section','content',s->'content') order by n),'[]')
    into v_sessions from jsonb_array_elements(coalesce(v_draft->'sessions','[]') || coalesce((
      select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->'events') with ordinality item(e,ord)
      where e ? 'content'
    ),'[]')) with ordinality item(s,n)
    where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>'section')
      or (v_product='full_course' and s->>'section'='programme' and public.can_access_v2_product('full_batch'));
  return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_publication.revision,'batchRevision',v_publication.batch_revision,
    'title',v_publication.document->'title','productCode',v_product,'sessions',v_sessions);
end;
$$;

create or replace function public.list_v2_live_registration_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(r.active,false),'revision',coalesce(r.revision,0),
    'eligible',coalesce(e.active,false) and public.v2_student_has_product(s.id,b.product_code)) order by s.full_name,s.id),'[]')
    from public.v2_course_batches b cross join public.profiles s
    left join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=s.id
    left join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=s.id
    where b.id=p_batch_id and (e.active or r.student_id is not null));
end;
$$;

create or replace function public.set_v2_live_registration(p_batch_id uuid,p_student_id uuid,p_active boolean,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_product text; v_current integer; v_publication jsonb;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid registration request' using errcode='22023'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select revision into v_current from public.v2_live_registrations where batch_id=p_batch_id and student_id=p_student_id;
  if coalesce(v_current,0)<>p_expected_revision then raise exception 'Registration changed; reload the roster' using errcode='40001'; end if;
  if p_active then
    if not public.v2_student_has_product(p_student_id,v_product) or not exists (
      select 1 from public.v2_batch_enrollments where batch_id=p_batch_id and student_id=p_student_id and active
    ) then raise exception 'Active Student product access and enrollment required' using errcode='22023'; end if;
    select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
    if v_publication is null or v_publication->>'state'<>'published' or not exists (
      select 1 from jsonb_array_elements(v_publication->'events') e where e->>'kind'='live'
    ) then raise exception 'Published live batch required' using errcode='22023'; end if;
  elsif v_current is null then raise exception 'Registration unavailable' using errcode='22023'; end if;
  insert into public.v2_live_registrations(batch_id,student_id,active,revision,actor_id)
    values(p_batch_id,p_student_id,p_active,p_expected_revision+1,auth.uid())
    on conflict(batch_id,student_id) do update set active=excluded.active,revision=excluded.revision,actor_id=excluded.actor_id,updated_at=statement_timestamp();
  insert into public.v2_live_registration_audit(batch_id,student_id,revision,active,actor_id)
    values(p_batch_id,p_student_id,p_expected_revision+1,p_active,auth.uid());
  return jsonb_build_object('batchId',p_batch_id,'studentId',p_student_id,'active',p_active,'revision',p_expected_revision+1);
end;
$$;

-- The caller identity is derived from the session on every join request.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text;
begin
  select b.product_code into v_product from public.v2_course_batches b
    join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
    join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active
    where b.id=p_batch_id;
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return null; end if;
  select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>'section') then return null; end if;
  if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
  select l->>'url' into v_url from public.v2_published_meetings p
    join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
    lateral jsonb_array_elements(m.request->'links') l
    where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>'key'=p_event_key::text;
  if v_url is null then return null; end if;
  return jsonb_build_object('batchId',p_batch_id,'eventKey',p_event_key,'url',v_url,'publicationRevision',v_publication.revision);
end;
$$;

create or replace function public.list_v2_live_class_status(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return '[]'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('eventKey',e->>'key','title',e->>'title',
    'publicationRevision',v_publication.revision,'completedAt',c.completed_at) order by n),'[]')
    from jsonb_array_elements(v_publication.document->'events') with ordinality item(e,n)
    left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>'key')::uuid
    where e->>'kind'='live');
end;
$$;

-- Completion is a one-way audited operational fact, independent of attendance.
create or replace function public.complete_v2_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_saved public.v2_live_class_completions%rowtype;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform 1 from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key;
  if found then
    if v_saved.publication_revision<>p_publication_revision then raise exception 'Completion belongs to another publication' using errcode='40001'; end if;
    return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',true);
  end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.revision is distinct from p_publication_revision then raise exception 'Publication changed; reload the class list' using errcode='40001'; end if;
  if v_publication.document->>'state'<>'published' or not exists (
    select 1 from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live'
  ) then raise exception 'Published live class required' using errcode='22023'; end if;
  insert into public.v2_live_class_completions(batch_id,event_key,publication_revision,actor_id)
    values(p_batch_id,p_event_key,p_publication_revision,auth.uid()) returning * into v_saved;
  return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',false);
end;
$$;

revoke all on function public.pin_v2_published_meetings(),public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261102110000','add_v2_student_delivery',array[$ace_source$-- Published course delivery, explicit live registration and class completion.
-- These transitions do not create payments, attendance or feedback submissions.

create table if not exists public.v2_published_meetings (
  batch_id uuid not null,
  publication_revision integer not null,
  meeting_revision integer not null,
  primary key(batch_id, publication_revision),
  foreign key(batch_id, publication_revision) references public.v2_batch_publication_revisions(batch_id, revision) on delete restrict,
  foreign key(batch_id, meeting_revision) references public.v2_batch_meeting_revisions(batch_id, revision) on delete restrict
);
create table if not exists public.v2_live_registrations (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  provenance text not null default 'admin_manual' check(provenance='admin_manual'),
  revision integer not null check(revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id)
);
create table if not exists public.v2_live_registration_audit (
  batch_id uuid not null,
  student_id uuid not null,
  revision integer not null,
  active boolean not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id, revision),
  foreign key(batch_id,student_id) references public.v2_live_registrations(batch_id,student_id) on delete restrict
);
create table if not exists public.v2_live_class_completions (
  batch_id uuid not null,
  event_key uuid not null,
  publication_revision integer not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default statement_timestamp(),
  primary key(batch_id,event_key),
  foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision) on delete restrict
);

alter table public.v2_published_meetings enable row level security;
alter table public.v2_live_registrations enable row level security;
alter table public.v2_live_registration_audit enable row level security;
alter table public.v2_live_class_completions enable row level security;
revoke all on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions from public,anon,authenticated,service_role;
grant select on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions to authenticated;
drop policy if exists v2_published_meetings_admin on public.v2_published_meetings;
create policy v2_published_meetings_admin on public.v2_published_meetings for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registrations_admin on public.v2_live_registrations;
create policy v2_live_registrations_admin on public.v2_live_registrations for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registration_audit_admin on public.v2_live_registration_audit;
create policy v2_live_registration_audit_admin on public.v2_live_registration_audit for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_completions_admin on public.v2_live_class_completions;
create policy v2_live_completions_admin on public.v2_live_class_completions for select to authenticated using(public.is_portal_admin());

-- Only a meeting revision matching the reviewed batch revision is published.
-- Editing a draft after publication never changes an already published link.
create or replace function public.pin_v2_published_meetings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.document->>'state'='published' then
    insert into public.v2_published_meetings(batch_id,publication_revision,meeting_revision)
      select new.batch_id,new.revision,m.revision from public.v2_batch_meeting_revisions m
      where m.batch_id=new.batch_id and m.batch_revision=new.batch_revision
      order by m.revision desc limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists v2_pin_published_meetings on public.v2_batch_publication_revisions;
create trigger v2_pin_published_meetings after insert on public.v2_batch_publication_revisions
  for each row execute function public.pin_v2_published_meetings();

create or replace function public.get_my_v2_published_course(p_batch_id uuid)
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
  -- Projection excludes draft metadata. Both modern sessions and historical
  -- outline content retain their published order and independently edited titles.
  select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',coalesce(nullif(s->>'title',''),'Course outline'),'section',s->'section','content',s->'content') order by n),'[]')
    into v_sessions from jsonb_array_elements(coalesce(v_draft->'sessions','[]') || coalesce((
      select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->'events') with ordinality item(e,ord)
      where e ? 'content'
    ),'[]')) with ordinality item(s,n)
    where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>'section')
      or (v_product='full_course' and s->>'section'='programme' and public.can_access_v2_product('full_batch'));
  return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_publication.revision,'batchRevision',v_publication.batch_revision,
    'title',v_publication.document->'title','productCode',v_product,'sessions',v_sessions);
end;
$$;

create or replace function public.list_v2_live_registration_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(r.active,false),'revision',coalesce(r.revision,0),
    'eligible',coalesce(e.active,false) and public.v2_student_has_product(s.id,b.product_code)) order by s.full_name,s.id),'[]')
    from public.v2_course_batches b cross join public.profiles s
    left join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=s.id
    left join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=s.id
    where b.id=p_batch_id and (e.active or r.student_id is not null));
end;
$$;

create or replace function public.set_v2_live_registration(p_batch_id uuid,p_student_id uuid,p_active boolean,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_product text; v_current integer; v_publication jsonb;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid registration request' using errcode='22023'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select revision into v_current from public.v2_live_registrations where batch_id=p_batch_id and student_id=p_student_id;
  if coalesce(v_current,0)<>p_expected_revision then raise exception 'Registration changed; reload the roster' using errcode='40001'; end if;
  if p_active then
    if not public.v2_student_has_product(p_student_id,v_product) or not exists (
      select 1 from public.v2_batch_enrollments where batch_id=p_batch_id and student_id=p_student_id and active
    ) then raise exception 'Active Student product access and enrollment required' using errcode='22023'; end if;
    select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
    if v_publication is null or v_publication->>'state'<>'published' or not exists (
      select 1 from jsonb_array_elements(v_publication->'events') e where e->>'kind'='live'
    ) then raise exception 'Published live batch required' using errcode='22023'; end if;
  elsif v_current is null then raise exception 'Registration unavailable' using errcode='22023'; end if;
  insert into public.v2_live_registrations(batch_id,student_id,active,revision,actor_id)
    values(p_batch_id,p_student_id,p_active,p_expected_revision+1,auth.uid())
    on conflict(batch_id,student_id) do update set active=excluded.active,revision=excluded.revision,actor_id=excluded.actor_id,updated_at=statement_timestamp();
  insert into public.v2_live_registration_audit(batch_id,student_id,revision,active,actor_id)
    values(p_batch_id,p_student_id,p_expected_revision+1,p_active,auth.uid());
  return jsonb_build_object('batchId',p_batch_id,'studentId',p_student_id,'active',p_active,'revision',p_expected_revision+1);
end;
$$;

-- The caller identity is derived from the session on every join request.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text;
begin
  select b.product_code into v_product from public.v2_course_batches b
    join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
    join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active
    where b.id=p_batch_id;
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return null; end if;
  select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>'section') then return null; end if;
  if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
  select l->>'url' into v_url from public.v2_published_meetings p
    join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
    lateral jsonb_array_elements(m.request->'links') l
    where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>'key'=p_event_key::text;
  if v_url is null then return null; end if;
  return jsonb_build_object('batchId',p_batch_id,'eventKey',p_event_key,'url',v_url,'publicationRevision',v_publication.revision);
end;
$$;

create or replace function public.list_v2_live_class_status(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return '[]'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('eventKey',e->>'key','title',e->>'title',
    'publicationRevision',v_publication.revision,'completedAt',c.completed_at) order by n),'[]')
    from jsonb_array_elements(v_publication.document->'events') with ordinality item(e,n)
    left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>'key')::uuid
    where e->>'kind'='live');
end;
$$;

-- Completion is a one-way audited operational fact, independent of attendance.
create or replace function public.complete_v2_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_saved public.v2_live_class_completions%rowtype;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform 1 from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key;
  if found then
    if v_saved.publication_revision<>p_publication_revision then raise exception 'Completion belongs to another publication' using errcode='40001'; end if;
    return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',true);
  end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.revision is distinct from p_publication_revision then raise exception 'Publication changed; reload the class list' using errcode='40001'; end if;
  if v_publication.document->>'state'<>'published' or not exists (
    select 1 from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live'
  ) then raise exception 'Published live class required' using errcode='22023'; end if;
  insert into public.v2_live_class_completions(batch_id,event_key,publication_revision,actor_id)
    values(p_batch_id,p_event_key,p_publication_revision,auth.uid()) returning * into v_saved;
  return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',false);
end;
$$;

revoke all on function public.pin_v2_published_meetings(),public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) to authenticated;
$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261102120000_add_v2_content_imports.sql
-- Additive content transfer retains immutable source identity and unpublished revisions.
create table public.v2_shared_content_assets (
  id uuid primary key,
  source_label text not null,
  source_table text not null,
  source_id uuid not null,
  source_field text not null,
  source_hash text not null,
  title text not null,
  url text not null,
  unique(source_label,source_table,source_id,source_field)
);
create table public.v2_content_imports (
  id uuid primary key,
  actor_id uuid not null references public.profiles(id),
  plan jsonb not null,
  fingerprint text not null,
  previous_documents jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  recovered_at timestamptz,
  recovered_by uuid references public.profiles(id)
);
create table public.v2_content_asset_placements (
  template_id uuid not null references public.v2_course_templates(id),
  item_id uuid not null,
  session_key uuid not null,
  content_kind text not null check(content_kind in ('materials','recordings','preSessionReads','postSessionReads')),
  asset_id uuid not null references public.v2_shared_content_assets(id),
  import_id uuid not null references public.v2_content_imports(id),
  primary key(template_id,item_id)
);
alter table public.v2_shared_content_assets enable row level security;
alter table public.v2_content_imports enable row level security;
alter table public.v2_content_asset_placements enable row level security;
revoke all on public.v2_shared_content_assets,public.v2_content_imports,public.v2_content_asset_placements from public,anon,authenticated,service_role;
grant select on public.v2_shared_content_assets,public.v2_content_imports,public.v2_content_asset_placements to authenticated;
create policy v2_asset_admin_read on public.v2_shared_content_assets for select to authenticated using(public.is_portal_admin());
create policy v2_import_admin_read on public.v2_content_imports for select to authenticated using(public.is_portal_admin());
create policy v2_placement_admin_read on public.v2_content_asset_placements for select to authenticated using(public.is_portal_admin());

create function public.validate_v2_content_import(p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_asset jsonb; v_draft jsonb; v_placement jsonb; v_row jsonb; v_schema text; v_table text;
 v_old jsonb; v_new jsonb; v_session jsonb; v_old_session jsonb; v_kind text; v_item jsonb;
 v_retained jsonb; v_assets uuid[]:=array[]::uuid[]; v_templates uuid[]:=array[]::uuid[];
 v_item_keys text[]:=array[]::text[]; v_head public.v2_course_templates%rowtype;
 v_registered public.v2_shared_content_assets%rowtype; v_old_documents jsonb:='[]';
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_plan->>'format' is distinct from 'v2-content-transfer-plan-1' or p_plan->>'status' is distinct from 'draft_only'
   or coalesce(p_plan->>'source','') !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
   or coalesce(p_plan->>'mappingReviewHash','') !~ '^[0-9a-f]{64}$'
   or jsonb_typeof(p_plan->'assets') is distinct from 'array'
   or jsonb_typeof(p_plan->'drafts') is distinct from 'array'
   or jsonb_typeof(p_plan->'placements') is distinct from 'array'
   then raise exception 'Invalid content import plan' using errcode='22023'; end if;
 if jsonb_array_length(p_plan->'assets') not between 1 and 10000
   or jsonb_array_length(p_plan->'drafts') not between 1 and 100
   or jsonb_array_length(p_plan->'placements') not between 1 and 10000
   then raise exception 'Invalid content import scope' using errcode='22023'; end if;
 for v_asset in select value from jsonb_array_elements(p_plan->'assets') order by value->>'assetId' loop
   v_table:=v_asset#>>'{source,table}';
   if v_table is null or not(v_table=any(array['materials','master_materials','course_template_resources','sessions','master_sessions']))
     or v_asset->>'titleField' is distinct from 'title'
     or not(coalesce(v_asset->>'urlField','')=any(array['file_url','notion_url','video_url','recording_url','url']))
     or (v_asset->>'assetId')::uuid=any(v_assets) then raise exception 'Invalid or duplicate source asset' using errcode='22023'; end if;
   v_assets:=array_append(v_assets,(v_asset->>'assetId')::uuid);
   execute format('select to_jsonb(r) from public.%I r where id=$1 for share',v_table)
     into v_row using (v_asset#>>'{source,id}')::uuid;
   if v_row is null or encode(sha256(convert_to(v_row::text,'UTF8')),'hex') is distinct from v_asset#>>'{source,rowHash}' then
     raise exception 'Source revision changed' using errcode='40001'; end if;
   select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'notNull',a.attnotnull) order by a.attname)::text,'UTF8')),'hex') into v_schema
     from pg_catalog.pg_attribute a where a.attrelid=to_regclass('public.'||v_table) and a.attnum>0 and not a.attisdropped;
   if v_schema is distinct from v_asset#>>'{source,schemaHash}' then raise exception 'Source schema changed' using errcode='40001'; end if;
   if v_row->>(v_asset->>'titleField') is distinct from v_asset->>'title'
     or v_row->>(v_asset->>'urlField') is distinct from v_asset->>'url'
     or not (coalesce(v_asset->>'url','') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or coalesce(v_asset->>'url','') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
     then raise exception 'Source content does not match reviewed asset' using errcode='22023'; end if;
   perform pg_advisory_xact_lock(hashtextextended('v2-asset:'||(v_asset->>'assetId'),0));
   select * into v_registered from public.v2_shared_content_assets where id=(v_asset->>'assetId')::uuid;
   if found and (v_registered.source_label<>p_plan->>'source' or v_registered.source_table<>v_table
     or v_registered.source_id<>(v_asset#>>'{source,id}')::uuid or v_registered.source_field<>v_asset->>'urlField'
     or v_registered.source_hash<>v_asset#>>'{source,rowHash}' or v_registered.title<>v_asset->>'title' or v_registered.url<>v_asset->>'url') then
     raise exception 'Shared asset collision requires a separate revision' using errcode='40001'; end if;
 end loop;
 for v_draft in select value from jsonb_array_elements(p_plan->'drafts') order by value->>'templateId' loop
   if (v_draft->>'templateId')::uuid=any(v_templates) then raise exception 'Duplicate destination' using errcode='22023'; end if;
   v_templates:=array_append(v_templates,(v_draft->>'templateId')::uuid);
   select * into v_head from public.v2_course_templates where id=(v_draft->>'templateId')::uuid for update;
   if not found or v_head.latest_revision<>(v_draft->>'expectedRevision')::integer
     or v_head.product_code<>v_draft->>'productCode' then raise exception 'Destination revision changed' using errcode='40001'; end if;
   select document into v_old from public.v2_course_template_revisions where template_id=v_head.id and revision=v_head.latest_revision;
   v_new:=v_draft->'document';
   if not public.v2_template_document_valid(v_new,(select sections from public.v2_course_offerings where code=v_head.product_code))
     or v_new-'sessions' is distinct from v_old-'sessions'
     or jsonb_typeof(v_old->'sessions') is distinct from 'array'
     or jsonb_array_length(v_new->'sessions')<>jsonb_array_length(v_old->'sessions') then
     raise exception 'Import must preserve destination structure' using errcode='22023'; end if;
   for v_session in select value from jsonb_array_elements(v_new->'sessions') loop
     select value into v_old_session from jsonb_array_elements(v_old->'sessions') where value->>'key'=v_session->>'key';
     if v_old_session is null or v_old_session-'content' is distinct from v_session-'content' then
       raise exception 'Import must preserve session metadata' using errcode='22023'; end if;
     foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
       v_retained:='[]';
       for v_item in select value from jsonb_array_elements(v_session->'content'->v_kind) loop
         select value into v_placement from jsonb_array_elements(p_plan->'placements')
           where value#>>'{target,templateId}'=v_head.id::text and value->>'itemId'=v_item->>'key';
         if v_placement is null then v_retained:=v_retained||jsonb_build_array(v_item); continue; end if;
         if (v_head.id::text||':'||(v_item->>'key'))=any(v_item_keys) then raise exception 'Duplicate placement' using errcode='22023'; end if;
         v_item_keys:=array_append(v_item_keys,v_head.id::text||':'||(v_item->>'key'));
         select value into v_asset from jsonb_array_elements(p_plan->'assets') where value->>'assetId'=v_placement->>'assetId';
         if v_asset is null or v_placement#>>'{target,sessionKey}'<>v_session->>'key'
           or v_placement#>>'{target,contentKind}'<>v_kind
           or (v_placement#>>'{target,revision}')::integer<>v_head.latest_revision
           or v_placement->'source' is distinct from v_asset->'source'
           or v_item is distinct from jsonb_build_object('key',v_placement->>'itemId','title',v_asset->>'title','url',v_asset->>'url')
           or v_session->'content'->v_kind->((v_placement->>'position')::integer) is distinct from v_item then
           raise exception 'Invalid imported placement' using errcode='22023'; end if;
         if exists(select 1 from jsonb_array_elements(v_old_session->'content'->v_kind) where value->>'key'=v_item->>'key')
           then raise exception 'Destination item already exists' using errcode='40001'; end if;
       end loop;
       if v_retained is distinct from v_old_session->'content'->v_kind then
         raise exception 'Import cannot remove, edit or reorder existing content' using errcode='22023'; end if;
     end loop;
   end loop;
   if (select jsonb_agg(value->>'key') from jsonb_array_elements(v_new->'sessions')) is distinct from
      (select jsonb_agg(value->>'key') from jsonb_array_elements(v_old->'sessions')) then
      raise exception 'Import cannot reorder sessions' using errcode='22023'; end if;
   v_old_documents:=v_old_documents||jsonb_build_array(jsonb_build_object('templateId',v_head.id,'productCode',v_head.product_code,
     'revision',v_head.latest_revision,'document',v_old));
 end loop;
 if cardinality(v_item_keys)<>jsonb_array_length(p_plan->'placements')
   or exists(select 1 from jsonb_array_elements(p_plan->'assets') a where not exists(
     select 1 from jsonb_array_elements(p_plan->'placements') p where p.value->>'assetId'=a.value->>'assetId')) then
   raise exception 'Import contains unused or duplicate scope' using errcode='22023'; end if;
 return v_old_documents;
end;
$$;

create function public.preview_v2_content_import(p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.validate_v2_content_import(p_plan);
 return jsonb_build_object('fingerprint',encode(sha256(convert_to(p_plan::text,'UTF8')),'hex'),
   'assets',jsonb_array_length(p_plan->'assets'),'placements',jsonb_array_length(p_plan->'placements'),
   'templates',jsonb_array_length(p_plan->'drafts'),'published',false);
end;
$$;

create function public.apply_v2_content_import(p_id uuid,p_plan jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_imports%rowtype; v_previous jsonb; v_draft jsonb; v_asset jsonb; v_place jsonb; v_result jsonb;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_id is null or p_fingerprint is distinct from encode(sha256(convert_to(p_plan::text,'UTF8')),'hex') then
   raise exception 'Reviewed import fingerprint required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-import:'||p_id::text,0));
 select * into v_saved from public.v2_content_imports where id=p_id;
 if found then
   if v_saved.actor_id<>auth.uid() or v_saved.plan<>p_plan or v_saved.recovered_at is not null then
     raise exception 'Import identifier belongs to another operation' using errcode='22023'; end if;
   return v_saved.result||jsonb_build_object('replayed',true);
 end if;
 v_previous:=public.validate_v2_content_import(p_plan);
 for v_asset in select value from jsonb_array_elements(p_plan->'assets') loop
   insert into public.v2_shared_content_assets(id,source_label,source_table,source_id,source_field,source_hash,title,url)
     values((v_asset->>'assetId')::uuid,p_plan->>'source',v_asset#>>'{source,table}',(v_asset#>>'{source,id}')::uuid,
       v_asset->>'urlField',v_asset#>>'{source,rowHash}',v_asset->>'title',v_asset->>'url') on conflict(id) do nothing;
   insert into public.v2_shared_content_asset_revisions(asset_id,revision,title,url,actor_id)
     values((v_asset->>'assetId')::uuid,1,v_asset->>'title',v_asset->>'url',auth.uid()) on conflict(asset_id,revision) do nothing;
 end loop;
 for v_draft in select value from jsonb_array_elements(p_plan->'drafts') order by value->>'templateId' loop
   perform public.save_v2_template_draft((v_draft->>'templateId')::uuid,v_draft->>'productCode',
     (v_draft->>'expectedRevision')::integer,gen_random_uuid(),v_draft->'document');
 end loop;
 v_result:=jsonb_build_object('importId',p_id,'assets',jsonb_array_length(p_plan->'assets'),
   'placements',jsonb_array_length(p_plan->'placements'),'templates',jsonb_array_length(p_plan->'drafts'),
   'imported',true,'published',false,'replayed',false);
 insert into public.v2_content_imports(id,actor_id,plan,fingerprint,previous_documents,result)
   values(p_id,auth.uid(),p_plan,p_fingerprint,v_previous,v_result);
 for v_place in select value from jsonb_array_elements(p_plan->'placements') loop
   insert into public.v2_content_asset_placements(template_id,item_id,session_key,content_kind,asset_id,import_id)
     values((v_place#>>'{target,templateId}')::uuid,(v_place->>'itemId')::uuid,(v_place#>>'{target,sessionKey}')::uuid,
       v_place#>>'{target,contentKind}',(v_place->>'assetId')::uuid,p_id);
 end loop;
 return v_result;
end;
$$;

create function public.recover_v2_content_import(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_imports%rowtype; v_previous jsonb; v_latest integer;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-import:'||p_id::text,0));
 select * into v_saved from public.v2_content_imports where id=p_id for update;
 if not found then raise exception 'Import not found' using errcode='22023'; end if;
 if v_saved.recovered_at is not null then return jsonb_build_object('importId',p_id,'recovered',true,'replayed',true); end if;
 for v_previous in select value from jsonb_array_elements(v_saved.previous_documents) order by value->>'templateId' loop
   select latest_revision into v_latest from public.v2_course_templates where id=(v_previous->>'templateId')::uuid for update;
   if v_latest<>(v_previous->>'revision')::integer+1 then raise exception 'Destination changed after import' using errcode='40001'; end if;
   if exists(select 1 from public.v2_course_batches where template_id=(v_previous->>'templateId')::uuid and template_revision=v_latest) then
     raise exception 'Imported revision is pinned by a batch; batch recovery requires separate review' using errcode='40001'; end if;
   perform public.save_v2_template_draft((v_previous->>'templateId')::uuid,v_previous->>'productCode',v_latest,gen_random_uuid(),v_previous->'document');
 end loop;
 delete from public.v2_content_asset_placements where import_id=p_id;
 update public.v2_content_imports set recovered_at=statement_timestamp(),recovered_by=auth.uid() where id=p_id;
 return jsonb_build_object('importId',p_id,'recovered',true,'replayed',false,'sharedAssetsRetained',true);
end;
$$;
revoke all on function public.validate_v2_content_import(jsonb),public.preview_v2_content_import(jsonb),
  public.apply_v2_content_import(uuid,jsonb,text),public.recover_v2_content_import(uuid) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_content_import(jsonb),public.apply_v2_content_import(uuid,jsonb,text),public.recover_v2_content_import(uuid) to authenticated;
create table public.v2_shared_content_asset_revisions (
  asset_id uuid not null references public.v2_shared_content_assets(id),
  revision integer not null check(revision>0),
  title text not null,
  url text not null,
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  primary key(asset_id,revision)
);
create table public.v2_content_asset_replacements (
  id uuid primary key,
  actor_id uuid not null references public.profiles(id),
  request jsonb not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp()
);
alter table public.v2_content_asset_placements add column asset_revision integer not null default 1;
alter table public.v2_content_asset_placements add constraint v2_placement_asset_revision
  foreign key(asset_id,asset_revision) references public.v2_shared_content_asset_revisions(asset_id,revision);
alter table public.v2_shared_content_asset_revisions enable row level security;
alter table public.v2_content_asset_replacements enable row level security;
revoke all on public.v2_shared_content_asset_revisions,public.v2_content_asset_replacements from public,anon,authenticated,service_role;
grant select on public.v2_shared_content_asset_revisions,public.v2_content_asset_replacements to authenticated;
create policy v2_asset_revision_admin_read on public.v2_shared_content_asset_revisions for select to authenticated using(public.is_portal_admin());
create policy v2_asset_replacement_admin_read on public.v2_content_asset_replacements for select to authenticated using(public.is_portal_admin());

create function public.build_v2_asset_replacement(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_asset uuid; v_template uuid; v_revision integer; v_document jsonb; v_place record;
 v_scope jsonb:='[]'; v_items jsonb; v_session_index integer; v_item_index integer; v_next integer;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if jsonb_typeof(p_request) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_request))<>4
   or not(p_request ?& array['assetId','title','url','templateIds'])
   or coalesce(p_request->>'title','')='' or length(p_request->>'title')>120
   or p_request->>'title'<>btrim(p_request->>'title',E' \t\n\r\f\013')
   or length(p_request->>'url')>2048
   or coalesce(p_request->>'url','') !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$'
   or jsonb_typeof(p_request->'templateIds') is distinct from 'array' then raise exception 'Invalid replacement scope' using errcode='22023'; end if;
 if jsonb_array_length(p_request->'templateIds') not between 1 and 100 or
   (select count(distinct value) from jsonb_array_elements(p_request->'templateIds'))<>jsonb_array_length(p_request->'templateIds')
   then raise exception 'Select unique destination templates' using errcode='22023'; end if;
 v_asset:=(p_request->>'assetId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('v2-asset:'||v_asset::text,0));
 if not exists(select 1 from public.v2_shared_content_assets where id=v_asset) then raise exception 'Shared asset not found' using errcode='22023'; end if;
 select coalesce(max(revision),0)+1 into v_next from public.v2_shared_content_asset_revisions where asset_id=v_asset;
 for v_template in select value::uuid from jsonb_array_elements_text(p_request->'templateIds') order by value loop
   select latest_revision into v_revision from public.v2_course_templates where id=v_template for update;
   select document into v_document from public.v2_course_template_revisions where template_id=v_template and revision=v_revision;
   if v_document is null then raise exception 'Destination not found' using errcode='40001'; end if;
   v_items:='[]';
   for v_place in select p.*,r.title,r.url from public.v2_content_asset_placements p
      join public.v2_shared_content_asset_revisions r on r.asset_id=p.asset_id and r.revision=p.asset_revision
      where p.asset_id=v_asset and p.template_id=v_template order by p.item_id loop
     select ordinality::integer-1 into v_session_index from jsonb_array_elements(v_document->'sessions') with ordinality where value->>'key'=v_place.session_key::text;
     select ordinality::integer-1 into v_item_index from jsonb_array_elements(v_document->'sessions'->v_session_index->'content'->v_place.content_kind) with ordinality
       where value->>'key'=v_place.item_id::text;
     if v_session_index is null or v_item_index is null or
       v_document->'sessions'->v_session_index->'content'->v_place.content_kind->v_item_index is distinct from
       jsonb_build_object('key',v_place.item_id,'title',v_place.title,'url',v_place.url) then
       raise exception 'A destination item changed; a new mapping review is required' using errcode='40001'; end if;
     v_document:=jsonb_set(v_document,array['sessions',v_session_index::text,'content',v_place.content_kind,v_item_index::text],
       jsonb_build_object('key',v_place.item_id,'title',p_request->>'title','url',p_request->>'url'));
     v_items:=v_items||jsonb_build_array(jsonb_build_object('itemId',v_place.item_id,'previousAssetRevision',v_place.asset_revision));
   end loop;
   if jsonb_array_length(v_items)=0 then raise exception 'Selected template does not reference the asset' using errcode='22023'; end if;
   v_scope:=v_scope||jsonb_build_array(jsonb_build_object('templateId',v_template,'expectedRevision',v_revision,'document',v_document,'items',v_items));
 end loop;
 return jsonb_build_object('request',p_request,'assetRevision',v_next,'scope',v_scope);
end;
$$;

create function public.preview_v2_asset_replacement(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_plan jsonb;
begin
 v_plan:=public.build_v2_asset_replacement(p_request);
 return jsonb_build_object('fingerprint',encode(sha256(convert_to(v_plan::text,'UTF8')),'hex'),
   'assetRevision',v_plan->'assetRevision','scope',(select jsonb_agg(jsonb_build_object('templateId',value->>'templateId',
     'title',value#>>'{document,title}','expectedRevision',value->'expectedRevision','items',jsonb_array_length(value->'items')))
     from jsonb_array_elements(v_plan->'scope')),'published',false);
end;
$$;

create function public.apply_v2_asset_replacement(p_id uuid,p_request jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_asset_replacements%rowtype; v_plan jsonb; v_scope jsonb; v_result jsonb;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_id is null then raise exception 'Replacement identifier required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-asset-replacement:'||p_id::text,0));
 select * into v_saved from public.v2_content_asset_replacements where id=p_id;
 if found then
   if v_saved.actor_id<>auth.uid() or v_saved.request<>p_request or v_saved.fingerprint is distinct from p_fingerprint then
     raise exception 'Replacement identifier belongs to another operation' using errcode='22023'; end if;
   return v_saved.result||jsonb_build_object('replayed',true);
 end if;
 v_plan:=public.build_v2_asset_replacement(p_request);
 if p_fingerprint is distinct from encode(sha256(convert_to(v_plan::text,'UTF8')),'hex') then
   raise exception 'Replacement scope changed; review again' using errcode='40001'; end if;
 insert into public.v2_shared_content_asset_revisions(asset_id,revision,title,url,actor_id)
   values((p_request->>'assetId')::uuid,(v_plan->>'assetRevision')::integer,p_request->>'title',p_request->>'url',auth.uid());
 for v_scope in select value from jsonb_array_elements(v_plan->'scope') loop
   perform public.save_v2_template_draft((v_scope->>'templateId')::uuid,
     (select product_code from public.v2_course_templates where id=(v_scope->>'templateId')::uuid),
     (v_scope->>'expectedRevision')::integer,gen_random_uuid(),v_scope->'document');
   update public.v2_content_asset_placements set asset_revision=(v_plan->>'assetRevision')::integer
     where asset_id=(p_request->>'assetId')::uuid and template_id=(v_scope->>'templateId')::uuid;
 end loop;
 v_result:=jsonb_build_object('replacementId',p_id,'assetId',p_request->>'assetId','assetRevision',v_plan->'assetRevision',
   'templates',jsonb_array_length(v_plan->'scope'),'published',false,'replayed',false);
 insert into public.v2_content_asset_replacements(id,actor_id,request,fingerprint,result) values(p_id,auth.uid(),p_request,p_fingerprint,v_result);
 return v_result;
end;
$$;
revoke all on function public.build_v2_asset_replacement(jsonb),public.preview_v2_asset_replacement(jsonb),
 public.apply_v2_asset_replacement(uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_asset_replacement(jsonb),public.apply_v2_asset_replacement(uuid,jsonb,text) to authenticated;

create function public.list_v2_content_import_workspace()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return jsonb_build_object(
   'assets',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'url',a.url,'templateIds',
     (select coalesce(jsonb_agg(distinct p.template_id),'[]') from public.v2_content_asset_placements p where p.asset_id=a.id)) order by a.title,a.id),'[]') from public.v2_shared_content_assets a),
   'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',r.document->>'title') order by t.id),'[]')
     from public.v2_course_templates t join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision),
   'imports',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'createdAt',i.created_at,'recovered',i.recovered_at is not null,
     'templates',i.result->'templates','placements',i.result->'placements') order by i.created_at desc),'[]') from public.v2_content_imports i));
end;
$$;
revoke all on function public.list_v2_content_import_workspace() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_content_import_workspace() to authenticated;


-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261102120000','add_v2_content_imports',array[$ace_source$-- Additive content transfer retains immutable source identity and unpublished revisions.
create table public.v2_shared_content_assets (
  id uuid primary key,
  source_label text not null,
  source_table text not null,
  source_id uuid not null,
  source_field text not null,
  source_hash text not null,
  title text not null,
  url text not null,
  unique(source_label,source_table,source_id,source_field)
);
create table public.v2_content_imports (
  id uuid primary key,
  actor_id uuid not null references public.profiles(id),
  plan jsonb not null,
  fingerprint text not null,
  previous_documents jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  recovered_at timestamptz,
  recovered_by uuid references public.profiles(id)
);
create table public.v2_content_asset_placements (
  template_id uuid not null references public.v2_course_templates(id),
  item_id uuid not null,
  session_key uuid not null,
  content_kind text not null check(content_kind in ('materials','recordings','preSessionReads','postSessionReads')),
  asset_id uuid not null references public.v2_shared_content_assets(id),
  import_id uuid not null references public.v2_content_imports(id),
  primary key(template_id,item_id)
);
alter table public.v2_shared_content_assets enable row level security;
alter table public.v2_content_imports enable row level security;
alter table public.v2_content_asset_placements enable row level security;
revoke all on public.v2_shared_content_assets,public.v2_content_imports,public.v2_content_asset_placements from public,anon,authenticated,service_role;
grant select on public.v2_shared_content_assets,public.v2_content_imports,public.v2_content_asset_placements to authenticated;
create policy v2_asset_admin_read on public.v2_shared_content_assets for select to authenticated using(public.is_portal_admin());
create policy v2_import_admin_read on public.v2_content_imports for select to authenticated using(public.is_portal_admin());
create policy v2_placement_admin_read on public.v2_content_asset_placements for select to authenticated using(public.is_portal_admin());

create function public.validate_v2_content_import(p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_asset jsonb; v_draft jsonb; v_placement jsonb; v_row jsonb; v_schema text; v_table text;
 v_old jsonb; v_new jsonb; v_session jsonb; v_old_session jsonb; v_kind text; v_item jsonb;
 v_retained jsonb; v_assets uuid[]:=array[]::uuid[]; v_templates uuid[]:=array[]::uuid[];
 v_item_keys text[]:=array[]::text[]; v_head public.v2_course_templates%rowtype;
 v_registered public.v2_shared_content_assets%rowtype; v_old_documents jsonb:='[]';
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_plan->>'format' is distinct from 'v2-content-transfer-plan-1' or p_plan->>'status' is distinct from 'draft_only'
   or coalesce(p_plan->>'source','') !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
   or coalesce(p_plan->>'mappingReviewHash','') !~ '^[0-9a-f]{64}$'
   or jsonb_typeof(p_plan->'assets') is distinct from 'array'
   or jsonb_typeof(p_plan->'drafts') is distinct from 'array'
   or jsonb_typeof(p_plan->'placements') is distinct from 'array'
   then raise exception 'Invalid content import plan' using errcode='22023'; end if;
 if jsonb_array_length(p_plan->'assets') not between 1 and 10000
   or jsonb_array_length(p_plan->'drafts') not between 1 and 100
   or jsonb_array_length(p_plan->'placements') not between 1 and 10000
   then raise exception 'Invalid content import scope' using errcode='22023'; end if;
 for v_asset in select value from jsonb_array_elements(p_plan->'assets') order by value->>'assetId' loop
   v_table:=v_asset#>>'{source,table}';
   if v_table is null or not(v_table=any(array['materials','master_materials','course_template_resources','sessions','master_sessions']))
     or v_asset->>'titleField' is distinct from 'title'
     or not(coalesce(v_asset->>'urlField','')=any(array['file_url','notion_url','video_url','recording_url','url']))
     or (v_asset->>'assetId')::uuid=any(v_assets) then raise exception 'Invalid or duplicate source asset' using errcode='22023'; end if;
   v_assets:=array_append(v_assets,(v_asset->>'assetId')::uuid);
   execute format('select to_jsonb(r) from public.%I r where id=$1 for share',v_table)
     into v_row using (v_asset#>>'{source,id}')::uuid;
   if v_row is null or encode(sha256(convert_to(v_row::text,'UTF8')),'hex') is distinct from v_asset#>>'{source,rowHash}' then
     raise exception 'Source revision changed' using errcode='40001'; end if;
   select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'notNull',a.attnotnull) order by a.attname)::text,'UTF8')),'hex') into v_schema
     from pg_catalog.pg_attribute a where a.attrelid=to_regclass('public.'||v_table) and a.attnum>0 and not a.attisdropped;
   if v_schema is distinct from v_asset#>>'{source,schemaHash}' then raise exception 'Source schema changed' using errcode='40001'; end if;
   if v_row->>(v_asset->>'titleField') is distinct from v_asset->>'title'
     or v_row->>(v_asset->>'urlField') is distinct from v_asset->>'url'
     or not (coalesce(v_asset->>'url','') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or coalesce(v_asset->>'url','') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
     then raise exception 'Source content does not match reviewed asset' using errcode='22023'; end if;
   perform pg_advisory_xact_lock(hashtextextended('v2-asset:'||(v_asset->>'assetId'),0));
   select * into v_registered from public.v2_shared_content_assets where id=(v_asset->>'assetId')::uuid;
   if found and (v_registered.source_label<>p_plan->>'source' or v_registered.source_table<>v_table
     or v_registered.source_id<>(v_asset#>>'{source,id}')::uuid or v_registered.source_field<>v_asset->>'urlField'
     or v_registered.source_hash<>v_asset#>>'{source,rowHash}' or v_registered.title<>v_asset->>'title' or v_registered.url<>v_asset->>'url') then
     raise exception 'Shared asset collision requires a separate revision' using errcode='40001'; end if;
 end loop;
 for v_draft in select value from jsonb_array_elements(p_plan->'drafts') order by value->>'templateId' loop
   if (v_draft->>'templateId')::uuid=any(v_templates) then raise exception 'Duplicate destination' using errcode='22023'; end if;
   v_templates:=array_append(v_templates,(v_draft->>'templateId')::uuid);
   select * into v_head from public.v2_course_templates where id=(v_draft->>'templateId')::uuid for update;
   if not found or v_head.latest_revision<>(v_draft->>'expectedRevision')::integer
     or v_head.product_code<>v_draft->>'productCode' then raise exception 'Destination revision changed' using errcode='40001'; end if;
   select document into v_old from public.v2_course_template_revisions where template_id=v_head.id and revision=v_head.latest_revision;
   v_new:=v_draft->'document';
   if not public.v2_template_document_valid(v_new,(select sections from public.v2_course_offerings where code=v_head.product_code))
     or v_new-'sessions' is distinct from v_old-'sessions'
     or jsonb_typeof(v_old->'sessions') is distinct from 'array'
     or jsonb_array_length(v_new->'sessions')<>jsonb_array_length(v_old->'sessions') then
     raise exception 'Import must preserve destination structure' using errcode='22023'; end if;
   for v_session in select value from jsonb_array_elements(v_new->'sessions') loop
     select value into v_old_session from jsonb_array_elements(v_old->'sessions') where value->>'key'=v_session->>'key';
     if v_old_session is null or v_old_session-'content' is distinct from v_session-'content' then
       raise exception 'Import must preserve session metadata' using errcode='22023'; end if;
     foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
       v_retained:='[]';
       for v_item in select value from jsonb_array_elements(v_session->'content'->v_kind) loop
         select value into v_placement from jsonb_array_elements(p_plan->'placements')
           where value#>>'{target,templateId}'=v_head.id::text and value->>'itemId'=v_item->>'key';
         if v_placement is null then v_retained:=v_retained||jsonb_build_array(v_item); continue; end if;
         if (v_head.id::text||':'||(v_item->>'key'))=any(v_item_keys) then raise exception 'Duplicate placement' using errcode='22023'; end if;
         v_item_keys:=array_append(v_item_keys,v_head.id::text||':'||(v_item->>'key'));
         select value into v_asset from jsonb_array_elements(p_plan->'assets') where value->>'assetId'=v_placement->>'assetId';
         if v_asset is null or v_placement#>>'{target,sessionKey}'<>v_session->>'key'
           or v_placement#>>'{target,contentKind}'<>v_kind
           or (v_placement#>>'{target,revision}')::integer<>v_head.latest_revision
           or v_placement->'source' is distinct from v_asset->'source'
           or v_item is distinct from jsonb_build_object('key',v_placement->>'itemId','title',v_asset->>'title','url',v_asset->>'url')
           or v_session->'content'->v_kind->((v_placement->>'position')::integer) is distinct from v_item then
           raise exception 'Invalid imported placement' using errcode='22023'; end if;
         if exists(select 1 from jsonb_array_elements(v_old_session->'content'->v_kind) where value->>'key'=v_item->>'key')
           then raise exception 'Destination item already exists' using errcode='40001'; end if;
       end loop;
       if v_retained is distinct from v_old_session->'content'->v_kind then
         raise exception 'Import cannot remove, edit or reorder existing content' using errcode='22023'; end if;
     end loop;
   end loop;
   if (select jsonb_agg(value->>'key') from jsonb_array_elements(v_new->'sessions')) is distinct from
      (select jsonb_agg(value->>'key') from jsonb_array_elements(v_old->'sessions')) then
      raise exception 'Import cannot reorder sessions' using errcode='22023'; end if;
   v_old_documents:=v_old_documents||jsonb_build_array(jsonb_build_object('templateId',v_head.id,'productCode',v_head.product_code,
     'revision',v_head.latest_revision,'document',v_old));
 end loop;
 if cardinality(v_item_keys)<>jsonb_array_length(p_plan->'placements')
   or exists(select 1 from jsonb_array_elements(p_plan->'assets') a where not exists(
     select 1 from jsonb_array_elements(p_plan->'placements') p where p.value->>'assetId'=a.value->>'assetId')) then
   raise exception 'Import contains unused or duplicate scope' using errcode='22023'; end if;
 return v_old_documents;
end;
$$;

create function public.preview_v2_content_import(p_plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.validate_v2_content_import(p_plan);
 return jsonb_build_object('fingerprint',encode(sha256(convert_to(p_plan::text,'UTF8')),'hex'),
   'assets',jsonb_array_length(p_plan->'assets'),'placements',jsonb_array_length(p_plan->'placements'),
   'templates',jsonb_array_length(p_plan->'drafts'),'published',false);
end;
$$;

create function public.apply_v2_content_import(p_id uuid,p_plan jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_imports%rowtype; v_previous jsonb; v_draft jsonb; v_asset jsonb; v_place jsonb; v_result jsonb;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_id is null or p_fingerprint is distinct from encode(sha256(convert_to(p_plan::text,'UTF8')),'hex') then
   raise exception 'Reviewed import fingerprint required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-import:'||p_id::text,0));
 select * into v_saved from public.v2_content_imports where id=p_id;
 if found then
   if v_saved.actor_id<>auth.uid() or v_saved.plan<>p_plan or v_saved.recovered_at is not null then
     raise exception 'Import identifier belongs to another operation' using errcode='22023'; end if;
   return v_saved.result||jsonb_build_object('replayed',true);
 end if;
 v_previous:=public.validate_v2_content_import(p_plan);
 for v_asset in select value from jsonb_array_elements(p_plan->'assets') loop
   insert into public.v2_shared_content_assets(id,source_label,source_table,source_id,source_field,source_hash,title,url)
     values((v_asset->>'assetId')::uuid,p_plan->>'source',v_asset#>>'{source,table}',(v_asset#>>'{source,id}')::uuid,
       v_asset->>'urlField',v_asset#>>'{source,rowHash}',v_asset->>'title',v_asset->>'url') on conflict(id) do nothing;
   insert into public.v2_shared_content_asset_revisions(asset_id,revision,title,url,actor_id)
     values((v_asset->>'assetId')::uuid,1,v_asset->>'title',v_asset->>'url',auth.uid()) on conflict(asset_id,revision) do nothing;
 end loop;
 for v_draft in select value from jsonb_array_elements(p_plan->'drafts') order by value->>'templateId' loop
   perform public.save_v2_template_draft((v_draft->>'templateId')::uuid,v_draft->>'productCode',
     (v_draft->>'expectedRevision')::integer,gen_random_uuid(),v_draft->'document');
 end loop;
 v_result:=jsonb_build_object('importId',p_id,'assets',jsonb_array_length(p_plan->'assets'),
   'placements',jsonb_array_length(p_plan->'placements'),'templates',jsonb_array_length(p_plan->'drafts'),
   'imported',true,'published',false,'replayed',false);
 insert into public.v2_content_imports(id,actor_id,plan,fingerprint,previous_documents,result)
   values(p_id,auth.uid(),p_plan,p_fingerprint,v_previous,v_result);
 for v_place in select value from jsonb_array_elements(p_plan->'placements') loop
   insert into public.v2_content_asset_placements(template_id,item_id,session_key,content_kind,asset_id,import_id)
     values((v_place#>>'{target,templateId}')::uuid,(v_place->>'itemId')::uuid,(v_place#>>'{target,sessionKey}')::uuid,
       v_place#>>'{target,contentKind}',(v_place->>'assetId')::uuid,p_id);
 end loop;
 return v_result;
end;
$$;

create function public.recover_v2_content_import(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_imports%rowtype; v_previous jsonb; v_latest integer;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-import:'||p_id::text,0));
 select * into v_saved from public.v2_content_imports where id=p_id for update;
 if not found then raise exception 'Import not found' using errcode='22023'; end if;
 if v_saved.recovered_at is not null then return jsonb_build_object('importId',p_id,'recovered',true,'replayed',true); end if;
 for v_previous in select value from jsonb_array_elements(v_saved.previous_documents) order by value->>'templateId' loop
   select latest_revision into v_latest from public.v2_course_templates where id=(v_previous->>'templateId')::uuid for update;
   if v_latest<>(v_previous->>'revision')::integer+1 then raise exception 'Destination changed after import' using errcode='40001'; end if;
   if exists(select 1 from public.v2_course_batches where template_id=(v_previous->>'templateId')::uuid and template_revision=v_latest) then
     raise exception 'Imported revision is pinned by a batch; batch recovery requires separate review' using errcode='40001'; end if;
   perform public.save_v2_template_draft((v_previous->>'templateId')::uuid,v_previous->>'productCode',v_latest,gen_random_uuid(),v_previous->'document');
 end loop;
 delete from public.v2_content_asset_placements where import_id=p_id;
 update public.v2_content_imports set recovered_at=statement_timestamp(),recovered_by=auth.uid() where id=p_id;
 return jsonb_build_object('importId',p_id,'recovered',true,'replayed',false,'sharedAssetsRetained',true);
end;
$$;
revoke all on function public.validate_v2_content_import(jsonb),public.preview_v2_content_import(jsonb),
  public.apply_v2_content_import(uuid,jsonb,text),public.recover_v2_content_import(uuid) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_content_import(jsonb),public.apply_v2_content_import(uuid,jsonb,text),public.recover_v2_content_import(uuid) to authenticated;
create table public.v2_shared_content_asset_revisions (
  asset_id uuid not null references public.v2_shared_content_assets(id),
  revision integer not null check(revision>0),
  title text not null,
  url text not null,
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  primary key(asset_id,revision)
);
create table public.v2_content_asset_replacements (
  id uuid primary key,
  actor_id uuid not null references public.profiles(id),
  request jsonb not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp()
);
alter table public.v2_content_asset_placements add column asset_revision integer not null default 1;
alter table public.v2_content_asset_placements add constraint v2_placement_asset_revision
  foreign key(asset_id,asset_revision) references public.v2_shared_content_asset_revisions(asset_id,revision);
alter table public.v2_shared_content_asset_revisions enable row level security;
alter table public.v2_content_asset_replacements enable row level security;
revoke all on public.v2_shared_content_asset_revisions,public.v2_content_asset_replacements from public,anon,authenticated,service_role;
grant select on public.v2_shared_content_asset_revisions,public.v2_content_asset_replacements to authenticated;
create policy v2_asset_revision_admin_read on public.v2_shared_content_asset_revisions for select to authenticated using(public.is_portal_admin());
create policy v2_asset_replacement_admin_read on public.v2_content_asset_replacements for select to authenticated using(public.is_portal_admin());

create function public.build_v2_asset_replacement(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_asset uuid; v_template uuid; v_revision integer; v_document jsonb; v_place record;
 v_scope jsonb:='[]'; v_items jsonb; v_session_index integer; v_item_index integer; v_next integer;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if jsonb_typeof(p_request) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_request))<>4
   or not(p_request ?& array['assetId','title','url','templateIds'])
   or coalesce(p_request->>'title','')='' or length(p_request->>'title')>120
   or p_request->>'title'<>btrim(p_request->>'title',E' \t\n\r\f\013')
   or length(p_request->>'url')>2048
   or coalesce(p_request->>'url','') !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$'
   or jsonb_typeof(p_request->'templateIds') is distinct from 'array' then raise exception 'Invalid replacement scope' using errcode='22023'; end if;
 if jsonb_array_length(p_request->'templateIds') not between 1 and 100 or
   (select count(distinct value) from jsonb_array_elements(p_request->'templateIds'))<>jsonb_array_length(p_request->'templateIds')
   then raise exception 'Select unique destination templates' using errcode='22023'; end if;
 v_asset:=(p_request->>'assetId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('v2-asset:'||v_asset::text,0));
 if not exists(select 1 from public.v2_shared_content_assets where id=v_asset) then raise exception 'Shared asset not found' using errcode='22023'; end if;
 select coalesce(max(revision),0)+1 into v_next from public.v2_shared_content_asset_revisions where asset_id=v_asset;
 for v_template in select value::uuid from jsonb_array_elements_text(p_request->'templateIds') order by value loop
   select latest_revision into v_revision from public.v2_course_templates where id=v_template for update;
   select document into v_document from public.v2_course_template_revisions where template_id=v_template and revision=v_revision;
   if v_document is null then raise exception 'Destination not found' using errcode='40001'; end if;
   v_items:='[]';
   for v_place in select p.*,r.title,r.url from public.v2_content_asset_placements p
      join public.v2_shared_content_asset_revisions r on r.asset_id=p.asset_id and r.revision=p.asset_revision
      where p.asset_id=v_asset and p.template_id=v_template order by p.item_id loop
     select ordinality::integer-1 into v_session_index from jsonb_array_elements(v_document->'sessions') with ordinality where value->>'key'=v_place.session_key::text;
     select ordinality::integer-1 into v_item_index from jsonb_array_elements(v_document->'sessions'->v_session_index->'content'->v_place.content_kind) with ordinality
       where value->>'key'=v_place.item_id::text;
     if v_session_index is null or v_item_index is null or
       v_document->'sessions'->v_session_index->'content'->v_place.content_kind->v_item_index is distinct from
       jsonb_build_object('key',v_place.item_id,'title',v_place.title,'url',v_place.url) then
       raise exception 'A destination item changed; a new mapping review is required' using errcode='40001'; end if;
     v_document:=jsonb_set(v_document,array['sessions',v_session_index::text,'content',v_place.content_kind,v_item_index::text],
       jsonb_build_object('key',v_place.item_id,'title',p_request->>'title','url',p_request->>'url'));
     v_items:=v_items||jsonb_build_array(jsonb_build_object('itemId',v_place.item_id,'previousAssetRevision',v_place.asset_revision));
   end loop;
   if jsonb_array_length(v_items)=0 then raise exception 'Selected template does not reference the asset' using errcode='22023'; end if;
   v_scope:=v_scope||jsonb_build_array(jsonb_build_object('templateId',v_template,'expectedRevision',v_revision,'document',v_document,'items',v_items));
 end loop;
 return jsonb_build_object('request',p_request,'assetRevision',v_next,'scope',v_scope);
end;
$$;

create function public.preview_v2_asset_replacement(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_plan jsonb;
begin
 v_plan:=public.build_v2_asset_replacement(p_request);
 return jsonb_build_object('fingerprint',encode(sha256(convert_to(v_plan::text,'UTF8')),'hex'),
   'assetRevision',v_plan->'assetRevision','scope',(select jsonb_agg(jsonb_build_object('templateId',value->>'templateId',
     'title',value#>>'{document,title}','expectedRevision',value->'expectedRevision','items',jsonb_array_length(value->'items')))
     from jsonb_array_elements(v_plan->'scope')),'published',false);
end;
$$;

create function public.apply_v2_asset_replacement(p_id uuid,p_request jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.v2_content_asset_replacements%rowtype; v_plan jsonb; v_scope jsonb; v_result jsonb;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_id is null then raise exception 'Replacement identifier required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-asset-replacement:'||p_id::text,0));
 select * into v_saved from public.v2_content_asset_replacements where id=p_id;
 if found then
   if v_saved.actor_id<>auth.uid() or v_saved.request<>p_request or v_saved.fingerprint is distinct from p_fingerprint then
     raise exception 'Replacement identifier belongs to another operation' using errcode='22023'; end if;
   return v_saved.result||jsonb_build_object('replayed',true);
 end if;
 v_plan:=public.build_v2_asset_replacement(p_request);
 if p_fingerprint is distinct from encode(sha256(convert_to(v_plan::text,'UTF8')),'hex') then
   raise exception 'Replacement scope changed; review again' using errcode='40001'; end if;
 insert into public.v2_shared_content_asset_revisions(asset_id,revision,title,url,actor_id)
   values((p_request->>'assetId')::uuid,(v_plan->>'assetRevision')::integer,p_request->>'title',p_request->>'url',auth.uid());
 for v_scope in select value from jsonb_array_elements(v_plan->'scope') loop
   perform public.save_v2_template_draft((v_scope->>'templateId')::uuid,
     (select product_code from public.v2_course_templates where id=(v_scope->>'templateId')::uuid),
     (v_scope->>'expectedRevision')::integer,gen_random_uuid(),v_scope->'document');
   update public.v2_content_asset_placements set asset_revision=(v_plan->>'assetRevision')::integer
     where asset_id=(p_request->>'assetId')::uuid and template_id=(v_scope->>'templateId')::uuid;
 end loop;
 v_result:=jsonb_build_object('replacementId',p_id,'assetId',p_request->>'assetId','assetRevision',v_plan->'assetRevision',
   'templates',jsonb_array_length(v_plan->'scope'),'published',false,'replayed',false);
 insert into public.v2_content_asset_replacements(id,actor_id,request,fingerprint,result) values(p_id,auth.uid(),p_request,p_fingerprint,v_result);
 return v_result;
end;
$$;
revoke all on function public.build_v2_asset_replacement(jsonb),public.preview_v2_asset_replacement(jsonb),
 public.apply_v2_asset_replacement(uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_asset_replacement(jsonb),public.apply_v2_asset_replacement(uuid,jsonb,text) to authenticated;

create function public.list_v2_content_import_workspace()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return jsonb_build_object(
   'assets',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'url',a.url,'templateIds',
     (select coalesce(jsonb_agg(distinct p.template_id),'[]') from public.v2_content_asset_placements p where p.asset_id=a.id)) order by a.title,a.id),'[]') from public.v2_shared_content_assets a),
   'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',r.document->>'title') order by t.id),'[]')
     from public.v2_course_templates t join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision),
   'imports',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'createdAt',i.created_at,'recovered',i.recovered_at is not null,
     'templates',i.result->'templates','placements',i.result->'placements') order by i.created_at desc),'[]') from public.v2_content_imports i));
end;
$$;
revoke all on function public.list_v2_content_import_workspace() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_content_import_workspace() to authenticated;

$ace_source$]);

-- BEGIN APPROVED SOURCE: 20261102130000_add_v2_publication_scopes.sql
-- Publication scopes pin every affected batch and private meeting revision.
-- Confirmation is atomic; a changed scope requires a fresh review.
create or replace function public.v2_publication_fingerprint(p_document jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select md5(jsonb_build_object('document',p_document,'meetingRevision',coalesce((
    select max(revision) from public.v2_batch_meeting_revisions
    where batch_id=(p_document->>'batchId')::uuid
      and batch_revision=(p_document->>'batchRevision')::integer
  ),0))::text)
$$;
create or replace function public.preview_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_document jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_document := public.build_v2_batch_publication(p_request);
  return jsonb_build_object('document',v_document,'fingerprint',public.v2_publication_fingerprint(v_document));
end;
$$;

create or replace function public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_document jsonb;
  v_saved public.v2_batch_publication_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_publication_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'Review publication before confirmation' using errcode='22023';
  end if;
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('v2-publication-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_publication_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('document',v_saved.document,'replayed',true);
  end if;
  -- Same batch lock order as draft saves. Recheck both the draft revision and
  -- publication revision after the lock so stale previews cannot win a race.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text,0));
  perform 1 from public.v2_course_batches where id=v_id for update;
  v_document := public.build_v2_batch_publication(p_request);
  if public.v2_publication_fingerprint(v_document) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='40001'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$$;


create table public.v2_publication_scope_requests (
  actor_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  request jsonb not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key(actor_id,request_id)
);
alter table public.v2_publication_scope_requests enable row level security;
revoke all on public.v2_publication_scope_requests from public,anon,authenticated,service_role;
grant select on public.v2_publication_scope_requests to authenticated;
create policy v2_scope_admin_read on public.v2_publication_scope_requests
  for select to authenticated using (public.is_portal_admin());

create or replace function public.preview_v2_publication_scope(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch record; v_input jsonb; v_document jsonb; v_items jsonb := '[]'; v_proposal jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid scope' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 3
    or not (p_request ?& array['requestId','action','productCodes'])
    or coalesce(p_request->>'action','') not in ('publish','unpublish')
    or coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_request->'productCodes') is distinct from 'array' then
    raise exception 'Invalid scope fields' using errcode='22023';
  end if;
  if jsonb_array_length(p_request->'productCodes') not between 1 and 4
    or exists(select 1 from jsonb_array_elements(p_request->'productCodes') p where
      jsonb_typeof(p) <> 'string' or p#>>'{}' not in ('full_course','quant','verbal','di'))
    or (select count(distinct p) from jsonb_array_elements(p_request->'productCodes') p) <> jsonb_array_length(p_request->'productCodes') then
    raise exception 'Invalid scope offerings' using errcode='22023';
  end if;
  for v_batch in
    select b.id,b.latest_revision,coalesce(p.revision,0) publication_revision
    from public.v2_course_batches b
    left join lateral (select revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true
    where p_request->'productCodes' ? b.product_code
      and (p_request->>'action'='publish' or p.document->>'state'='published')
    order by b.id
  loop
    if jsonb_array_length(v_items)>=100 then raise exception 'Scope exceeds 100 batches' using errcode='22023'; end if;
    v_input := jsonb_build_object('batchId',v_batch.id,'batchRevision',v_batch.latest_revision,
      'expectedRevision',v_batch.publication_revision,'requestId',p_request->>'requestId','action',p_request->>'action');
    v_document := public.build_v2_batch_publication(v_input);
    v_items := v_items || jsonb_build_array(jsonb_build_object('input',v_input,'document',v_document,
      'fingerprint',public.v2_publication_fingerprint(v_document)));
  end loop;
  if jsonb_array_length(v_items)=0 then raise exception 'No batches match this scope' using errcode='22023'; end if;
  v_proposal := jsonb_build_object('action',p_request->>'action','items',v_items);
  return jsonb_build_object('proposal',v_proposal,'fingerprint',md5(v_proposal::text));
end;
$$;

create or replace function public.save_v2_publication_scope(p_request jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_saved public.v2_publication_scope_requests%rowtype;
  v_review jsonb; v_item jsonb; v_document jsonb; v_input jsonb; v_result jsonb;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_fingerprint,'') !~ '^[0-9a-f]{32}$' then raise exception 'Scope review required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('v2-scope:' || v_actor::text || ':' || (p_request->>'requestId'),0));
  select * into v_saved from public.v2_publication_scope_requests where actor_id=v_actor and request_id=(p_request->>'requestId')::uuid;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different scope' using errcode='22023';
    end if;
    return jsonb_build_object('documents',v_saved.result,'replayed',true);
  end if;
  -- Brief write locks stabilize membership, draft heads, meeting links and publication heads.
  -- Ordinary Student reads remain available throughout the transaction.
  lock table public.v2_course_batches in exclusive mode;
  lock table public.v2_batch_meeting_revisions in share row exclusive mode;
  lock table public.v2_batch_publication_revisions in share row exclusive mode;
  v_review := public.preview_v2_publication_scope(p_request);
  if v_review->>'fingerprint' <> p_fingerprint then raise exception 'Publication scope changed' using errcode='40001'; end if;
  v_result := '[]';
  for v_item in select value from jsonb_array_elements(v_review->'proposal'->'items') loop
    v_document := v_item->'document';
    v_input := jsonb_set(v_item->'input','{requestId}',to_jsonb(gen_random_uuid()::text));
    insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
      values ((v_document->>'batchId')::uuid,(v_document->>'batchRevision')::integer,(v_document->>'revision')::integer,
        v_document,v_input,v_item->>'fingerprint',(v_input->>'requestId')::uuid,v_actor);
    v_result := v_result || jsonb_build_array(v_document);
  end loop;
  insert into public.v2_publication_scope_requests(actor_id,request_id,request,fingerprint,result)
    values(v_actor,(p_request->>'requestId')::uuid,p_request,p_fingerprint,v_result);
  return jsonb_build_object('documents',v_result,'replayed',false);
end;
$$;
revoke all on function public.v2_publication_fingerprint(jsonb),public.preview_v2_publication_scope(jsonb),
  public.save_v2_publication_scope(jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_publication_scope(jsonb),public.save_v2_publication_scope(jsonb,text) to authenticated;

-- END APPROVED SOURCE
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261102130000','add_v2_publication_scopes',array[$ace_source$-- Publication scopes pin every affected batch and private meeting revision.
-- Confirmation is atomic; a changed scope requires a fresh review.
create or replace function public.v2_publication_fingerprint(p_document jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select md5(jsonb_build_object('document',p_document,'meetingRevision',coalesce((
    select max(revision) from public.v2_batch_meeting_revisions
    where batch_id=(p_document->>'batchId')::uuid
      and batch_revision=(p_document->>'batchRevision')::integer
  ),0))::text)
$$;
create or replace function public.preview_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_document jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_document := public.build_v2_batch_publication(p_request);
  return jsonb_build_object('document',v_document,'fingerprint',public.v2_publication_fingerprint(v_document));
end;
$$;

create or replace function public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_document jsonb;
  v_saved public.v2_batch_publication_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_publication_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'Review publication before confirmation' using errcode='22023';
  end if;
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('v2-publication-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_publication_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('document',v_saved.document,'replayed',true);
  end if;
  -- Same batch lock order as draft saves. Recheck both the draft revision and
  -- publication revision after the lock so stale previews cannot win a race.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text,0));
  perform 1 from public.v2_course_batches where id=v_id for update;
  v_document := public.build_v2_batch_publication(p_request);
  if public.v2_publication_fingerprint(v_document) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='40001'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$$;


create table public.v2_publication_scope_requests (
  actor_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  request jsonb not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key(actor_id,request_id)
);
alter table public.v2_publication_scope_requests enable row level security;
revoke all on public.v2_publication_scope_requests from public,anon,authenticated,service_role;
grant select on public.v2_publication_scope_requests to authenticated;
create policy v2_scope_admin_read on public.v2_publication_scope_requests
  for select to authenticated using (public.is_portal_admin());

create or replace function public.preview_v2_publication_scope(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch record; v_input jsonb; v_document jsonb; v_items jsonb := '[]'; v_proposal jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid scope' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 3
    or not (p_request ?& array['requestId','action','productCodes'])
    or coalesce(p_request->>'action','') not in ('publish','unpublish')
    or coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_request->'productCodes') is distinct from 'array' then
    raise exception 'Invalid scope fields' using errcode='22023';
  end if;
  if jsonb_array_length(p_request->'productCodes') not between 1 and 4
    or exists(select 1 from jsonb_array_elements(p_request->'productCodes') p where
      jsonb_typeof(p) <> 'string' or p#>>'{}' not in ('full_course','quant','verbal','di'))
    or (select count(distinct p) from jsonb_array_elements(p_request->'productCodes') p) <> jsonb_array_length(p_request->'productCodes') then
    raise exception 'Invalid scope offerings' using errcode='22023';
  end if;
  for v_batch in
    select b.id,b.latest_revision,coalesce(p.revision,0) publication_revision
    from public.v2_course_batches b
    left join lateral (select revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true
    where p_request->'productCodes' ? b.product_code
      and (p_request->>'action'='publish' or p.document->>'state'='published')
    order by b.id
  loop
    if jsonb_array_length(v_items)>=100 then raise exception 'Scope exceeds 100 batches' using errcode='22023'; end if;
    v_input := jsonb_build_object('batchId',v_batch.id,'batchRevision',v_batch.latest_revision,
      'expectedRevision',v_batch.publication_revision,'requestId',p_request->>'requestId','action',p_request->>'action');
    v_document := public.build_v2_batch_publication(v_input);
    v_items := v_items || jsonb_build_array(jsonb_build_object('input',v_input,'document',v_document,
      'fingerprint',public.v2_publication_fingerprint(v_document)));
  end loop;
  if jsonb_array_length(v_items)=0 then raise exception 'No batches match this scope' using errcode='22023'; end if;
  v_proposal := jsonb_build_object('action',p_request->>'action','items',v_items);
  return jsonb_build_object('proposal',v_proposal,'fingerprint',md5(v_proposal::text));
end;
$$;

create or replace function public.save_v2_publication_scope(p_request jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_saved public.v2_publication_scope_requests%rowtype;
  v_review jsonb; v_item jsonb; v_document jsonb; v_input jsonb; v_result jsonb;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_fingerprint,'') !~ '^[0-9a-f]{32}$' then raise exception 'Scope review required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('v2-scope:' || v_actor::text || ':' || (p_request->>'requestId'),0));
  select * into v_saved from public.v2_publication_scope_requests where actor_id=v_actor and request_id=(p_request->>'requestId')::uuid;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different scope' using errcode='22023';
    end if;
    return jsonb_build_object('documents',v_saved.result,'replayed',true);
  end if;
  -- Brief write locks stabilize membership, draft heads, meeting links and publication heads.
  -- Ordinary Student reads remain available throughout the transaction.
  lock table public.v2_course_batches in exclusive mode;
  lock table public.v2_batch_meeting_revisions in share row exclusive mode;
  lock table public.v2_batch_publication_revisions in share row exclusive mode;
  v_review := public.preview_v2_publication_scope(p_request);
  if v_review->>'fingerprint' <> p_fingerprint then raise exception 'Publication scope changed' using errcode='40001'; end if;
  v_result := '[]';
  for v_item in select value from jsonb_array_elements(v_review->'proposal'->'items') loop
    v_document := v_item->'document';
    v_input := jsonb_set(v_item->'input','{requestId}',to_jsonb(gen_random_uuid()::text));
    insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
      values ((v_document->>'batchId')::uuid,(v_document->>'batchRevision')::integer,(v_document->>'revision')::integer,
        v_document,v_input,v_item->>'fingerprint',(v_input->>'requestId')::uuid,v_actor);
    v_result := v_result || jsonb_build_array(v_document);
  end loop;
  insert into public.v2_publication_scope_requests(actor_id,request_id,request,fingerprint,result)
    values(v_actor,(p_request->>'requestId')::uuid,p_request,p_fingerprint,v_result);
  return jsonb_build_object('documents',v_result,'replayed',false);
end;
$$;
revoke all on function public.v2_publication_fingerprint(jsonb),public.preview_v2_publication_scope(jsonb),
  public.save_v2_publication_scope(jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_publication_scope(jsonb),public.save_v2_publication_scope(jsonb,text) to authenticated;
$ace_source$]);

do $ace_postflight$
declare t text; r text; op text; f record;
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000','20261102100000','20261102110000','20261102120000','20261102130000']::text[])) <> 10 then
    raise exception 'Phase 2 ledger is incomplete';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; do not rerun Phase 1';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_content_asset_placements','v2_content_asset_replacements','v2_content_imports','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates','v2_live_class_completions','v2_live_registration_audit','v2_live_registrations','v2_publication_scope_requests','v2_published_meetings','v2_shared_content_asset_revisions','v2_shared_content_assets']::text[] loop
    if not exists (select 1 from pg_class where oid=to_regclass('public.'||t)
      and relkind='r' and relrowsecurity) then raise exception 'Missing table/RLS: %',t; end if;
    foreach r in array array['anon','authenticated','service_role'] loop
      foreach op in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r,'public.'||t,op) then
          raise exception 'Unexpected direct write: % % %',r,t,op;
        end if;
      end loop;
    end loop;
    if has_table_privilege('anon','public.'||t,'SELECT')
      or has_table_privilege('service_role','public.'||t,'SELECT') then
      raise exception 'Unexpected private-table read grant: %',t;
    end if;
    if not has_table_privilege('authenticated','public.'||t,'SELECT') then
      raise exception 'Missing RLS-mediated authenticated read: %',t;
    end if;
  end loop;
  foreach r in array array['apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[] loop
    if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r) <> 1 then
      raise exception 'Missing or unexpected overload of Phase 2 routine: %',r;
    end if;
  end loop;
  for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace
    and proname=any(array['apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[]) loop
    if has_function_privilege('anon',f.oid,'EXECUTE')
      or has_function_privilege('service_role',f.oid,'EXECUTE') then
      raise exception 'Unexpected RPC grant: %',f.proname;
    end if;
    if has_function_privilege('authenticated',f.oid,'EXECUTE') is distinct from
       (f.proname=any(array['apply_v2_asset_replacement','apply_v2_content_import','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration']::text[])) then
      raise exception 'Incorrect authenticated RPC grant: %',f.proname;
    end if;
  end loop;
  if (select jsonb_object_agg(code,entitlement_product_code) from public.v2_course_offerings)
    is distinct from '{"quant":"quant_crash","verbal":"verbal_crash","di":"di_crash","full_course":"full_batch"}'::jsonb then
    raise exception 'Canonical offering/Phase 1 compatibility mapping mismatch';
  end if;
end;
$ace_postflight$;
do $ace_existing_preservation$
declare t record; n bigint; h text;
begin
  for t in select * from ace_existing_before order by table_name loop
    if to_regclass('public.'||quote_ident(t.table_name)) is null then raise exception 'Existing application table missing: %',t.table_name; end if;
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from public.%I r',t.table_name) into n,h;
    if n is distinct from t.row_count or h is distinct from t.row_md5 then
      raise exception 'Existing application data changed: %; rolling back all Phase 2 changes',t.table_name;
    end if;
  end loop;
  if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')
     <> (select count(*) from ace_existing_before)+18 then
    raise exception 'Unexpected public table inventory changed';
  end if;
end;
$ace_existing_preservation$;
-- Archive-reference definitions are compared with the current database here.
-- Their presence in the manifest alone is not fresh staging verification.
do $ace_recovery_schema_guard$
declare
  expected_views jsonb := '{"worksheet_question_catalog": "afbcbf74ed26ac711e97fa832bccd93b", "worksheet_question_log_catalog": "c55468134700b8fe3d37277edf568515"}'::jsonb;
  actual_views jsonb;
begin
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='m') then
    raise exception 'Unexpected public materialized view; recovery metadata requires review';
  end if;
  select coalesce(jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true))),'{}')
    into actual_views from pg_class where relnamespace='public'::regnamespace and relkind='v';
  if actual_views is distinct from expected_views then
    raise exception 'Current public view definitions differ from the recovered archive reference; application stopped before migration writes';
  end if;
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='S') then
    raise exception 'Unexpected public sequence; recovery metadata requires review';
  end if;
end;
$ace_recovery_schema_guard$;

do $ace_recovery_schema_preservation$
declare after_fingerprint jsonb;
begin
  select jsonb_build_object(
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
    'definition_md5',md5(pg_get_viewdef(oid,true)),'acl',relacl::text,'options',reloptions)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind in ('v','m')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind='S')
) into after_fingerprint;
  if after_fingerprint is distinct from (select fingerprint from ace_recovery_schema_before) then
    raise exception 'Existing view definitions or privileges changed; rolling back Phase 2';
  end if;
end;
$ace_recovery_schema_preservation$;
do $ace_preservation$
declare after_fingerprint jsonb;
begin
  select jsonb_build_object(
  'earlier_ledger', (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'[]'))
    from supabase_migrations.schema_migrations m where version <> all(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000','20261102100000','20261102110000','20261102120000','20261102130000']::text[])),
  'phase1_tables', (select md5(jsonb_agg(jsonb_build_object('name',relname,'rls',relrowsecurity,
    'acl',relacl::text) order by relname)::text) from pg_class
    where relnamespace='public'::regnamespace and relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_columns', (select md5(jsonb_agg(to_jsonb(c) order by table_name,ordinal_position)::text)
    from information_schema.columns c where table_schema='public' and table_name=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_constraints', (select md5(jsonb_agg(jsonb_build_object('name',c.conname,
    'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname)::text)
    from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relnamespace='public'::regnamespace and t.relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_indexes', (select md5(jsonb_agg(to_jsonb(i) order by tablename,indexname)::text)
    from pg_indexes i where schemaname='public' and tablename=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_policies', (select md5(jsonb_agg(to_jsonb(p) order by tablename,policyname)::text)
    from pg_policies p where schemaname='public' and tablename=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_triggers', (select md5(jsonb_agg(jsonb_build_object('name',t.tgname,
    'definition',pg_get_triggerdef(t.oid)) order by t.tgrelid,t.tgname)::text)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal
      and c.relnamespace='public'::regnamespace and c.relname=any(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases']::text[])),
  'phase1_routines', (select md5(jsonb_agg(jsonb_build_object('name',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'acl',proacl::text) order by oid::regprocedure::text)::text)
    from pg_proc where pronamespace='public'::regnamespace and proname=any(array['can_access_v2_product','get_my_v2_access','grant_v2_purchase','quote_v2_products','reject_v2_price_rewrite','v2_access_window_contains','v2_purchase_shape']::text[])),
  'v2_price_versions', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_price_versions t),'v2_product_grants', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_product_grants t),'v2_products', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_products t),'v2_purchases', (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.v2_purchases t)
) into after_fingerprint;
  if after_fingerprint is distinct from (select fingerprint from ace_phase1_before) then
    raise exception 'Phase 1 or earlier migration ledger changed; rolling back the complete Phase 2 transaction';
  end if;
end;
$ace_preservation$;
notify pgrst, 'reload schema';
commit;
select jsonb_build_object('check','phase2_schema_activation','status','transaction committed',
  'migration_count',10,'phase1_migration_reapplied',false,'existing_public_data_preserved',true,
  'existing_view_definitions','matched archive reference at application and preserved',
  'public_sequence_count',0,'hosted_acceptance','pending') as result;
