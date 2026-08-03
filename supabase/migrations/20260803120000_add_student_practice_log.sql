begin;

create table public.student_question_logs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  master_question_id uuid not null references public.master_worksheet_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text check (status in ('done', 'review')),
  time_taken_seconds integer check (time_taken_seconds is null or time_taken_seconds >= 0),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, session_id, material_id, master_question_id)
);

create index student_question_logs_user_material_idx
  on public.student_question_logs(user_id, material_id);

create index student_question_logs_course_session_idx
  on public.student_question_logs(course_id, session_id);

create or replace function public.set_student_question_log_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.user_id,
    new.course_id,
    new.session_id,
    new.material_id,
    new.master_question_id,
    new.created_at
  ) is distinct from (
    old.user_id,
    old.course_id,
    old.session_id,
    old.material_id,
    old.master_question_id,
    old.created_at
  ) then
    raise exception 'Question log identity cannot be changed' using errcode = '22023';
  end if;

  if old.status is not null and new.status is null then
    raise exception 'Question log status cannot return to Not updated' using errcode = '22023';
  end if;

  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger set_student_question_log_updated_at
before update on public.student_question_logs
for each row execute function public.set_student_question_log_updated_at();

create or replace function public.provision_student_question_logs_for_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_question_logs (
    course_id,
    session_id,
    material_id,
    master_question_id,
    user_id
  )
  select
    new.course_id,
    session.id,
    material.id,
    question.id,
    new.user_id
  from public.sessions as session
  join public.materials as material
    on material.session_id = session.id
    and material.type = 'worksheet'
    and material.master_material_id is not null
  join public.master_worksheet_questions as question
    on question.master_material_id = material.master_material_id
  where session.course_id = new.course_id
  on conflict (user_id, course_id, session_id, material_id, master_question_id) do nothing;

  return new;
end;
$$;

create trigger provision_student_question_logs_after_enrollment
after insert on public.enrollments
for each row execute function public.provision_student_question_logs_for_enrollment();

create or replace function public.provision_student_question_logs_for_material()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.student_question_logs as log
  where log.material_id = new.id
    and (
      new.type <> 'worksheet'
      or new.master_material_id is null
      or not exists (
        select 1
        from public.master_worksheet_questions as question
        where question.id = log.master_question_id
          and question.master_material_id = new.master_material_id
      )
    );

  if new.type = 'worksheet' and new.master_material_id is not null then
    insert into public.student_question_logs (
      course_id,
      session_id,
      material_id,
      master_question_id,
      user_id
    )
    select
      session.course_id,
      new.session_id,
      new.id,
      question.id,
      enrollment.user_id
    from public.sessions as session
    join public.enrollments as enrollment
      on enrollment.course_id = session.course_id
    join public.master_worksheet_questions as question
      on question.master_material_id = new.master_material_id
    where session.id = new.session_id
    on conflict (user_id, course_id, session_id, material_id, master_question_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger provision_student_question_logs_after_material
after insert or update of type, master_material_id on public.materials
for each row execute function public.provision_student_question_logs_for_material();

create or replace function public.provision_student_question_logs_for_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_question_logs (
    course_id,
    session_id,
    material_id,
    master_question_id,
    user_id
  )
  select
    session.course_id,
    session.id,
    material.id,
    new.id,
    enrollment.user_id
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  join public.enrollments as enrollment on enrollment.course_id = session.course_id
  where material.type = 'worksheet'
    and material.master_material_id = new.master_material_id
  on conflict (user_id, course_id, session_id, material_id, master_question_id) do nothing;

  return new;
end;
$$;

create trigger provision_student_question_logs_after_question
after insert on public.master_worksheet_questions
for each row execute function public.provision_student_question_logs_for_question();

insert into public.student_question_logs (
  course_id,
  session_id,
  material_id,
  master_question_id,
  user_id
)
select
  session.course_id,
  session.id,
  material.id,
  question.id,
  enrollment.user_id
from public.sessions as session
join public.materials as material
  on material.session_id = session.id
  and material.type = 'worksheet'
  and material.master_material_id is not null
join public.master_worksheet_questions as question
  on question.master_material_id = material.master_material_id
join public.enrollments as enrollment on enrollment.course_id = session.course_id
on conflict (user_id, course_id, session_id, material_id, master_question_id) do nothing;

alter table public.student_question_logs enable row level security;

create policy "Students view own released question logs"
on public.student_question_logs
for select
using (
  user_id = auth.uid()
  and public.is_active_portal_user()
  and exists (
    select 1
    from public.materials as material
    where material.id = student_question_logs.material_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
  )
);

create policy "Students update own released question logs"
on public.student_question_logs
for update
using (
  user_id = auth.uid()
  and public.is_active_portal_user()
  and exists (
    select 1
    from public.enrollments as enrollment
    where enrollment.user_id = auth.uid()
      and enrollment.course_id = student_question_logs.course_id
  )
  and exists (
    select 1
    from public.materials as material
    where material.id = student_question_logs.material_id
      and material.session_id = student_question_logs.session_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
  )
)
with check (
  user_id = auth.uid()
  and public.is_active_portal_user()
  and exists (
    select 1
    from public.enrollments as enrollment
    where enrollment.user_id = auth.uid()
      and enrollment.course_id = student_question_logs.course_id
  )
  and exists (
    select 1
    from public.materials as material
    join public.sessions as session on session.id = material.session_id
    join public.master_worksheet_questions as question
      on question.id = student_question_logs.master_question_id
      and question.master_material_id = material.master_material_id
    where material.id = student_question_logs.material_id
      and material.session_id = student_question_logs.session_id
      and session.course_id = student_question_logs.course_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
  )
);

create policy "Admins view student question logs"
on public.student_question_logs
for select
using (public.is_portal_admin());

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
    left join public.master_sessions as master_session
      on master_session.id = session.master_session_id
    where session.course_id = selected_course_id
      and session.is_published = true
    group by
      material.id,
      material.title,
      session.id,
      session.title,
      session.class_type,
      session.session_number,
      master_session.week_number
  ) as item;

  return jsonb_build_object(
    'course', (
      select jsonb_build_object(
        'id', course.id,
        'name', course.name,
        'schedule_timezone', course.schedule_timezone
      )
      from public.courses as course
      where course.id = selected_course_id
    ),
    'worksheets', worksheet_payload
  );
