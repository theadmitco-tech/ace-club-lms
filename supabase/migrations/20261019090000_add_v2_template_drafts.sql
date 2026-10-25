-- Phase 2 draft authoring only. No curriculum is seeded and no batch is published.
-- Shared-environment application requires separate migration approval.
begin;

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

commit;
