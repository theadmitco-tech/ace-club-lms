begin;

-- courses.is_active controls batch operations/availability; it must not revoke
-- portal access already granted by an enrollment. Keep the existing profile
-- and can_access_course authorization checks and restore latest-enrollment
-- selection for live legacy batches that are operationally inactive.
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
          case
            when course.cohort_start_date is null then null
            else floor(
              ((session.session_date at time zone course.schedule_timezone)::date - course.cohort_start_date) / 7.0
            )::integer
          end
        ),
        'weekday', coalesce(master.weekday, to_char(session.session_date at time zone course.schedule_timezone, 'FMDay')),
        'event_type', coalesce(session.event_type, 'live_class'),
        'section_key', session.section_key,
        'display_order', session.display_order,
        'venue', session.venue,
        'reporting_time', session.reporting_time,
        'instructions', session.instructions,
        'materials', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', material.id,
              'type', material.type,
              'title', material.title,
              'available_from', material.available_from,
              'is_available', material.available_from <= statement_timestamp(),
              'tracker_available', material.type = 'worksheet'
                and material.available_from <= statement_timestamp()
                and exists (
                  select 1
                  from public.master_worksheet_questions as question
                  where question.master_material_id = material.master_material_id
                ),
              'category', material.category,
              'resource_scope', material.resource_scope,
              'resource_format', material.resource_format,
              'section_key', material.section_key,
              'session_id', material.session_id,
              'created_at', material.created_at
            )
            order by material.created_at, material.id
          )
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
        'tracker_available', material.type = 'worksheet'
          and exists (
            select 1
            from public.master_worksheet_questions as question
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
