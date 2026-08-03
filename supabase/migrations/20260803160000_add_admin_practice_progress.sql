begin;

create or replace function public.get_admin_course_practice_progress(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  progress_payload jsonb;
begin
  if auth.uid() is null or not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.courses as course
    where course.id = p_course_id
  ) then
    raise exception 'Batch not found' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'course', jsonb_build_object(
      'id', course.id,
      'name', course.name,
      'schedule_timezone', course.schedule_timezone
    ),
    'students', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', profile.id,
          'full_name', profile.full_name,
          'email', profile.email,
          'is_active', profile.is_active
        )
        order by lower(profile.full_name), lower(profile.email), profile.id
      )
      from public.enrollments as enrollment
      join public.profiles as profile on profile.id = enrollment.user_id
      where enrollment.course_id = course.id
        and profile.role = 'student'
    ), '[]'::jsonb),
    'worksheets', coalesce((
      select jsonb_agg(worksheet.payload order by worksheet.session_number, worksheet.material_id)
      from (
        select
          session.session_number,
          material.id as material_id,
          jsonb_build_object(
            'material_id', material.id,
            'session_id', session.id,
            'title', material.title,
            'session_title', session.title,
            'section', session.class_type,
            'week_number', coalesce(master_session.week_number, 0),
            'total_questions', count(question.id)
          ) as payload
        from public.sessions as session
        join public.materials as material
          on material.session_id = session.id
          and material.type = 'worksheet'
          and material.available_from <= statement_timestamp()
          and material.master_material_id is not null
        join public.master_worksheet_questions as question
          on question.master_material_id = material.master_material_id
        left join public.master_sessions as master_session
          on master_session.id = session.master_session_id
        where session.course_id = course.id
          and session.is_published = true
        group by
          session.id,
          session.title,
          session.class_type,
          session.session_number,
          material.id,
          material.title,
          master_session.week_number
      ) as worksheet
    ), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(row_payload.payload order by row_payload.student_name, row_payload.student_email, row_payload.session_number, row_payload.material_id)
      from (
        select
          lower(profile.full_name) as student_name,
          lower(profile.email) as student_email,
          session.session_number,
          material.id as material_id,
          jsonb_build_object(
            'user_id', profile.id,
            'material_id', material.id,
            'total_questions', count(question.id),
            'done_count', count(log.id) filter (where log.status = 'done'),
            'review_count', count(log.id) filter (where log.status = 'review'),
            'last_updated', max(log.updated_at) filter (
              where log.status is not null
                or log.time_taken_seconds is not null
                or nullif(btrim(log.comment), '') is not null
            )
          ) as payload
        from public.enrollments as enrollment
        join public.profiles as profile
          on profile.id = enrollment.user_id
          and profile.role = 'student'
        join public.sessions as session
          on session.course_id = enrollment.course_id
          and session.is_published = true
        join public.materials as material
          on material.session_id = session.id
          and material.type = 'worksheet'
          and material.available_from <= statement_timestamp()
          and material.master_material_id is not null
        join public.master_worksheet_questions as question
          on question.master_material_id = material.master_material_id
        left join public.student_question_logs as log
          on log.user_id = profile.id
          and log.course_id = enrollment.course_id
          and log.session_id = session.id
          and log.material_id = material.id
          and log.master_question_id = question.id
        where enrollment.course_id = course.id
        group by
          profile.id,
          profile.full_name,
          profile.email,
          session.session_number,
          material.id
      ) as row_payload
    ), '[]'::jsonb)
  )
  into progress_payload
  from public.courses as course
  where course.id = p_course_id;

  return progress_payload;
end;
$$;

create or replace function public.get_admin_student_worksheet_progress(
  p_course_id uuid,
  p_user_id uuid,
  p_material_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  worksheet_payload jsonb;
begin
  if auth.uid() is null or not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'course', jsonb_build_object(
      'id', course.id,
      'name', course.name,
      'schedule_timezone', course.schedule_timezone
    ),
    'student', jsonb_build_object(
      'id', profile.id,
      'full_name', profile.full_name,
      'email', profile.email,
      'is_active', profile.is_active
    ),
    'worksheet', jsonb_build_object(
      'material_id', material.id,
      'session_id', session.id,
      'title', material.title,
      'session_title', session.title,
      'section', session.class_type,
      'week_number', coalesce(master_session.week_number, 0),
      'questions', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', question.id,
            'question_number', question.question_number,
            'status', log.status,
            'time_taken_seconds', log.time_taken_seconds,
            'comment', log.comment,
            'updated_at', case
              when log.status is not null
                or log.time_taken_seconds is not null
                or nullif(btrim(log.comment), '') is not null
              then log.updated_at
              else null
            end
          )
          order by question.question_number
        ), '[]'::jsonb)
        from public.master_worksheet_questions as question
        left join public.student_question_logs as log
          on log.user_id = profile.id
          and log.course_id = course.id
          and log.session_id = session.id
          and log.material_id = material.id
          and log.master_question_id = question.id
        where question.master_material_id = material.master_material_id
      )
    )
  )
  into worksheet_payload
  from public.courses as course
  join public.enrollments as enrollment
    on enrollment.course_id = course.id
    and enrollment.user_id = p_user_id
  join public.profiles as profile
    on profile.id = enrollment.user_id
    and profile.role = 'student'
  join public.sessions as session
    on session.course_id = course.id
    and session.is_published = true
  join public.materials as material
    on material.session_id = session.id
    and material.type = 'worksheet'
    and material.available_from <= statement_timestamp()
    and material.master_material_id is not null
  left join public.master_sessions as master_session
    on master_session.id = session.master_session_id
  where course.id = p_course_id
    and material.id = p_material_id;

  if worksheet_payload is null then
    raise exception 'Released enrolled worksheet access required' using errcode = '42501';
  end if;

  return worksheet_payload;
end;
$$;

revoke all on function public.get_admin_course_practice_progress(uuid) from public;
revoke all on function public.get_admin_student_worksheet_progress(uuid, uuid, uuid) from public;

grant execute on function public.get_admin_course_practice_progress(uuid) to authenticated;
grant execute on function public.get_admin_student_worksheet_progress(uuid, uuid, uuid) to authenticated;

commit;
