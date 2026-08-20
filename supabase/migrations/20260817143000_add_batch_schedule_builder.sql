begin;

alter table public.courses
  add column source_template_id uuid references public.course_templates(id) on delete restrict,
  add column source_template_revision_id uuid references public.course_template_revisions(id) on delete restrict,
  add column creation_idempotency_key uuid,
  add column schedule_revision integer not null default 1,
  add column course_mode text;

alter table public.courses
  add constraint courses_template_provenance_check check (
    (source_template_id is null and source_template_revision_id is null)
    or (source_template_id is not null and source_template_revision_id is not null)
  ),
  add constraint courses_schedule_revision_check check (schedule_revision > 0),
  add constraint courses_course_mode_check check (course_mode is null or course_mode in ('full', 'crash'));

alter table public.course_template_revisions
  add constraint course_template_revisions_template_id_id_key unique (template_id, id);

alter table public.courses
  add constraint courses_template_revision_ownership_fkey
  foreign key (source_template_id, source_template_revision_id)
  references public.course_template_revisions(template_id, id)
  on delete restrict;

create unique index courses_creation_idempotency_key
  on public.courses(creation_idempotency_key)
  where creation_idempotency_key is not null;
create index courses_source_template_revision_id_idx
  on public.courses(source_template_revision_id)
  where source_template_revision_id is not null;

alter table public.sessions
  add column event_type text,
  add column section_key text,
  add column display_order integer,
  add column source_template_event_id uuid references public.course_template_events(id) on delete restrict,
  add column venue text,
  add column reporting_time time,
  add column instructions text,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users(id) on delete set null,
  add column cancellation_reason text;

