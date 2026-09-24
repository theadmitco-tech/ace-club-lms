begin;

-- Template-native worksheets have a question_count but no master question rows.
-- Keep the existing master-backed tracker untouched and add the missing material-backed catalog.
create table public.material_worksheet_questions (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  created_at timestamptz not null default statement_timestamp(),
  unique (material_id, question_number)
);

alter table public.material_worksheet_questions enable row level security;
revoke all on table public.material_worksheet_questions from public, anon, authenticated;

create table public.student_material_question_logs (
  id uuid primary key default gen_random_uuid(),
  material_question_id uuid not null
    references public.material_worksheet_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text check (status in ('done', 'review')),
  time_taken_seconds integer check (time_taken_seconds is null or time_taken_seconds >= 0),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (user_id, material_question_id)
);

create index student_material_question_logs_user_idx
  on public.student_material_question_logs(user_id);

alter table public.student_material_question_logs enable row level security;
revoke all on table public.student_material_question_logs from public, anon, authenticated;

create or replace function public.sync_material_worksheet_question_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.material_worksheet_questions as question
  where question.material_id = new.id
    and (
      new.type <> 'worksheet'
      or new.master_material_id is not null
      or new.question_count is null
      or question.question_number > new.question_count
    );

  if new.type = 'worksheet'
    and new.master_material_id is null
    and new.question_count is not null
  then
    insert into public.material_worksheet_questions (material_id, question_number)
    select new.id, generate_series(1, new.question_count)
    on conflict (material_id, question_number) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_material_worksheet_question_rows() from public, anon, authenticated;

create trigger sync_material_worksheet_question_rows
after insert or update of type, master_material_id, question_count
on public.materials
for each row execute function public.sync_material_worksheet_question_rows();

insert into public.material_worksheet_questions (material_id, question_number)
select material.id, generate_series(1, material.question_count)
from public.materials as material
where material.type = 'worksheet'
  and material.master_material_id is null
  and material.question_count is not null
on conflict (material_id, question_number) do nothing;

create or replace function public.set_student_material_question_log_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.material_question_id, new.created_at)
    is distinct from (old.user_id, old.material_question_id, old.created_at)
  then
    raise exception 'Question log identity cannot be changed' using errcode = '22023';
  end if;

  if old.status is not null and new.status is null then
    raise exception 'Question log status cannot return to Not updated' using errcode = '22023';
  end if;

  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_student_material_question_log_updated_at() from public, anon, authenticated;

create trigger set_student_material_question_log_updated_at
before update on public.student_material_question_logs
for each row execute function public.set_student_material_question_log_updated_at();

-- These private catalog views keep every existing RPC response shape unchanged.
create view public.worksheet_question_catalog
with (security_invoker = true)
as
select
  material.id as material_id,
  question.id as question_id,
  question.question_number
from public.materials as material
join public.master_worksheet_questions as question
  on question.master_material_id = material.master_material_id
where material.type = 'worksheet'
  and material.master_material_id is not null
union all
select
  material.id as material_id,
  question.id as question_id,
  question.question_number
from public.materials as material
join public.material_worksheet_questions as question
  on question.material_id = material.id
where material.type = 'worksheet'
  and material.master_material_id is null;

revoke all on table public.worksheet_question_catalog from public, anon, authenticated;

create view public.worksheet_question_log_catalog
with (security_invoker = true)
as
select
  log.user_id,
  log.material_id,
  log.master_question_id as question_id,
  log.status,
  log.time_taken_seconds,
  log.comment,
  log.updated_at
from public.student_question_logs as log
union all
select
  log.user_id,
  question.material_id,
  log.material_question_id as question_id,
  log.status,
  log.time_taken_seconds,
  log.comment,
  log.updated_at
from public.student_material_question_logs as log
join public.material_worksheet_questions as question
  on question.id = log.material_question_id;

revoke all on table public.worksheet_question_log_catalog from public, anon, authenticated;

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

  select coalesce(
    jsonb_agg(item.payload order by item.week_number, item.session_number, item.material_id),
    '[]'::jsonb
  )
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
        'total_questions', count(question.question_id),
        'done_count', count(log.question_id) filter (where log.status = 'done'),
        'review_count', count(log.question_id) filter (where log.status = 'review'),
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
    join public.worksheet_question_catalog as question
      on question.material_id = material.id
    left join public.worksheet_question_log_catalog as log
      on log.user_id = student_id
      and log.material_id = material.id
      and log.question_id = question.question_id
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

