-- Phase 4 adds caller-scoped learning state and section feedback guards.
-- Applied purchase, publication and legacy mock histories remain unchanged.
begin;
create table public.v2_learning_progress (
 student_id uuid not null references public.profiles(id), batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null, resource_key text not null, state text not null check(state in ('opened','read')),
 last_opened_at timestamptz not null default statement_timestamp(), read_at timestamptz,
 primary key(student_id,batch_id,session_key,resource_key)
);
create table public.v2_session_feedback (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 request_id uuid not null unique, confirmation_reference text not null unique, provider text not null default 'lms' check(provider='lms'), response jsonb not null, submitted_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key)
);
create table public.v2_feedback_obligations (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 batch_id uuid not null references public.v2_course_batches(id), session_key uuid not null,
 session_title text not null, section text not null check(section in ('quant','verbal','di')),
 source text not null check(source in ('recording','live')), source_key uuid not null,
 publication_revision integer not null, created_at timestamptz not null default statement_timestamp(),
 feedback_id uuid references public.v2_session_feedback(id),
 unique(student_id,batch_id,session_key,source,source_key)
);
create index v2_feedback_pending_idx on public.v2_feedback_obligations(student_id,section) where feedback_id is null;
create table public.v2_live_session_mappings (
 batch_id uuid not null references public.v2_course_batches(id), event_key uuid not null,
 publication_revision integer not null, session_key uuid not null, actor_id uuid not null references public.profiles(id),
 updated_at timestamptz not null default statement_timestamp(), primary key(batch_id,event_key,publication_revision),
 foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision)
);
create table public.v2_live_session_mapping_audit (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null,event_key uuid not null,
 publication_revision integer not null,session_key uuid not null,actor_id uuid not null references public.profiles(id),
 created_at timestamptz not null default statement_timestamp()
);

-- The internal reader retains the reviewed Phase 2 authorization boundary.
create function public.v2_learning_course_base(p_batch_id uuid)
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
create function public.v2_learning_session_open(p_student uuid,p_batch uuid,p_session uuid,p_section text)
returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.v2_feedback_obligations where student_id=p_student and section=p_section and feedback_id is null)
 or exists(select 1 from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and section=p_section and feedback_id is null);
