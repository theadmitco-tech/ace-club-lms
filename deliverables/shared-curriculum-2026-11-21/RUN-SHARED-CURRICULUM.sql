-- Staging project: eyphkkginlgoaxflauog. No existing cohorts are linked by installation.
rollback;
begin;
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$begin
 if to_regclass('public.v2_batch_curriculum_links') is not null or exists(select 1 from supabase_migrations.schema_migrations where version='20261121100000') then raise exception 'Curriculum links already exist; reconciliation required';end if;
end $$;
create temporary table curriculum_preserved_rows(name text,n bigint,h text) on commit drop;
do $$declare t record;n bigint;h text;begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('lock table public.%I in share mode',t.tablename);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  insert into curriculum_preserved_rows values(t.tablename,n,h);
 end loop;
end $$;
create temporary table curriculum_preserved_functions on commit drop as select oid,proname,pg_get_functiondef(oid) definition,proacl::text acl,proowner,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table curriculum_preserved_relations on commit drop as select oid,relacl::text acl,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace;
create temporary table curriculum_preserved_ledger on commit drop as select to_jsonb(m) document from supabase_migrations.schema_migrations m;
-- Explicit Admin-reviewed links preserve curriculum identity across live cohorts.
create table public.v2_batch_curriculum_links (
 batch_id uuid not null references public.v2_course_batches(id),
 source_batch_id uuid not null references public.v2_course_batches(id),
 session_keys uuid[] not null, source_revision integer not null,
 actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 primary key(batch_id,source_batch_id), check(batch_id<>source_batch_id)
);
alter table public.v2_batch_curriculum_links enable row level security;
revoke all on public.v2_batch_curriculum_links from public,anon,authenticated,service_role;
create function public.link_v2_batch_curriculum(p_batch uuid,p_revision integer,p_sources jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target jsonb; source jsonb; item jsonb; lesson jsonb; code text; source_code text; keys uuid[]; prior jsonb;
begin
 perform public.v2_content_assert_admin();
 perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 perform 1 from public.v2_course_batches where id=p_batch for update;
 if not found then raise exception 'Batch unavailable' using errcode='22023';end if;
 if jsonb_typeof(p_sources) is distinct from 'array' or jsonb_array_length(p_sources) not between 1 and 3 then raise exception 'Curriculum sources required' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('batchId',source_batch_id,'revision',source_revision,'sessionKeys',session_keys) order by source_batch_id),'[]') into prior from public.v2_batch_curriculum_links where batch_id=p_batch;
 if prior<>'[]'::jsonb then
  if prior<>(select jsonb_agg(value order by value->>'batchId') from jsonb_array_elements(p_sources)) then raise exception 'Curriculum already linked; reload batch' using errcode='PT409';end if;
  return jsonb_build_object('linked',true,'replayed',true);
 end if;
 if exists(select 1 from public.v2_batch_publication_revisions where batch_id=p_batch) then raise exception 'Curriculum must be linked before first publication' using errcode='22023';end if;
 if exists(select 1 from public.v2_batch_curriculum_links where source_batch_id=p_batch) then raise exception 'Curriculum chains are not supported' using errcode='22023';end if;
 select r.document,b.product_code into target,code from public.v2_course_batches b join public.v2_course_batch_revisions r on r.batch_id=b.id where b.id=p_batch order by r.revision desc limit 1;
 if (select max(revision) from public.v2_course_batch_revisions where batch_id=p_batch)<>p_revision then raise exception 'Batch changed; reload' using errcode='PT409';end if;
 for item in select value from jsonb_array_elements(p_sources) loop
  if jsonb_typeof(item) is distinct from 'object' or not item ?& array['batchId','revision','sessionKeys'] or (select count(*) from jsonb_object_keys(item))<>3 then raise exception 'Invalid curriculum source' using errcode='22023';end if;
  if exists(select 1 from public.v2_batch_curriculum_links where batch_id=(item->>'batchId')::uuid) then raise exception 'Curriculum chains are not supported' using errcode='22023';end if;
  perform 1 from public.v2_course_batches where id=(item->>'batchId')::uuid for share;
  select r.document,b.product_code into source,source_code from public.v2_course_batches b
   join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on p.document->>'state'='published'
   join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision
   where b.id=(item->>'batchId')::uuid and p.revision=(item->>'revision')::integer;
  if source is null or source_code not in ('quant','verbal','di') or (code<>'full_course' and code<>source_code)
   or exists(select 1 from jsonb_array_elements(source->'events') e where e->>'kind'='live') then raise exception 'Published subject curriculum unavailable' using errcode='22023';end if;
  if jsonb_typeof(item->'sessionKeys') is distinct from 'array' or jsonb_array_length(item->'sessionKeys')<1 then raise exception 'Teaching sessions required' using errcode='22023';end if;
  keys:=array(select value::uuid from jsonb_array_elements_text(item->'sessionKeys'));
  if cardinality(keys)<>(select count(distinct k) from unnest(keys) k) then raise exception 'Duplicate curriculum sessions' using errcode='22023';end if;
  for lesson in select s from jsonb_array_elements(target->'sessions') s where (s->>'key')::uuid=any(keys) loop
   if not exists(select 1 from jsonb_array_elements(source->'sessions') x where x->>'key'=lesson->>'key' and x->>'section'=lesson->>'section' and x->>'section'=source_code)
    or left(lesson->>'key',8) in ('ace00001','ace00002') then raise exception 'Curriculum session mismatch' using errcode='22023';end if;
  end loop;
  if (select count(*) from jsonb_array_elements(target->'sessions') x where (x->>'key')::uuid=any(keys))<>cardinality(keys)
   or exists(select 1 from public.v2_batch_curriculum_links l where l.batch_id=p_batch and l.session_keys && keys) then raise exception 'Curriculum session mismatch' using errcode='22023';end if;
  insert into public.v2_batch_curriculum_links values(p_batch,(item->>'batchId')::uuid,keys,(item->>'revision')::integer,auth.uid(),now());
 end loop;
 return jsonb_build_object('linked',true,'replayed',false);
