begin;

create table public.student_course_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  selected_course_id uuid not null references public.courses(id) on delete cascade,
  updated_at timestamptz not null default statement_timestamp()
);

alter table public.student_course_preferences enable row level security;
revoke all on table public.student_course_preferences from public, anon, authenticated;

create or replace function public.resolve_student_course_id(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select preference.selected_course_id
      from public.student_course_preferences as preference
      where preference.user_id = p_student_id
        and exists (
          select 1
          from public.enrollments as enrolled
          where enrolled.user_id = p_student_id
            and enrolled.course_id = preference.selected_course_id
        )
    ),
    (
      select enrollment.course_id
      from public.enrollments as enrollment
      where enrollment.user_id = p_student_id
      order by enrollment.enrolled_at desc, enrollment.course_id
      limit 1
    )
  );
$$;

revoke all on function public.resolve_student_course_id(uuid) from public, anon, authenticated;

create or replace function public.get_student_course_options()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  selected_course_id uuid;
  enrollment_count integer;
  course_payload jsonb;
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

  select count(*)::integer
  into enrollment_count
  from public.enrollments as enrollment
  where enrollment.user_id = student_id;

  select preference.selected_course_id
  into selected_course_id
  from public.student_course_preferences as preference
  where preference.user_id = student_id
    and exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = student_id
        and enrollment.course_id = preference.selected_course_id
    );

  if enrollment_count = 1 and selected_course_id is null then
    selected_course_id := public.resolve_student_course_id(student_id);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', course.id,
    'name', course.name,
    'course_mode', coalesce(course.course_mode, 'full'),
    'cohort_start_date', course.cohort_start_date,
    'is_active', course.is_active,
    'enrolled_at', enrollment.enrolled_at
  ) order by enrollment.enrolled_at desc, course.name), '[]'::jsonb)
  into course_payload
  from public.enrollments as enrollment
  join public.courses as course on course.id = enrollment.course_id
  where enrollment.user_id = student_id;

  return jsonb_build_object(
    'selected_course_id', selected_course_id,
    'courses', course_payload
  );
end;
$$;

revoke all on function public.get_student_course_options() from public, anon;
grant execute on function public.get_student_course_options() to authenticated;

create or replace function public.select_student_course(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
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

  if not exists (
    select 1
    from public.enrollments as enrollment
    where enrollment.user_id = student_id
      and enrollment.course_id = p_course_id
  ) then
    raise exception 'Course enrollment required' using errcode = '42501';
  end if;

  insert into public.student_course_preferences (user_id, selected_course_id, updated_at)
  values (student_id, p_course_id, statement_timestamp())
  on conflict (user_id) do update
  set selected_course_id = excluded.selected_course_id,
      updated_at = excluded.updated_at;

  return p_course_id;
end;
$$;

revoke all on function public.select_student_course(uuid) from public, anon;
grant execute on function public.select_student_course(uuid) to authenticated;

create or replace function public.get_portal_identity()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', profile.id,
    'role', profile.role,
    'full_name', profile.full_name,
    'tester_access', profile.role = 'admin' and exists (
      select 1
      from public.mock_assignment_testers as tester
      where tester.user_id = profile.id
        and tester.revoked_at is null
    ),
    'course_count', case when profile.role = 'student' then (
      select count(*)
      from public.enrollments as enrollment
      where enrollment.user_id = profile.id
    ) else 0 end,
    'selected_course_id', case when profile.role = 'student' then (
      select coalesce(
        (
          select preference.selected_course_id
          from public.student_course_preferences as preference
          where preference.user_id = profile.id
            and exists (
              select 1 from public.enrollments as enrolled
              where enrolled.user_id = profile.id
                and enrolled.course_id = preference.selected_course_id
            )
        ),
        case when (select count(*) from public.enrollments as counted where counted.user_id = profile.id) = 1
          then public.resolve_student_course_id(profile.id)
        end
      )
    ) else null end
  )
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true
    and profile.role in ('admin', 'student');
$$;

revoke all on function public.get_portal_identity() from public, anon;
grant execute on function public.get_portal_identity() to authenticated;

create or replace function public.get_student_practice_log()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  selected_course_id uuid;
  worksheet_payload jsonb;
begin
  if student_id is null or not exists (
    select 1 from public.profiles as profile
    where profile.id = student_id and profile.role = 'student' and profile.is_active = true
  ) then
    raise exception 'Student access required' using errcode = '42501';
  end if;

  selected_course_id := public.resolve_student_course_id(student_id);

  if selected_course_id is null then
    return jsonb_build_object('course', null, 'worksheets', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(item.payload order by item.week_number, item.session_number, item.material_id), '[]'::jsonb)
  into worksheet_payload
  from (
    select
      coalesce(master_session.week_number, 0) as week_number,
      session.session_number,
      material.id as material_id,
      jsonb_build_object(
        'material_id', material.id,
        'session_id', session.id,
        'title', material.title,
        'session_title', session.title,
        'section', session.class_type,
        'week_number', coalesce(master_session.week_number, 0),
        'total_questions', count(question.id),
        'done_count', count(log.id) filter (where log.status = 'done'),
        'review_count', count(log.id) filter (where log.status = 'review'),
        'last_updated', max(log.updated_at) filter (
          where log.status is not null
            or log.time_taken_seconds is not null
            or nullif(btrim(log.comment), '') is not null
        )
      ) as payload
    from public.sessions as session
    join public.materials as material
      on material.session_id = session.id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
      and material.master_material_id is not null
    join public.master_worksheet_questions as question
      on question.master_material_id = material.master_material_id
    left join public.student_question_logs as log
      on log.user_id = student_id
      and log.course_id = selected_course_id
      and log.session_id = session.id
      and log.material_id = material.id
      and log.master_question_id = question.id
    left join public.master_sessions as master_session on master_session.id = session.master_session_id
    where session.course_id = selected_course_id
      and session.is_published = true
    group by material.id, material.title, session.id, session.title, session.class_type,
      session.session_number, master_session.week_number
  ) as item;

  return jsonb_build_object(
    'course', (
      select jsonb_build_object(
        'id', course.id,
        'name', course.name,
        'schedule_timezone', course.schedule_timezone
      )
      from public.courses as course where course.id = selected_course_id
    ),
    'worksheets', worksheet_payload
  );