$$;
create or replace function public.get_my_v2_published_course(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb;
begin
 v_course:=public.v2_learning_course_base(p_batch_id);
 if v_course is null then return null; end if;
 return jsonb_set(v_course,'{sessions}',coalesce((select jsonb_agg(s order by n) from jsonb_array_elements(v_course->'sessions') with ordinality items(s,n)
 where public.v2_learning_session_open(auth.uid(),p_batch_id,(s->>'key')::uuid,s->>'section')),'[]'));
end; $$;
create function public.get_my_v2_learning_state(p_batch_id uuid)
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
 'obligations',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'batchId',o.batch_id,'sessionKey',o.session_key,'sessionTitle',o.session_title,'section',o.section,'source',o.source,'eventKey',case when o.source='live' then o.source_key end,'createdAt',o.created_at) order by o.created_at,o.id),'[]')
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
create function public.mark_v2_learning_progress(p_batch_id uuid,p_session_key uuid,p_item_key uuid,p_state text,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_course jsonb; v_session jsonb; v_resource text;
begin
 if p_state is null or p_state not in ('opened','read') then raise exception 'Invalid progress state' using errcode='22023'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 v_course:=public.get_my_v2_published_course(p_batch_id);
 if v_course is null or (v_course->>'publicationRevision')::integer is distinct from p_publication_revision then raise exception 'Published course unavailable' using errcode='42501'; end if;
 select s into v_session from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p_session_key::text;
 if v_session is null then raise exception 'Session unavailable' using errcode='42501'; end if;
 if p_item_key is null then
  if p_state<>'opened' then raise exception 'Session progress is visual opening only' using errcode='22023'; end if;
  v_resource:='session';
 else
  if not exists(select 1 from jsonb_array_elements(v_session#>'{content,preSessionReads}') i where i->>'key'=p_item_key::text) then raise exception 'Published pre-read required' using errcode='22023'; end if;
  v_resource:=p_item_key::text;
 end if;
 insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state,read_at)
 values(auth.uid(),p_batch_id,p_session_key,v_resource,p_state,case when p_state='read' then statement_timestamp() end)
 on conflict(student_id,batch_id,session_key,resource_key) do update set last_opened_at=statement_timestamp(),
 state=case when public.v2_learning_progress.state='read' then 'read' else excluded.state end,
 read_at=coalesce(public.v2_learning_progress.read_at,excluded.read_at);
 return jsonb_build_object('saved',true);
end; $$;
create function public.v2_add_feedback_obligation(p_student uuid,p_batch uuid,p_session uuid,p_title text,p_section text,p_source text,p_key uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_feedback uuid;
begin
 select id into v_feedback from public.v2_session_feedback where student_id=p_student and batch_id=p_batch and session_key=p_session;
 insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision,feedback_id)
 values(p_student,p_batch,p_session,p_title,p_section,p_source,p_key,p_revision,v_feedback)
 on conflict(student_id,batch_id,session_key,source,source_key) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.v2_feedback_obligations where student_id=p_student and batch_id=p_batch and session_key=p_session and source=p_source and source_key=p_key; end if;
 return v_id;
end; $$;
create function public.v2_store_session_feedback(p_obligation_id uuid,p_student_id uuid,p_request_id uuid,p_response jsonb,p_event_id text)
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
 select * into v_saved from public.v2_session_feedback where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key;
 if found then
  if v_saved.request_id<>p_request_id or v_saved.confirmation_reference<>p_event_id or v_saved.response<>p_response then raise exception 'Feedback was already submitted; reload the session' using errcode='40001'; end if;
  return jsonb_build_object('submitted',true,'replayed',true);
 end if;
 select exists(select 1 from public.v2_feedback_obligations where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and source='live') into v_live;
 if (v_live and p_response->>'attendance'='recording') or (not v_live and p_response->>'attendance'<>'recording') then raise exception 'Feedback attendance context changed; reload the session' using errcode='40001'; end if;
 insert into public.v2_session_feedback(student_id,batch_id,session_key,request_id,confirmation_reference,response) values(p_student_id,o.batch_id,o.session_key,p_request_id,p_event_id,p_response) returning * into v_saved;
 update public.v2_feedback_obligations set feedback_id=v_saved.id where student_id=p_student_id and batch_id=o.batch_id and session_key=o.session_key and feedback_id is null;
 return jsonb_build_object('submitted',true,'replayed',false);
end; $$;
-- The temporary LMS form records caller-authored feedback; no external verification is claimed.
create function public.submit_v2_session_feedback(p_obligation_id uuid,p_request_id uuid,p_response jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role='student' and is_active for update;
 if not found then raise exception 'Active Student access required' using errcode='42501'; end if;
 return public.v2_store_session_feedback(p_obligation_id,auth.uid(),p_request_id,p_response,'lms:'||p_request_id::text);
end; $$;
create function public.set_v2_live_session_mapping(p_batch_id uuid,p_event_key uuid,p_session_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_session jsonb;
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
 perform 1 from public.v2_course_batches where id=p_batch_id for update;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.revision is distinct from p_publication_revision or v_publication.document->>'state'<>'published' then raise exception 'Publication changed; reload the class list' using errcode='40001'; end if;
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
end; $$;
create function public.list_v2_live_session_mappings(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('eventKey',event_key,'sessionKey',session_key,'publicationRevision',publication_revision) order by publication_revision,event_key),'[]') from public.v2_live_session_mappings where batch_id=p_batch_id);
end; $$;
create function public.v2_completed_class_feedback() returns trigger language plpgsql security definer set search_path='' as $$
declare v_mapping public.v2_live_session_mappings%rowtype; v_session jsonb; v_product text; v_student uuid;
begin
 select * into v_mapping from public.v2_live_session_mappings where batch_id=new.batch_id and event_key=new.event_key and publication_revision=new.publication_revision;
 if not found then return new; end if;
 select s into v_session from public.v2_batch_publication_revisions p, lateral jsonb_array_elements(p.document->'sessions') s
 where p.batch_id=new.batch_id and p.revision=new.publication_revision and s->>'key'=v_mapping.session_key::text;
 select product_code into v_product from public.v2_course_batches where id=new.batch_id;
 for v_student in select r.student_id from public.v2_live_registrations r join public.v2_batch_enrollments e on e.batch_id=r.batch_id and e.student_id=r.student_id
 where r.batch_id=new.batch_id and r.active and e.active order by r.student_id loop
  perform 1 from public.profiles where id=v_student for update;
  if public.v2_student_has_product(v_student,v_product) then
   perform public.v2_add_feedback_obligation(v_student,new.batch_id,v_mapping.session_key,v_session->>'title',v_session->>'section','live',new.event_key,new.publication_revision);
  end if;
 end loop;
 return new;
end; $$;
create trigger v2_live_completion_feedback after insert on public.v2_live_class_completions for each row execute function public.v2_completed_class_feedback();
create function public.complete_v2_learning_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if not exists(select 1 from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=p_publication_revision) then raise exception 'A reviewed course-session mapping is required before completion' using errcode='22023'; end if;
 return public.complete_v2_live_class(p_batch_id,p_event_key,p_publication_revision);
end; $$;

-- Meeting delivery remains independently guarded by registration and paid access.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text; v_session uuid;
begin
 select b.product_code into v_product from public.v2_course_batches b
 join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
 join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active where b.id=p_batch_id;
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
 select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
 if not found or v_publication.document->>'state'<>'published' then return null; end if;
 select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
 if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>'section') then return null; end if;
 select session_key into v_session from public.v2_live_session_mappings where batch_id=p_batch_id and event_key=p_event_key and publication_revision=v_publication.revision;
 if not public.v2_learning_session_open(auth.uid(),p_batch_id,v_session,v_event->>'section') then return null; end if;
 if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
 select l->>'url' into v_url from public.v2_published_meetings p join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
 lateral jsonb_array_elements(m.request->'links') l where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>'key'=p_event_key::text;
 if v_url is null then return null; end if;
 return jsonb_build_object('batchId',p_batch_id,'eventKey',p_event_key,'url',v_url,'publicationRevision',v_publication.revision);
end; $$;
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('batchId',b.id,'batchRevision',r.batch_revision,'revision',r.revision,'state','published',
 'productCode',b.product_code,'title',r.document->'title','sections',r.document->'sections','timeZone',r.document->'timeZone',
 'liveRegistrationLimit',case when coalesce(l.active,false) then r.document->'liveRegistrationLimit' else 'null'::jsonb end,
 'events',coalesce((select jsonb_agg(jsonb_build_object('key',ev.value->'key','title',ev.value->'title','section',ev.value->'section','kind',ev.value->'kind','startsAt',ev.value->'startsAt','endsAt',ev.value->'endsAt','instructor',ev.value->'instructor') order by ev.ordinality)
 from jsonb_array_elements(r.document->'events') with ordinality ev(value,ordinality)
 where ev.value->>'kind'<>'live' or coalesce(l.active,false)),'[]'))
 ||case when r.document?'sessions' then jsonb_build_object('sessions',coalesce((select jsonb_agg(jsonb_build_object('key',s.value->'key','title',s.value->'title','section',s.value->'section') order by s.n) from jsonb_array_elements(r.document->'sessions') with ordinality s(value,n)),'[]')) else '{}'::jsonb end order by b.id),'[]')
 from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
 join lateral(select batch_revision,revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) r on true
 left join public.v2_live_registrations l on l.batch_id=b.id and l.student_id=auth.uid()
 where e.student_id=auth.uid() and e.active and r.document->>'state'='published' and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;
