-- Mock tests attached to a V2 batch. Admins add, edit and remove them; students see the mocks of
-- batches they are actively enrolled in while their access is active. Mocks never create
-- feedback obligations, live registrations or attendance records. Existing data is unchanged.
begin;

create table public.v2_batch_mocks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.v2_course_batches(id),
  title text not null check (length(btrim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz,
  test_url text check (test_url is null or (test_url ~ '^https://[^[:space:]]+$' and length(test_url) <= 2000)),
  instructions text not null default '' check (length(instructions) <= 2000),
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default statement_timestamp(),
  check (ends_at is null or ends_at > starts_at)
);
create index v2_batch_mocks_batch_idx on public.v2_batch_mocks(batch_id, starts_at);
alter table public.v2_batch_mocks enable row level security;
revoke all on table public.v2_batch_mocks from public, anon, authenticated;

create or replace function public.v2_require_active_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active;
  if not found then raise exception 'Active Admin access required' using errcode = '42501'; end if;
end; $$;

create or replace function public.list_v2_batch_mocks(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.v2_require_active_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'startsAt', m.starts_at, 'endsAt', m.ends_at,
    'testUrl', m.test_url, 'instructions', m.instructions) order by m.starts_at)
    from public.v2_batch_mocks m where m.batch_id = p_batch_id), '[]'::jsonb);
end; $$;

-- Creates (p_mock_id null) or updates one mock and returns it.
create or replace function public.save_v2_batch_mock(p_batch_id uuid, p_mock_id uuid, p_title text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_test_url text, p_instructions text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.v2_require_active_admin();
  perform 1 from public.v2_course_batches where id = p_batch_id;
  if not found then raise exception 'Batch unavailable' using errcode = '22023'; end if;
  if p_title is null or p_starts_at is null then raise exception 'A mock needs a title and a start time' using errcode = '22023'; end if;
  if p_mock_id is null then
    insert into public.v2_batch_mocks(batch_id, title, starts_at, ends_at, test_url, instructions, created_by)
    values (p_batch_id, btrim(p_title), p_starts_at, p_ends_at, nullif(btrim(coalesce(p_test_url, '')), ''), coalesce(p_instructions, ''), auth.uid())
    returning id into v_id;
  else
    update public.v2_batch_mocks set title = btrim(p_title), starts_at = p_starts_at, ends_at = p_ends_at,
      test_url = nullif(btrim(coalesce(p_test_url, '')), ''), instructions = coalesce(p_instructions, ''), updated_at = statement_timestamp()
    where id = p_mock_id and batch_id = p_batch_id returning id into v_id;
    if v_id is null then raise exception 'Mock unavailable' using errcode = '22023'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end; $$;

create or replace function public.delete_v2_batch_mock(p_batch_id uuid, p_mock_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.v2_require_active_admin();
  delete from public.v2_batch_mocks where id = p_mock_id and batch_id = p_batch_id;
  return jsonb_build_object('deleted', found);
end; $$;

-- The caller's mocks: active enrollment, published batch and active access, like the student schedule.
create or replace function public.get_my_v2_mocks()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'batchId', m.batch_id, 'title', m.title, 'startsAt', m.starts_at,
    'endsAt', m.ends_at, 'testUrl', m.test_url, 'instructions', m.instructions) order by m.starts_at), '[]'::jsonb)
  from public.v2_batch_mocks m
  join public.v2_batch_enrollments e on e.batch_id = m.batch_id and e.student_id = auth.uid() and e.active
  join public.v2_course_batches b on b.id = m.batch_id
  join lateral (select document from public.v2_batch_publication_revisions where batch_id = b.id order by revision desc limit 1) r on true
  where r.document->>'state' = 'published' and public.can_access_v2_product(public.v2_entitlement_product_code(b.product_code));
$$;

revoke all on function public.v2_require_active_admin(), public.list_v2_batch_mocks(uuid),
  public.save_v2_batch_mock(uuid, uuid, text, timestamptz, timestamptz, text, text), public.delete_v2_batch_mock(uuid, uuid),
  public.get_my_v2_mocks() from public, anon, authenticated, service_role;
grant execute on function public.list_v2_batch_mocks(uuid), public.save_v2_batch_mock(uuid, uuid, text, timestamptz, timestamptz, text, text),
  public.delete_v2_batch_mock(uuid, uuid), public.get_my_v2_mocks() to authenticated;

commit;