end;
$$;

revoke all on function public.get_student_practice_log() from public, anon;
grant execute on function public.get_student_practice_log() to authenticated;

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
  resource_payload jsonb;
begin
  if student_id is null or not exists (
    select 1 from public.profiles as profile
    where profile.id = student_id and profile.role = 'student' and profile.is_active = true
  ) then
    raise exception 'Student access required' using errcode = '42501';
  end if;

  selected_course_id := public.resolve_student_course_id(student_id);

  if selected_course_id is null or not public.can_access_course(selected_course_id) then
    return jsonb_build_object(
      'generated_at', statement_timestamp(),
      'course', null,
      'sessions', '[]'::jsonb,
      'resources', '[]'::jsonb
    );
  end if;

  select jsonb_build_object(
    'id', course.id,
    'name', course.name,
    'cohort_start_date', course.cohort_start_date,
    'schedule_timezone', course.schedule_timezone,
    'course_mode', coalesce(course.course_mode, 'full')
  )
  into course_payload
  from public.courses as course
  where course.id = selected_course_id;

  select coalesce(jsonb_agg(item.payload order by item.starts_at, item.display_order, item.session_number), '[]'::jsonb)
  into session_payload
  from (
    select
      session.session_date as starts_at,
      coalesce(session.display_order, session.session_number) as display_order,
      session.session_number,
      jsonb_build_object(
        'id', session.id,
        'title', session.title,
        'session_number', session.session_number,
        'session_date', session.session_date,
        'session_end_at', session.session_end_at,
        'class_type', session.class_type,
        'instructor', session.instructor,
        'week_number', coalesce(
          master.week_number,
          case when course.cohort_start_date is null then null else floor(
            ((session.session_date at time zone course.schedule_timezone)::date - course.cohort_start_date) / 7.0
          )::integer end
        ),
        'weekday', coalesce(master.weekday, to_char(session.session_date at time zone course.schedule_timezone, 'FMDay')),
        'event_type', coalesce(session.event_type, 'live_class'),
        'section_key', session.section_key,
        'display_order', session.display_order,
        'venue', session.venue,
        'reporting_time', session.reporting_time,
        'instructions', session.instructions,
        'materials', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', material.id,
            'type', material.type,
            'title', material.title,
            'available_from', material.available_from,
            'is_available', material.available_from <= statement_timestamp(),
            'tracker_available', material.type = 'worksheet'
              and material.available_from <= statement_timestamp()
              and exists (
                select 1 from public.master_worksheet_questions as question
                where question.master_material_id = material.master_material_id
              ),
            'category', material.category,
            'resource_scope', material.resource_scope,
            'resource_format', material.resource_format,
            'section_key', material.section_key,
            'session_id', material.session_id,
            'created_at', material.created_at
          ) order by material.created_at, material.id)
          from public.materials as material
          where material.session_id = session.id
        ), '[]'::jsonb)
      ) as payload
    from public.sessions as session
    join public.courses as course on course.id = session.course_id
    left join public.master_sessions as master on master.id = session.master_session_id
    where session.course_id = selected_course_id
      and session.is_published = true
  ) as item;

  select coalesce(jsonb_agg(item.payload order by item.available_from desc, item.created_at desc, item.id), '[]'::jsonb)
  into resource_payload
  from (
    select
      material.id,
      material.available_from,
      material.created_at,
      jsonb_build_object(
        'id', material.id,
        'type', material.type,
        'title', material.title,
        'available_from', material.available_from,
        'is_available', true,
        'tracker_available', material.type = 'worksheet' and exists (
          select 1 from public.master_worksheet_questions as question
          where question.master_material_id = material.master_material_id
        ),
        'category', material.category,
        'resource_scope', material.resource_scope,
        'resource_format', material.resource_format,
        'section_key', coalesce(
          material.section_key,
          session.section_key,
          case when session.class_type in ('QA', 'VA', 'DI') then lower(session.class_type) end
        ),
        'session_id', material.session_id,
        'session_title', session.title,
        'notion_url', material.notion_url,
        'file_url', material.file_url,
        'video_url', material.video_url,
        'text_content', material.text_content,
        'created_at', material.created_at
      ) as payload
    from public.materials as material
    left join public.sessions as session on session.id = material.session_id
    where material.course_id = selected_course_id
      and material.available_from <= statement_timestamp()
      and (session.id is null or session.is_published = true)
  ) as item;

  return jsonb_build_object(
    'generated_at', statement_timestamp(),
    'course', course_payload,
    'sessions', session_payload,
    'resources', resource_payload
  );
end;
$$;

revoke all on function public.get_student_timeline() from public, anon;
grant execute on function public.get_student_timeline() to authenticated;

commit;
