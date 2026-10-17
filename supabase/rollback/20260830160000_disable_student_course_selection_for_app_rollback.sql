begin;

-- Emergency Tier 2 compensation only. The Production application must first
-- be rolled back to its recorded pre-course-selector deployment. Keep all
-- additive schema and Student choices, but make the restored application use
-- the same latest-enrollment rule it used before course selection shipped.
create or replace function public.resolve_student_course_id(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select enrollment.course_id
  from public.enrollments as enrollment
  where enrollment.user_id = p_student_id
  order by enrollment.enrolled_at desc, enrollment.course_id
  limit 1;
$$;

revoke all on function public.resolve_student_course_id(uuid) from public, anon, authenticated;

-- Prevent cached/new clients from changing course preferences while the old
-- application is serving. Preserve the functions, table and every preference
-- row so the forward feature can be diagnosed and re-enabled without data loss.
revoke all on function public.get_student_course_options() from public, anon, authenticated;
revoke all on function public.select_student_course(uuid) from public, anon, authenticated;

do $$
begin
  if to_regclass('public.student_course_preferences') is null then
    raise exception 'Rollback refused: student_course_preferences is missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_template_resources'
      and column_name = 'question_count'
  ) then
    raise exception 'Rollback refused: template question_count must be preserved';
  end if;

  if has_function_privilege('authenticated', 'public.get_student_course_options()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.select_student_course(uuid)', 'EXECUTE') then
    raise exception 'Rollback failed: course-selection RPC access remains enabled';
  end if;

  if has_function_privilege('authenticated', 'public.resolve_student_course_id(uuid)', 'EXECUTE') then
    raise exception 'Rollback failed: internal resolver is directly callable';
  end if;

  if not has_function_privilege('authenticated', 'public.get_student_timeline()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_student_practice_log()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_portal_identity()', 'EXECUTE') then
    raise exception 'Rollback failed: restored application read RPCs are unavailable';
  end if;

  if exists (
    select 1
    from (
      select distinct enrollment.user_id
      from public.enrollments as enrollment
    ) as student
    where public.resolve_student_course_id(student.user_id) is distinct from (
      select enrollment.course_id
      from public.enrollments as enrollment
      where enrollment.user_id = student.user_id
      order by enrollment.enrolled_at desc, enrollment.course_id
      limit 1
    )
  ) then
    raise exception 'Rollback failed: resolver does not match latest enrollment';
  end if;
end;
$$;

commit;
