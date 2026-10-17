begin;

-- Resolve the active portal identity in one authenticated database round trip.
-- This replaces separate Auth, profile, and tester-grant requests while keeping
-- the database as the source of truth for every request.
create or replace function public.get_portal_identity()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', profile.id,
    'role', profile.role,
    'full_name', profile.full_name,
    'tester_access', profile.role = 'admin' and exists (
      select 1
      from public.mock_assignment_testers as tester
      where tester.user_id = profile.id
        and tester.revoked_at is null
    )
  )
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true
    and profile.role in ('admin', 'student');
$$;

revoke all on function public.get_portal_identity() from public, anon;
grant execute on function public.get_portal_identity() to authenticated;

commit;