create or replace function public.get_student_worksheet_log(p_material_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  worksheet_payload jsonb;
begin
  if student_id is null or not exists (
    select 1 from public.profiles as profile
    where profile.id = student_id and profile.role = 'student' and profile.is_active = true
  ) then
    raise exception 'Student access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'material_id', material.id,
    'session_id', session.id,
    'course_id', session.course_id,
    'title', material.title,
    'session_title', session.title,
    'section', session.class_type,
    'week_number', coalesce(master_session.week_number, 0),
    'questions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', question.question_id,
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
        ) order by question.question_number
      ), '[]'::jsonb)
      from public.worksheet_question_catalog as question
      left join public.worksheet_question_log_catalog as log
        on log.user_id = student_id
        and log.material_id = material.id
        and log.question_id = question.question_id
      where question.material_id = material.id
    )
  )
  into worksheet_payload
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  left join public.master_sessions as master_session on master_session.id = session.master_session_id
  where material.id = p_material_id
    and material.type = 'worksheet'
    and material.available_from <= statement_timestamp()
    and session.is_published = true
    and exists (
      select 1 from public.worksheet_question_catalog as question
      where question.material_id = material.id
    )
    and exists (
      select 1 from public.enrollments as enrollment
      where enrollment.user_id = student_id
        and enrollment.course_id = session.course_id
    );

  if worksheet_payload is null then
    raise exception 'Released worksheet access required' using errcode = '42501';
  end if;

  return worksheet_payload;
end;
$$;

revoke all on function public.get_student_worksheet_log(uuid) from public, anon;
grant execute on function public.get_student_worksheet_log(uuid) to authenticated;

create or replace function public.update_student_question_log(
  p_material_id uuid,
  p_question_id uuid,
  p_status text,
  p_time_taken_seconds integer,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  saved_master_log public.student_question_logs%rowtype;
  saved_material_log public.student_material_question_logs%rowtype;
begin
  if p_status is not null and p_status not in ('done', 'review') then
    raise exception 'Invalid tracker status' using errcode = '22023';
  end if;

  if p_time_taken_seconds is not null and p_time_taken_seconds < 0 then
    raise exception 'Invalid time taken' using errcode = '22023';
  end if;

  if p_comment is not null and char_length(p_comment) > 2000 then
    raise exception 'Comment is too long' using errcode = '22023';
  end if;

  update public.student_question_logs as log
  set
    status = coalesce(p_status, log.status),
    time_taken_seconds = p_time_taken_seconds,
    comment = nullif(btrim(p_comment), '')
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  where log.user_id = student_id
    and log.material_id = p_material_id
    and log.master_question_id = p_question_id
    and log.material_id = material.id
    and log.session_id = session.id
    and log.course_id = session.course_id
    and material.type = 'worksheet'
    and material.available_from <= statement_timestamp()
    and session.is_published = true
    and exists (
      select 1 from public.profiles as profile
      where profile.id = student_id and profile.role = 'student' and profile.is_active = true
    )
    and exists (
      select 1 from public.enrollments as enrollment
      where enrollment.user_id = student_id and enrollment.course_id = session.course_id
    )
  returning log.* into saved_master_log;

  if saved_master_log.id is not null then
    return jsonb_build_object(
      'id', saved_master_log.master_question_id,
      'status', saved_master_log.status,
      'time_taken_seconds', saved_master_log.time_taken_seconds,
      'comment', saved_master_log.comment,
      'updated_at', saved_master_log.updated_at
    );
  end if;

  insert into public.student_material_question_logs (
    material_question_id,
    user_id,
    status,
    time_taken_seconds,
    comment
  )
  select
    question.id,
    student_id,
    p_status,
    p_time_taken_seconds,
    nullif(btrim(p_comment), '')
  from public.material_worksheet_questions as question
  join public.materials as material on material.id = question.material_id
  join public.sessions as session on session.id = material.session_id
  where question.id = p_question_id
    and material.id = p_material_id
    and material.type = 'worksheet'
    and material.master_material_id is null
    and material.available_from <= statement_timestamp()
    and session.is_published = true
    and exists (
      select 1 from public.profiles as profile
      where profile.id = student_id and profile.role = 'student' and profile.is_active = true
    )
    and exists (
      select 1 from public.enrollments as enrollment
      where enrollment.user_id = student_id and enrollment.course_id = session.course_id
    )
  on conflict (user_id, material_question_id) do update
  set
    status = coalesce(excluded.status, student_material_question_logs.status),
    time_taken_seconds = excluded.time_taken_seconds,
    comment = excluded.comment
  returning * into saved_material_log;

  if saved_material_log.id is null then
    raise exception 'Question log access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', saved_material_log.material_question_id,
    'status', saved_material_log.status,
    'time_taken_seconds', saved_material_log.time_taken_seconds,
    'comment', saved_material_log.comment,
    'updated_at', saved_material_log.updated_at
  );
