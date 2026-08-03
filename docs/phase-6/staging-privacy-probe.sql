-- Phase 6 staging-only tracker privacy probe.
-- Run in the staging Supabase SQL Editor as one script.
-- The transaction rolls back the temporary role/status changes and all test state.

begin;

-- Store the probe context in transaction-local session state so it survives the
-- role changes below without relying on a helper table.
select set_config(
  'phase6.probe_context',
  coalesce((
    select jsonb_build_object(
      'owner_id', log.user_id,
      'course_id', log.course_id,
      'material_id', log.material_id,
      'master_question_id', log.master_question_id,
      'owner_status', log.status,
      'owner_time_taken_seconds', log.time_taken_seconds,
      'owner_comment', log.comment,
      'owner_updated_at', log.updated_at,
      'other_student_id', other_account.id
    )::text
    from public.student_question_logs as log
    join public.materials as material
      on material.id = log.material_id
    cross join lateral (
      select profile.id
      from public.profiles as profile
      where profile.id <> log.user_id
      order by
        (profile.role = 'student') desc,
        profile.is_active desc,
        profile.created_at
      limit 1
    ) as other_account
    where material.type = 'worksheet'
      and material.available_from <= statement_timestamp()
    order by log.created_at
    limit 1
  ), ''),
  true
);

do $$
begin
  if nullif(current_setting('phase6.probe_context', true), '') is null then
    raise exception 'Probe requires one released tracker owner and a different staging account';
  end if;
end;
$$;

-- If staging has only one Student, temporarily simulate the second account as an
-- active Student. The final rollback restores its original role and active state.
update public.profiles
set role = 'student',
    is_active = true
where id = (
  current_setting('phase6.probe_context')::jsonb ->> 'other_student_id'
)::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase6.probe_context')::jsonb ->> 'other_student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase6.probe_context')::jsonb;
  exposed_rows integer;
begin
  select count(*)
  into exposed_rows
  from public.student_question_logs
  where user_id = (probe ->> 'owner_id')::uuid;

  if exposed_rows <> 0 then
    raise exception 'Cross-student tracker rows were exposed';
  end if;

  begin
    perform public.get_student_worksheet_log(
      (probe ->> 'material_id')::uuid
    );
  exception when sqlstate '42501' then
    -- Also valid: the second Student is not enrolled in this course.
  end;

  begin
    perform public.update_student_question_log(
      (probe ->> 'material_id')::uuid,
      (probe ->> 'master_question_id')::uuid,
      'done',
      null,
      null
    );
  exception when sqlstate '42501' then
    -- Also valid: the second Student is not enrolled in this course.
  end;
end;
$$;

reset role;

do $$
declare
  probe jsonb := current_setting('phase6.probe_context')::jsonb;
begin
  if exists (
    select 1
    from public.student_question_logs as log
    where log.user_id = (probe ->> 'owner_id')::uuid
      and log.course_id = (probe ->> 'course_id')::uuid
      and log.material_id = (probe ->> 'material_id')::uuid
      and log.master_question_id = (probe ->> 'master_question_id')::uuid
      and (
        log.status is distinct from (probe ->> 'owner_status')
        or log.time_taken_seconds is distinct from
          nullif(probe ->> 'owner_time_taken_seconds', '')::integer
        or log.comment is distinct from (probe ->> 'owner_comment')
        or log.updated_at is distinct from
          (probe ->> 'owner_updated_at')::timestamptz
      )
  ) then
    raise exception 'A different Student changed the tracker owner row';
  end if;
end;
$$;

set local role authenticated;

select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  exposed_rows integer;
begin
  select count(*) into exposed_rows from public.student_question_logs;
  if exposed_rows <> 0 then
    raise exception 'Signed-out tracker rows were exposed';
  end if;
end;
$$;

reset role;

update public.profiles
set is_active = false
where id = (
  current_setting('phase6.probe_context')::jsonb ->> 'owner_id'
)::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  current_setting('phase6.probe_context')::jsonb ->> 'owner_id',
  true
);

do $$
declare
  probe jsonb := current_setting('phase6.probe_context')::jsonb;
  exposed_rows integer;
  write_blocked boolean := false;
begin
  select count(*)
  into exposed_rows
  from public.student_question_logs
  where user_id = (probe ->> 'owner_id')::uuid;

  if exposed_rows <> 0 then
    raise exception 'Deactivated Student tracker rows were exposed';
  end if;

  begin
    perform public.update_student_question_log(
      (probe ->> 'material_id')::uuid,
      (probe ->> 'master_question_id')::uuid,
      'done',
      null,
      null
    );
  exception when sqlstate '42501' then
    write_blocked := true;
  end;

  if not write_blocked then
    raise exception 'Deactivated Student could update the worksheet log RPC';
  end if;
end;
$$;

reset role;

select 'PASS: cross-student read/write, signed-out and deactivated tracker boundaries' as result;

rollback;
