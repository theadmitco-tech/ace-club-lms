-- Approved A1: preserve historical drafts and permit undated non-live outline items.
-- No existing rows are rewritten. Shared application requires separate approval.
begin;

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
    if (select count(*) from jsonb_object_keys(v_event)) <> (8 + case when v_event ? 'kind' then 1 else 0 end)
      or not (v_event ?& array['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor']) then return false; end if;
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
  if p_request->>'startDate' <> '' then perform public.v2_batch_date(p_request->>'startDate'); end if;
  if (p_request->>'expectedRevision')::integer = 0 then
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
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events);
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
  select r.document into v_batch from public.v2_live_batches b
    join public.v2_live_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
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
commit;