end;$$;
revoke all on function public.link_v2_batch_curriculum(uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.save_v2_curriculum_batch(p_request jsonb,p_fingerprint text,p_sources jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.v2_content_assert_admin();
 perform pg_advisory_xact_lock(hashtextextended('v2-content-publishing',0));
 if (p_request->>'expectedRevision')::integer<>0 then raise exception 'Only new cohorts can link curriculum' using errcode='22023';end if;
 result:=public.save_v2_batch_draft(p_request,p_fingerprint);
 perform public.link_v2_batch_curriculum((result#>>'{draft,id}')::uuid,(result#>>'{draft,revision}')::integer,p_sources);
 return result;
end;$$;
revoke all on function public.save_v2_curriculum_batch(jsonb,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_v2_curriculum_batch(jsonb,text,jsonb) to authenticated;
create function public.v2_curriculum_identity(p_batch uuid,p_session uuid) returns uuid language sql stable security definer set search_path='' as $$
 select coalesce((select source_batch_id from public.v2_batch_curriculum_links where batch_id=p_batch and p_session=any(session_keys)),p_batch);
$$;
create function public.v2_curriculum_source(p_source uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'sessions',r.document->'sessions')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_source;
$$;
create function public.v2_compose_local_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
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
create or replace function public.v2_compose_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; source jsonb; sources jsonb:='{}'; sessions jsonb:='[]'; before_pages jsonb:='[]'; after_pages jsonb:='[]'; lesson jsonb; inherited jsonb; link record;
begin
 if p_course is null then return null;end if;
 for link in select * from public.v2_batch_curriculum_links where batch_id=(p_course->>'batchId')::uuid order by source_batch_id loop
  source:=public.v2_curriculum_source(link.source_batch_id);
  if source is not null then
   source:=public.v2_compose_local_content(source,p_preview_id,p_preview_revision,p_preview_visible);
   sources:=sources||jsonb_build_object(link.source_batch_id::text,source);
   before_pages:=before_pages||coalesce((select jsonb_agg(x) from jsonb_array_elements(source->'sessions') x where left(x->>'key',8)='ace00001'),'[]');
   after_pages:=after_pages||coalesce((select jsonb_agg(x) from jsonb_array_elements(source->'sessions') x where left(x->>'key',8)='ace00002'),'[]');
  end if;
 end loop;
 for lesson in select value from jsonb_array_elements(p_course->'sessions') loop
  select * into link from public.v2_batch_curriculum_links where batch_id=(p_course->>'batchId')::uuid and (lesson->>'key')::uuid=any(session_keys);
  if found then
   select x into inherited from jsonb_array_elements(sources#>array[link.source_batch_id::text,'sessions']) x where x->>'key'=lesson->>'key';
   if inherited is not null then sessions:=sessions||jsonb_build_array(inherited);end if;
  else sessions:=sessions||jsonb_build_array(lesson);end if;
 end loop;
 result:=jsonb_set(p_course,'{sessions}',before_pages||sessions||after_pages);
 return public.v2_compose_local_content(result,p_preview_id,p_preview_revision,p_preview_visible);
end;$$;
create function public.v2_local_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',public.v2_content_key(i.id,r.revision),'sessionKey',t->>'sessionKey','placement',t->>'placement','anchorKey',public.v2_content_anchor((p_course->>'batchId')::uuid,(t->>'sessionKey')::uuid,(t->>'anchorKey')::uuid,p_preview_id,p_preview_revision,p_preview_visible),'order',(t->>'order')::integer) order by (t->>'order')::integer,i.id),'[]')
 from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(r.document->'targets') t
 where case when i.id=p_preview_id then p_preview_visible else i.visible end
 and t->>'batchId'=p_course->>'batchId' and (t->>'publicationRevision')::integer=(p_course->>'publicationRevision')::integer
 and exists(select 1 from jsonb_array_elements(p_course->'sessions') s cross join lateral jsonb_each(s->'content') k cross join lateral jsonb_array_elements(k.value) item
 where s->>'key'=t->>'sessionKey' and item->>'key'=public.v2_content_key(i.id,r.revision)::text);
$$;
create or replace function public.v2_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;source jsonb;link record;
begin
 result:=public.v2_local_content_placements(p_course,p_preview_id,p_preview_revision,p_preview_visible);
 for link in select * from public.v2_batch_curriculum_links where batch_id=(p_course->>'batchId')::uuid loop
  source:=public.v2_curriculum_source(link.source_batch_id);
  if source is not null then
   source:=jsonb_set(source,'{sessions}',p_course->'sessions');
   result:=result||public.v2_local_content_placements(source,p_preview_id,p_preview_revision,p_preview_visible);
  end if;
 end loop;
 return result;
end;$$;
create function public.v2_local_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
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
create or replace function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;target jsonb;link record;expanded jsonb:='[]';receipt jsonb;
begin
 result:=public.v2_local_content_scope(p_id,p_revision,p_action);
 for target in select value from jsonb_array_elements(result->'targets') loop
  for link in select l.*,p.revision,p.document->>'title' title from public.v2_batch_curriculum_links l
   left join lateral(select * from public.v2_batch_publication_revisions where batch_id=l.batch_id order by revision desc limit 1)p on true
   where l.source_batch_id=(target->>'batchId')::uuid and ((target->>'sessionKey')::uuid=any(l.session_keys) or left(target->>'sessionKey',8) in ('ace00001','ace00002')) order by l.batch_id loop
   expanded:=expanded||jsonb_build_array(target||jsonb_build_object('batchId',link.batch_id,'courseTitle',coalesce(link.title,'Linked draft batch'),'publicationRevision',coalesce(link.revision,1)));
  end loop;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(l) order by batch_id,source_batch_id),'[]') into receipt from public.v2_batch_curriculum_links l;
 return result||jsonb_build_object('targets',(result->'targets')||expanded,'fingerprint',encode(sha256(convert_to((result->>'fingerprint')||expanded::text||receipt::text,'UTF8')),'hex'));
end;$$;
create or replace function public.v2_learning_session_open(p_student uuid,p_batch uuid,p_session uuid,p_section text)
returns boolean language sql stable security definer set search_path='' as $$
 select left(p_session::text,8) in ('ace00001','ace00002')
 or not exists(select 1 from public.v2_feedback_obligations where student_id=p_student and section=p_section and feedback_id is null)
 or exists(select 1 from public.v2_feedback_obligations o where o.student_id=p_student and o.session_key=p_session and o.section=p_section and o.feedback_id is null
 and public.v2_curriculum_identity(o.batch_id,o.session_key)=public.v2_curriculum_identity(p_batch,p_session));
$$;
create or replace function public.v2_add_feedback_obligation(p_student uuid,p_batch uuid,p_session uuid,p_title text,p_section text,p_source text,p_key uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_feedback uuid;
begin
 perform 1 from public.profiles where id=p_student for update;
 select id into v_feedback from public.v2_session_feedback where student_id=p_student and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(p_batch,p_session) and session_key=p_session;
 insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision,feedback_id)
 values(p_student,p_batch,p_session,p_title,p_section,p_source,p_key,p_revision,v_feedback)
 on conflict(student_id,batch_id,session_key,source,source_key) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and source=p_source and source_key=p_key; end if;
 return v_id;
end; $$;
create or replace function public.v2_store_session_feedback(p_obligation_id uuid,p_student_id uuid,p_request_id uuid,p_response jsonb,p_event_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
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
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception 'Feedback was already submitted; reload the session' using errcode='PT409'; end if;
  return jsonb_build_object('submitted',true,'replayed',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key and source='live') into v_live;
 if (v_live and p_response->>'attendance'='recording') or (not v_live and p_response->>'attendance'<>'recording') then raise exception 'Feedback attendance context changed; reload the session' using errcode='PT409'; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object('submitted',true,'replayed',false);
end; $$;
revoke all on function public.v2_curriculum_identity(uuid,uuid),public.v2_curriculum_source(uuid),public.v2_compose_local_content(jsonb,uuid,integer,boolean),public.v2_local_content_placements(jsonb,uuid,integer,boolean),public.v2_local_content_scope(uuid,integer,text) from public,anon,authenticated,service_role;
create or replace function public.get_my_v2_learning_state(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb; v_registered boolean; v_publication jsonb; v_revision integer;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 v_revision:=(v_course->>'publicationRevision')::integer;
 select exists(select 1 from public.v2_live_registrations where batch_id=p_batch_id and student_id=auth.uid() and active) into v_registered;
 select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id and revision=v_revision;
 return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_revision,
 'sessions',(select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',s->'title','section',s->'section',
 'locked',not public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>'key')::uuid,s->>'section')) order by n),'[]') from jsonb_array_elements(v_course->'sessions') with ordinality items(s,n)),
 'obligations',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'batchId',case when public.v2_curriculum_identity(o.batch_id,o.session_key)=public.v2_curriculum_identity(p_batch_id,o.session_key) and exists(select 1 from jsonb_array_elements(v_course->'sessions') x where x->>'key'=o.session_key::text) then p_batch_id else o.batch_id end,'sessionKey',o.session_key,'sessionTitle',o.session_title,'section',o.section,'source',o.source,'eventKey',case when o.source='live' then o.source_key end,'createdAt',o.created_at) order by o.created_at,o.id),'[]')
 from public.v2_feedback_obligations o where o.student_id=auth.uid() and o.feedback_id is null and o.section in (select s->>'section' from jsonb_array_elements(v_course->'sessions') s)),
 'progress',(select coalesce(jsonb_agg(jsonb_build_object('sessionKey',p.session_key,'itemKey',case when p.resource_key<>'session' then p.resource_key end,'status',p.state,'lastOpenedAt',p.last_opened_at,'readAt',p.read_at) order by p.last_opened_at),'[]') from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and exists(select 1 from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p.session_key::text)),
 'lastSessionKey',(select p.session_key from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and p.resource_key='session' and exists(select 1 from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p.session_key::text and public.v2_learning_session_open(auth.uid(),p_batch_id,p.session_key,s->>'section')) order by p.last_opened_at desc limit 1),
 'liveRegistered',v_registered,'liveEvents',case when not v_registered then '[]'::jsonb else (
 select coalesce(jsonb_agg(jsonb_build_object('key',e->'key','title',e->'title','section',e->'section','startsAt',e->'startsAt','endsAt',e->'endsAt','completedAt',c.completed_at,'sessionKey',m.session_key) order by n),'[]')
 from jsonb_array_elements(v_publication->'events') with ordinality items(e,n)
 left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>'key')::uuid
 left join public.v2_live_session_mappings m on m.batch_id=p_batch_id and m.event_key=(e->>'key')::uuid and m.publication_revision=v_revision
 where e->>'kind'='live' and public.can_access_v2_product(public.v2_entitlement_product_code(v_course->>'productCode'),e->>'section')
 ) end);
