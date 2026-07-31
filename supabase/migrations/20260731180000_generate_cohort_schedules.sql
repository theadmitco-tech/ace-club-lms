begin;

-- Repeat the archival normalization for staging, where the signed Phase 3
-- migration was applied before these columns were added to its Production-safe form.
alter table public.master_sessions
  add column if not exists curriculum_version text,
  add column if not exists is_archived boolean not null default false;

update public.master_sessions
set
  curriculum_version = case when curriculum_key is null then 'legacy-v1' else 'mvp-2026' end,
  is_archived = curriculum_key is null;

drop index if exists public.master_sessions_session_number_key;

create unique index if not exists master_sessions_version_session_number_key
  on public.master_sessions (curriculum_version, session_number);

alter table public.courses
  add column if not exists cohort_start_date date,
  add column if not exists schedule_timezone text not null default 'Asia/Kolkata';

alter table public.sessions
  add column if not exists master_session_id uuid,
  add column if not exists class_type text,
  add column if not exists instructor text,
  add column if not exists session_end_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_master_session_id_fkey'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_master_session_id_fkey
      foreign key (master_session_id)
      references public.master_sessions(id)
      on delete set null;
  end if;
end
$$;

create unique index if not exists sessions_course_master_session_key
  on public.sessions (course_id, master_session_id)
  where master_session_id is not null;

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
  where session.course_id = p_course_id;

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
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
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
    and not exists (
      select 1
      from public.materials as existing
      where existing.session_id = session.id
        and existing.master_material_id = material.id
    );

  get diagnostics inserted_materials = row_count;

  return jsonb_build_object('materials_added', inserted_materials);
end;
$$;

revoke all on function public.generate_course_schedule(uuid, date) from public;
revoke all on function public.sync_course_master_materials(uuid) from public;
grant execute on function public.generate_course_schedule(uuid, date) to authenticated;
grant execute on function public.sync_course_master_materials(uuid) to authenticated;

commit;
