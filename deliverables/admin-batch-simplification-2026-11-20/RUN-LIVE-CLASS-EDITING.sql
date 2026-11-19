-- Staging application packet. The deployment operator verifies the target before execution.
-- The packet preserves every current public table dynamically, including all 92 expected staging tables.
-- Source SHA-256: 7128d3044b6a8c8819399acb25f8287d48682e360e028e4a0750c9296dc25cfb
-- No course publication, enrollment, purchase or payment operation is performed.
begin;
set local timezone='UTC';
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table live_class_expected_functions on commit drop as
select * from jsonb_to_recordset('[{"signature":"assert_v2_batch_request(jsonb)","before":"9ea0873db8a56370ee5c97eb25e3ba2d","after":"7ce4271b58244f89f061eb53d6d602a4"},{"signature":"build_v2_batch_draft(jsonb)","before":"77b7199da5350706feb4fea24928083a","after":"86665aa8a81b21912a8564191f117105"},{"signature":"build_v2_batch_publication(jsonb)","before":"7523d5acfd53a4c7b152d60beba4c4f6","after":"adb033360ffae94ed48fb1c4845bdd7e"},{"signature":"assert_v2_completed_class_preservation(uuid,jsonb)","before":null,"after":"23823d5ff015043fd2c1b5d26ce50621"}]'::jsonb) as g(signature text,before text,after text);

do $preflight$ declare g record;p record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version='20261120100000') then raise exception 'Live-class editing migration already recorded; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103120000')
   or not exists(select 1 from supabase_migrations.schema_migrations where version='20261113110000') then raise exception 'Current integration and fulfillment baseline required';end if;
 for g in select * from live_class_expected_functions loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||g.signature);
  if g.before is null then
   if found then raise exception 'Unrecorded completed-class validator exists';end if;
  else
   if not found or md5(p.prosrc)<>g.before or p.proconfig is distinct from array['search_path=""']
      or p.provolatile::text<>(case when g.signature='assert_v2_batch_request(jsonb)' then 'i' else 's' end)
      or p.prosecdef is distinct from (g.signature<>'assert_v2_batch_request(jsonb)') then
     raise exception 'Reviewed function baseline mismatch: %',g.signature;
   end if;
   if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in(select oid from pg_roles where rolname in('anon','authenticated','service_role')))) then
     raise exception 'Unexpected baseline function privilege: %',g.signature;
   end if;
  end if;
 end loop;
end;$preflight$;

create temporary table live_class_relations on commit drop as
select oid,relname,relkind from pg_class where relnamespace='public'::regnamespace and relkind in('r','p','v','m','S');
create temporary table live_class_functions on commit drop as
select oid from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table live_class_rows(relation oid primary key,row_count bigint,row_md5 text) on commit drop;
do $capture$ declare t record;n bigint;h text;begin
 for t in select * from live_class_relations where relkind in('r','p') order by relname loop
  execute format('lock table public.%I in share mode',t.relname);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.relname) into n,h;
  insert into live_class_rows values(t.oid,n,h);
 end loop;
end;$capture$;
create temporary table live_class_ledger on commit drop as
select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]'::jsonb) document from supabase_migrations.schema_migrations m;

create function pg_temp.live_class_metadata() returns jsonb language sql as $metadata$
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('id',p.oid,'signature',p.oid::regprocedure::text,
   'definition',case when p.oid in(select to_regprocedure('public.'||signature) from live_class_expected_functions where before is not null) then null else pg_get_functiondef(p.oid) end,
   'acl',p.proacl::text,'owner',p.proowner,'definer',p.prosecdef,'configuration',p.proconfig,'volatility',p.provolatile,'language',p.prolang)
   order by p.oid) from pg_proc p join live_class_functions f on f.oid=p.oid),
 'relations',(select jsonb_agg(jsonb_build_object('id',c.oid,'name',c.relname,'kind',c.relkind,'owner',c.relowner,'acl',c.relacl::text,'rls',c.relrowsecurity,'forcedRls',c.relforcerowsecurity)
   order by c.oid) from pg_class c join live_class_relations r on r.oid=c.oid),
 'columns',(select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_attribute a where a.attrelid in(select oid from live_class_relations)),
 'defaults',(select jsonb_agg(jsonb_build_object('relation',d.adrelid,'column',d.adnum,'definition',pg_get_expr(d.adbin,d.adrelid)) order by d.adrelid,d.adnum)
   from pg_attrdef d where d.adrelid in(select oid from live_class_relations)),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname='public'),
 'constraints',(select jsonb_agg(jsonb_build_object('relation',c.conrelid,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname)
   from pg_constraint c where c.conrelid in(select oid from live_class_relations)),
 'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public'),
 'triggers',(select jsonb_agg(jsonb_build_object('relation',t.tgrelid,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) order by t.tgrelid,t.tgname)
   from pg_trigger t where t.tgrelid in(select oid from live_class_relations) or t.tgrelid='auth.users'::regclass),
 'views',(select jsonb_agg(jsonb_build_object('id',r.oid,'definition',pg_get_viewdef(r.oid,true)) order by r.oid) from live_class_relations r where relkind in('v','m'))
);$metadata$;
create temporary table live_class_preserved_metadata on commit drop as select pg_temp.live_class_metadata() document;

