-- Deterministic revision conflicts return HTTP 409 without serialization retries.
-- Existing function signatures, permissions and migration records remain preserved.
begin;
do $guard$declare r jsonb;begin
 for r in select value from jsonb_array_elements('[{"signature":"public.apply_v2_asset_replacement(uuid, jsonb, text)","before":"60c31500f3b1b459727e6576fc44aead","after":"30efa3b36710f356a73642e369e05031"},{"signature":"public.begin_v2_recording_watch(uuid, uuid, uuid, integer)","before":"2c5bdc2ca7e07b21842d134631653259","after":"f06688f3ed29bf6aa1ae22c4b43d878c"},{"signature":"public.build_v2_asset_replacement(jsonb)","before":"3b88e74764439c10249ac2b81c802aad","after":"06cf186b526479576a1eccc1ac81e599"},{"signature":"public.build_v2_batch_draft(jsonb)","before":"4524513bded4ac18e4e6ec9202fbb525","after":"77b7199da5350706feb4fea24928083a"},{"signature":"public.build_v2_batch_publication(jsonb)","before":"80334c979243f139db66247a7954f813","after":"7523d5acfd53a4c7b152d60beba4c4f6"},{"signature":"public.complete_v2_live_class(uuid, uuid, integer)","before":"d7c38f642d9401bf3f9aa6ff2c1f39d1","after":"b705612c86f1905bcbeb0a97ff9e6f57"},{"signature":"public.record_v2_recording_sample(uuid, uuid, numeric, numeric, boolean)","before":"4f9130871c8e964e30cf3ad72e5918df","after":"b7dcd1d691950055ce2ebe32b4c92ef1"},{"signature":"public.recover_v2_content_import(uuid)","before":"1414fccace18dbc9b5a7b59fd5407c16","after":"cbc8a1f41402317d16f2977db8d8ac44"},{"signature":"public.save_v2_batch_draft(jsonb, text)","before":"ba1bbf80bffab7b424a790c9af3ca6a4","after":"7d9b14e6c2147ff2a5329f1bb15c4e84"},{"signature":"public.save_v2_batch_publication(jsonb, text)","before":"17356d39d6c21bc0d6ef0a0567af2ac9","after":"6a48f06a8f10e10925d4c7985cd02d0d"},{"signature":"public.save_v2_meeting_draft(jsonb)","before":"5415af740cd0cd701b9285de56256771","after":"b286337c0a4454f67946433260734c3c"},{"signature":"public.save_v2_publication_scope(jsonb, text)","before":"f11aa3e9a9ddf596be6f07785a7019eb","after":"71e3f02d4dd62f4e2bb25cb0410ce175"},{"signature":"public.save_v2_template_draft(uuid, text, integer, uuid, jsonb)","before":"49648c317673831d01fb59e1f9c9b633","after":"272a7072ff0863494acd404d87af2844"},{"signature":"public.set_v2_batch_enrollment(uuid, uuid, boolean, integer)","before":"1a231be65aaef78fc9d582630fa52354","after":"40c1078557ec84b44f1446b520f204b5"},{"signature":"public.set_v2_live_registration(uuid, uuid, boolean, integer)","before":"fb03986e55984d73101f7148b056d060","after":"9f89846244f2a9daed65a3b015c9753e"},{"signature":"public.set_v2_live_session_mapping(uuid, uuid, uuid, integer)","before":"6b841c0cb819a2bdaedc797bc06f9dbc","after":"2dd6298794de00ec10885d0979bf09b9"},{"signature":"public.v2_store_session_feedback(uuid, uuid, uuid, jsonb, text)","before":"17396fefc3f9e71f1759fd82ad205e88","after":"5faa1fca02d12174d8d24322f15bd6f5"},{"signature":"public.validate_v2_content_import(jsonb)","before":"760dcacd5f22ea4dddae83b229394faa","after":"0fba2d1f70f3fe8d14bf47f4a0936ab6"}]'::jsonb) loop
  if not exists(select 1 from pg_proc where oid=to_regprocedure(r->>'signature') and md5(prosrc)=r->>'before') then raise exception 'Integration conflict repair source mismatch: %',r->>'signature';end if;
 end loop;
