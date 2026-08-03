-- Phase 7 staging-only Admin progress authorization and data-contract probe (v3).
-- Run in the staging Supabase SQL Editor as one script.
-- The transaction rolls back every temporary profile, release, session and log change.

begin;

select set_config(
  'phase7.probe_context',
  coalesce((
    select jsonb_build_object(
      'admin_id', (
        select profile.id
        from public.profiles as profile
        where profile.role = 'admin'
          and profile.is_active = true
        order by profile.created_at
        limit 1
      ),
      'owner_id', log.user_id,
      'course_id', log.course_id,
      'session_id', log.session_id,
      'material_id', log.material_id,
      'question_id', log.master_question_id,
      'status', log.status,
      'time_taken_seconds', log.time_taken_seconds,
      'comment', log.comment,
      'updated_at', log.updated_at,
      'available_from', material.available_from,
      'session_published', session.is_published,
      'total_rows', (select count(*) from public.student_question_logs),
      'admin_owned_rows', (
        select count(*)
        from public.student_question_logs as candidate
        join public.profiles as profile on profile.id = candidate.user_id
        where profile.role = 'admin'
      )
    )::text
    from public.student_question_logs as log
    join public.materials as material
      on material.id = log.material_id
      and material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
    join public.sessions as session
      on session.id = log.session_id
      and session.is_published = true
    join public.profiles as owner
      on owner.id = log.user_id
      and owner.role = 'student'
      and owner.is_active = true
    order by log.created_at
    limit 1
  ), ''),
  true
);

do $$
declare
  probe jsonb := nullif(current_setting('phase7.probe_context', true), '')::jsonb;
begin
  if probe is null
    or nullif(probe ->> 'admin_id', '') is null
    or nullif(probe ->> 'owner_id', '') is null then
    raise exception 'Probe requires one active Admin and one active Student with a released worksheet log';
  end if;
end;
$$;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  course_payload jsonb;
  detail_payload jsonb;
  summary_row jsonb;
  detail_row jsonb;
  expected_total integer;
  expected_done integer;
  expected_review integer;
