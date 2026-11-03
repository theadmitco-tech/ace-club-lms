-- Independent content publication preserves original course revisions and learning records.
begin;
create table public.v2_content_items (
 id uuid primary key, draft_revision integer not null default 0,
 published_revision integer, visible boolean not null default false,
 deleted boolean not null default false, publication_version integer not null default 0
);
create table public.v2_content_item_revisions (
 item_id uuid not null references public.v2_content_items(id), revision integer not null,
 document jsonb not null, actor_id uuid not null references public.profiles(id), request_id uuid not null,
 created_at timestamptz not null default statement_timestamp(),
 primary key(item_id,revision),unique(actor_id,request_id)
);
create table public.v2_content_publication_audit (
 id uuid primary key, item_id uuid not null references public.v2_content_items(id),
 actor_id uuid not null references public.profiles(id), request jsonb not null,result jsonb not null,
 created_at timestamptz not null default statement_timestamp()
);
create function public.v2_content_key(p_id uuid,p_revision integer) returns uuid
language sql immutable set search_path='' as $$ select md5(p_id::text||':'||p_revision::text)::uuid $$;
create function public.v2_content_assert_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501';end if;
end;$$;
create function public.v2_content_validate(p_document jsonb) returns void language plpgsql security definer set search_path='' as $$
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
  if d is null then raise exception 'Course publication changed; reload scope' using errcode='40001';end if;
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
create function public.save_v2_content_item(p_id uuid,p_expected_revision integer,p_request_id uuid,p_document jsonb) returns jsonb
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
 if not found or h.draft_revision<>p_expected_revision or h.deleted then raise exception 'Draft changed; reload content' using errcode='40001';end if;
 insert into public.v2_content_item_revisions values(p_id,p_expected_revision+1,p_document,auth.uid(),p_request_id,statement_timestamp());
 update public.v2_content_items set draft_revision=p_expected_revision+1 where id=p_id;
 return jsonb_build_object('id',p_id,'revision',p_expected_revision+1,'replayed',false);