create table public.v2_recording_watch_sessions (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id),batch_id uuid not null references public.v2_course_batches(id),
 session_key uuid not null,recording_key uuid not null,publication_revision integer not null,url_hash text not null,
 duration_seconds integer,last_position numeric,last_seen_at timestamptz,last_playing boolean not null default false,
 covered int8multirange not null default '{}',created_at timestamptz not null default statement_timestamp(),
 unique(student_id,batch_id,session_key,recording_key,publication_revision)
);
create table public.v2_recording_watch_samples (
 watch_id uuid not null references public.v2_recording_watch_sessions(id),request_id uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default statement_timestamp(),primary key(watch_id,request_id)
);
create function public.v2_recording_player_supported(p_url text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_url ~* '^https://(www\.|m\.)?(youtube\.com/(watch\?|embed/|shorts/)|youtube-nocookie\.com/embed/|youtu\.be/)'
 or p_url ~* '^https://[^[:space:]]+\.(mp4|webm|ogg)([?#][^[:space:]]*)?$',false);
$$;
create function public.v2_learning_recording(p_batch uuid,p_session uuid,p_recording uuid,p_revision integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_course jsonb; v_session jsonb; v_recording jsonb;
begin
 v_course:=public.get_my_v2_published_course(p_batch);
 if v_course is null or (v_course->>'publicationRevision')::integer is distinct from p_revision then raise exception 'Published recording unavailable' using errcode='42501'; end if;
 select s into v_session from jsonb_array_elements(v_course->'sessions') s where s->>'key'=p_session::text;
 if v_session is null or v_session->>'section' not in ('quant','verbal','di') then raise exception 'Subject recording required' using errcode='22023'; end if;
 select r into v_recording from jsonb_array_elements(v_session#>'{content,recordings}') r where r->>'key'=p_recording::text;
 if v_recording is null then raise exception 'Published recording unavailable' using errcode='42501'; end if;
 return jsonb_build_object('url',v_recording->'url','section',v_session->'section','sessionTitle',v_session->'title');
end; $$;
create function public.begin_v2_recording_watch(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_recording jsonb; w public.v2_recording_watch_sessions%rowtype; v_seconds numeric;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if not public.v2_recording_player_supported(v_recording->>'url') then raise exception 'Player observation is unavailable for this recording' using errcode='22023'; end if;
 insert into public.v2_recording_watch_sessions(student_id,batch_id,session_key,recording_key,publication_revision,url_hash)
 values(auth.uid(),p_batch_id,p_session_key,p_recording_key,p_publication_revision,encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')) on conflict do nothing;
 select * into strict w from public.v2_recording_watch_sessions where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and recording_key=p_recording_key and publication_revision=p_publication_revision;
 if w.url_hash<>encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex') then raise exception 'Recording changed; reload the published session' using errcode='40001'; end if;
 select coalesce(sum(upper(r)-lower(r)),0)/1000.0 into v_seconds from unnest(w.covered) r;
 return jsonb_build_object('watchId',w.id,'thresholdPercent',80,'watchedSeconds',v_seconds,'durationSeconds',w.duration_seconds,
 'due',exists(select 1 from public.v2_feedback_obligations where student_id=auth.uid() and batch_id=p_batch_id and session_key=p_session_key and source='recording' and source_key=p_recording_key and feedback_id is null));
end; $$;
create function public.record_v2_recording_sample(p_watch_id uuid,p_request_id uuid,p_position_seconds numeric,p_duration_seconds numeric,p_playing boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.v2_recording_watch_sessions%rowtype; v_recording jsonb; v_input jsonb; v_saved public.v2_recording_watch_samples%rowtype;
 v_elapsed numeric; v_seconds numeric; v_result jsonb; v_due boolean; v_start bigint; v_end bigint;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into w from public.v2_recording_watch_sessions where id=p_watch_id and student_id=auth.uid() for update;
 if not found then raise exception 'Recording observation unavailable' using errcode='42501'; end if;
 v_recording:=public.v2_learning_recording(w.batch_id,w.session_key,w.recording_key,w.publication_revision);
 if encode(sha256(convert_to(v_recording->>'url','UTF8')),'hex')<>w.url_hash then raise exception 'Recording changed; reload the session' using errcode='40001'; end if;
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
end; $$;
create function public.report_v2_recording_watched(p_batch_id uuid,p_session_key uuid,p_recording_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_recording jsonb; v_id uuid;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 v_recording:=public.v2_learning_recording(p_batch_id,p_session_key,p_recording_key,p_publication_revision);
 if public.v2_recording_player_supported(v_recording->>'url') then raise exception 'Supported players require playback observations' using errcode='22023'; end if;
 v_id:=public.v2_add_feedback_obligation(auth.uid(),p_batch_id,p_session_key,v_recording->>'sessionTitle',v_recording->>'section','recording',p_recording_key,p_publication_revision);
 return jsonb_build_object('due',exists(select 1 from public.v2_feedback_obligations where id=v_id and feedback_id is null),'obligationId',v_id);
end; $$;
alter table public.v2_learning_progress enable row level security;
revoke all on public.v2_learning_progress from public,anon,authenticated,service_role;
alter table public.v2_session_feedback enable row level security;
revoke all on public.v2_session_feedback from public,anon,authenticated,service_role;
alter table public.v2_feedback_obligations enable row level security;
revoke all on public.v2_feedback_obligations from public,anon,authenticated,service_role;
alter table public.v2_live_session_mappings enable row level security;
revoke all on public.v2_live_session_mappings from public,anon,authenticated,service_role;
alter table public.v2_live_session_mapping_audit enable row level security;
revoke all on public.v2_live_session_mapping_audit from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_sessions enable row level security;
revoke all on public.v2_recording_watch_sessions from public,anon,authenticated,service_role;
alter table public.v2_recording_watch_samples enable row level security;
revoke all on public.v2_recording_watch_samples from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_course_base(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_session_open(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_learning_state(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_learning_state(uuid) to authenticated;
revoke all on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.mark_v2_learning_progress(uuid,uuid,uuid,text,integer) to authenticated;
revoke all on function public.v2_add_feedback_obligation(uuid,uuid,uuid,text,text,text,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.v2_store_session_feedback(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.submit_v2_session_feedback(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.submit_v2_session_feedback(uuid,uuid,jsonb) to authenticated;
revoke all on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.set_v2_live_session_mapping(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.list_v2_live_session_mappings(uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_session_mappings(uuid) to authenticated;
revoke all on function public.v2_completed_class_feedback() from public,anon,authenticated,service_role;
revoke all on function public.complete_v2_learning_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.complete_v2_learning_live_class(uuid,uuid,integer) to authenticated;
revoke all on function public.v2_recording_player_supported(text) from public,anon,authenticated,service_role;
revoke all on function public.v2_learning_recording(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.begin_v2_recording_watch(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_recording_sample(uuid,uuid,numeric,numeric,boolean) to authenticated;
revoke all on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.report_v2_recording_watched(uuid,uuid,uuid,integer) to authenticated;
revoke all on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.get_my_v2_meeting(uuid,uuid),public.get_my_v2_batch_schedules() to authenticated;
commit;
