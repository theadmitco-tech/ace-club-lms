begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_supported_youtube_url_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_supported_youtube_url_check
      check (
        type <> 'video'
        or (video_url is not null and public.is_supported_youtube_url(video_url))
      ) not valid;
  end if;
end
$$;

create or replace function public.enforce_batch_recording_release()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  release_at timestamptz;
begin
  if new.type <> 'video' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.master_material_id is not null then
    return null;
  end if;

  select session.session_end_at
  into release_at
  from public.sessions as session
  where session.id = new.session_id;

  if release_at is null then
    raise exception 'Recording session must have an end time';
  end if;

  new.master_material_id := null;
  new.available_from := release_at;
  new.file_url := null;
  new.notion_url := null;
  return new;
end;
$$;

drop trigger if exists enforce_batch_recording_release on public.materials;
create trigger enforce_batch_recording_release
before insert or update on public.materials
for each row execute function public.enforce_batch_recording_release();

-- Preserve existing cohort recordings while removing the master relationship.
-- The foreign key uses ON DELETE SET NULL, and the trigger reasserts the
-- cohort session's own release timestamp during that update.
delete from public.master_materials as material
using public.master_sessions as session
where material.master_session_id = session.id
  and material.type = 'video'
  and session.curriculum_version = 'mvp-2026'
  and session.is_archived = false;