end;$$;
create function public.v2_content_anchor(p_batch uuid,p_session uuid,p_anchor uuid,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare r record;
begin
 if p_anchor is null then return null;end if;
 select i.id,v.revision,case when i.id=p_preview_id then p_preview_visible else i.visible end visible into r
 from public.v2_content_items i join public.v2_content_item_revisions v on v.item_id=i.id and v.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(v.document->'targets') t
 where v.document->>'kind'='recordings' and t->>'batchId'=p_batch::text and t->>'sessionKey'=p_session::text and t->>'replaceKey'=p_anchor::text;
 if found then return case when r.visible then public.v2_content_key(r.id,r.revision) else null end;end if;
 return p_anchor;
end;$$;
-- The composer reads only confirmed revisions unless an explicit Admin preview overrides one item.
create function public.v2_compose_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sessions jsonb:='[]';s jsonb;content jsonb;items jsonb;entry record;t jsonb;kind text;key uuid;title text;row jsonb;sort_items jsonb;idx integer;
begin
 if p_course is null then return null;end if;
 for s in select value from jsonb_array_elements(p_course->'sessions') loop
  content:=s->'content';title:=s->>'title';
  for kind in select unnest(array['materials','recordings','preSessionReads','postSessionReads','heading']) loop
   select coalesce(jsonb_agg(jsonb_build_object('item',v,'order',n*100)),'[]') into sort_items from jsonb_array_elements(coalesce(content->kind,'[]')) with ordinality a(v,n);
   for entry in select h.id,case when h.id=p_preview_id then p_preview_visible else h.visible end visible,r.revision,r.document
    from public.v2_content_items h join public.v2_content_item_revisions r on r.item_id=h.id
     and r.revision=case when h.id=p_preview_id then p_preview_revision else h.published_revision end
    where r.document->>'kind'=kind order by h.id loop
    select value into t from jsonb_array_elements(entry.document->'targets') where value->>'batchId'=p_course->>'batchId' and value->>'sessionKey'=s->>'key';
    if t is null or (t->>'publicationRevision')::integer<>(p_course->>'publicationRevision')::integer then continue;end if;
    if kind='heading' then if entry.visible then title:=entry.document->>'title';end if;continue;end if;
    if t->>'anchorKey' is not null and not exists(select 1 from jsonb_array_elements(content->'recordings') r where r->>'key'=public.v2_content_anchor((p_course->>'batchId')::uuid,(s->>'key')::uuid,(t->>'anchorKey')::uuid,p_preview_id,p_preview_revision,p_preview_visible)::text) then continue;end if;
    if t->>'replaceKey' is not null then
     select coalesce(jsonb_agg(v),'[]') into sort_items from jsonb_array_elements(sort_items) v where v#>>'{item,key}'<>t->>'replaceKey';
    end if;
    if entry.visible then
     key:=public.v2_content_key(entry.id,entry.revision);
     sort_items:=sort_items||jsonb_build_array(jsonb_build_object('order',(t->>'order')::integer,'item',jsonb_build_object('key',key,'title',entry.document->>'title','url',entry.document->>'url')));
    end if;
   end loop;
   if kind<>'heading' then
    select coalesce(jsonb_agg(v->'item' order by (v->>'order')::integer,v#>>'{item,key}'),'[]') into items from jsonb_array_elements(sort_items) v;
    content:=jsonb_set(content,array[kind],items);
   end if;
  end loop;
  sessions:=sessions||jsonb_build_array(jsonb_set(jsonb_set(s,'{content}',content),'{title}',to_jsonb(title)));
 end loop;
 return jsonb_set(p_course,'{sessions}',sessions);
end;$$;
create function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h public.v2_content_items%rowtype;d jsonb;t jsonb;other record;old jsonb;scope jsonb:='[]';course_title text;session_title text;fingerprint text;candidate jsonb;session jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_action is null or p_action not in ('publish','unpublish','delete') then raise exception 'Invalid publication action' using errcode='22023';end if;
 select * into h from public.v2_content_items where id=p_id;
 if not found or h.draft_revision is distinct from p_revision or h.deleted then raise exception 'Content revision changed' using errcode='40001';end if;
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
create function public.publish_v2_content_item(p_id uuid,p_revision integer,p_action text,p_request_id uuid,p_fingerprint text) returns jsonb
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
 if scope->>'fingerprint'<>p_fingerprint then raise exception 'Scope changed; review again' using errcode='40001';end if;
 update public.v2_content_items set published_revision=case when p_action='publish' then p_revision else published_revision end,
 visible=p_action='publish',deleted=p_action='delete',publication_version=publication_version+1 where id=p_id;
 result:=jsonb_build_object('id',p_id,'action',p_action,'confirmed',true);
 insert into public.v2_content_publication_audit values(p_request_id,p_id,auth.uid(),input,result,statement_timestamp());return result;
end;$$;
create function public.list_v2_content_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.v2_content_assert_admin();
 return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('document',r.document) order by r.created_at desc),'[]') from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision),
 'courses',(select coalesce(jsonb_agg(jsonb_build_object('batchId',b.id,'title',p.document->>'title','productCode',b.product_code,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]'),'anchors',public.v2_compose_content(jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]')))->'sessions') order by b.id),'[]')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions d on d.batch_id=b.id and d.revision=p.batch_revision));
end;$$;

create function public.v2_phase4_course_base(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_product text; v_draft jsonb; v_sessions jsonb;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id
 where b.id=p_batch_id and e.student_id=auth.uid() and e.active;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>'state'<>'published' then return null; end if;
 select document into v_draft from public.v2_course_batch_revisions where batch_id=p_batch_id and revision=v_publication.batch_revision;
 select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',coalesce(nullif(s->>'title',''),'Course outline'),'section',s->'section','content',s->'content') order by n),'[]')
 into v_sessions from jsonb_array_elements(coalesce(v_draft->'sessions','[]')||coalesce((select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->'events') with ordinality item(e,ord) where e?'content'),'[]')) with ordinality item(s,n)
 where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>'section')
 or (v_product='full_course' and s->>'section'='programme' and public.can_access_v2_product('full_batch'));
 return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_publication.revision,'batchRevision',v_publication.batch_revision,
 'title',v_publication.document->'title','productCode',v_product,'sessions',v_sessions);