end; $$;

do $$declare t record;n bigint;h text;begin
 for t in select * from curriculum_preserved_rows loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.name) into n,h;
  if n<>t.n or h<>t.h then raise exception 'Existing application rows changed: %',t.name;end if;
 end loop;
 if exists(select 1 from curriculum_preserved_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or p.proacl::text is distinct from f.acl or p.proowner<>f.proowner or p.prosecdef<>f.prosecdef or p.proconfig is distinct from f.proconfig or (f.proname not in ('v2_compose_content','v2_content_placements','v2_content_scope','v2_learning_session_open','v2_add_feedback_obligation','v2_store_session_feedback','get_my_v2_learning_state') and pg_get_functiondef(p.oid) is distinct from f.definition)) then raise exception 'Unexpected function or permission changes';end if;
 if exists(select 1 from curriculum_preserved_relations r left join pg_class c on c.oid=r.oid where c.oid is null or c.relacl::text is distinct from r.acl or c.relrowsecurity<>r.relrowsecurity or c.relforcerowsecurity<>r.relforcerowsecurity) then raise exception 'Existing relation security changed';end if;
 if exists(select document from curriculum_preserved_ledger except select to_jsonb(m) from supabase_migrations.schema_migrations m) then raise exception 'Original migration ledger changed';end if;
 if exists(select 1 from public.v2_batch_curriculum_links) then raise exception 'Unexpected existing-batch link';end if;