-- Live-class edits produce new private batch revisions. Published history remains immutable.
-- Shared-environment application requires a separately reviewed migration step.

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
    if (select count(*) from jsonb_object_keys(v_event)) <> (6 + case when v_event ? 'kind' then 1 else 0 end + case when v_event ? 'title' then 1 else 0 end + case when v_event ? 'section' then 1 else 0 end)
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
    if v_event ? 'title' and (jsonb_typeof(v_event->'title') is distinct from 'string'
      or length(v_event->>'title') not between case when v_event->>'kind'='outline' then 0 else 1 end and 120
      or v_event->>'title' <> btrim(v_event->>'title', E' \t\n\r\f\013')) then
      raise exception 'Invalid class title' using errcode='22023';
    end if;
    if v_event ? 'section' and (jsonb_typeof(v_event->'section') is distinct from 'string'
      or v_event->>'section' not in ('quant','verbal','di')) then
      raise exception 'Invalid class subject' using errcode='22023';
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

create or replace function public.assert_v2_completed_class_preservation(p_batch_id uuid,p_events jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare v_completed jsonb; v_candidate jsonb;
begin
  for v_completed in
    select e from public.v2_live_class_completions c
      join public.v2_batch_publication_revisions p on p.batch_id=c.batch_id and p.revision=c.publication_revision,
      jsonb_array_elements(p.document->'events') e
      where c.batch_id=p_batch_id and e->>'key'=c.event_key::text
  loop
    select e into v_candidate from jsonb_array_elements(p_events) e where e->>'key'=v_completed->>'key';
    if not found or coalesce(v_candidate->>'kind','live') <> 'live'
      or v_candidate->>'title' is distinct from v_completed->>'title'
      or v_candidate->>'section' is distinct from v_completed->>'section'
      or v_candidate->>'startsAt' is distinct from v_completed->>'startsAt'
      or v_candidate->>'endsAt' is distinct from v_completed->>'endsAt'
      or v_candidate->>'instructor' is distinct from v_completed->>'instructor' then
      raise exception 'Completed live classes cannot be removed or changed' using errcode='22023';
    end if;
  end loop;
end;
$$;
revoke all on function public.assert_v2_completed_class_preservation(uuid,jsonb) from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.build_v2_batch_draft(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := '[]'; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer; v_sessions jsonb; v_sections text[]; v_inputs jsonb; v_identity jsonb;
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>'expectedRevision')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>'id')::uuid) then
      raise exception 'Batch revision changed' using errcode='PT409';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>'templateId')::uuid and t.latest_revision=(p_request->>'templateRevision')::integer;
    if not found then raise exception 'Template revision changed' using errcode='PT409'; end if;

  else
    select * into v_head from public.v2_course_batches where id=(p_request->>'id')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception 'Batch revision changed' using errcode='PT409'; end if;
    if v_head.state <> 'draft' then raise exception 'Only draft schedules can be changed here' using errcode='22023'; end if;
    if v_head.template_id <> (p_request->>'templateId')::uuid or v_head.template_revision <> (p_request->>'templateRevision')::integer then
      raise exception 'Batch template identity cannot change' using errcode='22023';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>'startDate' <> p_request->>'startDate' then
      raise exception 'Template anchor date cannot change; edit event dates instead' using errcode='22023';
    end if;
    if exists(select 1 from jsonb_array_elements(v_source->'events') e
      where e->>'kind'='outline' and not exists(select 1 from jsonb_array_elements(p_request->'events') n where n->>'key'=e->>'key')) then
      raise exception 'Outline events must be preserved' using errcode='22023';
    end if;
  end if;
  select sections into v_sections from public.v2_course_offerings where code=v_product;
  v_inputs := case when v_revision=0 then v_source->'events' else p_request->'events' end;
  v_sessions := case when p_request ? 'sessions' then p_request->'sessions' else v_source->'sessions' end;
  if v_sessions is not null then
    if not public.v2_course_sessions_valid(v_sessions,v_sections) then raise exception 'Invalid course sessions or content scope' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(v_sessions) s join jsonb_array_elements(v_inputs) e on s->>'key'=e->>'key') then
      raise exception 'Course session and live event identifiers must be distinct' using errcode='22023';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_inputs) loop
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
      v_edit := v_event;
      select value into v_identity from jsonb_array_elements(v_source->'events') where value->>'key'=v_edit->>'key';
      if found then
        if v_edit ? 'section' and v_edit->>'section' is distinct from v_identity->>'section' then
          raise exception 'Existing class subject must be preserved' using errcode='22023';
        end if;
        if v_identity->>'kind'='outline' and v_edit ? 'title' and v_edit->>'title' is distinct from v_identity->>'title' then
          raise exception 'Outline title must be preserved' using errcode='22023';
        end if;
        v_event := v_identity || case when v_edit ? 'title' then jsonb_build_object('title',v_edit->>'title') else '{}'::jsonb end;
      else
        if coalesce(v_edit->>'kind','live') <> 'live' or not(v_edit ?& array['title','section'])
          or not((v_edit->>'section')=any(v_sections)) then
          raise exception 'New live classes require a title and included subject' using errcode='22023';
        end if;
        if exists(select 1 from public.v2_course_batch_revisions r, jsonb_array_elements(r.document->'events') e
          where r.batch_id=v_head.id and e->>'key'=v_edit->>'key') then
          raise exception 'Removed class identifiers cannot be reused' using errcode='22023';
        end if;
        if exists(select 1 from public.v2_course_batch_revisions r, jsonb_array_elements(coalesce(r.document->'sessions','[]'::jsonb)) s
          where r.batch_id=v_head.id and s->>'key'=v_edit->>'key') then
          raise exception 'Course session and live event identifiers must be distinct' using errcode='22023';
        end if;
      end if;
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
  perform public.assert_v2_completed_class_preservation((p_request->>'id')::uuid,v_events);
  return jsonb_build_object('id',p_request->>'id','productCode',v_product,'templateId',p_request->>'templateId',
    'templateRevision',p_request->'templateRevision','revision',v_revision+1,'state','draft',
    'title',p_request->>'title','startDate',p_request->>'startDate','timeZone','Asia/Kolkata','events',v_events)
    || case when v_sessions is not null then jsonb_build_object('sessions',v_sessions) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.build_v2_batch_publication(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_draft jsonb; v_previous jsonb; v_sections text[]; v_current integer;
  v_event jsonb; v_events jsonb := '[]'; v_live boolean := false; v_sessions jsonb;
begin
  perform public.assert_v2_publication_request(p_request);
  select r.document, p.sections into v_draft, v_sections from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    join public.v2_course_offerings p on p.code=b.product_code
    where b.id=(p_request->>'batchId')::uuid and b.latest_revision=(p_request->>'batchRevision')::integer;
  if not found then raise exception 'Batch revision changed' using errcode='PT409'; end if;
  select document,revision into v_previous,v_current from public.v2_batch_publication_revisions
    where batch_id=(p_request->>'batchId')::uuid order by revision desc limit 1;
  if coalesce(v_current,0) <> (p_request->>'expectedRevision')::integer then
    raise exception 'Publication revision changed' using errcode='PT409';
  end if;
  if p_request->>'action'='unpublish' and coalesce(v_previous->>'state','') <> 'published' then
    raise exception 'Only a published batch can be unpublished' using errcode='22023';
  end if;
  if p_request->>'action'='publish' then
    perform public.assert_v2_completed_class_preservation((p_request->>'batchId')::uuid,v_draft->'events');
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
$function$
;
revoke all on function public.assert_v2_batch_request(jsonb),public.build_v2_batch_draft(jsonb),public.build_v2_batch_publication(jsonb)
  from public,anon,authenticated,service_role;


do $postflight$ declare t record;n bigint;h text;g record;p record;begin
 for t in select r.*,x.row_count,x.row_md5 from live_class_relations r join live_class_rows x on x.relation=r.oid loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.relname) into n,h;
  if n<>t.row_count or h<>t.row_md5 then raise exception 'Application data changed: %',t.relname;end if;
 end loop;
 if pg_temp.live_class_metadata() is distinct from (select document from live_class_preserved_metadata) then raise exception 'Existing schema or security metadata changed outside reviewed scope';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind in('r','p','v','m','S'))<>(select count(*) from live_class_relations) then raise exception 'Relation inventory changed';end if;
 if (select count(*) from pg_proc where pronamespace='public'::regnamespace and prokind='f')<>(select count(*)+1 from live_class_functions) then raise exception 'Function inventory changed outside reviewed scope';end if;
 for g in select * from live_class_expected_functions loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||g.signature);
  if not found or md5(p.prosrc)<>g.after or p.proconfig is distinct from array['search_path=""']
    or p.provolatile::text<>(case when g.signature='assert_v2_batch_request(jsonb)' then 'i' else 's' end)
    or p.prosecdef is distinct from (g.signature<>'assert_v2_batch_request(jsonb)') then raise exception 'Installed function mismatch: %',g.signature;end if;
  if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in(select oid from pg_roles where rolname in('anon','authenticated','service_role')))) then raise exception 'Installed function privilege mismatch: %',g.signature;end if;
 end loop;
 if (select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations m) is distinct from (select document from live_class_ledger) then raise exception 'Original migration ledger changed';end if;