end; $$;
create or replace function public.v2_learning_course_base(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.v2_compose_content(public.v2_phase4_course_base(p_batch_id));
$$;
create function public.v2_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',public.v2_content_key(i.id,r.revision),'sessionKey',t->>'sessionKey','placement',t->>'placement','anchorKey',public.v2_content_anchor((p_course->>'batchId')::uuid,(t->>'sessionKey')::uuid,(t->>'anchorKey')::uuid,p_preview_id,p_preview_revision,p_preview_visible),'order',(t->>'order')::integer) order by (t->>'order')::integer,i.id),'[]')
 from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(r.document->'targets') t
 where case when i.id=p_preview_id then p_preview_visible else i.visible end
 and t->>'batchId'=p_course->>'batchId' and (t->>'publicationRevision')::integer=(p_course->>'publicationRevision')::integer
 and exists(select 1 from jsonb_array_elements(p_course->'sessions') s cross join lateral jsonb_each(s->'content') k cross join lateral jsonb_array_elements(k.value) item
 where s->>'key'=t->>'sessionKey' and item->>'key'=public.v2_content_key(i.id,r.revision)::text);
$$;
create function public.get_my_v2_content_placements(p_batch_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.v2_content_placements(public.get_my_v2_published_course(p_batch_id));
$$;
create function public.read_v2_content_preview(p_batch_id uuid,p_item_id uuid,p_revision integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;d jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_item_id is not null then
  select r.document into d from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision
  where i.id=p_item_id and i.draft_revision=p_revision and not i.deleted;
  if d is null or not exists(select 1 from jsonb_array_elements(d->'targets') t where t->>'batchId'=p_batch_id::text) then raise exception 'Preview revision unavailable' using errcode='40001';end if;
 end if;
 select jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'batchRevision',p.batch_revision,'title',p.document->>'title','productCode',b.product_code,'sessions',coalesce(r.document->'sessions','[]')) into c
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_batch_id;
 if c is null then raise exception 'Published course unavailable' using errcode='22023';end if;
 c:=public.v2_compose_content(c,p_item_id,p_revision);
 return jsonb_build_object('course',c,'placements',public.v2_content_placements(c,p_item_id,p_revision));
end;$$;
revoke all on function public.v2_content_key(uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_assert_admin() from public,anon,authenticated,service_role;
revoke all on function public.v2_content_validate(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.save_v2_content_item(uuid,integer,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_v2_content_item(uuid,integer,uuid,jsonb) to authenticated;
revoke all on function public.v2_compose_content(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_scope(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.v2_content_scope(uuid,integer,text) to authenticated;
revoke all on function public.publish_v2_content_item(uuid,integer,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.publish_v2_content_item(uuid,integer,text,uuid,text) to authenticated;
revoke all on function public.list_v2_content_workspace() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_content_workspace() to authenticated;
revoke all on function public.v2_phase4_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_content_placements(jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_content_placements(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_content_placements(uuid) to authenticated;
revoke all on function public.read_v2_content_preview(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_content_preview(uuid,uuid,integer) to authenticated;
alter table public.v2_content_items enable row level security;
revoke all on public.v2_content_items from public,anon,authenticated,service_role;
alter table public.v2_content_item_revisions enable row level security;
revoke all on public.v2_content_item_revisions from public,anon,authenticated,service_role;
alter table public.v2_content_publication_audit enable row level security;
revoke all on public.v2_content_publication_audit from public,anon,authenticated,service_role;
revoke all on function public.v2_content_anchor(uuid,uuid,uuid,uuid,integer,boolean) from public,anon,authenticated,service_role;
commit;