end;
$$;

revoke all on function public.update_student_question_log(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.update_student_question_log(uuid, uuid, text, integer, text) to authenticated;

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

  select coalesce(
    jsonb_agg(item.payload order by item.starts_at, item.display_order, item.session_number),
    '[]'::jsonb
  )
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
                select 1 from public.worksheet_question_catalog as question
                where question.material_id = material.id
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

  select coalesce(
    jsonb_agg(item.payload order by item.available_from desc, item.created_at desc, item.id),
    '[]'::jsonb
  )
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
          select 1 from public.worksheet_question_catalog as question
          where question.material_id = material.id
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

  if not exists (select 1 from public.courses as course where course.id = p_course_id) then
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
        ) order by lower(profile.full_name), lower(profile.email), profile.id
      )
      from public.enrollments as enrollment
      join public.profiles as profile on profile.id = enrollment.user_id
      where enrollment.course_id = course.id and profile.role = 'student'
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
            'total_questions', count(question.question_id)
          ) as payload
        from public.sessions as session
        join public.materials as material
          on material.session_id = session.id
          and material.type = 'worksheet'
          and material.available_from <= statement_timestamp()
        join public.worksheet_question_catalog as question on question.material_id = material.id
        left join public.master_sessions as master_session on master_session.id = session.master_session_id
        where session.course_id = course.id and session.is_published = true
        group by session.id, session.title, session.class_type, session.session_number,
          material.id, material.title, master_session.week_number
      ) as worksheet
    ), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(
        row_payload.payload
        order by row_payload.student_name, row_payload.student_email,
          row_payload.session_number, row_payload.material_id
      )
      from (
        select
          lower(profile.full_name) as student_name,
          lower(profile.email) as student_email,
          session.session_number,
          material.id as material_id,
          jsonb_build_object(
            'user_id', profile.id,
            'material_id', material.id,
            'total_questions', count(question.question_id),
            'done_count', count(log.question_id) filter (where log.status = 'done'),
            'review_count', count(log.question_id) filter (where log.status = 'review'),
            'last_updated', max(log.updated_at) filter (
              where log.status is not null
                or log.time_taken_seconds is not null
                or nullif(btrim(log.comment), '') is not null
            )
          ) as payload
        from public.enrollments as enrollment
        join public.profiles as profile
          on profile.id = enrollment.user_id and profile.role = 'student'
        join public.sessions as session
          on session.course_id = enrollment.course_id and session.is_published = true
        join public.materials as material
          on material.session_id = session.id
          and material.type = 'worksheet'
          and material.available_from <= statement_timestamp()
        join public.worksheet_question_catalog as question on question.material_id = material.id
        left join public.worksheet_question_log_catalog as log
          on log.user_id = profile.id
          and log.material_id = material.id
          and log.question_id = question.question_id
        where enrollment.course_id = course.id
        group by profile.id, profile.full_name, profile.email,
          session.session_number, material.id
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
            'id', question.question_id,
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
          ) order by question.question_number
        ), '[]'::jsonb)
        from public.worksheet_question_catalog as question
        left join public.worksheet_question_log_catalog as log
          on log.user_id = profile.id
          and log.material_id = material.id
          and log.question_id = question.question_id
        where question.material_id = material.id
      )
    )
  )
  into worksheet_payload
  from public.courses as course
  join public.enrollments as enrollment
    on enrollment.course_id = course.id and enrollment.user_id = p_user_id
  join public.profiles as profile
    on profile.id = enrollment.user_id and profile.role = 'student'
  join public.sessions as session
    on session.course_id = course.id and session.is_published = true
  join public.materials as material
    on material.session_id = session.id
    and material.type = 'worksheet'
    and material.available_from <= statement_timestamp()
  left join public.master_sessions as master_session on master_session.id = session.master_session_id
  where course.id = p_course_id
    and material.id = p_material_id
    and exists (
      select 1 from public.worksheet_question_catalog as question
      where question.material_id = material.id
    );

  if worksheet_payload is null then
    raise exception 'Released enrolled worksheet access required' using errcode = '42501';
  end if;

  return worksheet_payload;
end;
$$;

revoke all on function public.get_admin_course_practice_progress(uuid) from public, anon;
revoke all on function public.get_admin_student_worksheet_progress(uuid, uuid, uuid) from public, anon;
grant execute on function public.get_admin_course_practice_progress(uuid) to authenticated;
grant execute on function public.get_admin_student_worksheet_progress(uuid, uuid, uuid) to authenticated;

commit;
