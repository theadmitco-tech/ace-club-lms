-- Pilot V3 Phase 7: assignment-scoped early mock access for named testers.
create table public.mock_assignment_testers (
  assignment_id uuid not null references public.mock_assessment_assignments(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default statement_timestamp(),
  revoked_by uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  primary key (assignment_id, user_id),
  check ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null))
);

create index mock_assignment_testers_user_active_idx
  on public.mock_assignment_testers(user_id, assignment_id)
  where revoked_at is null;

alter table public.mock_assignment_testers enable row level security;

create policy "Testers read own mock grants"
on public.mock_assignment_testers for select
using (user_id = (select auth.uid()) and revoked_at is null);

create policy "Admins manage mock tester grants"
on public.mock_assignment_testers for all
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin' and p.is_active = true
))
with check (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin' and p.is_active = true
));

create policy "Testers view assigned mock assignment"
on public.mock_assessment_assignments for select
using (exists (
  select 1 from public.mock_assignment_testers t
  join public.profiles p on p.id = t.user_id
  where t.assignment_id = mock_assessment_assignments.id
    and t.user_id = (select auth.uid())
    and t.revoked_at is null
    and p.is_active = true
));

create policy "Testers view assigned mock version"
on public.mock_assessment_versions for select
using (exists (
  select 1
  from public.mock_assessment_assignments a
  join public.mock_assignment_testers t on t.assignment_id = a.id
  join public.profiles p on p.id = t.user_id
  where a.assessment_version_id = mock_assessment_versions.id
    and t.user_id = (select auth.uid())
    and t.revoked_at is null
    and p.is_active = true
));

grant select on public.mock_assignment_testers to authenticated;
grant select, insert, update on public.mock_assignment_testers to service_role;

alter table public.mock_assessment_audit
  drop constraint mock_assessment_audit_action_check;
alter table public.mock_assessment_audit
  add constraint mock_assessment_audit_action_check
  check (action in ('created','updated','published','assigned','retired','tester_granted','tester_revoked'));

create or replace function private.is_eligible_mock_student(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_student_id
      and p.is_active = true
      and (
        (
          p.role = 'student'
          and exists (
            select 1
            from public.mock_assessment_assignments a
            join public.enrollments e on e.course_id = a.course_id and e.user_id = p_student_id
            where a.id = p_assignment_id
              and a.release_at <= statement_timestamp()
          )
        )
        or exists (
          select 1
          from public.mock_assignment_testers t
          where t.assignment_id = p_assignment_id
            and t.user_id = p_student_id
            and t.revoked_at is null
        )
      )
  );
$$;

revoke all on function private.is_eligible_mock_student(uuid, uuid) from public, anon, authenticated;
