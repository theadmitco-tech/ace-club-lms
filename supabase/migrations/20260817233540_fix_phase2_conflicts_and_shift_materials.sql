begin;

-- SQLSTATE 40001 is reserved for retryable serialization failures. PostgREST's
-- upstream retries turn these deliberate stale-review denials into timeouts.
-- Replace the one stale-review code in every Phase 2 mutation function with the
-- ordinary, non-retryable PL/pgSQL exception code while preserving the reviewed
-- function definitions and signatures already applied on Staging.
do $$
declare
  v_function regprocedure;
  v_definition text;
  v_occurrences integer;
begin
  foreach v_function in array array[
    'public.confirm_template_batch(text,uuid,uuid,date,text,uuid)'::regprocedure,
    'public.shift_batch_schedule(uuid,uuid,integer,integer)'::regprocedure,
    'public.cancel_batch_event(uuid,uuid,text,integer)'::regprocedure,
    'public.save_batch_event(uuid,uuid,integer,text,text,text,timestamptz,integer,text,text,time,text,boolean)'::regprocedure,
    'public.reorder_batch_events(uuid,uuid[],integer)'::regprocedure
  ] loop
    v_definition := pg_get_functiondef(v_function);
    v_occurrences := (length(v_definition) - length(replace(v_definition, '40001', ''))) / length('40001');
    if v_occurrences <> 1 then
      raise exception 'Expected exactly one retryable stale-review code in %, found %', v_function, v_occurrences;
    end if;
    execute replace(v_definition, '40001', 'P0001');
  end loop;
end;
$$;

-- Run the material update after the event-update statement. Sibling
-- data-modifying CTEs share one snapshot, so the previous implementation read
-- the sessions' pre-shift timestamps and left unreleased materials behind.
create or replace function public.shift_batch_schedule(
  p_course_id uuid,
  p_selected_session_id uuid,
  p_days integer,
  p_expected_schedule_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_selected public.sessions;
  v_changed jsonb;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_days = 0 or abs(p_days) > 365 then
    raise exception 'Shift must be between -365 and 365 non-zero days';
  end if;

  select * into v_course
  from public.courses
  where id = p_course_id
  for update;
  if not found then
    raise exception 'Batch not found' using errcode = 'P0002';
  end if;
  if v_course.schedule_revision <> p_expected_schedule_revision then
    raise exception 'Schedule changed after review. Review consequences again.' using errcode = 'P0001';
  end if;

  select * into v_selected
  from public.sessions
  where id = p_selected_session_id
    and course_id = p_course_id
  for update;
  if not found then
    raise exception 'Selected batch event not found' using errcode = 'P0002';
  end if;
  if v_selected.cancelled_at is not null or v_selected.session_date <= statement_timestamp() then
    raise exception 'Completed, current or cancelled events cannot be shifted';
  end if;
  if exists (
    select 1
    from public.sessions as session
    where session.course_id = p_course_id
      and session.display_order >= v_selected.display_order
      and session.cancelled_at is null
      and session.session_date > statement_timestamp()
      and session.session_date + make_interval(days => p_days) <= statement_timestamp()
  ) then
    raise exception 'A shift cannot move an eligible event into the past';
  end if;

  with eligible as (
    select
      session.id,
      session.title,
      session.session_date as before_start,
      session.session_end_at as before_end
    from public.sessions as session
    where session.course_id = p_course_id
      and session.display_order >= v_selected.display_order
      and session.cancelled_at is null
      and session.session_date > statement_timestamp()
    order by session.display_order
    for update
  ), changed as (
    update public.sessions as session
    set
      session_date = eligible.before_start + make_interval(days => p_days),
      session_end_at = eligible.before_end + make_interval(days => p_days)
    from eligible
    where session.id = eligible.id
    returning
      session.id,
      session.title,
      eligible.before_start,
      session.session_date as after_start
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'before', before_start,
        'after', after_start
      )
      order by before_start
    ),
    '[]'::jsonb
  )
  into v_changed
  from changed;

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
    'events', v_changed
  );
end;
$$;

comment on function public.shift_batch_schedule(uuid, uuid, integer, integer) is
  'Admin-only Phase 2 shift with non-retryable stale-review denial and post-shift unreleased-material synchronization.';

commit;
