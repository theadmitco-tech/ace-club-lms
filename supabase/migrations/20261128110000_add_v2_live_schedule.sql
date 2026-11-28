-- Every enrolled student with active access can see their batch's live class dates and times.
-- Only titles, times and completion are returned: no Meet links, rosters or registrations.
-- Joining a class still requires an active live seat. Existing functions and data are unchanged.
begin;

create or replace function public.get_my_v2_live_schedule(p_batch_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_course jsonb; v_publication jsonb;
begin
  v_course := public.v2_learning_course_base(p_batch_id);
  if v_course is null then return null; end if;
  select document into v_publication from public.v2_batch_publication_revisions
  where batch_id = p_batch_id and revision = (v_course->>'publicationRevision')::integer;
  return coalesce((select jsonb_agg(jsonb_build_object('key', e->'key', 'title', e->'title', 'section', e->'section',
      'startsAt', e->'startsAt', 'endsAt', e->'endsAt', 'completedAt', c.completed_at) order by n)
    from jsonb_array_elements(coalesce(v_publication->'events', '[]'::jsonb)) with ordinality items(e, n)
    left join public.v2_live_class_completions c on c.batch_id = p_batch_id and c.event_key = (e->>'key')::uuid
    where e->>'kind' = 'live'
      and public.can_access_v2_product(public.v2_entitlement_product_code(v_course->>'productCode'), e->>'section')), '[]'::jsonb);
end; $$;

revoke all on function public.get_my_v2_live_schedule(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_my_v2_live_schedule(uuid) to authenticated;

commit;
