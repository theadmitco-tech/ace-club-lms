-- Generated from PR #24 commit 18f4bfedb1e4f927e49d8d535e0db2e7e93916ed; see ../activation-manifest.json.
-- STAGING ONLY: eyphkkginlgoaxflauog. Never run on Production.
-- ALL-SIX-MISSING PATH ONLY. Existing Phase 2 objects/ledger cause a hard stop.
-- Run 00 and 01 first, inspect drift, and complete a fresh backup/restore rehearsal.
-- Edit only the two acknowledgements below after those external checks pass.
-- These acknowledgements do not independently establish database identity/recovery.
-- The six source SQL bodies are unchanged except their transaction boundaries
-- are replaced by ONE atomic transaction containing all six ledger inserts.
-- Run this entire file, not a highlighted fragment. On error execute ROLLBACK.
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $ace_gate$
declare
  verified_project_ref text := 'REPLACE_WITH_VERIFIED_PROJECT_REF';
  backup_restore_evidence text := 'REPLACE_WITH_BACKUP_RESTORE_EVIDENCE';
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
  if exists (select 1 from supabase_migrations.schema_migrations where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000']::text[])) then
    raise exception 'A Phase 2 version is already recorded; inspect definitions and prepare only the reconciled missing set';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates']::text[] loop
    if to_regclass('public.'||t) is not null then raise exception 'Existing Phase 2 object: %; stop for drift review',t; end if;
  end loop;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array['assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_batch_draft','build_v2_batch_publication','get_my_v2_batch_schedules','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_template_drafts','preview_v2_batch_draft','preview_v2_batch_publication','read_v2_meeting_draft','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_template_draft','set_v2_batch_enrollment','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_session_content_valid','v2_student_has_product','v2_template_document_valid']::text[])) then
    raise exception 'Existing Phase 2 routine; stop for drift review';
  end if;
  foreach t in array array['v2_price_versions','v2_product_grants','v2_products','v2_purchases','profiles']::text[] loop
    if to_regclass('public.'||t) is null then raise exception 'Missing dependency: %',t; end if;
  end loop;
  if to_regprocedure('public.is_portal_admin()') is null then raise exception 'Missing Admin authorization dependency'; end if;
end;
$ace_preconditions$;
create temporary table ace_phase1_before on commit drop as select jsonb_build_object(
  'earlier_ledger', (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'[]'))
    from supabase_migrations.schema_migrations m where version <> all(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000']::text[])),
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

do $ace_postflight$
declare t text; r text; op text; f record;
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000']::text[])) <> 6 then
    raise exception 'Phase 2 ledger is incomplete';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; do not rerun Phase 1';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates']::text[] loop
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
  foreach r in array array['assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_batch_draft','build_v2_batch_publication','get_my_v2_batch_schedules','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_template_drafts','preview_v2_batch_draft','preview_v2_batch_publication','read_v2_meeting_draft','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_template_draft','set_v2_batch_enrollment','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_session_content_valid','v2_student_has_product','v2_template_document_valid']::text[] loop
    if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r) <> 1 then
      raise exception 'Missing or unexpected overload of Phase 2 routine: %',r;
    end if;
  end loop;
  for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace
    and proname=any(array['assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_batch_draft','build_v2_batch_publication','get_my_v2_batch_schedules','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_template_drafts','preview_v2_batch_draft','preview_v2_batch_publication','read_v2_meeting_draft','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_template_draft','set_v2_batch_enrollment','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_session_content_valid','v2_student_has_product','v2_template_document_valid']::text[]) loop
    if has_function_privilege('anon',f.oid,'EXECUTE')
      or has_function_privilege('service_role',f.oid,'EXECUTE') then
      raise exception 'Unexpected RPC grant: %',f.proname;
    end if;
    if has_function_privilege('authenticated',f.oid,'EXECUTE') is distinct from
       (f.proname ~ '^(save_|list_|preview_|read_|set_|get_my_)') then
      raise exception 'Incorrect authenticated RPC grant: %',f.proname;
    end if;
  end loop;
  if (select jsonb_object_agg(code,entitlement_product_code) from public.v2_course_offerings)
    is distinct from '{"quant":"quant_crash","verbal":"verbal_crash","di":"di_crash","full_course":"full_batch"}'::jsonb then
    raise exception 'Canonical offering/Phase 1 compatibility mapping mismatch';
  end if;
end;
$ace_postflight$;

do $ace_preservation$
declare after_fingerprint jsonb;
begin
  select jsonb_build_object(
  'earlier_ledger', (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'[]'))
    from supabase_migrations.schema_migrations m where version <> all(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000']::text[])),
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
select 'Phase 2 six-migration transaction committed; run 00, 01, 03 and hosted acceptance next' as result;