end $$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261121100000','add_v2_curriculum_links',array['begin;
-- Explicit Admin-reviewed links preserve curriculum identity across live cohorts.
create table public.v2_batch_curriculum_links (
 batch_id uuid not null references public.v2_course_batches(id),
 source_batch_id uuid not null references public.v2_course_batches(id),
 session_keys uuid[] not null, source_revision integer not null,
 actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 primary key(batch_id,source_batch_id), check(batch_id<>source_batch_id)
);
alter table public.v2_batch_curriculum_links enable row level security;
revoke all on public.v2_batch_curriculum_links from public,anon,authenticated,service_role;
create function public.link_v2_batch_curriculum(p_batch uuid,p_revision integer,p_sources jsonb) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare target jsonb; source jsonb; item jsonb; lesson jsonb; code text; source_code text; keys uuid[]; prior jsonb;
begin
 perform public.v2_content_assert_admin();
 perform pg_advisory_xact_lock(hashtextextended(''v2-content-publishing'',0));
 perform 1 from public.v2_course_batches where id=p_batch for update;
 if not found then raise exception ''Batch unavailable'' using errcode=''22023'';end if;
 if jsonb_typeof(p_sources) is distinct from ''array'' or jsonb_array_length(p_sources) not between 1 and 3 then raise exception ''Curriculum sources required'' using errcode=''22023'';end if;
 select coalesce(jsonb_agg(jsonb_build_object(''batchId'',source_batch_id,''revision'',source_revision,''sessionKeys'',session_keys) order by source_batch_id),''[]'') into prior from public.v2_batch_curriculum_links where batch_id=p_batch;
 if prior<>''[]''::jsonb then
  if prior<>(select jsonb_agg(value order by value->>''batchId'') from jsonb_array_elements(p_sources)) then raise exception ''Curriculum already linked; reload batch'' using errcode=''PT409'';end if;
  return jsonb_build_object(''linked'',true,''replayed'',true);
 end if;
 if exists(select 1 from public.v2_batch_publication_revisions where batch_id=p_batch) then raise exception ''Curriculum must be linked before first publication'' using errcode=''22023'';end if;
 if exists(select 1 from public.v2_batch_curriculum_links where source_batch_id=p_batch) then raise exception ''Curriculum chains are not supported'' using errcode=''22023'';end if;
 select r.document,b.product_code into target,code from public.v2_course_batches b join public.v2_course_batch_revisions r on r.batch_id=b.id where b.id=p_batch order by r.revision desc limit 1;
 if (select max(revision) from public.v2_course_batch_revisions where batch_id=p_batch)<>p_revision then raise exception ''Batch changed; reload'' using errcode=''PT409'';end if;
 for item in select value from jsonb_array_elements(p_sources) loop
  if jsonb_typeof(item) is distinct from ''object'' or not item ?& array[''batchId'',''revision'',''sessionKeys''] or (select count(*) from jsonb_object_keys(item))<>3 then raise exception ''Invalid curriculum source'' using errcode=''22023'';end if;
  if exists(select 1 from public.v2_batch_curriculum_links where batch_id=(item->>''batchId'')::uuid) then raise exception ''Curriculum chains are not supported'' using errcode=''22023'';end if;
  perform 1 from public.v2_course_batches where id=(item->>''batchId'')::uuid for share;
  select r.document,b.product_code into source,source_code from public.v2_course_batches b
   join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on p.document->>''state''=''published''
   join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision
   where b.id=(item->>''batchId'')::uuid and p.revision=(item->>''revision'')::integer;
  if source is null or source_code not in (''quant'',''verbal'',''di'') or (code<>''full_course'' and code<>source_code)
   or exists(select 1 from jsonb_array_elements(source->''events'') e where e->>''kind''=''live'') then raise exception ''Published subject curriculum unavailable'' using errcode=''22023'';end if;
  if jsonb_typeof(item->''sessionKeys'') is distinct from ''array'' or jsonb_array_length(item->''sessionKeys'')<1 then raise exception ''Teaching sessions required'' using errcode=''22023'';end if;
  keys:=array(select value::uuid from jsonb_array_elements_text(item->''sessionKeys''));
  if cardinality(keys)<>(select count(distinct k) from unnest(keys) k) then raise exception ''Duplicate curriculum sessions'' using errcode=''22023'';end if;
  for lesson in select s from jsonb_array_elements(target->''sessions'') s where (s->>''key'')::uuid=any(keys) loop
   if not exists(select 1 from jsonb_array_elements(source->''sessions'') x where x->>''key''=lesson->>''key'' and x->>''section''=lesson->>''section'' and x->>''section''=source_code)
    or left(lesson->>''key'',8) in (''ace00001'',''ace00002'') then raise exception ''Curriculum session mismatch'' using errcode=''22023'';end if;
  end loop;
  if (select count(*) from jsonb_array_elements(target->''sessions'') x where (x->>''key'')::uuid=any(keys))<>cardinality(keys)
   or exists(select 1 from public.v2_batch_curriculum_links l where l.batch_id=p_batch and l.session_keys && keys) then raise exception ''Curriculum session mismatch'' using errcode=''22023'';end if;
  insert into public.v2_batch_curriculum_links values(p_batch,(item->>''batchId'')::uuid,keys,(item->>''revision'')::integer,auth.uid(),now());
 end loop;
 return jsonb_build_object(''linked'',true,''replayed'',false);
