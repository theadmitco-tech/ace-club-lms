-- Pilot V1 Production verification — read-only and identity-free.
-- Run before migration and again after migration/smoke checks. Compare only
-- these aggregate and schema results; do not add raw Student rows to evidence.

begin;
set transaction read only;

select version
from supabase_migrations.schema_migrations
where version in (
  '20260804120000',
  '20260811170000',
  '20260813081141'
)
order by version;

select
  (select count(*) from public.courses) as courses,
  (select count(*) from public.sessions) as sessions,
  (select count(*) from public.enrollments) as enrollments,
  (select count(*) from public.materials) as materials,
  (select count(*) from public.student_question_logs) as student_question_logs,
  (
    select count(*)
    from public.student_question_logs as log
    join public.profiles as profile on profile.id = log.user_id
    where lower(profile.role) = 'admin'
  ) as admin_owned_student_question_logs;

select
  count(*) filter (where status is null) as tracker_not_updated,
  count(*) filter (where status = 'done') as tracker_done,
  count(*) filter (where status = 'review') as tracker_review,
  max(updated_at) as tracker_latest_update
from public.student_question_logs;

select type, count(*) as material_count
from public.materials
group by type
order by type;

select id, public, file_size_limit
from storage.buckets
where id = 'course-materials';

select
  count(*) as course_material_objects,
  count(*) filter (where name like 'worksheets/%') as worksheet_objects,
  count(*) filter (where name like 'session-materials/%') as session_material_objects
from storage.objects
where bucket_id = 'course-materials';

select
  constraint_name,
  is_present,
  is_validated
from (
  values
    ('master_materials_no_session_material'),
    ('materials_type_check'),
    ('materials_session_material_shape_check')
) as expected(constraint_name)
cross join lateral (
  select
    exists (
      select 1
      from pg_constraint
      where conname = expected.constraint_name
    ) as is_present,
    coalesce((
      select bool_and(convalidated)
      from pg_constraint
      where conname = expected.constraint_name
    ), false) as is_validated
) as state
order by constraint_name;

select
  policyname,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'materials'
order by policyname;

with expected(signature) as (
  values
    ('public.enforce_batch_session_material()'),
    ('public.save_batch_session_material(uuid,text,text,uuid)'),
    ('public.remove_batch_session_material(uuid,uuid)')
), resolved as (
  select signature, to_regprocedure(signature) as function_oid
  from expected
)
select
  signature,
  function_oid is not null as is_present,
  case when function_oid is not null
    then has_function_privilege('anon', function_oid, 'EXECUTE')
  end as anon_can_execute,
  case when function_oid is not null
    then has_function_privilege('authenticated', function_oid, 'EXECUTE')
  end as authenticated_can_execute,
  case when function_oid is not null
    then (select proacl::text from pg_proc where oid = function_oid)
  end as explicit_acl
from resolved
order by signature;

rollback;
