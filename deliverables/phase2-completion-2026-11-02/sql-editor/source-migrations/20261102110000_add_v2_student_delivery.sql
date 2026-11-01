-- Published course delivery, explicit live registration and class completion.
-- These transitions do not create payments, attendance or feedback submissions.
begin;

create table if not exists public.v2_published_meetings (
  batch_id uuid not null,
  publication_revision integer not null,
  meeting_revision integer not null,
  primary key(batch_id, publication_revision),
  foreign key(batch_id, publication_revision) references public.v2_batch_publication_revisions(batch_id, revision) on delete restrict,
  foreign key(batch_id, meeting_revision) references public.v2_batch_meeting_revisions(batch_id, revision) on delete restrict
);
create table if not exists public.v2_live_registrations (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  provenance text not null default 'admin_manual' check(provenance='admin_manual'),
  revision integer not null check(revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id)
);
create table if not exists public.v2_live_registration_audit (
  batch_id uuid not null,
  student_id uuid not null,
  revision integer not null,
  active boolean not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key(batch_id, student_id, revision),
  foreign key(batch_id,student_id) references public.v2_live_registrations(batch_id,student_id) on delete restrict
);
create table if not exists public.v2_live_class_completions (
  batch_id uuid not null,
  event_key uuid not null,
  publication_revision integer not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default statement_timestamp(),
  primary key(batch_id,event_key),
  foreign key(batch_id,publication_revision) references public.v2_batch_publication_revisions(batch_id,revision) on delete restrict
);

alter table public.v2_published_meetings enable row level security;
alter table public.v2_live_registrations enable row level security;
alter table public.v2_live_registration_audit enable row level security;
alter table public.v2_live_class_completions enable row level security;
revoke all on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions from public,anon,authenticated,service_role;
grant select on public.v2_published_meetings,public.v2_live_registrations,public.v2_live_registration_audit,public.v2_live_class_completions to authenticated;
drop policy if exists v2_published_meetings_admin on public.v2_published_meetings;
create policy v2_published_meetings_admin on public.v2_published_meetings for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registrations_admin on public.v2_live_registrations;
create policy v2_live_registrations_admin on public.v2_live_registrations for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_registration_audit_admin on public.v2_live_registration_audit;
create policy v2_live_registration_audit_admin on public.v2_live_registration_audit for select to authenticated using(public.is_portal_admin());
drop policy if exists v2_live_completions_admin on public.v2_live_class_completions;
create policy v2_live_completions_admin on public.v2_live_class_completions for select to authenticated using(public.is_portal_admin());

-- Only a meeting revision matching the reviewed batch revision is published.
-- Editing a draft after publication never changes an already published link.
create or replace function public.pin_v2_published_meetings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.document->>'state'='published' then
    insert into public.v2_published_meetings(batch_id,publication_revision,meeting_revision)
      select new.batch_id,new.revision,m.revision from public.v2_batch_meeting_revisions m
      where m.batch_id=new.batch_id and m.batch_revision=new.batch_revision
      order by m.revision desc limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists v2_pin_published_meetings on public.v2_batch_publication_revisions;
create trigger v2_pin_published_meetings after insert on public.v2_batch_publication_revisions
  for each row execute function public.pin_v2_published_meetings();

create or replace function public.get_my_v2_published_course(p_batch_id uuid)
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
  -- Projection excludes draft metadata. Both modern sessions and historical
  -- outline content retain their published order and independently edited titles.
  select coalesce(jsonb_agg(jsonb_build_object('key',s->'key','title',coalesce(nullif(s->>'title',''),'Course outline'),'section',s->'section','content',s->'content') order by n),'[]')
    into v_sessions from jsonb_array_elements(coalesce(v_draft->'sessions','[]') || coalesce((
      select jsonb_agg(e order by ord) from jsonb_array_elements(v_draft->'events') with ordinality item(e,ord)
      where e ? 'content'
    ),'[]')) with ordinality item(s,n)
    where public.can_access_v2_product(public.v2_entitlement_product_code(v_product),s->>'section')
      or (v_product='full_course' and s->>'section'='programme' and public.can_access_v2_product('full_batch'));
  return jsonb_build_object('batchId',p_batch_id,'publicationRevision',v_publication.revision,'batchRevision',v_publication.batch_revision,
    'title',v_publication.document->'title','productCode',v_product,'sessions',v_sessions);
end;
$$;

create or replace function public.list_v2_live_registration_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(r.active,false),'revision',coalesce(r.revision,0),
    'eligible',coalesce(e.active,false) and public.v2_student_has_product(s.id,b.product_code)) order by s.full_name,s.id),'[]')
    from public.v2_course_batches b cross join public.profiles s
    left join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=s.id
    left join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=s.id
    where b.id=p_batch_id and (e.active or r.student_id is not null));