begin
  course_payload := public.get_admin_course_practice_progress(
    (probe ->> 'course_id')::uuid
  );
  detail_payload := public.get_admin_student_worksheet_progress(
    (probe ->> 'course_id')::uuid,
    (probe ->> 'owner_id')::uuid,
    (probe ->> 'material_id')::uuid
  );

  select item
  into summary_row
  from jsonb_array_elements(course_payload -> 'progress') as item
  where item ->> 'user_id' = probe ->> 'owner_id'
    and item ->> 'material_id' = probe ->> 'material_id';

  if summary_row is null then
    raise exception 'Admin cohort progress omitted the enrolled Student worksheet row';
  end if;

  select
    count(*),
    count(*) filter (where status = 'done'),
    count(*) filter (where status = 'review')
  into expected_total, expected_done, expected_review
  from public.student_question_logs
  where user_id = (probe ->> 'owner_id')::uuid
    and course_id = (probe ->> 'course_id')::uuid
    and material_id = (probe ->> 'material_id')::uuid;

  if (summary_row ->> 'total_questions')::integer <> expected_total
    or (summary_row ->> 'done_count')::integer <> expected_done
    or (summary_row ->> 'review_count')::integer <> expected_review then
    raise exception 'Admin cohort totals do not match Student tracker rows';
  end if;

  select item
  into detail_row
  from jsonb_array_elements(detail_payload #> '{worksheet,questions}') as item
  where item ->> 'id' = probe ->> 'question_id';

  if detail_row is null
    or (detail_row ->> 'status') is distinct from (probe ->> 'status')
    or nullif(detail_row ->> 'time_taken_seconds', '')::integer is distinct from
      nullif(probe ->> 'time_taken_seconds', '')::integer
    or (detail_row ->> 'comment') is distinct from (probe ->> 'comment')
    or nullif(detail_row ->> 'updated_at', '')::timestamptz is distinct from
      nullif(probe ->> 'updated_at', '')::timestamptz then
    raise exception 'Admin question inspection does not match the Student tracker row';
  end if;

  if (select count(*) from public.student_question_logs) <>
      (probe ->> 'total_rows')::integer
    or (
      select count(*)
      from public.student_question_logs as candidate
      join public.profiles as profile on profile.id = candidate.user_id
      where profile.role = 'admin'
    ) <> (probe ->> 'admin_owned_rows')::integer then
    raise exception 'Admin inspection changed tracker ownership or row counts';
  end if;
end;
$$;

reset role;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'owner_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  course_blocked boolean := false;
  detail_blocked boolean := false;
begin
  begin
    perform public.get_admin_course_practice_progress(
      (probe ->> 'course_id')::uuid
    );
  exception when sqlstate '42501' then
    course_blocked := true;
  end;

  begin
    perform public.get_admin_student_worksheet_progress(
      (probe ->> 'course_id')::uuid,
      (probe ->> 'owner_id')::uuid,
      (probe ->> 'material_id')::uuid
    );
  exception when sqlstate '42501' then
    detail_blocked := true;
  end;

  if not course_blocked or not detail_blocked then
    raise exception 'Student could execute a Phase 7 Admin RPC';
  end if;

  perform public.get_student_practice_log();
  perform public.get_student_worksheet_log((probe ->> 'material_id')::uuid);
  perform public.update_student_question_log(
    (probe ->> 'material_id')::uuid,
    (probe ->> 'question_id')::uuid,
    'done',
    nullif(probe ->> 'time_taken_seconds', '')::integer,
    probe ->> 'comment'
  );
end;
$$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  course_blocked boolean := false;
  detail_blocked boolean := false;
begin
  begin
    perform public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);
  exception when sqlstate '42501' then
    course_blocked := true;
  end;

  begin
    perform public.get_admin_student_worksheet_progress(
      (probe ->> 'course_id')::uuid,
      (probe ->> 'owner_id')::uuid,
      (probe ->> 'material_id')::uuid
    );
  exception when sqlstate '42501' then
    detail_blocked := true;
  end;

  if not course_blocked or not detail_blocked then
    raise exception 'Signed-out caller could execute a Phase 7 Admin RPC';
  end if;
end;
$$;

reset role;

-- Re-provision the selected enrollment inside this rollback-only transaction so
-- its question rows begin untouched naturally. This preserves the Phase 6 rule
-- that a saved status can never be updated back to Not updated.
do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
begin
  delete from public.student_question_logs
  where user_id = (probe ->> 'owner_id')::uuid
    and course_id = (probe ->> 'course_id')::uuid;

  delete from public.enrollments
  where user_id = (probe ->> 'owner_id')::uuid
    and course_id = (probe ->> 'course_id')::uuid;

  insert into public.enrollments (user_id, course_id)
  values (
    (probe ->> 'owner_id')::uuid,
    (probe ->> 'course_id')::uuid
  );
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  payload jsonb;
  summary_row jsonb;
begin
  payload := public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);

  select item
  into summary_row
  from jsonb_array_elements(payload -> 'progress') as item
  where item ->> 'user_id' = probe ->> 'owner_id'
    and item ->> 'material_id' = probe ->> 'material_id';

  if summary_row is null or summary_row ->> 'last_updated' is not null then
    raise exception 'Untouched worksheet did not return an absent last update';
  end if;
end;
$$;

reset role;

update public.profiles
set is_active = false
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'owner_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'owner_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  read_blocked boolean := false;
  write_blocked boolean := false;
begin
  begin
    perform public.get_student_practice_log();
  exception when sqlstate '42501' then
    read_blocked := true;
  end;

  begin
    perform public.update_student_question_log(
      (probe ->> 'material_id')::uuid,
      (probe ->> 'question_id')::uuid,
      'done',
      null,
      null
    );
  exception when sqlstate '42501' then
    write_blocked := true;
  end;

  if not read_blocked or not write_blocked then
    raise exception 'Deactivated Student retained tracker read or write access';
  end if;
