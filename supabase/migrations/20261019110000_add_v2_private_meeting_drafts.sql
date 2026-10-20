-- Private Admin meeting drafts only. No student join or publication path.
begin;

create table if not exists public.v2_batch_meeting_revisions (
  batch_id uuid not null,
  batch_revision integer not null,
  revision integer not null check (revision > 0),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  request_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, revision),
  foreign key (batch_id, batch_revision) references public.v2_live_batch_revisions(batch_id, revision) on delete restrict,
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
  select r.document into v_batch from public.v2_live_batches b
    join public.v2_live_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
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
  v_head public.v2_live_batches%rowtype; v_batch jsonb; v_saved public.v2_batch_meeting_revisions%rowtype;
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
  select * into v_head from public.v2_live_batches where id=v_id for update;
  if not found then raise exception 'Draft batch unavailable' using errcode='22023'; end if;
  if v_head.state <> 'draft' then raise exception 'Only draft meeting details can be changed here' using errcode='22023'; end if;
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='40001'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='40001'; end if;
  select document into v_batch from public.v2_live_batch_revisions where batch_id=v_id and revision=v_head.latest_revision;
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
commit;