end;$guard$;
CREATE OR REPLACE FUNCTION public.apply_v2_asset_replacement(p_id uuid, p_request jsonb, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   raise exception 'Replacement scope changed; review again' using errcode='PT409'; end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.begin_v2_recording_watch(p_batch_id uuid, p_session_key uuid, p_recording_key uuid, p_publication_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_recording jsonb; w public.v2_recording_watch_sessions%rowtype; v_seconds numeric;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if not public.v2_recording_player_supported(v_recording->>'url') then raise exception 'Player observation is unavailable for this recording' using errcode='22023'; end if;
 insert into public.v2_recording_watch_sessions(student_id,batch_id,session_key,recording_key,publication_revision,url_hash)
 values(auth.uid(),p_batch_id,p_session_key,p_recording_key,p_publication_revision,encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')) on conflict do nothing;
 select * into strict w from public.v2_recording_watch_sessions where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and recording_key=p_recording_key and publication_revision=p_publication_revision;
 if w.url_hash<>encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex') then raise exception 'Recording changed; reload the published session' using errcode='PT409'; end if;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 return jsonb_build_object('watchId',w.id,'thresholdPercent',80,'watchedSeconds',v_seconds,'durationSeconds',w.duration_seconds,
 'due',exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and source='recording' and source_key=p_recording_key and feedback_id is null));
end; $function$
;
CREATE OR REPLACE FUNCTION public.build_v2_asset_replacement(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   if v_document is null then raise exception 'Destination not found' using errcode='PT409'; end if;
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
       raise exception 'A destination item changed; a new mapping review is required' using errcode='PT409'; end if;
     v_document:=jsonb_set(v_document,array['sessions',v_session_index::text,'content',v_place.content_kind,v_item_index::text],
       jsonb_build_object('key',v_place.item_id,'title',p_request->>'title','url',p_request->>'url'));
     v_items:=v_items||jsonb_build_array(jsonb_build_object('itemId',v_place.item_id,'previousAssetRevision',v_place.asset_revision));
   end loop;
   if jsonb_array_length(v_items)=0 then raise exception 'Selected template does not reference the asset' using errcode='22023'; end if;
   v_scope:=v_scope||jsonb_build_array(jsonb_build_object('templateId',v_template,'expectedRevision',v_revision,'document',v_document,'items',v_items));
 end loop;
 return jsonb_build_object('request',p_request,'assetRevision',v_next,'scope',v_scope);
end;
$function$
;
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
  v_revision integer; v_sessions jsonb; v_sections text[];
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
CREATE OR REPLACE FUNCTION public.complete_v2_live_class(p_batch_id uuid, p_event_key uuid, p_publication_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_saved public.v2_live_class_completions%rowtype;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform 1 from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key;
  if found then
    if v_saved.publication_revision<>p_publication_revision then raise exception 'Completion belongs to another publication' using errcode='PT409'; end if;
    return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',true);
  end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.revision is distinct from p_publication_revision then raise exception 'Publication changed; reload the class list' using errcode='PT409'; end if;
  if v_publication.document->>'state'<>'published' or not exists (
    select 1 from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live'
  ) then raise exception 'Published live class required' using errcode='22023'; end if;
  insert into public.v2_live_class_completions(batch_id,event_key,publication_revision,actor_id)
    values(p_batch_id,p_event_key,p_publication_revision,auth.uid()) returning * into v_saved;
  return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.record_v2_recording_sample(p_watch_id uuid, p_request_id uuid, p_position_seconds numeric, p_duration_seconds numeric, p_playing boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.v2_recording_watch_sessions%rowtype; v_recording jsonb; v_input jsonb; v_saved public.v2_recording_watch_samples%rowtype;
 v_elapsed numeric; v_seconds numeric; v_result jsonb; v_due boolean; v_start bigint; v_end bigint;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into w from public.v2_recording_watch_sessions where id=p_watch_id and student_id=auth.uid() for update;
 if not found then raise exception 'Recording observation unavailable' using errcode='42501'; end if;
 v_recording:=public.v2_learning_recording(w.batch_id,w.session_key,w.recording_key,w.publication_revision);
 if encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')<>w.url_hash then raise exception 'Recording changed; reload the session' using errcode='PT409'; end if;
 if p_request_id is null or p_position_seconds is null or p_duration_seconds is null or p_playing is null
 or p_position_seconds::text in ('NaN','Infinity','-Infinity') or p_duration_seconds::text in ('NaN','Infinity','-Infinity')
 or p_duration_seconds<1 or p_duration_seconds>43200 or p_position_seconds<0 or p_position_seconds>p_duration_seconds+1
 then raise exception 'Invalid player observation' using errcode='22023'; end if;
 v_input:=jsonb_build_object('position',p_position_seconds,'duration',p_duration_seconds,'playing',p_playing);
 select * into v_saved from public.v2_recording_watch_samples where watch_id=w.id and request_id=p_request_id;
 if found then
  if v_saved.request<>v_input then raise exception 'Observation request was already used' using errcode='22023'; end if;
  return v_saved.result;
 end if;
 if w.duration_seconds is not null and abs(w.duration_seconds-p_duration_seconds)>2 then raise exception 'Recording duration changed' using errcode='22023'; end if;
 w.duration_seconds:=coalesce(w.duration_seconds,ceil(p_duration_seconds)::integer);
 v_elapsed:=extract(epoch from statement_timestamp()-w.last_seen_at);
 if w.last_playing and w.last_position is not null and v_elapsed between 0.5 and 20
 and p_position_seconds>w.last_position and p_position_seconds-w.last_position<=v_elapsed*2+1 then
  -- Millisecond intervals preserve fractional continuity; overlapping playback adds no duplicate credit.
  v_start:=floor(w.last_position*1000)::bigint;v_end:=least(floor(p_position_seconds*1000)::bigint,w.duration_seconds::bigint*1000);
  if v_end>v_start then w.covered:=w.covered+int8multirange(int8range(v_start,v_end,'[)')); end if;
 end if;
 update public.v2_recording_watch_sessions set duration_seconds=w.duration_seconds,last_position=p_position_seconds,last_seen_at=statement_timestamp(),last_playing=p_playing,covered=w.covered where id=w.id;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 if v_seconds*100>=w.duration_seconds*80 then
  perform public.v2_add_feedback_obligation(auth.uid(),w.batch_id,w.session_key,v_recording->>'sessionTitle',v_recording->>'section','recording',w.recording_key,w.publication_revision);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=w.batch_id and session_key=w.session_key and source='recording' and source_key=w.recording_key and feedback_id is null) into v_due;
 v_result:=jsonb_build_object('due',v_due,'watchedSeconds',v_seconds,'thresholdPercent',80);
 insert into public.v2_recording_watch_samples(watch_id,request_id,request,result) values(w.id,p_request_id,v_input,v_result);
 return v_result;
end; $function$
;
CREATE OR REPLACE FUNCTION public.recover_v2_content_import(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_saved public.v2_content_imports%rowtype; v_previous jsonb; v_latest integer;
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-import:'||p_id::text,0));
 select * into v_saved from public.v2_content_imports where id=p_id for update;
 if not found then raise exception 'Import not found' using errcode='22023'; end if;
 if v_saved.recovered_at is not null then return jsonb_build_object('importId',p_id,'recovered',true,'replayed',true); end if;
 for v_previous in select value from jsonb_array_elements(v_saved.previous_documents) order by value->>'templateId' loop
   select latest_revision into v_latest from public.v2_course_templates where id=(v_previous->>'templateId')::uuid for update;
   if v_latest<>(v_previous->>'revision')::integer+1 then raise exception 'Destination changed after import' using errcode='PT409'; end if;
   if exists(select 1 from public.v2_course_batches where template_id=(v_previous->>'templateId')::uuid and template_revision=v_latest) then
     raise exception 'Imported revision is pinned by a batch; batch recovery requires separate review' using errcode='PT409'; end if;
   perform public.save_v2_template_draft((v_previous->>'templateId')::uuid,v_previous->>'productCode',v_latest,gen_random_uuid(),v_previous->'document');
 end loop;
 delete from public.v2_content_asset_placements where import_id=p_id;
 update public.v2_content_imports set recovered_at=statement_timestamp(),recovered_by=auth.uid() where id=p_id;
 return jsonb_build_object('importId',p_id,'recovered',true,'replayed',false,'sharedAssetsRetained',true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_v2_batch_draft(p_request jsonb, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if md5(v_draft::text) <> p_fingerprint then raise exception 'The reviewed schedule changed' using errcode='PT409'; end if;
  if v_expected = 0 then
    insert into public.v2_course_batches(id,template_id,template_revision,product_code,latest_revision)
      values (v_id,(p_request->>'templateId')::uuid,(p_request->>'templateRevision')::integer,v_draft->>'productCode',0);
  end if;
  insert into public.v2_course_batch_revisions(batch_id,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,v_expected+1,v_draft,p_request,p_fingerprint,v_token,v_actor);
  update public.v2_course_batches set latest_revision=v_expected+1 where id=v_id;
  return jsonb_build_object('draft',v_draft,'replayed',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if public.v2_publication_fingerprint(v_document) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='PT409'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_v2_meeting_draft(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if v_head.latest_revision <> (p_request->>'batchRevision')::integer then raise exception 'Batch revision changed' using errcode='PT409'; end if;
  select coalesce(max(revision),0) into v_current from public.v2_batch_meeting_revisions where batch_id=v_id;
  if v_current <> v_expected then raise exception 'Meeting revision changed' using errcode='PT409'; end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.save_v2_publication_scope(p_request jsonb, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if v_review->>'fingerprint' <> p_fingerprint then raise exception 'Publication scope changed' using errcode='PT409'; end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.save_v2_template_draft(p_id uuid, p_product_code text, p_expected_revision integer, p_request_id uuid, p_document jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if not found then raise exception 'Template revision changed' using errcode = 'PT409'; end if;
  if v_head.product_code <> p_product_code then
    raise exception 'Template product cannot change' using errcode = '22023';
  end if;
  if v_head.latest_revision <> p_expected_revision then
    raise exception 'Template revision changed' using errcode = 'PT409';
  end if;
  insert into public.v2_course_template_revisions(template_id, product_code, revision, document, request_id, actor_id)
    values (p_id, p_product_code, p_expected_revision + 1, p_document, p_request_id, v_actor);
  update public.v2_course_templates set latest_revision = p_expected_revision + 1 where id = p_id;
  return jsonb_build_object('template', jsonb_build_object('id', p_id, 'productCode', p_product_code,
    'revision', p_expected_revision + 1, 'document', p_document), 'replayed', false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_v2_batch_enrollment(p_batch_id uuid, p_student_id uuid, p_active boolean, p_expected_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if coalesce(v_revision,0) <> p_expected_revision then raise exception 'Enrollment changed; reload the roster' using errcode='PT409'; end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.set_v2_live_registration(p_batch_id uuid, p_student_id uuid, p_active boolean, p_expected_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_product text; v_current integer; v_publication jsonb;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid registration request' using errcode='22023'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select revision into v_current from public.v2_live_registrations where batch_id=p_batch_id and student_id=p_student_id;
  if coalesce(v_current,0)<>p_expected_revision then raise exception 'Registration changed; reload the roster' using errcode='PT409'; end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.set_v2_live_session_mapping(p_batch_id uuid, p_event_key uuid, p_session_key uuid, p_publication_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_session jsonb;
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform 1 from public.v2_course_batches where id=p_batch_id for update;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.revision is distinct from p_publication_revision or v_publication.document->>'state'<>'published' then raise exception 'Publication changed; reload the class list' using errcode='PT409'; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
 select s into v_session from jsonb_array_elements(v_publication.document->'sessions') s where s->>'key'=p_session_key::text;
 if v_event is null or v_session is null or v_event->>'section' is distinct from v_session->>'section' then raise exception 'A published session in the live class subject is required' using errcode='22023'; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then raise exception 'Completed class mappings are immutable' using errcode='22023'; end if;
 if exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision and session_key=p_session_key) then return jsonb_build_object('saved',true,'replayed',true); end if;
 insert into public.v2_live_session_mappings(batch_id,event_key,publication_revision,session_key,actor_id)
 values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid())
 on conflict(batch_id,event_key,publication_revision) do update set session_key=excluded.session_key,actor_id=excluded.actor_id,updated_at=statement_timestamp();
 insert into public.v2_live_session_mapping_audit(batch_id,event_key,publication_revision,session_key,actor_id) values(p_batch_id,p_event_key,p_publication_revision,p_session_key,auth.uid());
 return jsonb_build_object('saved',true,'replayed',false);
end; $function$
;
CREATE OR REPLACE FUNCTION public.v2_store_session_feedback(p_obligation_id uuid, p_student_id uuid, p_request_id uuid, p_response jsonb, p_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.v2_feedback_obligations%rowtype; v_saved public.v2_session_feedback%rowtype; v_live boolean;
begin
 perform 1 from public.profiles where id=p_student_id for update;
 if not found then raise exception 'Feedback owner unavailable' using errcode='42501'; end if;
 select * into o from public.v2_feedback_obligations where id=p_obligation_id and student_id=p_student_id for update;
 if not found then raise exception 'Feedback obligation unavailable' using errcode='42501'; end if;
 if p_request_id is null or p_event_id is null or length(p_event_id) not between 1 and 200 or p_response is null or jsonb_typeof(p_response)<>'object'
 or not p_response ?& array['usefulness','clarity','comment','attendance'] or (select count(*) from jsonb_object_keys(p_response))<>4
 or (p_response->>'attendance'='missed' and (p_response->'usefulness'<>'null'::jsonb or p_response->'clarity'<>'null'::jsonb))
 or (p_response->>'attendance'<>'missed' and (jsonb_typeof(p_response->'usefulness')<>'number' or jsonb_typeof(p_response->'clarity')<>'number' or p_response->>'usefulness' !~ '^[1-5]$' or p_response->>'clarity' !~ '^[1-5]$'))
 or jsonb_typeof(p_response->'comment')<>'string' or length(p_response->>'comment')>4000
 or jsonb_typeof(p_response->'attendance')<>'string' or p_response->>'attendance' not in ('attended','missed','recording') then raise exception 'Invalid feedback response' using errcode='22023'; end if;
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception 'Feedback was already submitted; reload the session' using errcode='PT409'; end if;
  return jsonb_build_object('submitted',true,'replayed',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and source='live') into v_live;
 if (v_live and p_response->>'attendance'='recording') or (not v_live and p_response->>'attendance'<>'recording') then raise exception 'Feedback attendance context changed; reload the session' using errcode='PT409'; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object('submitted',true,'replayed',false);
end; $function$
;
CREATE OR REPLACE FUNCTION public.validate_v2_content_import(p_plan jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
     raise exception 'Source revision changed' using errcode='PT409'; end if;
   select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'notNull',a.attnotnull) order by a.attname)::text,'UTF8')),'hex') into v_schema
     from pg_catalog.pg_attribute a where a.attrelid=to_regclass('public.'||v_table) and a.attnum>0 and not a.attisdropped;
   if v_schema is distinct from v_asset#>>'{source,schemaHash}' then raise exception 'Source schema changed' using errcode='PT409'; end if;
   if v_row->>(v_asset->>'titleField') is distinct from v_asset->>'title'
     or v_row->>(v_asset->>'urlField') is distinct from v_asset->>'url'
     or not (coalesce(v_asset->>'url','') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or coalesce(v_asset->>'url','') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
     then raise exception 'Source content does not match reviewed asset' using errcode='22023'; end if;
   perform pg_advisory_xact_lock(hashtextextended('v2-asset:'||(v_asset->>'assetId'),0));
   select * into v_registered from public.v2_shared_content_assets where id=(v_asset->>'assetId')::uuid;
   if found and (v_registered.source_label<>p_plan->>'source' or v_registered.source_table<>v_table
     or v_registered.source_id<>(v_asset#>>'{source,id}')::uuid or v_registered.source_field<>v_asset->>'urlField'
     or v_registered.source_hash<>v_asset#>>'{source,rowHash}' or v_registered.title<>v_asset->>'title' or v_registered.url<>v_asset->>'url') then
     raise exception 'Shared asset collision requires a separate revision' using errcode='PT409'; end if;
 end loop;
 for v_draft in select value from jsonb_array_elements(p_plan->'drafts') order by value->>'templateId' loop
   if (v_draft->>'templateId')::uuid=any(v_templates) then raise exception 'Duplicate destination' using errcode='22023'; end if;
   v_templates:=array_append(v_templates,(v_draft->>'templateId')::uuid);
   select * into v_head from public.v2_course_templates where id=(v_draft->>'templateId')::uuid for update;
   if not found or v_head.latest_revision<>(v_draft->>'expectedRevision')::integer
     or v_head.product_code<>v_draft->>'productCode' then raise exception 'Destination revision changed' using errcode='PT409'; end if;
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
           then raise exception 'Destination item already exists' using errcode='PT409'; end if;
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
$function$
;
commit;