end;
$$;

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  payload jsonb;
  inactive_visible boolean;
begin
  payload := public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);
  select exists (
    select 1
    from jsonb_array_elements(payload -> 'students') as student
    where student ->> 'id' = probe ->> 'owner_id'
      and (student ->> 'is_active')::boolean = false
  ) into inactive_visible;

  if not inactive_visible then
    raise exception 'Inactive enrolled Student disappeared from Admin progress';
  end if;
end;
$$;

reset role;

update public.profiles
set is_active = true
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'owner_id'
)::uuid;

update public.materials
set available_from = statement_timestamp() + interval '1 day'
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'material_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  payload jsonb;
  detail_blocked boolean := false;
begin
  payload := public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);
  if exists (
    select 1
    from jsonb_array_elements(payload -> 'worksheets') as worksheet
    where worksheet ->> 'material_id' = probe ->> 'material_id'
  ) then
    raise exception 'Unreleased worksheet appeared in Admin cohort progress';
  end if;

  begin
    perform public.get_admin_student_worksheet_progress(
      (probe ->> 'course_id')::uuid,
      (probe ->> 'owner_id')::uuid,
      (probe ->> 'material_id')::uuid
    );
  exception when sqlstate '42501' then
    detail_blocked := true;
  end;

  if not detail_blocked then
    raise exception 'Admin could inspect an unreleased worksheet';
  end if;
end;
$$;

reset role;

update public.materials
set available_from = (
  current_setting('phase7.probe_context')::jsonb ->> 'available_from'
)::timestamptz
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'material_id'
)::uuid;

update public.sessions
set is_published = false
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'session_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  payload jsonb;
  detail_blocked boolean := false;
begin
  payload := public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);
  if exists (
    select 1
    from jsonb_array_elements(payload -> 'worksheets') as worksheet
    where worksheet ->> 'material_id' = probe ->> 'material_id'
  ) then
    raise exception 'Unpublished worksheet appeared in Admin cohort progress';
  end if;

  begin
    perform public.get_admin_student_worksheet_progress(
      (probe ->> 'course_id')::uuid,
      (probe ->> 'owner_id')::uuid,
      (probe ->> 'material_id')::uuid
    );
  exception when sqlstate '42501' then
    detail_blocked := true;
  end;

  if not detail_blocked then
    raise exception 'Admin could inspect an unpublished worksheet';
  end if;
end;
$$;

reset role;

update public.sessions
set is_published = (
  current_setting('phase7.probe_context')::jsonb ->> 'session_published'
)::boolean
where id = (
  current_setting('phase7.probe_context')::jsonb ->> 'session_id'
)::uuid;

update public.materials as material
set available_from = statement_timestamp() + interval '1 day'
from public.sessions as session
where session.id = material.session_id
  and session.course_id = (
    current_setting('phase7.probe_context')::jsonb ->> 'course_id'
  )::uuid
  and material.type = 'worksheet'
  and material.master_material_id is not null;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('phase7.probe_context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase7.probe_context')::jsonb;
  payload jsonb;
begin
  payload := public.get_admin_course_practice_progress((probe ->> 'course_id')::uuid);

  if jsonb_array_length(payload -> 'students') = 0 then
    raise exception 'Empty-release probe lost enrolled Students';
  end if;

  if jsonb_array_length(payload -> 'worksheets') <> 0
    or jsonb_array_length(payload -> 'progress') <> 0 then
    raise exception 'Batch with no released worksheets returned progress rows';
  end if;
end;
$$;

reset role;

select 'PASS: Phase 7 Admin auth, Student/signed-out denial, totals, ownership, untouched/inactive history, release and empty-data boundaries' as result;

rollback;