alter table public.sessions
  add constraint sessions_event_type_check check (
    event_type is null or event_type in ('live_class', 'mock', 'orientation', 'break', 'support')
  ),
  add constraint sessions_section_key_check check (
    section_key is null or section_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  add constraint sessions_display_order_check check (display_order is null or display_order > 0),
  add constraint sessions_venue_check check (venue is null or length(btrim(venue)) between 1 and 200),
  add constraint sessions_instructions_check check (instructions is null or length(instructions) <= 2000),
  add constraint sessions_cancellation_check check (
    (cancelled_at is null and cancelled_by is null and cancellation_reason is null)
    or (cancelled_at is not null and cancellation_reason is not null and length(btrim(cancellation_reason)) between 1 and 500)
  );

create unique index sessions_course_display_order_key
  on public.sessions(course_id, display_order)
  where display_order is not null;
create index sessions_course_section_order_idx
  on public.sessions(course_id, section_key, display_order);
create index sessions_source_template_event_id_idx
  on public.sessions(source_template_event_id)
  where source_template_event_id is not null;

create or replace function public.confirm_template_batch(
  p_name text,
  p_template_id uuid,
  p_expected_revision_id uuid,
  p_start_date date,
  p_publication_state text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.course_templates;
  v_course public.courses;
  v_sessions integer;
  v_materials integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if nullif(btrim(p_name), '') is null or length(btrim(p_name)) > 120 then
    raise exception 'Batch name is required and must be at most 120 characters';
  end if;
  if p_start_date is null then raise exception 'Batch start date is required'; end if;
  if p_publication_state not in ('draft', 'published') then
    raise exception 'Publication state must be draft or published';
  end if;
  if p_idempotency_key is null then raise exception 'Creation idempotency key is required'; end if;

  select * into v_course
  from public.courses
  where creation_idempotency_key = p_idempotency_key;
  if found then
    if v_course.source_template_id is distinct from p_template_id
      or v_course.source_template_revision_id is distinct from p_expected_revision_id
      or v_course.cohort_start_date is distinct from p_start_date
      or v_course.name is distinct from btrim(p_name) then
      raise exception 'Creation token was already used for a different batch proposal' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'courseId', v_course.id,
      'scheduleRevision', v_course.schedule_revision,
      'replayed', true
    );
  end if;

  select * into v_template
  from public.course_templates
  where id = p_template_id
  for share;
  if not found then raise exception 'Course template not found' using errcode = 'P0002'; end if;
  if v_template.current_revision_id is distinct from p_expected_revision_id then
    raise exception 'Template changed after preview. Review the latest revision before confirming.' using errcode = '40001';
  end if;

  insert into public.courses (
    name, is_active, cohort_start_date, schedule_timezone, source_template_id,
    source_template_revision_id, creation_idempotency_key, schedule_revision, course_mode
  ) values (
    btrim(p_name), p_publication_state = 'published', p_start_date, 'Asia/Kolkata',
    v_template.id, p_expected_revision_id, p_idempotency_key, 1, v_template.course_mode
  ) returning * into v_course;

  insert into public.sessions (
    course_id, master_session_id, title, session_number, session_date, session_end_at,
    class_type, instructor, is_published, event_type, section_key, display_order,
    source_template_event_id, venue, reporting_time, instructions
  )
  select
    v_course.id,
    event.source_master_session_id,
    event.title,
    event.display_order,
    starts.start_at,
    starts.start_at + make_interval(mins => event.duration_minutes),
    case when event.event_type in ('mock', 'orientation', 'break', 'support')
      then upper(event.event_type) else upper(event.section_key) end,
    event.instructor,
    p_publication_state = 'published' and event.is_published_by_default,
    event.event_type,
    event.section_key,
    event.display_order,
    event.id,
    event.venue,
    event.reporting_time,
    nullif(btrim(event.instructions), '')
  from (
    select e.*, s.section_key
    from public.course_template_events e
    join public.course_template_sections s on s.id = e.section_id
    where e.revision_id = p_expected_revision_id
  ) event
  cross join lateral (
    select (p_start_date + event.relative_day + event.start_time) at time zone 'Asia/Kolkata' as start_at
  ) starts
  order by event.display_order;
  get diagnostics v_sessions = row_count;
  if v_sessions = 0 then raise exception 'The selected template has no events'; end if;

  insert into public.materials (
    session_id, master_material_id, type, title, notion_url, file_url, video_url,
    question_count, available_from
  )
  select
    session.id,
    master.id,
    master.type,
    resource.title,
    master.notion_url,
    master.file_url,
    master.video_url,
    master.question_count,
    case
      when master.type = 'pre_read' then session.session_date - interval '7 days'
      else session.session_end_at
    end
  from public.course_template_resources resource
  join public.master_materials master on master.id = resource.master_material_id
  join public.sessions session
    on session.course_id = v_course.id
    and session.source_template_event_id = resource.event_id
  where resource.revision_id = p_expected_revision_id
    and resource.resource_type in ('pre_read', 'worksheet');
  get diagnostics v_materials = row_count;

  return jsonb_build_object(
    'courseId', v_course.id,
    'scheduleRevision', 1,
    'sessions', v_sessions,
    'materials', v_materials,
    'replayed', false
  );
end;
$$;

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
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_days = 0 or abs(p_days) > 365 then raise exception 'Shift must be between -365 and 365 non-zero days'; end if;
  select * into v_course from public.courses where id = p_course_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_course.schedule_revision <> p_expected_schedule_revision then
    raise exception 'Schedule changed after review. Review consequences again.' using errcode = '40001';
  end if;
  select * into v_selected from public.sessions
  where id = p_selected_session_id and course_id = p_course_id for update;
  if not found then raise exception 'Selected batch event not found' using errcode = 'P0002'; end if;
  if v_selected.cancelled_at is not null or v_selected.session_date <= statement_timestamp() then
    raise exception 'Completed, current or cancelled events cannot be shifted';
  end if;
  if exists (
    select 1 from public.sessions s
    where s.course_id = p_course_id
      and s.display_order >= v_selected.display_order
      and s.cancelled_at is null
      and s.session_date > statement_timestamp()
      and s.session_date + make_interval(days => p_days) <= statement_timestamp()
  ) then
    raise exception 'A shift cannot move an eligible event into the past';
  end if;

  with eligible as (
    select s.id, s.title, s.session_date before_start, s.session_end_at before_end
    from public.sessions s
    where s.course_id = p_course_id
      and s.display_order >= v_selected.display_order
      and s.cancelled_at is null
      and s.session_date > statement_timestamp()
    order by s.display_order
    for update
  ), changed as (
    update public.sessions s
    set session_date = e.before_start + make_interval(days => p_days),
        session_end_at = e.before_end + make_interval(days => p_days)
    from eligible e where s.id = e.id
    returning s.id, s.title, e.before_start, s.session_date after_start
  ), material_changes as (
    update public.materials m
    set available_from = case
      when m.type = 'pre_read' then s.session_date - interval '7 days'
      else s.session_end_at
    end
    from public.sessions s
    where s.course_id = p_course_id and m.session_id = s.id
      and m.available_from > statement_timestamp()
    returning m.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'title', title, 'before', before_start, 'after', after_start
  ) order by before_start), '[]'::jsonb) into v_changed from changed;

  update public.courses set schedule_revision = schedule_revision + 1 where id = p_course_id;
  return jsonb_build_object('scheduleRevision', v_course.schedule_revision + 1, 'events', v_changed);