end;
$$;

create or replace function public.set_v2_live_registration(p_batch_id uuid,p_student_id uuid,p_active boolean,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_product text; v_current integer; v_publication jsonb;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if p_active is null or p_expected_revision is null or p_expected_revision not between 0 and 2147483646 then
    raise exception 'Invalid registration request' using errcode='22023'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select revision into v_current from public.v2_live_registrations where batch_id=p_batch_id and student_id=p_student_id;
  if coalesce(v_current,0)<>p_expected_revision then raise exception 'Registration changed; reload the roster' using errcode='40001'; end if;
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
$$;

-- The caller identity is derived from the session on every join request.
create or replace function public.get_my_v2_meeting(p_batch_id uuid,p_event_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_product text; v_publication public.v2_batch_publication_revisions%rowtype; v_event jsonb; v_url text;
begin
  select b.product_code into v_product from public.v2_course_batches b
    join public.v2_batch_enrollments e on e.batch_id=b.id and e.student_id=auth.uid() and e.active
    join public.v2_live_registrations r on r.batch_id=b.id and r.student_id=auth.uid() and r.active
    where b.id=p_batch_id;
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product)) then return null; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return null; end if;
  select e into v_event from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live';
  if not found or not public.can_access_v2_product(public.v2_entitlement_product_code(v_product),v_event->>'section') then return null; end if;
  if exists(select 1 from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key) then return null; end if;
  select l->>'url' into v_url from public.v2_published_meetings p
    join public.v2_batch_meeting_revisions m on m.batch_id=p.batch_id and m.revision=p.meeting_revision,
    lateral jsonb_array_elements(m.request->'links') l
    where p.batch_id=p_batch_id and p.publication_revision=v_publication.revision and l->>'key'=p_event_key::text;
  if v_url is null then return null; end if;
  return jsonb_build_object('batchId',p_batch_id,'eventKey',p_event_key,'url',v_url,'publicationRevision',v_publication.revision);
end;
$$;

create or replace function public.list_v2_live_class_status(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.document->>'state'<>'published' then return '[]'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('eventKey',e->>'key','title',e->>'title',
    'publicationRevision',v_publication.revision,'completedAt',c.completed_at) order by n),'[]')
    from jsonb_array_elements(v_publication.document->'events') with ordinality item(e,n)
    left join public.v2_live_class_completions c on c.batch_id=p_batch_id and c.event_key=(e->>'key')::uuid
    where e->>'kind'='live');
end;
$$;

-- Completion is a one-way audited operational fact, independent of attendance.
create or replace function public.complete_v2_live_class(p_batch_id uuid,p_event_key uuid,p_publication_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_publication public.v2_batch_publication_revisions%rowtype; v_saved public.v2_live_class_completions%rowtype;
begin
  perform 1 from public.profiles where id=auth.uid() and role='admin' and is_active for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform 1 from public.v2_course_batches where id=p_batch_id for update;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  select * into v_saved from public.v2_live_class_completions where batch_id=p_batch_id and event_key=p_event_key;
  if found then
    if v_saved.publication_revision<>p_publication_revision then raise exception 'Completion belongs to another publication' using errcode='40001'; end if;
    return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',true);
  end if;
  select * into v_publication from public.v2_batch_publication_revisions where batch_id=p_batch_id order by revision desc limit 1;
  if not found or v_publication.revision is distinct from p_publication_revision then raise exception 'Publication changed; reload the class list' using errcode='40001'; end if;
  if v_publication.document->>'state'<>'published' or not exists (
    select 1 from jsonb_array_elements(v_publication.document->'events') e where e->>'key'=p_event_key::text and e->>'kind'='live'
  ) then raise exception 'Published live class required' using errcode='22023'; end if;
  insert into public.v2_live_class_completions(batch_id,event_key,publication_revision,actor_id)
    values(p_batch_id,p_event_key,p_publication_revision,auth.uid()) returning * into v_saved;
  return jsonb_build_object('eventKey',p_event_key,'completedAt',v_saved.completed_at,'replayed',false);
end;
$$;

revoke all on function public.pin_v2_published_meetings(),public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_published_course(uuid),public.list_v2_live_registration_options(uuid),
  public.set_v2_live_registration(uuid,uuid,boolean,integer),public.get_my_v2_meeting(uuid,uuid),public.list_v2_live_class_status(uuid),
  public.complete_v2_live_class(uuid,uuid,integer) to authenticated;
commit;