end;$$;
revoke all on function public.link_v2_batch_curriculum(uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.save_v2_curriculum_batch(p_request jsonb,p_fingerprint text,p_sources jsonb) returns jsonb language plpgsql security definer set search_path='''' as $$
declare result jsonb;
begin
 perform public.v2_content_assert_admin();
 perform pg_advisory_xact_lock(hashtextextended(''v2-content-publishing'',0));
 if (p_request->>''expectedRevision'')::integer<>0 then raise exception ''Only new cohorts can link curriculum'' using errcode=''22023'';end if;
 result:=public.save_v2_batch_draft(p_request,p_fingerprint);
 perform public.link_v2_batch_curriculum((result#>>''{draft,id}'')::uuid,(result#>>''{draft,revision}'')::integer,p_sources);
 return result;
end;$$;
revoke all on function public.save_v2_curriculum_batch(jsonb,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_v2_curriculum_batch(jsonb,text,jsonb) to authenticated;
create function public.v2_curriculum_identity(p_batch uuid,p_session uuid) returns uuid language sql stable security definer set search_path='''' as $$
 select coalesce((select source_batch_id from public.v2_batch_curriculum_links where batch_id=p_batch and p_session=any(session_keys)),p_batch);
$$;
create function public.v2_curriculum_source(p_source uuid) returns jsonb language sql stable security definer set search_path='''' as $$
 select jsonb_build_object(''batchId'',b.id,''publicationRevision'',p.revision,''sessions'',r.document->''sessions'')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>''state''=''published''
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_source;
$$;
create function public.v2_compose_local_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare sessions jsonb:=''[]'';s jsonb;content jsonb;items jsonb;entry record;t jsonb;kind text;key uuid;title text;row jsonb;sort_items jsonb;idx integer;
begin
 if p_course is null then return null;end if;
 for s in select value from jsonb_array_elements(p_course->''sessions'') loop
  content:=s->''content'';title:=s->>''title'';
  for kind in select unnest(array[''materials'',''recordings'',''preSessionReads'',''postSessionReads'',''heading'']) loop
   select coalesce(jsonb_agg(jsonb_build_object(''item'',v,''order'',n*100)),''[]'') into sort_items from jsonb_array_elements(coalesce(content->kind,''[]'')) with ordinality a(v,n);
   for entry in select h.id,case when h.id=p_preview_id then p_preview_visible else h.visible end visible,r.revision,r.document
    from public.v2_content_items h join public.v2_content_item_revisions r on r.item_id=h.id
     and r.revision=case when h.id=p_preview_id then p_preview_revision else h.published_revision end
    where r.document->>''kind''=kind order by h.id loop
    select value into t from jsonb_array_elements(entry.document->''targets'') where value->>''batchId''=p_course->>''batchId'' and value->>''sessionKey''=s->>''key'';
    if t is null or (t->>''publicationRevision'')::integer<>(p_course->>''publicationRevision'')::integer then continue;end if;
    if kind=''heading'' then if entry.visible then title:=entry.document->>''title'';end if;continue;end if;
    if t->>''anchorKey'' is not null and not exists(select 1 from jsonb_array_elements(content->''recordings'') r where r->>''key''=public.v2_content_anchor((p_course->>''batchId'')::uuid,(s->>''key'')::uuid,(t->>''anchorKey'')::uuid,p_preview_id,p_preview_revision,p_preview_visible)::text) then continue;end if;
    if t->>''replaceKey'' is not null then
     select coalesce(jsonb_agg(v),''[]'') into sort_items from jsonb_array_elements(sort_items) v where v#>>''{item,key}''<>t->>''replaceKey'';
    end if;
    if entry.visible then
     key:=public.v2_content_key(entry.id,entry.revision);
     sort_items:=sort_items||jsonb_build_array(jsonb_build_object(''order'',(t->>''order'')::integer,''item'',jsonb_build_object(''key'',key,''title'',entry.document->>''title'',''url'',entry.document->>''url'')));
    end if;
   end loop;
   if kind<>''heading'' then
    select coalesce(jsonb_agg(v->''item'' order by (v->>''order'')::integer,v#>>''{item,key}''),''[]'') into items from jsonb_array_elements(sort_items) v;
    content:=jsonb_set(content,array[kind],items);
   end if;
  end loop;
  sessions:=sessions||jsonb_build_array(jsonb_set(jsonb_set(s,''{content}'',content),''{title}'',to_jsonb(title)));
 end loop;
 return jsonb_set(p_course,''{sessions}'',sessions);
end;$$;
create or replace function public.v2_compose_content(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare result jsonb; source jsonb; sources jsonb:=''{}''; sessions jsonb:=''[]''; before_pages jsonb:=''[]''; after_pages jsonb:=''[]''; lesson jsonb; inherited jsonb; link record;
begin
 if p_course is null then return null;end if;
 for link in select * from public.v2_batch_curriculum_links where batch_id=(p_course->>''batchId'')::uuid order by source_batch_id loop
  source:=public.v2_curriculum_source(link.source_batch_id);
  if source is not null then
   source:=public.v2_compose_local_content(source,p_preview_id,p_preview_revision,p_preview_visible);
   sources:=sources||jsonb_build_object(link.source_batch_id::text,source);
   before_pages:=before_pages||coalesce((select jsonb_agg(x) from jsonb_array_elements(source->''sessions'') x where left(x->>''key'',8)=''ace00001''),''[]'');
   after_pages:=after_pages||coalesce((select jsonb_agg(x) from jsonb_array_elements(source->''sessions'') x where left(x->>''key'',8)=''ace00002''),''[]'');
  end if;
 end loop;
 for lesson in select value from jsonb_array_elements(p_course->''sessions'') loop
  select * into link from public.v2_batch_curriculum_links where batch_id=(p_course->>''batchId'')::uuid and (lesson->>''key'')::uuid=any(session_keys);
  if found then
   select x into inherited from jsonb_array_elements(sources#>array[link.source_batch_id::text,''sessions'']) x where x->>''key''=lesson->>''key'';
   if inherited is not null then sessions:=sessions||jsonb_build_array(inherited);end if;
  else sessions:=sessions||jsonb_build_array(lesson);end if;
 end loop;
 result:=jsonb_set(p_course,''{sessions}'',before_pages||sessions||after_pages);
 return public.v2_compose_local_content(result,p_preview_id,p_preview_revision,p_preview_visible);
end;$$;
create function public.v2_local_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language sql stable security definer set search_path='''' as $$
 select coalesce(jsonb_agg(jsonb_build_object(''key'',public.v2_content_key(i.id,r.revision),''sessionKey'',t->>''sessionKey'',''placement'',t->>''placement'',''anchorKey'',public.v2_content_anchor((p_course->>''batchId'')::uuid,(t->>''sessionKey'')::uuid,(t->>''anchorKey'')::uuid,p_preview_id,p_preview_revision,p_preview_visible),''order'',(t->>''order'')::integer) order by (t->>''order'')::integer,i.id),''[]'')
 from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=case when i.id=p_preview_id then p_preview_revision else i.published_revision end
 cross join lateral jsonb_array_elements(r.document->''targets'') t
 where case when i.id=p_preview_id then p_preview_visible else i.visible end
 and t->>''batchId''=p_course->>''batchId'' and (t->>''publicationRevision'')::integer=(p_course->>''publicationRevision'')::integer
 and exists(select 1 from jsonb_array_elements(p_course->''sessions'') s cross join lateral jsonb_each(s->''content'') k cross join lateral jsonb_array_elements(k.value) item
 where s->>''key''=t->>''sessionKey'' and item->>''key''=public.v2_content_key(i.id,r.revision)::text);
$$;
create or replace function public.v2_content_placements(p_course jsonb,p_preview_id uuid default null,p_preview_revision integer default null,p_preview_visible boolean default true)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare result jsonb;source jsonb;link record;
begin
 result:=public.v2_local_content_placements(p_course,p_preview_id,p_preview_revision,p_preview_visible);
 for link in select * from public.v2_batch_curriculum_links where batch_id=(p_course->>''batchId'')::uuid loop
  source:=public.v2_curriculum_source(link.source_batch_id);
  if source is not null then
   source:=jsonb_set(source,''{sessions}'',p_course->''sessions'');
   result:=result||public.v2_local_content_placements(source,p_preview_id,p_preview_revision,p_preview_visible);
  end if;
 end loop;
 return result;
end;$$;
create function public.v2_local_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare h public.v2_content_items%rowtype;d jsonb;t jsonb;other record;old jsonb;scope jsonb:=''[]'';course_title text;session_title text;fingerprint text;candidate jsonb;session jsonb;
begin
 perform public.v2_content_assert_admin();
 if p_action is null or p_action not in (''publish'',''unpublish'',''delete'') then raise exception ''Invalid publication action'' using errcode=''22023'';end if;
 select * into h from public.v2_content_items where id=p_id;
 if not found or h.draft_revision is distinct from p_revision or h.deleted then raise exception ''Content revision changed'' using errcode=''PT409'';end if;
 select document into d from public.v2_content_item_revisions where item_id=p_id and revision=case when p_action=''publish'' then p_revision else coalesce(h.published_revision,p_revision) end;
 if p_action=''publish'' then perform public.v2_content_validate(d);end if;
 select document into old from public.v2_content_item_revisions where item_id=p_id and revision=h.published_revision;
 for t in select distinct value from jsonb_array_elements((d->''targets'')||coalesce(old->''targets'',''[]'')) loop
  select r.document->>''title'' into course_title from public.v2_batch_publication_revisions r where batch_id=(t->>''batchId'')::uuid order by revision desc limit 1;
  select s->>''title'' into session_title from public.v2_course_batch_revisions b cross join lateral jsonb_array_elements(coalesce(b.document->''sessions'',''[]'')||coalesce(b.document->''events'',''[]'')) s
   where b.batch_id=(t->>''batchId'')::uuid and b.revision=(select batch_revision from public.v2_batch_publication_revisions where batch_id=b.batch_id order by revision desc limit 1) and s->>''key''=t->>''sessionKey'';
  scope:=scope||jsonb_build_array(t||jsonb_build_object(''courseTitle'',course_title,''sessionTitle'',session_title));
  if p_action=''publish'' then
   for other in select r.document from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.published_revision where i.id<>p_id loop
    if exists(select 1 from jsonb_array_elements(other.document->''targets'') x where x->>''batchId''=t->>''batchId'' and x->>''sessionKey''=t->>''sessionKey''
     and ((d->>''kind''=''heading'' and other.document->>''kind''=''heading'') or (t->>''replaceKey'' is not null and x->>''replaceKey''=t->>''replaceKey''))) then raise exception ''Another managed item owns this original target'' using errcode=''22023'';end if;
   end loop;
  end if;
 end loop;
 if p_action=''publish'' then
  for t in select distinct jsonb_build_object(''batchId'',value->>''batchId'') from jsonb_array_elements(d->''targets'') loop
   candidate:=public.read_v2_content_preview((t->>''batchId'')::uuid,p_id,p_revision);
   for session in select value from jsonb_array_elements(candidate#>''{course,sessions}'') loop
    if not public.v2_session_content_valid(session->''content'') then raise exception ''Resulting session exceeds content limits'' using errcode=''22023'';end if;
   end loop;
  end loop;
 end if;
 select encode(sha256(convert_to(jsonb_build_object(''head'',to_jsonb(h),''document'',d,''action'',p_action,
 ''heads'',(select coalesce(jsonb_agg(to_jsonb(i) order by id),''[]'') from public.v2_content_items i),
 ''publications'',(select coalesce(jsonb_agg(to_jsonb(p) order by batch_id,revision),''[]'') from public.v2_batch_publication_revisions p where p.batch_id in(select (x->>''batchId'')::uuid from jsonb_array_elements(scope) x)))::text,''UTF8'')),''hex'') into fingerprint;
 return jsonb_build_object(''id'',p_id,''revision'',p_revision,''action'',p_action,''fingerprint'',fingerprint,''targets'',scope);
end;$$;
create or replace function public.v2_content_scope(p_id uuid,p_revision integer,p_action text) returns jsonb
language plpgsql security definer set search_path='''' as $$
declare result jsonb;target jsonb;link record;expanded jsonb:=''[]'';receipt jsonb;
begin
 result:=public.v2_local_content_scope(p_id,p_revision,p_action);
 for target in select value from jsonb_array_elements(result->''targets'') loop
  for link in select l.*,p.revision,p.document->>''title'' title from public.v2_batch_curriculum_links l
   left join lateral(select * from public.v2_batch_publication_revisions where batch_id=l.batch_id order by revision desc limit 1)p on true
   where l.source_batch_id=(target->>''batchId'')::uuid and ((target->>''sessionKey'')::uuid=any(l.session_keys) or left(target->>''sessionKey'',8) in (''ace00001'',''ace00002'')) order by l.batch_id loop
   expanded:=expanded||jsonb_build_array(target||jsonb_build_object(''batchId'',link.batch_id,''courseTitle'',coalesce(link.title,''Linked draft batch''),''publicationRevision'',coalesce(link.revision,1)));
  end loop;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(l) order by batch_id,source_batch_id),''[]'') into receipt from public.v2_batch_curriculum_links l;
 return result||jsonb_build_object(''targets'',(result->''targets'')||expanded,''fingerprint'',encode(sha256(convert_to((result->>''fingerprint'')||expanded::text||receipt::text,''UTF8'')),''hex''));
end;$$;
create or replace function public.v2_learning_session_open(p_student uuid,p_batch uuid,p_session uuid,p_section text)
returns boolean language sql stable security definer set search_path='''' as $$
 select left(p_session::text,8) in (''ace00001'',''ace00002'')
 or not exists(select 1 from public.v2_feedback_obligations where student_id=p_student and section=p_section and feedback_id is null)
 or exists(select 1 from public.v2_feedback_obligations o where o.student_id=p_student and o.session_key=p_session and o.section=p_section and o.feedback_id is null
 and public.v2_curriculum_identity(o.batch_id,o.session_key)=public.v2_curriculum_identity(p_batch,p_session));
$$;
create or replace function public.v2_add_feedback_obligation(p_student uuid,p_batch uuid,p_session uuid,p_title text,p_section text,p_source text,p_key uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='''' as $$
declare v_id uuid; v_feedback uuid;
begin
 perform 1 from public.profiles where id=p_student for update;
 select id into v_feedback from public.v2_session_feedback where student_id=p_student and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(p_batch,p_session) and session_key=p_session;
 insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision,feedback_id)
 values(p_student,p_batch,p_session,p_title,p_section,p_source,p_key,p_revision,v_feedback)
 on conflict(student_id,batch_id,session_key,source,source_key) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and source=p_source and source_key=p_key; end if;
 return v_id;
end; $$;
create or replace function public.v2_store_session_feedback(p_obligation_id uuid,p_student_id uuid,p_request_id uuid,p_response jsonb,p_event_id text)
returns jsonb language plpgsql security definer set search_path='''' as $$
declare o public.v2_feedback_obligations%rowtype; v_saved public.v2_session_feedback%rowtype; v_live boolean;
begin
 perform 1 from public.profiles where id=p_student_id for update;
 if not found then raise exception ''Feedback owner unavailable'' using errcode=''42501''; end if;
 select * into o from public.v2_feedback_obligations where id=p_obligation_id and student_id=p_student_id for update;
 if not found then raise exception ''Feedback obligation unavailable'' using errcode=''42501''; end if;
 if p_request_id is null or p_event_id is null or length(p_event_id) not between 1 and 200 or p_response is null or jsonb_typeof(p_response)<>''object''
 or not p_response ?& array[''usefulness'',''clarity'',''comment'',''attendance''] or (select count(*) from jsonb_object_keys(p_response))<>4
 or (p_response->>''attendance''=''missed'' and (p_response->''usefulness''<>''null''::jsonb or p_response->''clarity''<>''null''::jsonb))
 or (p_response->>''attendance''<>''missed'' and (jsonb_typeof(p_response->''usefulness'')<>''number'' or jsonb_typeof(p_response->''clarity'')<>''number'' or p_response->>''usefulness'' !~ ''^[1-5]$'' or p_response->>''clarity'' !~ ''^[1-5]$''))
 or jsonb_typeof(p_response->''comment'')<>''string'' or length(p_response->>''comment'')>4000
 or jsonb_typeof(p_response->''attendance'')<>''string'' or p_response->>''attendance'' not in (''attended'',''missed'',''recording'') then raise exception ''Invalid feedback response'' using errcode=''22023''; end if;
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception ''Feedback was already submitted; reload the session'' using errcode=''PT409''; end if;
  return jsonb_build_object(''submitted'',true,''replayed'',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key and source=''live'') into v_live;
 if (v_live and p_response->>''attendance''=''recording'') or (not v_live and p_response->>''attendance''<>''recording'') then raise exception ''Feedback attendance context changed; reload the session'' using errcode=''PT409''; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and public.v2_curriculum_identity(batch_id,session_key)=public.v2_curriculum_identity(o.batch_id,o.session_key) and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object(''submitted'',true,''replayed'',false);
end; $$;
revoke all on function public.v2_curriculum_identity(uuid,uuid),public.v2_curriculum_source(uuid),public.v2_compose_local_content(jsonb,uuid,integer,boolean),public.v2_local_content_placements(jsonb,uuid,integer,boolean),public.v2_local_content_scope(uuid,integer,text) from public,anon,authenticated,service_role;
create or replace function public.get_my_v2_learning_state(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='''' as $$
declare v_course jsonb; v_registered boolean; v_publication jsonb; v_revision integer;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 v_revision:=(v_course->>''publicationRevision'')::integer;
 select exists(select 1 from public.v2_live_registrations where batch_id=p_batch_id and student_id=auth.uid() and active) into v_registered;
 select document into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id and revision=v_revision;
 return jsonb_build_object(''batchId'',p_batch_id,''publicationRevision'',v_revision,
 ''sessions'',(select coalesce(jsonb_agg(jsonb_build_object(''key'',s->''key'',''title'',s->''title'',''section'',s->''section'',
 ''locked'',not public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>''key'')::uuid,s->>''section'')) order by n),''[]'') from jsonb_array_elements(v_course->''sessions'') with ordinality items(s,n)),
 ''obligations'',(select coalesce(jsonb_agg(jsonb_build_object(''id'',o.id,''batchId'',case when public.v2_curriculum_identity(o.batch_id,o.session_key)=public.v2_curriculum_identity(p_batch_id,o.session_key) and exists(select 1 from jsonb_array_elements(v_course->''sessions'') x where x->>''key''=o.session_key::text) then p_batch_id else o.batch_id end,''sessionKey'',o.session_key,''sessionTitle'',o.session_title,''section'',o.section,''source'',o.source,''eventKey'',case when o.source=''live'' then o.source_key end,''createdAt'',o.created_at) order by o.created_at,o.id),''[]'')
 from public.v2_feedback_obligations o where o.student_id=auth.uid() and o.feedback_id is null and o.section in (select s->>''section'' from jsonb_array_elements(v_course->''sessions'') s)),
 ''progress'',(select coalesce(jsonb_agg(jsonb_build_object(''sessionKey'',p.session_key,''itemKey'',case when p.resource_key<>''session'' then p.resource_key end,''status'',p.state,''lastOpenedAt'',p.last_opened_at,''readAt'',p.read_at) order by p.last_opened_at),''[]'') from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and exists(select 1 from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p.session_key::text)),
 ''lastSessionKey'',(select p.session_key from public.v2_learning_progress p where p.student_id=auth.uid() and p.batch_id=p_batch_id and p.resource_key=''session'' and exists(select 1 from jsonb_array_elements(v_course->''sessions'') s where s->>''key''=p.session_key::text and public.v2_learning_session_open(auth.uid(),p_batch_id,p.session_key,s->>''section'')) order by p.last_opened_at desc limit 1),
 ''liveRegistered'',v_registered,''liveEvents'',case when not v_registered then ''[]''::jsonb else (
 select coalesce(jsonb_agg(jsonb_build_object(''key'',e->''key'',''title'',e->''title'',''section'',e->''section'',''startsAt'',e->''startsAt'',''endsAt'',e->''endsAt'',''completedAt'',c.completed_at,''sessionKey'',m.session_key) order by n),''[]'')
 from jsonb_array_elements(v_publication->''events'') with ordinality items(e,n)
 left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>''key'')::uuid
 left join public.v2_live_session_mappings m on m.batch_id=p_batch_id and m.event_key=(e->>''key'')::uuid and m.publication_revision=v_revision
 where e->>''kind''=''live'' and public.can_access_v2_product(public.v2_entitlement_product_code(v_course->>''productCode''),e->>''section'')
 ) end);
end; $$;
commit;
']);
notify pgrst,'reload schema';
select jsonb_build_object('check','shared_curriculum','migration','20261121100000','sourceSha256','65d19390b295d187db266b52c09244329e696ea5df2a7311ca83ad5b43f0180a','existingRowsPreserved',true,'existingPermissionsPreserved',true,'originalLedgerPreserved',true,'existingBatchesLinked',0,'publicTablesPreserved',(select count(*) from curriculum_preserved_rows));
commit;
