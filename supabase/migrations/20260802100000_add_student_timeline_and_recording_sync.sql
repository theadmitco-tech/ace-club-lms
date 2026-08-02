begin;

create or replace function public.is_supported_youtube_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    btrim(p_url) ~* '^https://(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[A-Za-z0-9_-]{6,}',
    false
  );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'master_materials_supported_youtube_url_check'
      and conrelid = 'public.master_materials'::regclass
  ) then
    alter table public.master_materials
      add constraint master_materials_supported_youtube_url_check
      check (
        type <> 'video'
        or (video_url is not null and public.is_supported_youtube_url(video_url))
      ) not valid;
  end if;
end
$$;

create or replace function public.get_student_timeline()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  selected_course_id uuid;
  course_payload jsonb;
  session_payload jsonb;
begin
  if student_id is null or not exists (
    select 1
    from public.profiles as profile
    where profile.id = student_id
      and profile.role = 'student'
      and profile.is_active = true
  ) then
    raise exception 'Student access required' using errcode = '42501';
  end if;

  select enrollment.course_id
  into selected_course_id
  from public.enrollments as enrollment
  where enrollment.user_id = student_id
  order by enrollment.enrolled_at desc
  limit 1;

  if selected_course_id is null then
    return jsonb_build_object(
      'generated_at', statement_timestamp(),
      'course', null,
      'sessions', '[]'::jsonb
    );
  end if;

  select jsonb_build_object(
    'id', course.id,
    'name', course.name,
    'cohort_start_date', course.cohort_start_date,
    'schedule_timezone', course.schedule_timezone
  )
  into course_payload
  from public.courses as course
  where course.id = selected_course_id;

  select coalesce(jsonb_agg(item.payload order by item.session_number), '[]'::jsonb)
  into session_payload
  from (
    select
      session.session_number,
      jsonb_build_object(
        'id', session.id,
        'title', session.title,
        'session_number', session.session_number,
        'session_date', session.session_date,
        'session_end_at', session.session_end_at,
        'class_type', session.class_type,
        'instructor', session.instructor,
        'week_number', master.week_number,
        'weekday', master.weekday,
        'materials', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', material.id,
              'type', material.type,
              'title', material.title,
              'available_from', material.available_from,
              'is_available', material.available_from <= statement_timestamp()
            )
            order by material.created_at, material.id
          )
          from public.materials as material
          where material.session_id = session.id
        ), '[]'::jsonb)
      ) as payload
    from public.sessions as session
    left join public.master_sessions as master
      on master.id = session.master_session_id
    where session.course_id = selected_course_id
      and session.is_published = true
  ) as item;

  return jsonb_build_object(
    'generated_at', statement_timestamp(),
    'course', course_payload,
    'sessions', session_payload
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
    video_url = master_material.video_url,
    question_count = master_material.question_count
  from public.sessions as session
  join public.master_materials as master_material
    on master_material.master_session_id = session.master_session_id
  where session.course_id = p_course_id
    and existing.session_id = session.id
    and existing.master_material_id = master_material.id
    and (
      existing.title,
      existing.notion_url,
      existing.file_url,
      existing.video_url,
      existing.question_count
    ) is distinct from (
      master_material.title,
      master_material.notion_url,
      master_material.file_url,
      master_material.video_url,
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

revoke all on function public.is_supported_youtube_url(text) from public;
revoke all on function public.get_student_timeline() from public;
revoke all on function public.sync_course_master_materials(uuid) from public;

grant execute on function public.get_student_timeline() to authenticated;
grant execute on function public.sync_course_master_materials(uuid) to authenticated;
grant execute on function public.is_supported_youtube_url(text) to authenticated;

commit;
