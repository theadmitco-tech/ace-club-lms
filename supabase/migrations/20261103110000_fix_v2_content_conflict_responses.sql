-- Deterministic content conflicts return HTTP conflict errors without transaction retry semantics.
begin;
create or replace function public.v2_content_validate(p_document jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t jsonb;d jsonb;s jsonb;kind text;seen text[]:='{}';identity text;item jsonb;
begin
 if jsonb_typeof(p_document) is distinct from 'object' or not p_document ?& array['title','kind','url','targets']
 or (select count(*) from jsonb_object_keys(p_document))<>4 then raise exception 'Invalid content fields' using errcode='22023';end if;
 kind:=p_document->>'kind';
 if kind not in ('heading','materials','recordings','preSessionReads','postSessionReads') or kind is null
 or jsonb_typeof(p_document->'title') is distinct from 'string' or length(p_document->>'title') not between 1 and 120
 or btrim(p_document->>'title')<>p_document->>'title' then raise exception 'Invalid content title or kind' using errcode='22023';end if;
 if kind='heading' then
  if p_document->'url' is distinct from 'null'::jsonb then raise exception 'Heading cannot contain a resource URL' using errcode='22023';end if;
 else
  item:=jsonb_build_object('key',gen_random_uuid(),'title',p_document->'title','url',p_document->'url');
  if not public.v2_session_content_valid(jsonb_build_object('materials',jsonb_build_array(item),'recordings','[]'::jsonb,'preSessionReads','[]'::jsonb,'postSessionReads','[]'::jsonb)) then raise exception 'Invalid content source' using errcode='22023';end if;
 end if;
 if jsonb_typeof(p_document->'targets') is distinct from 'array' or jsonb_array_length(p_document->'targets') not between 1 and 200 then raise exception 'Explicit content scope required' using errcode='22023';end if;
 for t in select value from jsonb_array_elements(p_document->'targets') loop
  if jsonb_typeof(t) is distinct from 'object' or not t ?& array['batchId','sessionKey','publicationRevision','placement','anchorKey','replaceKey','order']
   or (select count(*) from jsonb_object_keys(t))<>7
   or coalesce(t->>'batchId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(t->>'sessionKey','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(t->'publicationRevision') is distinct from 'number' or coalesce(t->>'publicationRevision','') !~ '^[1-9][0-9]{0,8}$'
   or jsonb_typeof(t->'order') is distinct from 'number' or coalesce(t->>'order','') !~ '^[0-9]{1,4}$'
   or t->>'placement' is null or t->>'placement' not in ('session','before_course','area_top','before_video','after_video','after_course')
  then raise exception 'Invalid content target' using errcode='22023';end if;
  identity:=(t->>'batchId')||':'||(t->>'sessionKey');
  if identity=any(seen) then raise exception 'Duplicate content target' using errcode='22023';end if;seen:=array_append(seen,identity);
  if kind in ('heading','recordings','materials') and t->>'placement'<>'session' then raise exception 'Only readings use the five additional placements' using errcode='22023';end if;
  perform 1 from public.v2_course_batches where id=(t->>'batchId')::uuid for share;
  select b.document into d from public.v2_batch_publication_revisions p
   join public.v2_course_batch_revisions b on b.batch_id=p.batch_id and b.revision=p.batch_revision
   where p.batch_id=(t->>'batchId')::uuid and p.revision=(t->>'publicationRevision')::integer
   and p.revision=(select max(revision) from public.v2_batch_publication_revisions where batch_id=p.batch_id)
   and p.document->>'state'='published';
  if d is null then raise exception 'Course publication changed; reload scope' using errcode='PT409';end if;
  select value into s from jsonb_array_elements(coalesce(d->'sessions','[]')||coalesce(d->'events','[]')) where value->>'key'=t->>'sessionKey' and value?'content';
  if s is null then raise exception 'Target session unavailable' using errcode='22023';end if;
  if t->>'placement' in ('before_video','after_video') then
   if not exists(select 1 from jsonb_array_elements(public.v2_compose_content(jsonb_build_object('batchId',t->>'batchId','publicationRevision',t->'publicationRevision','sessions',jsonb_build_array(s)))#>'{sessions,0,content,recordings}') r where r->>'key'=t->>'anchorKey') and not exists(select 1 from jsonb_array_elements(s#>'{content,recordings}') r where r->>'key'=t->>'anchorKey') then raise exception 'Recording placement requires a current recording anchor' using errcode='22023';end if;
  elsif t->'anchorKey' is distinct from 'null'::jsonb then raise exception 'Unexpected recording anchor' using errcode='22023';end if;
  if t->'replaceKey' is distinct from 'null'::jsonb then
   if kind='heading' or not exists(select 1 from jsonb_array_elements(s->'content'->kind) r where r->>'key'=t->>'replaceKey') then raise exception 'Original replacement item unavailable' using errcode='22023';end if;
  end if;
 end loop;
end;$$;

create or replace function public.save_v2_content_item(p_id uuid,p_expected_revision integer,p_request_id uuid,p_document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.v2_content_items%rowtype;r public.v2_content_item_revisions%rowtype;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483645 then raise exception 'Invalid draft request' using errcode='22023';end if;
 select * into r from public.v2_content_item_revisions where actor_id=auth.uid() and request_id=p_request_id;
 if found then
  if r.item_id<>p_id or r.revision<>p_expected_revision+1 or r.document<>p_document then raise exception 'Draft request token already used' using errcode='22023';end if;
  return jsonb_build_object('id',p_id,'revision',r.revision,'replayed',true);
 end if;
 perform public.v2_content_validate(p_document);
 if p_expected_revision=0 then insert into public.v2_content_items(id) values(p_id) on conflict do nothing;end if;
 select * into h from public.v2_content_items where id=p_id for update;
 if not found or h.draft_revision<>p_expected_revision or h.deleted then raise exception 'Draft changed; reload content' using errcode='PT409';end if;
 insert into public.v2_content_item_revisions values(p_id,p_expected_revision+1,p_document,auth.uid(),p_request_id,statement_timestamp());
 update public.v2_content_items set draft_revision=p_expected_revision+1 where id=p_id;
 return jsonb_build_object('id',p_id,'revision',p_expected_revision+1,'replayed',false);
end;$$;

create or replace function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.v2_content_items%rowtype;d jsonb;t jsonb;other record;old jsonb;scope jsonb:='[]';course_title text;session_title text;fingerprint text;candidate jsonb;session jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_action is null or p_action not in ('publish','unpublish','delete') then raise exception 'Invalid publication action' using errcode='22023';end if;
 select * into h from public.v2_content_items where id=p_id;
 if not found or h.draft_revision is distinct from p_revision or h.deleted then raise exception 'Content revision changed' using errcode='PT409';end if;
 select document into d from public.v2_content_item_revisions where item_id=p_id and revision=case when p_action='publish' then p_revision else coalesce(h.published_revision,p_revision) end;
 if p_action='publish' then perform public.v2_content_validate(d);end if;
 select document into old from public.v2_content_item_revisions where item_id=p_id and revision=h.published_revision;
 for t in select distinct value from jsonb_array_elements((d->'targets')||coalesce(old->'targets','[]')) loop
  select r.document->>'title' into course_title from public.v2_batch_publication_revisions r where batch_id=(t->>'batchId')::uuid order by revision desc limit 1;
  select s->>'title' into session_title from public.v2_course_batch_revisions b cross join lateral jsonb_array_elements(coalesce(b.document->'sessions','[]')||coalesce(b.document->'events','[]')) s
   where b.batch_id=(t->>'batchId')::uuid and b.revision=(select batch_revision from public.v2_batch_publication_revisions where batch_id=b.batch_id order by revision desc limit 1) and s->>'key'=t->>'sessionKey';
  scope:=scope||jsonb_build_array(t||jsonb_build_object('courseTitle',course_title,'sessionTitle',session_title));
  if p_action='publish' then
   for other in select r.document from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.published_revision where i.id<>p_id loop
    if exists(select 1 from jsonb_array_elements(other.document->'targets') x where x->>'batchId'=t->>'batchId' and x->>'sessionKey'=t->>'sessionKey'
     and ((d->>'kind'='heading' and other.document->>'kind'='heading') or (t->>'replaceKey' is not null and x->>'replaceKey'=t->>'replaceKey'))) then raise exception 'Another managed item owns this original target' using errcode='22023';end if;
   end loop;
  end if;
 end loop;
 if p_action='publish' then
  for t in select distinct jsonb_build_object('batchId',value->>'batchId') from jsonb_array_elements(d->'targets') loop
   candidate:=public.read_v2_content_preview((t->>'batchId')::uuid,p_id,p_revision);
   for session in select value from jsonb_array_elements(candidate#>'{course,sessions}') loop
    if not public.v2_session_content_valid(session->'content') then raise exception 'Resulting session exceeds content limits' using errcode='22023';end if;
   end loop;
  end loop;
 end if;
 select encode(sha256(convert_to(jsonb_build_object('head',to_jsonb(h),'document',d,'action',p_action,
 'heads',(select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]') from public.v2_content_items i),
 'publications',(select coalesce(jsonb_agg(to_jsonb(p) order by batch_id,revision),'[]') from public.v2_batch_publication_revisions p where p.batch_id in(select (x->>'batchId')::uuid from jsonb_array_elements(scope) x)))::text,'UTF8')),'hex') into fingerprint;
 return jsonb_build_object('id',p_id,'revision',p_revision,'action',p_action,'fingerprint',fingerprint,'targets',scope);
end;$$;

create or replace function public.publish_v2_content_item(p_id uuid,p_revision integer,p_action text,p_request_id uuid,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare scope jsonb;input jsonb;saved public.v2_content_publication_audit%rowtype;result jsonb;
begin
 perform public.v2_content_assert_admin();perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 input:=jsonb_build_object('id',p_id,'revision',p_revision,'action',p_action,'fingerprint',p_fingerprint);
 if p_request_id is null or coalesce(p_fingerprint,'')!~'^[0-9a-f]{64}$' then raise exception 'Reviewed scope required' using errcode='22023';end if;
 select * into saved from public.v2_content_publication_audit where id=p_request_id;
 if found then
  if saved.actor_id<>auth.uid() or saved.request<>input then raise exception 'Publication token already used' using errcode='22023';end if;return saved.result;
 end if;
 scope:=public.v2_content_scope(p_id,p_revision,p_action);
 if scope->>'fingerprint'<>p_fingerprint then raise exception 'Scope changed; review again' using errcode='PT409';end if;
 update public.v2_content_items set published_revision=case when p_action='publish' then p_revision else published_revision end,
 visible=p_action='publish',deleted=p_action='delete',publication_version=publication_version+1 where id=p_id;
 result:=jsonb_build_object('id',p_id,'action',p_action,'confirmed',true);
 insert into public.v2_content_publication_audit values(p_request_id,p_id,auth.uid(),input,result,statement_timestamp());return result;
end;$$;

create or replace function public.read_v2_content_preview(p_batch_id uuid,p_item_id uuid,p_revision integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;d jsonb;
begin
 -- Read-only authorization uses the statement snapshot; write operations retain their locking guard.
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active) then
  raise exception 'Active Admin access required' using errcode='42501';
 end if;
 if p_item_id is not null then
  select r.document into d from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision
  where i.id=p_item_id and i.draft_revision=p_revision and not i.deleted;
  if d is null or not exists(select 1 from jsonb_array_elements(d->'targets') t where t->>'batchId'=p_batch_id::text) then raise exception 'Preview revision unavailable' using errcode='PT409';end if;
 end if;
 select jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'batchRevision',p.batch_revision,'title',p.document->>'title','productCode',b.product_code,'sessions',coalesce(r.document->'sessions','[]')) into c
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_batch_id;
 if c is null then raise exception 'Published course unavailable' using errcode='22023';end if;
 c:=public.v2_compose_content(c,p_item_id,p_revision);
 return jsonb_build_object('course',c,'placements',public.v2_content_placements(c,p_item_id,p_revision));
end;$$;
commit;
