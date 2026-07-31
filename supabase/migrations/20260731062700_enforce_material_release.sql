drop policy if exists "Authorised users can view materials" on public.materials;

create policy "Authorised users can view materials"
on public.materials
as permissive
for select
to public
using (
  available_from <= now()
  and exists (
    select 1
    from public.sessions as session
    where session.id = materials.session_id
      and public.can_access_course(session.course_id)
  )
);
