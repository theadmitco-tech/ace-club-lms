-- Admin-only immutable schedule publication. Student eligibility and the public
-- registration catalogue remain undecided; no Student/anon reader is granted.
-- Publication neither changes purchases nor exposes private meeting drafts.
begin;

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
  v_event jsonb; v_events jsonb := '[]'; v_live boolean := false;
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
  return jsonb_build_object('batchId',p_request->>'batchId','batchRevision',p_request->'batchRevision',
    'revision',coalesce(v_current,0)+1,'state',case when p_request->>'action'='publish' then 'published' else 'unpublished' end,
    'productCode',v_draft->>'productCode','title',v_draft->>'title','sections',to_jsonb(v_sections),
    'timeZone','Asia/Kolkata','liveRegistrationLimit',case when v_live then 8 else null end,'events',v_events);
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
commit;