create or replace function public.generate_course_schedule(
  p_course_id uuid,
  p_start_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_sessions integer;
  generated_materials integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if extract(isodow from p_start_date) <> 5 then
    raise exception 'Cohort start date must be a Friday';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found';
  end if;

  if exists (select 1 from public.sessions where course_id = p_course_id) then
    raise exception 'Course already has a schedule';
  end if;

  update public.courses
  set
    cohort_start_date = p_start_date,
    schedule_timezone = 'Asia/Kolkata'
  where id = p_course_id;

  insert into public.sessions (
    course_id,
    master_session_id,
    title,
    session_number,
    session_date,
    session_end_at,
    class_type,
    instructor,
    is_published
  )
  select
    p_course_id,
    master.id,
    master.title,
    master.session_number,
    starts.session_start_at,
    starts.session_start_at + case when master.class_type = 'ORIENTATION' then interval '1 hour' else interval '2 hours' end,
    master.class_type,
    master.instructor,
    true
  from public.master_sessions as master
  cross join lateral (
    select (
      p_start_date
      + (master.week_number * 7)
      + case master.weekday when 'Friday' then 0 when 'Saturday' then 1 when 'Sunday' then 2 end
      + case master.weekday when 'Friday' then time '20:00' else time '10:00' end
    ) at time zone 'Asia/Kolkata' as session_start_at
  ) as starts
  where master.curriculum_version = 'mvp-2026'
    and master.is_archived = false
  order by master.session_number;

  get diagnostics generated_sessions = row_count;

  if generated_sessions <> 31 then
    raise exception 'Expected 31 current master sessions, found %', generated_sessions;
  end if;

  insert into public.materials (
    session_id,
    master_material_id,
    type,
    title,
    notion_url,
    file_url,
    video_url,
    question_count,
    available_from
  )
  select
    session.id,
    material.id,
    material.type,
    material.title,
    material.notion_url,
    material.file_url,
    material.video_url,
    material.question_count,
    case
      when material.type = 'pre_read' and master.week_number = 0 then statement_timestamp()
      when material.type = 'pre_read' then session.session_date - interval '7 days'
      else session.session_end_at
    end
  from public.sessions as session
  join public.master_sessions as master on master.id = session.master_session_id
  join public.master_materials as material on material.master_session_id = master.id
  where session.course_id = p_course_id
    and material.type <> 'video';

  get diagnostics generated_materials = row_count;

  return jsonb_build_object(
    'sessions', generated_sessions,
    'materials', generated_materials
  );
end;
$$;

create or replace function public.sync_course_master_materials(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_materials integer;
  updated_materials integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.materials as existing
  set
    title = master_material.title,
    notion_url = master_material.notion_url,
    file_url = master_material.file_url,
    question_count = master_material.question_count
  from public.sessions as session
  join public.master_materials as master_material
    on master_material.master_session_id = session.master_session_id
  where session.course_id = p_course_id
    and master_material.type <> 'video'
    and existing.session_id = session.id
    and existing.master_material_id = master_material.id
    and (
      existing.title,
      existing.notion_url,
      existing.file_url,
      existing.question_count
    ) is distinct from (
      master_material.title,
      master_material.notion_url,
      master_material.file_url,
      master_material.question_count
    );

  get diagnostics updated_materials = row_count;

  insert into public.materials (
    session_id,
    master_material_id,
    type,
    title,
    notion_url,
    file_url,
    video_url,
    question_count,
    available_from
  )
  select
    session.id,
    master_material.id,
    master_material.type,
    master_material.title,
    master_material.notion_url,
    master_material.file_url,
    master_material.video_url,
    master_material.question_count,
    case
      when master_material.type = 'pre_read' and master.week_number = 0 then statement_timestamp()
      when master_material.type = 'pre_read' then session.session_date - interval '7 days'
      else session.session_end_at
    end
  from public.sessions as session
  join public.master_sessions as master on master.id = session.master_session_id
  join public.master_materials as master_material on master_material.master_session_id = master.id
  where session.course_id = p_course_id
    and master_material.type <> 'video'
    and not exists (
      select 1
      from public.materials as existing
      where existing.session_id = session.id
        and existing.master_material_id = master_material.id
    );

  get diagnostics inserted_materials = row_count;

  return jsonb_build_object(
    'materials_added', inserted_materials,
    'materials_updated', updated_materials
  );
end;
$$;

create or replace function public.save_batch_recording(
  p_session_id uuid,
  p_title text,
  p_video_url text,
  p_material_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_material public.materials;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Recording title is required';
  end if;

  if not public.is_supported_youtube_url(p_video_url) then
    raise exception 'Enter a valid YouTube or youtu.be link';
  end if;

  if not exists (
    select 1 from public.sessions as session where session.id = p_session_id
  ) then
    raise exception 'Batch session not found' using errcode = 'P0002';
  end if;

  if p_material_id is null then
    insert into public.materials (
      session_id,
      master_material_id,
      type,
      title,
      video_url,
      available_from
    )
    select
      session.id,
      null,
      'video',
      btrim(p_title),
      btrim(p_video_url),
      session.session_end_at
    from public.sessions as session
    where session.id = p_session_id
    returning * into saved_material;
  else
    update public.materials as material
    set
      master_material_id = null,
      title = btrim(p_title),
      video_url = btrim(p_video_url)
    where material.id = p_material_id
      and material.session_id = p_session_id
      and material.type = 'video'
    returning material.* into saved_material;

    if saved_material.id is null then
      raise exception 'Batch recording not found' using errcode = 'P0002';
    end if;
  end if;

  return jsonb_build_object(
    'id', saved_material.id,
    'available_from', saved_material.available_from
  );
end;
$$;

create or replace function public.remove_batch_recording(p_material_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_recording uuid;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  delete from public.materials as material
  where material.id = p_material_id
    and material.type = 'video'
  returning material.id into removed_recording;

  if removed_recording is null then
    raise exception 'Batch recording not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', removed_recording);
end;
$$;

drop function if exists public.remove_master_recording(uuid);

revoke all on function public.enforce_batch_recording_release() from public;
revoke all on function public.generate_course_schedule(uuid, date) from public;
revoke all on function public.sync_course_master_materials(uuid) from public;
revoke all on function public.save_batch_recording(uuid, text, text, uuid) from public;
revoke all on function public.remove_batch_recording(uuid) from public;

grant execute on function public.generate_course_schedule(uuid, date) to authenticated;
grant execute on function public.sync_course_master_materials(uuid) to authenticated;
grant execute on function public.save_batch_recording(uuid, text, text, uuid) to authenticated;
grant execute on function public.remove_batch_recording(uuid) to authenticated;

commit;
