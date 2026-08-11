begin;

-- Session materials are cohort-only. Master content remains restricted to the
-- original reusable types, and schedule generation/sync can therefore never
-- source a session_material row.
alter table public.master_materials
  add constraint master_materials_no_session_material
  check (type <> 'session_material') not valid;

alter table public.master_materials
  validate constraint master_materials_no_session_material;

alter table public.materials
  drop constraint materials_type_check;

alter table public.materials
  add constraint materials_type_check
  check (type = any (array[
    'pre_read'::text,
    'class_material'::text,
    'worksheet'::text,
    'video'::text,
    'session_material'::text
  ])) not valid;

alter table public.materials
  validate constraint materials_type_check;

alter table public.materials
  add constraint materials_session_material_shape_check
  check (
    type <> 'session_material'
    or (
      master_material_id is null
      and file_url is not null
      and notion_url is null
      and video_url is null
    )
  ) not valid;

alter table public.materials
  validate constraint materials_session_material_shape_check;

create unique index materials_session_material_file_url_key
  on public.materials (file_url)
  where type = 'session_material';

create or replace function public.enforce_batch_session_material()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  release_at timestamptz;
  expected_file_pattern text;
begin
  if tg_op = 'UPDATE' and old.type = 'session_material' and new.type <> 'session_material' then
    raise exception 'Session material type cannot be changed';
  end if;

  if new.type <> 'session_material' then
    return new;
  end if;

  select session.session_end_at
  into release_at
  from public.sessions as session
  where session.id = new.session_id;

  if release_at is null then
    raise exception 'Session material batch session must have an end time';
  end if;
  if nullif(btrim(new.title), '') is null then
    raise exception 'Session material title is required';
  end if;

  expected_file_pattern := '^/api/materials/file[?]path=session-materials%2f'
    || new.session_id::text
    || '%2f[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]pdf$';
  if new.file_url !~* expected_file_pattern then
    raise exception 'Session material PDF must belong to the selected batch session';
  end if;

  new.master_material_id := null;
  new.title := btrim(new.title);
  new.available_from := release_at;
  new.notion_url := null;
  new.video_url := null;
  return new;
end;
$$;

drop trigger if exists enforce_batch_session_material on public.materials;
create trigger enforce_batch_session_material
before insert or update on public.materials
for each row execute function public.enforce_batch_session_material();

create or replace function public.save_batch_session_material(
  p_session_id uuid,
  p_title text,
  p_file_url text default null,
  p_material_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_material public.materials;
  saved_material public.materials;
  next_file_url text;
  previous_file_url text;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'Session material title is required';
  end if;
  if not exists (
    select 1 from public.sessions as session where session.id = p_session_id
  ) then
    raise exception 'Batch session not found' using errcode = 'P0002';
  end if;

  if p_material_id is null then
    if nullif(btrim(p_file_url), '') is null then
      raise exception 'Session material PDF is required';
    end if;

    insert into public.materials (
      session_id,
      master_material_id,
      type,
      title,
      file_url,
      available_from
    )
    select
      session.id,
      null,
      'session_material',
      btrim(p_title),
      btrim(p_file_url),
      session.session_end_at
    from public.sessions as session
    where session.id = p_session_id
    returning * into saved_material;
  else
    select material.*
    into existing_material
    from public.materials as material
    where material.id = p_material_id
      and material.session_id = p_session_id
      and material.type = 'session_material'
    for update;

    if existing_material.id is null then
      raise exception 'Session material not found' using errcode = 'P0002';
    end if;

    next_file_url := coalesce(nullif(btrim(p_file_url), ''), existing_material.file_url);
    if next_file_url is distinct from existing_material.file_url then
      previous_file_url := existing_material.file_url;
    end if;

    update public.materials as material
    set
      title = btrim(p_title),
      file_url = next_file_url
    where material.id = existing_material.id
    returning material.* into saved_material;
  end if;

  return jsonb_build_object(
    'id', saved_material.id,
    'available_from', saved_material.available_from,
    'previous_file_url', previous_file_url
  );
end;
$$;

create or replace function public.remove_batch_session_material(
  p_session_id uuid,
  p_material_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_material public.materials;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  delete from public.materials as material
  where material.id = p_material_id
    and material.session_id = p_session_id
    and material.type = 'session_material'
  returning material.* into removed_material;

  if removed_material.id is null then
    raise exception 'Session material not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', removed_material.id,
    'file_url', removed_material.file_url
  );
end;
$$;

-- Student reads remain enrollment- and release-gated and now explicitly
-- require a published session. The existing Admin management policy remains a
-- separate permissive policy, so Admins can still prepare future resources.
drop policy if exists "Authorised users can view materials" on public.materials;
create policy "Authorised users can view materials"
on public.materials
as permissive
for select
to public
using (
  available_from <= statement_timestamp()
  and exists (
    select 1
    from public.sessions as session
    where session.id = materials.session_id
      and session.is_published = true
      and public.can_access_course(session.course_id)
  )
);

revoke all on function public.enforce_batch_session_material() from public;
revoke all on function public.save_batch_session_material(uuid, text, text, uuid) from public;
revoke all on function public.remove_batch_session_material(uuid, uuid) from public;
revoke all on function public.save_batch_session_material(uuid, text, text, uuid) from anon;
revoke all on function public.remove_batch_session_material(uuid, uuid) from anon;

grant execute on function public.save_batch_session_material(uuid, text, text, uuid) to authenticated;
grant execute on function public.remove_batch_session_material(uuid, uuid) to authenticated;

commit;
