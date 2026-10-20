-- Independent draft schedules only. Shared migration application needs approval.
begin;

create table if not exists public.v2_live_batches (
  id uuid primary key,
  template_id uuid not null,
  template_revision integer not null,
  product_code text not null,
  latest_revision integer not null check (latest_revision >= 0),
  state text not null default 'draft' check (state = 'draft'),
  foreign key (template_id, template_revision) references public.v2_course_template_revisions(template_id, revision) on delete restrict,
  foreign key (template_id, product_code) references public.v2_course_templates(id, product_code) on delete restrict
);
create table if not exists public.v2_live_batch_revisions (
  batch_id uuid not null references public.v2_live_batches(id) on delete restrict,
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
  if not exists (select 1 from pg_constraint where conrelid='public.v2_live_batches'::regclass and conname='v2_batch_current_revision') then
    alter table public.v2_live_batches add constraint v2_batch_current_revision
      foreign key (id, latest_revision) references public.v2_live_batch_revisions(batch_id, revision)
      deferrable initially deferred;
  end if;
end $$;

alter table public.v2_live_batches enable row level security;
alter table public.v2_live_batch_revisions enable row level security;
revoke all on public.v2_live_batches, public.v2_live_batch_revisions from public, anon, authenticated, service_role;
grant select on public.v2_live_batches, public.v2_live_batch_revisions to authenticated;
drop policy if exists v2_batch_admin_read on public.v2_live_batches;
create policy v2_batch_admin_read on public.v2_live_batches for select to authenticated using (public.is_portal_admin());
drop policy if exists v2_batch_revision_admin_read on public.v2_live_batch_revisions;
create policy v2_batch_revision_admin_read on public.v2_live_batch_revisions for select to authenticated using (public.is_portal_admin());

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
  v_head public.v2_live_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer;
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_live_batches where id=(p_request->>'id')::uuid) then
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
    select * into v_head from public.v2_live_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='40001'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_live_batch_revisions where batch_id=v_head.id and revision=v_revision;
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
  v_actor uuid := auth.uid(); v_draft jsonb; v_saved public.v2_live_batch_revisions%rowtype;
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
  select * into v_saved from public.v2_live_batch_revisions where actor_id=v_actor and request_id=v_token;
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
    perform 1 from public.v2_live_batches where id=v_id for update;
  end if;
  v_draft := public.build_v2_batch_draft(p_request);
  -- This checksum binds confirmation to the reviewed projection. It is not an
  -- authorization token; active Admin identity and all data are revalidated.
  if md5(v_draft::text) <> p_fingerprint then raise exception 'The reviewed schedule changed' using errcode='40001'; end if;
  if v_expected = 0 then
    insert into public.v2_live_batches(id,template_id,template_revision,product_code,latest_revision)
      values (v_id,(p_request->>'templateId')::uuid,(p_request->>'templateRevision')::integer,v_draft->>'productCode',0);
  end if;
  insert into public.v2_live_batch_revisions(batch_id,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,v_expected+1,v_draft,p_request,p_fingerprint,v_token,v_actor);
  update public.v2_live_batches set latest_revision=v_expected+1 where id=v_id;
  return jsonb_build_object('draft',v_draft,'replayed',false);
end;
$$;

create or replace function public.list_v2_batch_drafts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(r.document order by r.created_at desc,b.id),'[]'::jsonb)
    from public.v2_live_batches b join public.v2_live_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    where b.state='draft');
end;
$$;

revoke all on function public.v2_batch_date(text), public.assert_v2_batch_request(jsonb), public.build_v2_batch_draft(jsonb),
  public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts()
  from public, anon, authenticated, service_role;
grant execute on function public.preview_v2_batch_draft(jsonb), public.save_v2_batch_draft(jsonb,text), public.list_v2_batch_drafts() to authenticated;

commit;