end;
$$;

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
    select 1
    from public.profiles as profile
    where profile.id = student_id
      and profile.role = 'student'
      and profile.is_active = true
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
        ) order by question.question_number
      ), '[]'::jsonb)
      from public.master_worksheet_questions as question
      left join public.student_question_logs as log
        on log.user_id = student_id
        and log.course_id = session.course_id
        and log.session_id = session.id
        and log.material_id = material.id
        and log.master_question_id = question.id
      where question.master_material_id = material.master_material_id
    )
  )
  into worksheet_payload
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  left join public.master_sessions as master_session on master_session.id = session.master_session_id
  where material.id = p_material_id
    and material.type = 'worksheet'
    and material.master_material_id is not null
    and material.available_from <= statement_timestamp()
    and session.is_published = true
    and exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = student_id
        and enrollment.course_id = session.course_id
    );

  if worksheet_payload is null then
    raise exception 'Released worksheet access required' using errcode = '42501';
  end if;

  return worksheet_payload;
end;
$$;

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
  saved_log public.student_question_logs%rowtype;
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
      select 1
      from public.profiles as profile
      where profile.id = student_id
        and profile.role = 'student'
        and profile.is_active = true
    )
    and exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = student_id
        and enrollment.course_id = session.course_id
    )
  returning log.* into saved_log;

  if saved_log.id is null then
    raise exception 'Question log access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', saved_log.master_question_id,
    'status', saved_log.status,
    'time_taken_seconds', saved_log.time_taken_seconds,
    'comment', saved_log.comment,
    'updated_at', saved_log.updated_at
  );
end;
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
              'is_available', material.available_from <= statement_timestamp(),
              'tracker_available', material.type = 'worksheet'
                and material.available_from <= statement_timestamp()
                and exists (
                  select 1
                  from public.master_worksheet_questions as question
                  where question.master_material_id = material.master_material_id
                )
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

revoke all on function public.set_student_question_log_updated_at() from public;
revoke all on function public.provision_student_question_logs_for_enrollment() from public;
revoke all on function public.provision_student_question_logs_for_material() from public;
revoke all on function public.provision_student_question_logs_for_question() from public;
revoke all on function public.get_student_practice_log() from public;
revoke all on function public.get_student_worksheet_log(uuid) from public;
revoke all on function public.update_student_question_log(uuid, uuid, text, integer, text) from public;

grant execute on function public.get_student_practice_log() to authenticated;
grant execute on function public.get_student_worksheet_log(uuid) to authenticated;
grant execute on function public.update_student_question_log(uuid, uuid, text, integer, text) to authenticated;
grant select on table public.student_question_logs to authenticated;

commit;