end;
$$;

create or replace function public.cancel_batch_event(
  p_course_id uuid,
  p_session_id uuid,
  p_reason text,
  p_expected_schedule_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_revision integer;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'Cancellation reason is required'; end if;
  select schedule_revision into v_revision from public.courses where id = p_course_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_revision <> p_expected_schedule_revision then raise exception 'Schedule changed after review. Review again.' using errcode = '40001'; end if;
  update public.sessions set cancelled_at = statement_timestamp(), cancelled_by = auth.uid(),
    cancellation_reason = btrim(p_reason)
  where id = p_session_id and course_id = p_course_id and cancelled_at is null
    and session_date > statement_timestamp();
  if not found then raise exception 'Only an eligible future event can be cancelled'; end if;
  update public.courses set schedule_revision = schedule_revision + 1 where id = p_course_id;
  return jsonb_build_object('scheduleRevision', v_revision + 1, 'sessionId', p_session_id);
end;
$$;

create or replace function public.save_batch_event(
  p_course_id uuid,
  p_session_id uuid,
  p_expected_schedule_revision integer,
  p_title text,
  p_event_type text,
  p_section_key text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_instructor text,
  p_venue text,
  p_reporting_time time,
  p_instructions text,
  p_is_published boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_session public.sessions;
  v_order integer;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 160 then raise exception 'Event title is required and must be at most 160 characters'; end if;
  if p_event_type not in ('live_class', 'mock', 'orientation', 'break', 'support') then raise exception 'Unsupported event type'; end if;
  if p_section_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'A valid Section is required'; end if;
  if p_starts_at is null or p_duration_minutes not between 15 and 720 then raise exception 'A valid start and duration are required'; end if;

  select * into v_course from public.courses where id = p_course_id for update;
  if not found or v_course.source_template_revision_id is null then raise exception 'Phase 2 batch not found' using errcode = 'P0002'; end if;
  if v_course.schedule_revision <> p_expected_schedule_revision then raise exception 'Schedule changed after review. Review again.' using errcode = '40001'; end if;

  if p_session_id is null then
    if p_starts_at <= statement_timestamp() then raise exception 'An extra event must be in the future'; end if;
    select coalesce(max(coalesce(display_order, session_number)), 0) + 1 into v_order from public.sessions where course_id = p_course_id;
    insert into public.sessions (
      course_id, title, session_number, session_date, session_end_at, class_type,
      instructor, is_published, event_type, section_key, display_order, venue,
      reporting_time, instructions
    ) values (
      p_course_id, btrim(p_title), v_order, p_starts_at,
      p_starts_at + make_interval(mins => p_duration_minutes), upper(p_section_key),
      nullif(btrim(p_instructor), ''), p_is_published, p_event_type, p_section_key,
      v_order, nullif(btrim(p_venue), ''), p_reporting_time,
      nullif(btrim(p_instructions), '')
    ) returning * into v_session;
  else
    select * into v_session from public.sessions where id = p_session_id and course_id = p_course_id for update;
    if not found then raise exception 'Batch event not found' using errcode = 'P0002'; end if;
    if v_session.cancelled_at is not null then raise exception 'Cancelled events cannot be edited'; end if;
    if v_session.session_date > statement_timestamp() and p_starts_at <= statement_timestamp() then
      raise exception 'A future event cannot be moved into the past';
    end if;
    if v_session.session_date <= statement_timestamp() and (
      v_session.title is distinct from btrim(p_title)
      or v_session.session_date is distinct from p_starts_at
      or v_session.session_end_at is distinct from p_starts_at + make_interval(mins => p_duration_minutes)
      or v_session.event_type is distinct from p_event_type
      or v_session.section_key is distinct from p_section_key
      or v_session.instructor is distinct from nullif(btrim(p_instructor), '')
      or v_session.is_published is distinct from p_is_published
    ) then
      raise exception 'Completed or current events allow only venue and instruction corrections';
    end if;
    update public.sessions set
      title = btrim(p_title), session_date = p_starts_at,
      session_end_at = p_starts_at + make_interval(mins => p_duration_minutes),
      class_type = upper(p_section_key), instructor = nullif(btrim(p_instructor), ''),
      is_published = p_is_published, event_type = p_event_type, section_key = p_section_key,
      venue = nullif(btrim(p_venue), ''), reporting_time = p_reporting_time,
      instructions = nullif(btrim(p_instructions), '')
    where id = p_session_id returning * into v_session;

    update public.materials set available_from = case
      when type = 'pre_read' then v_session.session_date - interval '7 days'
      else v_session.session_end_at
    end
    where session_id = v_session.id and available_from > statement_timestamp();
  end if;
  update public.courses set schedule_revision = schedule_revision + 1 where id = p_course_id;
  return jsonb_build_object('scheduleRevision', v_course.schedule_revision + 1, 'sessionId', v_session.id);
end;
$$;

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
declare v_course public.courses; v_count integer; v_eligible integer; v_offset integer;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_course from public.courses where id = p_course_id for update;
  if not found or v_course.source_template_revision_id is null then raise exception 'Phase 2 batch not found' using errcode = 'P0002'; end if;
  if v_course.schedule_revision <> p_expected_schedule_revision then raise exception 'Schedule changed after review. Review again.' using errcode = '40001'; end if;
  select count(*), count(distinct item.id) into v_count, v_eligible
  from unnest(p_ordered_session_ids) as item(id);
  if v_count = 0 or v_count <> v_eligible then raise exception 'Reorder list must contain unique events'; end if;
  select count(*) into v_eligible from public.sessions
  where course_id = p_course_id and cancelled_at is null and session_date > statement_timestamp();
  if v_count <> v_eligible or exists (
    select 1 from unnest(p_ordered_session_ids) id
    where not exists (select 1 from public.sessions s where s.id = id and s.course_id = p_course_id and s.cancelled_at is null and s.session_date > statement_timestamp())
  ) then raise exception 'Reorder must include every eligible future event exactly once'; end if;

  create temporary table if not exists pg_temp.batch_reorder_slots(position integer, display_order integer, session_number integer, session_date timestamptz, session_end_at timestamptz) on commit drop;
  truncate pg_temp.batch_reorder_slots;
  insert into pg_temp.batch_reorder_slots
  select row_number() over(order by coalesce(display_order, session_number)), coalesce(display_order, session_number), session_number, session_date, session_end_at
  from public.sessions where course_id = p_course_id and cancelled_at is null and session_date > statement_timestamp();
  select coalesce(max(coalesce(display_order, session_number)), 0) + v_count + 1
  into v_offset from public.sessions where course_id = p_course_id;
  update public.sessions set display_order = coalesce(display_order, session_number) + v_offset,
    session_number = session_number + v_offset
  where course_id = p_course_id and cancelled_at is null and session_date > statement_timestamp();
  update public.sessions s set display_order = slot.display_order, session_number = slot.session_number,
    session_date = slot.session_date, session_end_at = slot.session_end_at
  from unnest(p_ordered_session_ids) with ordinality requested(id, position)
  join pg_temp.batch_reorder_slots slot on slot.position = requested.position
  where s.id = requested.id;
  update public.materials m set available_from = case when m.type = 'pre_read' then s.session_date - interval '7 days' else s.session_end_at end
  from public.sessions s where s.course_id = p_course_id and m.session_id = s.id and m.available_from > statement_timestamp();
  update public.courses set schedule_revision = schedule_revision + 1 where id = p_course_id;
  return jsonb_build_object('scheduleRevision', v_course.schedule_revision + 1, 'events', v_count);
end;
$$;

revoke all on function public.confirm_template_batch(text, uuid, uuid, date, text, uuid) from public, anon;
revoke all on function public.shift_batch_schedule(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.cancel_batch_event(uuid, uuid, text, integer) from public, anon;
revoke all on function public.save_batch_event(uuid, uuid, integer, text, text, text, timestamptz, integer, text, text, time, text, boolean) from public, anon;
revoke all on function public.reorder_batch_events(uuid, uuid[], integer) from public, anon;
grant execute on function public.confirm_template_batch(text, uuid, uuid, date, text, uuid) to authenticated;
grant execute on function public.shift_batch_schedule(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.cancel_batch_event(uuid, uuid, text, integer) to authenticated;
grant execute on function public.save_batch_event(uuid, uuid, integer, text, text, text, timestamptz, integer, text, text, time, text, boolean) to authenticated;
grant execute on function public.reorder_batch_events(uuid, uuid[], integer) to authenticated;

commit;
