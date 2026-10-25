-- Proposed migration: local rehearsal only. Enrollment controls schedule visibility;
-- it neither purchases access nor allocates a paid live-course registration.
begin;

create table if not exists public.v2_batch_enrollments (
  batch_id uuid not null references public.v2_course_batches(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null,
  revision integer not null check (revision > 0),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (batch_id, student_id)
);
create index if not exists v2_batch_enrollments_student_idx
  on public.v2_batch_enrollments(student_id, batch_id) where active;
alter table public.v2_batch_enrollments enable row level security;
revoke all on public.v2_batch_enrollments from public, anon, authenticated, service_role;
grant select on public.v2_batch_enrollments to authenticated;
drop policy if exists v2_enrollment_admin_read on public.v2_batch_enrollments;
create policy v2_enrollment_admin_read on public.v2_batch_enrollments
  for select to authenticated using (public.is_portal_admin());

-- Private helper: never accepts an arbitrary student ID through a public RPC.
create or replace function public.v2_student_has_product(p_student uuid, p_product text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles s
    join public.v2_purchases p on p.student_id=s.id
    join public.v2_product_grants g on g.purchase_id=p.id
    where s.id=p_student and s.role='student' and s.is_active
      and g.product_code=public.v2_entitlement_product_code(p_product)
      and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
  );
$$;

create or replace function public.list_v2_batch_enrollment_options(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_product text;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  select product_code into v_product from public.v2_course_batches where id=p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'studentId',s.id,'name',coalesce(nullif(btrim(s.full_name),''),'Student'),
    'active',coalesce(e.active,false),'revision',coalesce(e.revision,0),
    'eligible',public.v2_student_has_product(s.id,v_product)
  ) order by s.full_name,s.id),'[]'::jsonb)
    from public.profiles s left join public.v2_batch_enrollments e on e.student_id=s.id and e.batch_id=p_batch_id
    where e.student_id is not null or public.v2_student_has_product(s.id,v_product));
end;
$$;

-- Optimistic concurrency: an interrupted confirmation is resolved by reloading
-- the roster. A stale retry must never undo a subsequent removal or enrollment.
create or replace function public.set_v2_batch_enrollment(
  p_batch_id uuid, p_student_id uuid, p_active boolean, p_expected_revision integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if coalesce(v_revision,0) <> p_expected_revision then raise exception 'Enrollment changed; reload the roster' using errcode='40001'; end if;
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
$$;

-- No caller-supplied student identifier. Latest publication is selected BEFORE
-- filtering state, so unpublishing cannot resurrect an older published revision.
create or replace function public.get_my_v2_batch_schedules()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId',b.id,'batchRevision',r.batch_revision,'revision',r.revision,'state','published',
    'productCode',b.product_code,'title',r.document->'title','sections',r.document->'sections',
    'timeZone',r.document->'timeZone','liveRegistrationLimit',r.document->'liveRegistrationLimit',
    'events',coalesce((select jsonb_agg(jsonb_build_object(
      'key',ev.value->'key','title',ev.value->'title','section',ev.value->'section','kind',ev.value->'kind',
      'startsAt',ev.value->'startsAt','endsAt',ev.value->'endsAt','instructor',ev.value->'instructor'
    ) order by ev.ordinality) from jsonb_array_elements(r.document->'events') with ordinality ev(value,ordinality)),'[]'::jsonb)
  ) order by b.id),'[]'::jsonb)
  from public.v2_batch_enrollments e join public.v2_course_batches b on b.id=e.batch_id
  join lateral (select batch_revision,revision,document from public.v2_batch_publication_revisions
    where batch_id=b.id order by revision desc limit 1) r on true
  where e.student_id=auth.uid() and e.active and r.document->>'state'='published'
    and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;

revoke all on function public.v2_student_has_product(uuid,text),
  public.list_v2_batch_enrollment_options(uuid),public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),
  public.get_my_v2_batch_schedules() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_batch_enrollment_options(uuid),
  public.set_v2_batch_enrollment(uuid,uuid,boolean,integer),public.get_my_v2_batch_schedules() to authenticated;
commit;
