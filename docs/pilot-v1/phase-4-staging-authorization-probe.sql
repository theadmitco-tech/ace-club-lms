-- Pilot V1 Phase 4 staging-only Session-material authorization probe.
-- Run after 20260811170000_add_batch_session_materials.sql in the staging SQL
-- Editor. The transaction rolls back every temporary course, session,
-- enrollment, material and profile-state change.

begin;

do $$
declare
  admin_id uuid;
  student_id uuid;
  course_a_id uuid := gen_random_uuid();
  course_b_id uuid := gen_random_uuid();
  session_a_id uuid := gen_random_uuid();
  session_b_id uuid := gen_random_uuid();
  session_a_file_id uuid := gen_random_uuid();
  session_b_file_id uuid := gen_random_uuid();
begin
  select profile.id into admin_id
  from public.profiles as profile
  where profile.role = 'admin' and profile.is_active = true
  order by profile.created_at
  limit 1;

  select profile.id into student_id
  from public.profiles as profile
  where profile.role = 'student' and profile.is_active = true
  order by profile.created_at
  limit 1;

  if admin_id is null or student_id is null then
    raise exception 'Probe requires one active Admin and one active Student in staging';
  end if;

  insert into public.courses (id, name, description)
  values
    (course_a_id, 'Phase 4 authorization probe A', 'Rollback-only staging fixture'),
    (course_b_id, 'Phase 4 authorization probe B', 'Rollback-only staging fixture');

  insert into public.sessions (
    id,
    course_id,
    title,
    session_number,
    session_date,
    session_end_at,
    class_type,
    is_published
  )
  values
    (
      session_a_id,
      course_a_id,
      'Phase 4 future session',
      1,
      statement_timestamp() + interval '1 day',
      statement_timestamp() + interval '1 day 2 hours',
      'VA',
      true
    ),
    (
      session_b_id,
      course_b_id,
      'Phase 4 cross-batch session',
      1,
      statement_timestamp() - interval '1 day',
      statement_timestamp() - interval '22 hours',
      'VA',
      true
    );

  insert into public.enrollments (user_id, course_id)
  values (student_id, course_a_id);

  perform set_config('pilot_v1_phase4.context', jsonb_build_object(
    'admin_id', admin_id,
    'student_id', student_id,
    'course_a_id', course_a_id,
    'course_b_id', course_b_id,
    'session_a_id', session_a_id,
    'session_b_id', session_b_id,
    'session_a_file_url', '/api/materials/file?path=session-materials%2F'
      || session_a_id::text || '%2F' || session_a_file_id::text || '.pdf',
    'session_b_file_url', '/api/materials/file?path=session-materials%2F'
      || session_b_id::text || '%2F' || session_b_file_id::text || '.pdf'
  )::text, true);
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
  saved jsonb;
  cross_session_blocked boolean := false;
  master_blocked boolean := false;
begin
  saved := public.save_batch_session_material(
    (probe ->> 'session_a_id')::uuid,
    'Phase 4 private reading',
    probe ->> 'session_a_file_url',
    null
  );

  if not exists (
    select 1
    from public.materials as material
    join public.sessions as session on session.id = material.session_id
    where material.id = (saved ->> 'id')::uuid
      and material.type = 'session_material'
      and material.master_material_id is null
      and material.available_from = session.session_end_at
  ) then
    raise exception 'Admin create did not preserve cohort-only identity and authoritative release';
  end if;

  perform set_config(
    'pilot_v1_phase4.context',
    (probe || jsonb_build_object('material_a_id', saved ->> 'id'))::text,
    true
  );

  begin
    perform public.save_batch_session_material(
      (probe ->> 'session_b_id')::uuid,
      'Wrong-session PDF',
      probe ->> 'session_a_file_url',
      null
    );
  exception when others then
    cross_session_blocked := true;
  end;

  begin
    insert into public.master_materials (master_session_id, type, title)
    values (gen_random_uuid(), 'session_material', 'Forbidden reusable reading');
  exception when check_violation then
    master_blocked := true;
  end;

  if not cross_session_blocked or not master_blocked then
    raise exception 'Cross-session or reusable Master Session material was accepted';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
  write_blocked boolean := false;
begin
  if exists (
    select 1 from public.materials
    where id = (probe ->> 'material_a_id')::uuid
  ) then
    raise exception 'Student read a pre-release Session material';
  end if;

  begin
    perform public.save_batch_session_material(
      (probe ->> 'session_a_id')::uuid,
      'Student write attempt',
      probe ->> 'session_a_file_url',
      null
    );
  exception when sqlstate '42501' then
    write_blocked := true;
  end;

  if not write_blocked then
    raise exception 'Student could execute the Admin Session-material RPC';
  end if;
end;
$$;

reset role;
update public.sessions
set session_end_at = statement_timestamp() - interval '1 minute'
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'session_a_id'
)::uuid;

update public.materials
set title = title
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'material_a_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
begin
  if not exists (
    select 1 from public.materials
    where id = (probe ->> 'material_a_id')::uuid
  ) then
    raise exception 'Active enrolled Student could not read released Session material';
  end if;
end;
$$;

reset role;
update public.sessions
set is_published = false
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'session_a_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
begin
  if exists (
    select 1 from public.materials
    where id = (probe ->> 'material_a_id')::uuid
  ) then
    raise exception 'Student read Session material from an unpublished session';
  end if;
end;
$$;

reset role;
update public.sessions
set is_published = true
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'session_a_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
  saved jsonb;
begin
  saved := public.save_batch_session_material(
    (probe ->> 'session_b_id')::uuid,
    'Cross-batch private reading',
    probe ->> 'session_b_file_url',
    null
  );
  perform set_config(
    'pilot_v1_phase4.context',
    (probe || jsonb_build_object('material_b_id', saved ->> 'id'))::text,
    true
  );
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
begin
  if exists (
    select 1 from public.materials
    where id = (probe ->> 'material_b_id')::uuid
  ) then
    raise exception 'Student read Session material from another batch';
  end if;
end;
$$;

reset role;
update public.profiles
set is_active = false
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id'
)::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
begin
  if exists (
    select 1 from public.materials
    where id = (probe ->> 'material_a_id')::uuid
  ) then
    raise exception 'Inactive Student retained Session-material access';
  end if;
end;
$$;

reset role;
update public.profiles
set is_active = true
where id = (
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'student_id'
)::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
  write_blocked boolean := false;
begin
  if exists (
    select 1 from public.materials
    where id = (probe ->> 'material_a_id')::uuid
  ) then
    raise exception 'Signed-out caller retained Session-material access';
  end if;

  begin
    perform public.remove_batch_session_material(
      (probe ->> 'session_a_id')::uuid,
      (probe ->> 'material_a_id')::uuid
    );
  exception when sqlstate '42501' then
    write_blocked := true;
  end;

  if not write_blocked then
    raise exception 'Signed-out caller could execute the Admin Session-material RPC';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('pilot_v1_phase4.context')::jsonb ->> 'admin_id',
  true
);

do $$
declare
  probe jsonb := current_setting('pilot_v1_phase4.context')::jsonb;
begin
  perform public.remove_batch_session_material(
    (probe ->> 'session_a_id')::uuid,
    (probe ->> 'material_a_id')::uuid
  );
  perform public.remove_batch_session_material(
    (probe ->> 'session_b_id')::uuid,
    (probe ->> 'material_b_id')::uuid
  );
end;
$$;

reset role;
rollback;
