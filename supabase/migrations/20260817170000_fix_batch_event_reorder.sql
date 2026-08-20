begin;

create or replace function public.reorder_batch_events(
  p_course_id uuid,
  p_ordered_session_ids uuid[],
  p_expected_schedule_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_count integer;
  v_eligible integer;
  v_offset integer;
  v_position integer;
  v_display_orders integer[];
  v_session_numbers integer[];
  v_session_dates timestamptz[];
  v_session_end_dates timestamptz[];
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_course
  from public.courses
  where id = p_course_id
  for update;

  if not found or v_course.source_template_revision_id is null then
    raise exception 'Phase 2 batch not found' using errcode = 'P0002';
  end if;
  if v_course.schedule_revision <> p_expected_schedule_revision then
    raise exception 'Schedule changed after review. Review again.' using errcode = '40001';
  end if;

  select count(*), count(distinct item.id)
  into v_count, v_eligible
  from unnest(p_ordered_session_ids) as item(id);

  if v_count = 0 or v_count <> v_eligible then
    raise exception 'Reorder list must contain unique events';
  end if;

  select count(*) into v_eligible
  from public.sessions
  where course_id = p_course_id
    and cancelled_at is null
    and session_date > statement_timestamp();

  if v_count <> v_eligible or exists (
    select 1
    from unnest(p_ordered_session_ids) as requested(id)
    where not exists (
      select 1
      from public.sessions as session
      where session.id = requested.id
        and session.course_id = p_course_id
        and session.cancelled_at is null
        and session.session_date > statement_timestamp()
    )
  ) then
    raise exception 'Reorder must include every eligible future event exactly once';
  end if;

  perform 1
  from public.sessions
  where course_id = p_course_id
    and cancelled_at is null
    and session_date > statement_timestamp()
  order by coalesce(display_order, session_number)
  for update;

  select
    array_agg(coalesce(display_order, session_number) order by coalesce(display_order, session_number)),
    array_agg(session_number order by coalesce(display_order, session_number)),
    array_agg(session_date order by coalesce(display_order, session_number)),
    array_agg(session_end_at order by coalesce(display_order, session_number))
  into v_display_orders, v_session_numbers, v_session_dates, v_session_end_dates
  from public.sessions
  where course_id = p_course_id
    and cancelled_at is null
    and session_date > statement_timestamp();

  select coalesce(max(coalesce(display_order, session_number)), 0) + v_count + 1
  into v_offset
  from public.sessions
  where course_id = p_course_id;

  update public.sessions
  set
    display_order = coalesce(display_order, session_number) + v_offset,
    session_number = session_number + v_offset
  where course_id = p_course_id
    and cancelled_at is null
    and session_date > statement_timestamp();

  for v_position in 1..v_count loop
    update public.sessions
    set
      display_order = v_display_orders[v_position],
      session_number = v_session_numbers[v_position],
      session_date = v_session_dates[v_position],
      session_end_at = v_session_end_dates[v_position]
    where id = p_ordered_session_ids[v_position]
      and course_id = p_course_id;
  end loop;

  update public.materials as material
  set available_from = case
    when material.type = 'pre_read' then session.session_date - interval '7 days'
    else session.session_end_at
  end
  from public.sessions as session
  where session.course_id = p_course_id
    and material.session_id = session.id
    and material.available_from > statement_timestamp();

  update public.courses
  set schedule_revision = schedule_revision + 1
  where id = p_course_id;

  return jsonb_build_object(
    'scheduleRevision', v_course.schedule_revision + 1,
    'events', v_count
  );
end;
$$;

revoke all on function public.reorder_batch_events(uuid, uuid[], integer) from public, anon;
grant execute on function public.reorder_batch_events(uuid, uuid[], integer) to authenticated;

commit;