end;$postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements)
values('20261120100000','add_v2_live_class_editing',array['-- Live-class edits produce new private batch revisions. Published history remains immutable.
-- Shared-environment application requires a separately reviewed migration step.
begin;

create or replace function public.assert_v2_batch_request(p_request jsonb)
returns void language plpgsql immutable set search_path = '''' as $$
declare v_event jsonb; v_keys text[] := array[]::text[]; v_field text;
begin
  if jsonb_typeof(p_request) is distinct from ''object'' then raise exception ''Invalid batch request'' using errcode=''22023''; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> (9 + case when p_request ? ''sessions'' then 1 else 0 end)
    or not (p_request ?& array[''id'',''templateId'',''templateRevision'',''expectedRevision'',''requestId'',''title'',''startDate'',''timeZone'',''events'']) then
    raise exception ''Invalid batch fields'' using errcode=''22023'';
  end if;
  foreach v_field in array array[''id'',''templateId'',''requestId''] loop
    if jsonb_typeof(p_request->v_field) is distinct from ''string''
      or (p_request->>v_field) !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' then
      raise exception ''Invalid batch identifier'' using errcode=''22023'';
    end if;
  end loop;
  foreach v_field in array array[''templateRevision'',''expectedRevision''] loop
    if jsonb_typeof(p_request->v_field) is distinct from ''number'' or (p_request->>v_field) !~ ''^[0-9]{1,10}$'' then
      raise exception ''Invalid batch revision'' using errcode=''22023'';
    end if;
  end loop;
  if (p_request->>''expectedRevision'')::numeric not between 0 and 2147483646
    or (p_request->>''templateRevision'')::numeric not between 1 and 2147483647 then
    raise exception ''Invalid batch revision'' using errcode=''22023'';
  end if;
  if jsonb_typeof(p_request->''title'') is distinct from ''string'' or length(p_request->>''title'') not between 1 and 120
    or p_request->>''title'' <> btrim(p_request->>''title'', E'' \t\n\r\f\013'')
    or p_request->>''timeZone'' is distinct from ''Asia/Kolkata''
    or jsonb_typeof(p_request->''startDate'') is distinct from ''string'' then
    raise exception ''Invalid batch title or time zone'' using errcode=''22023'';
  end if;
  if p_request->>''startDate'' <> '''' then perform public.v2_batch_date(p_request->>''startDate''); end if;
  if (p_request->>''expectedRevision'')::integer = 0 then
    if p_request ? ''sessions'' then raise exception ''New batch content must come from the template'' using errcode=''22023''; end if;
    if p_request->''events'' <> ''null''::jsonb then raise exception ''New batch events must come from the template'' using errcode=''22023''; end if;
    return;
  end if;
  if jsonb_typeof(p_request->''events'') is distinct from ''array'' then raise exception ''Invalid batch events'' using errcode=''22023''; end if;
  if jsonb_array_length(p_request->''events'') not between 0 and 100 then raise exception ''Invalid batch events'' using errcode=''22023''; end if;
  for v_event in select value from jsonb_array_elements(p_request->''events'') loop
    if jsonb_typeof(v_event) is distinct from ''object'' then raise exception ''Invalid batch event'' using errcode=''22023''; end if;
    if (select count(*) from jsonb_object_keys(v_event)) <> (6 + case when v_event ? ''kind'' then 1 else 0 end + case when v_event ? ''title'' then 1 else 0 end + case when v_event ? ''section'' then 1 else 0 end)
      or not (v_event ?& array[''key'',''localDate'',''localStartTime'',''durationMinutes'',''instructor'',''capacity'']) then
      raise exception ''Invalid batch event fields'' using errcode=''22023'';
    end if;
    if jsonb_typeof(v_event->''key'') is distinct from ''string''
      or (v_event->>''key'') !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
      or v_event->>''key'' = any(v_keys)

      or jsonb_typeof(v_event->''instructor'') is distinct from ''string''
      or length(v_event->>''instructor'') > 120
      or v_event->>''instructor'' <> btrim(v_event->>''instructor'', E'' \t\n\r\f\013'') then
      raise exception ''Invalid batch event values'' using errcode=''22023'';
    end if;
    if v_event ? ''title'' and (jsonb_typeof(v_event->''title'') is distinct from ''string''
      or length(v_event->>''title'') not between case when v_event->>''kind''=''outline'' then 0 else 1 end and 120
      or v_event->>''title'' <> btrim(v_event->>''title'', E'' \t\n\r\f\013'')) then
      raise exception ''Invalid class title'' using errcode=''22023'';
    end if;
    if v_event ? ''section'' and (jsonb_typeof(v_event->''section'') is distinct from ''string''
      or v_event->>''section'' not in (''quant'',''verbal'',''di'')) then
      raise exception ''Invalid class subject'' using errcode=''22023'';
    end if;
    v_keys := array_append(v_keys, v_event->>''key'');
    if v_event ? ''kind'' and (jsonb_typeof(v_event->''kind'') is distinct from ''string'' or v_event->>''kind'' not in (''live'',''outline'')) then raise exception ''Invalid event kind'' using errcode=''22023''; end if;
    if jsonb_typeof(v_event->''capacity'') is distinct from ''number'' or (v_event->>''capacity'') !~ ''^[0-9]{1,4}$'' then raise exception ''Invalid historical capacity'' using errcode=''22023''; end if;
    if (v_event->>''capacity'')::integer not between 1 and 1000 then raise exception ''Invalid historical capacity'' using errcode=''22023''; end if;
    if v_event->>''kind''=''outline'' then
      if v_event->''localDate'' <> ''null''::jsonb or v_event->''localStartTime'' <> ''null''::jsonb or v_event->''durationMinutes'' <> ''null''::jsonb then raise exception ''Invalid outline timing'' using errcode=''22023''; end if;
      continue;
    end if;
    if jsonb_typeof(v_event->''localDate'') is distinct from ''string'' or jsonb_typeof(v_event->''localStartTime'') is distinct from ''string''
      or (v_event->>''localStartTime'') !~ ''^([01][0-9]|2[0-3]):[0-5][0-9]$'' then raise exception ''Invalid live timing'' using errcode=''22023''; end if;
    perform public.v2_batch_date(v_event->>''localDate'');
    if jsonb_typeof(v_event->''durationMinutes'') is distinct from ''number'' or (v_event->>''durationMinutes'') !~ ''^[0-9]{1,3}$''
      or jsonb_typeof(v_event->''capacity'') is distinct from ''number'' or (v_event->>''capacity'') !~ ''^[0-9]{1,4}$'' then
      raise exception ''Invalid batch event duration or capacity'' using errcode=''22023'';
    end if;
    if (v_event->>''durationMinutes'')::integer not between 15 and 720 or (v_event->>''capacity'')::integer not between 0 and 1000 then
      raise exception ''Invalid batch event duration or capacity'' using errcode=''22023'';
    end if;
  end loop;
end;
$$;

create or replace function public.assert_v2_completed_class_preservation(p_batch_id uuid,p_events jsonb)
returns void language plpgsql stable security definer set search_path='''' as $$
declare v_completed jsonb; v_candidate jsonb;
begin
  for v_completed in
    select e from public.v2_live_class_completions c
      join public.v2_batch_publication_revisions p on p.batch_id=c.batch_id and p.revision=c.publication_revision,
      jsonb_array_elements(p.document->''events'') e
      where c.batch_id=p_batch_id and e->>''key''=c.event_key::text
  loop
    select e into v_candidate from jsonb_array_elements(p_events) e where e->>''key''=v_completed->>''key'';
    if not found or coalesce(v_candidate->>''kind'',''live'') <> ''live''
      or v_candidate->>''title'' is distinct from v_completed->>''title''
      or v_candidate->>''section'' is distinct from v_completed->>''section''
      or v_candidate->>''startsAt'' is distinct from v_completed->>''startsAt''
      or v_candidate->>''endsAt'' is distinct from v_completed->>''endsAt''
      or v_candidate->>''instructor'' is distinct from v_completed->>''instructor'' then
      raise exception ''Completed live classes cannot be removed or changed'' using errcode=''22023'';
    end if;
  end loop;
end;
$$;
revoke all on function public.assert_v2_completed_class_preservation(uuid,jsonb) from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.build_v2_batch_draft(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
declare
  v_head public.v2_course_batches%rowtype;
  v_source jsonb; v_product text; v_event jsonb; v_edit jsonb;
  v_events jsonb := ''[]''; v_date date; v_start timestamptz; v_end timestamptz;
  v_revision integer; v_sessions jsonb; v_sections text[]; v_inputs jsonb; v_identity jsonb;
begin
  perform public.assert_v2_batch_request(p_request);
  v_revision := (p_request->>''expectedRevision'')::integer;
  if v_revision = 0 then
    if exists (select 1 from public.v2_course_batches where id=(p_request->>''id'')::uuid) then
      raise exception ''Batch revision changed'' using errcode=''PT409'';
    end if;
    select r.document, t.product_code into v_source, v_product from public.v2_course_templates t
      join public.v2_course_template_revisions r on r.template_id=t.id and r.revision=t.latest_revision
      where t.id=(p_request->>''templateId'')::uuid and t.latest_revision=(p_request->>''templateRevision'')::integer;
    if not found then raise exception ''Template revision changed'' using errcode=''PT409''; end if;

  else
    select * into v_head from public.v2_course_batches where id=(p_request->>''id'')::uuid;
    if not found or v_head.latest_revision <> v_revision then raise exception ''Batch revision changed'' using errcode=''PT409''; end if;
    if v_head.state <> ''draft'' then raise exception ''Only draft schedules can be changed here'' using errcode=''22023''; end if;
    if v_head.template_id <> (p_request->>''templateId'')::uuid or v_head.template_revision <> (p_request->>''templateRevision'')::integer then
      raise exception ''Batch template identity cannot change'' using errcode=''22023'';
    end if;
    select document into v_source from public.v2_course_batch_revisions where batch_id=v_head.id and revision=v_revision;
    v_product := v_head.product_code;
    if v_source->>''startDate'' <> p_request->>''startDate'' then
      raise exception ''Template anchor date cannot change; edit event dates instead'' using errcode=''22023'';
    end if;
    if exists(select 1 from jsonb_array_elements(v_source->''events'') e
      where e->>''kind''=''outline'' and not exists(select 1 from jsonb_array_elements(p_request->''events'') n where n->>''key''=e->>''key'')) then
      raise exception ''Outline events must be preserved'' using errcode=''22023'';
    end if;
  end if;
  select sections into v_sections from public.v2_course_offerings where code=v_product;
  v_inputs := case when v_revision=0 then v_source->''events'' else p_request->''events'' end;
  v_sessions := case when p_request ? ''sessions'' then p_request->''sessions'' else v_source->''sessions'' end;
  if v_sessions is not null then
    if not public.v2_course_sessions_valid(v_sessions,v_sections) then raise exception ''Invalid course sessions or content scope'' using errcode=''22023''; end if;
    if exists(select 1 from jsonb_array_elements(v_sessions) s join jsonb_array_elements(v_inputs) e on s->>''key''=e->>''key'') then
      raise exception ''Course session and live event identifiers must be distinct'' using errcode=''22023'';
    end if;
  end if;
  for v_event in select value from jsonb_array_elements(v_inputs) loop
    if v_revision = 0 and v_event->>''kind''=''outline'' then
      v_edit := jsonb_build_object(''key'',v_event->>''key'',''kind'',''outline'',''localDate'',null,''localStartTime'',null,
        ''durationMinutes'',null,''instructor'',v_event->>''instructor'',''capacity'',v_event->''capacity'');
    elsif v_revision = 0 then
      v_date := public.v2_batch_date(p_request->>''startDate'') + (v_event->>''dayOffset'')::integer;
      v_edit := jsonb_build_object(''key'',v_event->>''key'',''localDate'',to_char(v_date,''YYYY-MM-DD''),
        ''localStartTime'',v_event->>''localStartTime'',''durationMinutes'',v_event->''durationMinutes'',
        ''instructor'',v_event->>''instructor'',''capacity'',v_event->''capacity'')
        || case when v_event ? ''kind'' then jsonb_build_object(''kind'',v_event->>''kind'') else ''{}''::jsonb end;
    else
      v_edit := v_event;
      select value into v_identity from jsonb_array_elements(v_source->''events'') where value->>''key''=v_edit->>''key'';
      if found then
        if v_edit ? ''section'' and v_edit->>''section'' is distinct from v_identity->>''section'' then
          raise exception ''Existing class subject must be preserved'' using errcode=''22023'';
        end if;
        if v_identity->>''kind''=''outline'' and v_edit ? ''title'' and v_edit->>''title'' is distinct from v_identity->>''title'' then
          raise exception ''Outline title must be preserved'' using errcode=''22023'';
        end if;
        v_event := v_identity || case when v_edit ? ''title'' then jsonb_build_object(''title'',v_edit->>''title'') else ''{}''::jsonb end;
      else
        if coalesce(v_edit->>''kind'',''live'') <> ''live'' or not(v_edit ?& array[''title'',''section''])
          or not((v_edit->>''section'')=any(v_sections)) then
          raise exception ''New live classes require a title and included subject'' using errcode=''22023'';
        end if;
        if exists(select 1 from public.v2_course_batch_revisions r, jsonb_array_elements(r.document->''events'') e
          where r.batch_id=v_head.id and e->>''key''=v_edit->>''key'') then
          raise exception ''Removed class identifiers cannot be reused'' using errcode=''22023'';
        end if;
        if exists(select 1 from public.v2_course_batch_revisions r, jsonb_array_elements(coalesce(r.document->''sessions'',''[]''::jsonb)) s
          where r.batch_id=v_head.id and s->>''key''=v_edit->>''key'') then
          raise exception ''Course session and live event identifiers must be distinct'' using errcode=''22023'';
        end if;
      end if;
    end if;
    if v_event ? ''content'' then v_edit := v_edit || jsonb_build_object(''content'',v_event->''content''); end if;
    -- Item type belongs to the source snapshot. Rescheduling cannot turn a
    -- blank outline into a live event without a separately reviewed content edit.
    if coalesce(v_edit->>''kind'',''live'') <> coalesce(v_event->>''kind'',''live'') then raise exception ''Event kind must be preserved'' using errcode=''22023''; end if;
    if v_edit->>''kind''=''outline'' then
      v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object(''title'',v_event->>''title'',''section'',v_event->>''section'',''startsAt'',null,''endsAt'',null));
      continue;
    end if;
    v_date := public.v2_batch_date(v_edit->>''localDate'');
    v_start := (v_date + (v_edit->>''localStartTime'')::time) at time zone ''Asia/Kolkata'';
    v_end := v_start + make_interval(mins => (v_edit->>''durationMinutes'')::integer);
    v_events := v_events || jsonb_build_array(v_edit || jsonb_build_object(''title'',v_event->>''title'',''section'',v_event->>''section'',
      ''startsAt'',to_char(v_start at time zone ''UTC'',''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"''),
      ''endsAt'',to_char(v_end at time zone ''UTC'',''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'')));
  end loop;
  perform public.assert_v2_completed_class_preservation((p_request->>''id'')::uuid,v_events);
  return jsonb_build_object(''id'',p_request->>''id'',''productCode'',v_product,''templateId'',p_request->>''templateId'',
    ''templateRevision'',p_request->''templateRevision'',''revision'',v_revision+1,''state'',''draft'',
    ''title'',p_request->>''title'',''startDate'',p_request->>''startDate'',''timeZone'',''Asia/Kolkata'',''events'',v_events)
    || case when v_sessions is not null then jsonb_build_object(''sessions'',v_sessions) else ''{}''::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.build_v2_batch_publication(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
declare
  v_draft jsonb; v_previous jsonb; v_sections text[]; v_current integer;
  v_event jsonb; v_events jsonb := ''[]''; v_live boolean := false; v_sessions jsonb;
begin
  perform public.assert_v2_publication_request(p_request);
  select r.document, p.sections into v_draft, v_sections from public.v2_course_batches b
    join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=b.latest_revision
    join public.v2_course_offerings p on p.code=b.product_code
    where b.id=(p_request->>''batchId'')::uuid and b.latest_revision=(p_request->>''batchRevision'')::integer;
  if not found then raise exception ''Batch revision changed'' using errcode=''PT409''; end if;
  select document,revision into v_previous,v_current from public.v2_batch_publication_revisions
    where batch_id=(p_request->>''batchId'')::uuid order by revision desc limit 1;
  if coalesce(v_current,0) <> (p_request->>''expectedRevision'')::integer then
    raise exception ''Publication revision changed'' using errcode=''PT409'';
  end if;
  if p_request->>''action''=''unpublish'' and coalesce(v_previous->>''state'','''') <> ''published'' then
    raise exception ''Only a published batch can be unpublished'' using errcode=''22023'';
  end if;
  if p_request->>''action''=''publish'' then
    perform public.assert_v2_completed_class_preservation((p_request->>''batchId'')::uuid,v_draft->''events'');
  end if;
  for v_event in select value from jsonb_array_elements(v_draft->''events'') loop
    if coalesce(v_event->>''kind'',''live'')=''live'' then
      if nullif(v_event->>''title'','''') is null or v_event->>''startsAt'' is null or v_event->>''endsAt'' is null then
        raise exception ''Live sessions require a topic and exact schedule'' using errcode=''22023'';
      end if;
      v_live := true;
    end if;
    -- Explicit projection excludes historical per-event capacity and any future
    -- private draft metadata. No meeting table is queried.
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      ''key'',v_event->>''key'',''title'',v_event->>''title'',''section'',v_event->>''section'',
      ''kind'',coalesce(v_event->>''kind'',''live''),''startsAt'',v_event->''startsAt'',
      ''endsAt'',v_event->''endsAt'',''instructor'',v_event->>''instructor''));
  end loop;
  -- Publish course headings independently from live events. Private content is
  -- pinned by batch_revision and stays in the Admin-only course revision.
  if v_draft ? ''sessions'' then
    select coalesce(jsonb_agg(jsonb_build_object(''key'',value->>''key'',''title'',value->>''title'',''section'',value->>''section'') order by n),''[]''::jsonb)
      into v_sessions from jsonb_array_elements(v_draft->''sessions'') with ordinality as item(value,n);
  end if;
  return jsonb_build_object(''batchId'',p_request->>''batchId'',''batchRevision'',p_request->''batchRevision'',
    ''revision'',coalesce(v_current,0)+1,''state'',case when p_request->>''action''=''publish'' then ''published'' else ''unpublished'' end,
    ''productCode'',v_draft->>''productCode'',''title'',v_draft->>''title'',''sections'',to_jsonb(v_sections),
    ''timeZone'',''Asia/Kolkata'',''liveRegistrationLimit'',case when v_live then 8 else null end,''events'',v_events)
    || case when v_sessions is not null then jsonb_build_object(''sessions'',v_sessions) else ''{}''::jsonb end;
end;
$function$
;
revoke all on function public.assert_v2_batch_request(jsonb),public.build_v2_batch_draft(jsonb),public.build_v2_batch_publication(jsonb)
  from public,anon,authenticated,service_role;

commit;
']);
notify pgrst,'reload schema';
select jsonb_build_object('check','live_class_editing','migration','20261120100000','publicTablesPreserved',(select count(*) from live_class_rows),
 'existingRowsPreserved',true,'existingMetadataPreserved',true,'originalLedgerPreserved',true,'publishedSchedulesChanged',false);
commit;
