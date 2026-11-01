-- Additive content transfer retains immutable source identity and unpublished revisions.
begin;
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

commit;
