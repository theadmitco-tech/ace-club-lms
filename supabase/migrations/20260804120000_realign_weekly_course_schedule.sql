begin;

-- Preserve the Orientation master row for history, but remove it from all
-- current and future Student timelines.
update public.master_sessions
set
  curriculum_version = 'mvp-2026-retired',
  session_number = 1,
  is_archived = true
where curriculum_key = 'w01-fri-orientation'
  and curriculum_version = 'mvp-2026';

do $$
begin
  if not exists (
    select 1
    from public.master_sessions
    where curriculum_key = 'w01-fri-orientation'
      and curriculum_version = 'mvp-2026-retired'
      and class_type = 'ORIENTATION'
      and is_archived = true
  ) then
    raise exception 'Expected the active Orientation master session to exist';
  end if;
end
$$;

-- Move the existing academic master rows rather than recreating them. This
-- preserves their approved detailed titles, instructors, materials, PDFs and
-- worksheet-question associations.
update public.master_sessions
set session_number = -session_number
where curriculum_version = 'mvp-2026'
  and is_archived = false;

with approved (
  old_key, session_number, curriculum_key, week_number, weekday
) as (
  values
    ('w00-fri-mock-1-diagnostic', 1,  'w00-fri-mock-1-diagnostic',              0,  'Friday'),
    ('w00-sat-individual-calls',  2,  'w00-sat-individual-calls',               0,  'Saturday'),
    ('w00-sun-individual-calls',  3,  'w00-sun-individual-calls',               0,  'Sunday'),
    ('w01-sat-verbal-1',          4,  'w01-fri-verbal-1',                       1,  'Friday'),
    ('w01-sun-quant-1',           5,  'w01-sat-quant-1',                        1,  'Saturday'),
    ('w02-fri-di-1',              6,  'w01-sun-di-1',                           1,  'Sunday'),
    ('w02-sat-verbal-2',          7,  'w02-fri-verbal-2',                       2,  'Friday'),
    ('w02-sun-quant-2',           8,  'w02-sat-quant-2',                        2,  'Saturday'),
    ('w03-fri-di-2',              9,  'w02-sun-di-2',                           2,  'Sunday'),
    ('w03-sat-verbal-3',         10,  'w03-fri-verbal-3',                       3,  'Friday'),
    ('w03-sun-quant-3',          11,  'w03-sat-quant-3',                        3,  'Saturday'),
    ('w04-fri-break',            12,  'w04-fri-break',                          4,  'Friday'),
    ('w04-sat-mock-2',           13,  'w04-sat-mock-2',                         4,  'Saturday'),
    ('w04-sun-analysis-call',    14,  'w04-sun-analysis-call',                   4,  'Sunday'),
    ('w05-sat-verbal-4',         15,  'w05-fri-verbal-4',                       5,  'Friday'),
    ('w05-sun-quant-4',          16,  'w05-sat-quant-4',                        5,  'Saturday'),
    ('w05-fri-di-3',             17,  'w05-sun-di-3',                           5,  'Sunday'),
    ('w06-sat-verbal-5',         18,  'w06-fri-verbal-5',                       6,  'Friday'),
    ('w06-sun-quant-5',          19,  'w06-sat-quant-5',                        6,  'Saturday'),
    ('w06-fri-di-4',             20,  'w06-sun-di-4',                           6,  'Sunday'),
    ('w07-sat-verbal-6',         21,  'w07-fri-verbal-6',                       7,  'Friday'),
    ('w07-sun-quant-6',          22,  'w07-sat-quant-6',                        7,  'Saturday'),
    ('w07-fri-di-5',             23,  'w07-sun-di-5',                           7,  'Sunday'),
    ('w08-fri-break',            24,  'w08-fri-break',                          8,  'Friday'),
    ('w08-sat-mock-3',           25,  'w08-sat-mock-3',                         8,  'Saturday'),
    ('w08-sun-individual-calls', 26,  'w08-sun-individual-calls',               8,  'Sunday'),
    ('w10-sat-mock',             27,  'w10-sat-mock',                          10,  'Saturday'),
    ('w12-sat-mock',             28,  'w12-sat-mock',                          12,  'Saturday'),
    ('w14-sat-mock',             29,  'w14-sat-mock',                          14,  'Saturday'),
    ('w16-sat-mock',             30,  'w16-sat-mock',                          16,  'Saturday')
)
update public.master_sessions as master
set
  session_number = approved.session_number,
  curriculum_key = approved.curriculum_key,
  week_number = approved.week_number,
  weekday = approved.weekday
from approved
where master.curriculum_key = approved.old_key
  and master.curriculum_version = 'mvp-2026'
  and master.is_archived = false;

do $$
declare
  active_count integer;
  unmatched_count integer;
begin
  select count(*) into active_count
  from public.master_sessions
  where curriculum_version = 'mvp-2026'
    and is_archived = false;

  select count(*) into unmatched_count
  from public.master_sessions
  where curriculum_version = 'mvp-2026'
    and is_archived = false
    and session_number < 0;

  if active_count <> 30 or unmatched_count <> 0 then
    raise exception 'Expected 30 remapped active sessions and no unmatched rows; found % active and % unmatched',
      active_count, unmatched_count;
  end if;
end
$$;

-- Hide the removed Orientation in existing cohorts without deleting its
-- historical session or materials.
update public.sessions as session
set is_published = false
from public.master_sessions as master
where session.master_session_id = master.id
  and master.curriculum_version = 'mvp-2026-retired'
  and master.class_type = 'ORIENTATION';

-- Realign every existing cohort generated from the current master curriculum.
do $$
begin
  if exists (
    select 1
    from public.sessions as session
    join public.master_sessions as master on master.id = session.master_session_id
    join public.courses as course on course.id = session.course_id
    where master.curriculum_version = 'mvp-2026'
      and master.is_archived = false
      and course.cohort_start_date is null
  ) then
    raise exception 'Cannot realign a current-curriculum cohort without cohort_start_date';
  end if;
end
$$;

update public.sessions as session
set
  title = master.title,
  session_number = master.session_number,
  session_date = starts.session_start_at,
  session_end_at = starts.session_start_at + interval '2 hours',
  class_type = master.class_type,
  instructor = master.instructor
from public.master_sessions as master
join public.courses as course on true
cross join lateral (
  select (
    course.cohort_start_date
    + (master.week_number * 7)
    + case master.weekday when 'Friday' then 0 when 'Saturday' then 1 when 'Sunday' then 2 end
    + case master.weekday when 'Friday' then time '20:00' else time '10:00' end
  ) at time zone 'Asia/Kolkata' as session_start_at
) as starts
where session.master_session_id = master.id
  and session.course_id = course.id
  and course.cohort_start_date is not null
  and master.curriculum_version = 'mvp-2026'
  and master.is_archived = false;

-- Keep all copied material release timestamps aligned with the moved class.
update public.materials as material
set available_from = case
  when material.type = 'pre_read' and master.week_number = 0 then material.available_from
  when material.type = 'pre_read' then session.session_date - interval '7 days'
  else session.session_end_at
end
from public.sessions as session
join public.master_sessions as master on master.id = session.master_session_id
where material.session_id = session.id
  and master.curriculum_version = 'mvp-2026'
  and master.is_archived = false;

create or replace function public.generate_course_schedule(
  p_course_id uuid,
  p_start_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_sessions integer;
  generated_materials integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if extract(isodow from p_start_date) <> 5 then
    raise exception 'Cohort start date must be a Friday';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found';
  end if;

  if exists (select 1 from public.sessions where course_id = p_course_id) then
    raise exception 'Course already has a schedule';
  end if;

  update public.courses
  set
    cohort_start_date = p_start_date,
    schedule_timezone = 'Asia/Kolkata'
  where id = p_course_id;

  insert into public.sessions (
    course_id,
    master_session_id,
    title,
    session_number,
    session_date,
    session_end_at,
    class_type,
    instructor,
    is_published
  )
  select
    p_course_id,
    master.id,
    master.title,
    master.session_number,
    starts.session_start_at,
    starts.session_start_at + interval '2 hours',
    master.class_type,
    master.instructor,
    true
  from public.master_sessions as master
  cross join lateral (
    select (
      p_start_date
      + (master.week_number * 7)
      + case master.weekday when 'Friday' then 0 when 'Saturday' then 1 when 'Sunday' then 2 end
      + case master.weekday when 'Friday' then time '20:00' else time '10:00' end
    ) at time zone 'Asia/Kolkata' as session_start_at
  ) as starts
  where master.curriculum_version = 'mvp-2026'
    and master.is_archived = false
  order by master.session_number;

  get diagnostics generated_sessions = row_count;

  if generated_sessions <> 30 then
    raise exception 'Expected 30 current master sessions, found %', generated_sessions;
  end if;

  insert into public.materials (
    session_id,
    master_material_id,
    type,
    title,
    notion_url,
    file_url,
    video_url,
    question_count,
    available_from
  )
  select
    session.id,
    material.id,
    material.type,
    material.title,
    material.notion_url,
    material.file_url,
    material.video_url,
    material.question_count,
    case
      when material.type = 'pre_read' and master.week_number = 0 then statement_timestamp()
      when material.type = 'pre_read' then session.session_date - interval '7 days'
      else session.session_end_at
    end
  from public.sessions as session
  join public.master_sessions as master on master.id = session.master_session_id
  join public.master_materials as material on material.master_session_id = master.id
  where session.course_id = p_course_id
    and material.type <> 'video';

  get diagnostics generated_materials = row_count;

  return jsonb_build_object(
    'sessions', generated_sessions,
    'materials', generated_materials
  );
end;
$$;

revoke all on function public.generate_course_schedule(uuid, date) from public;
revoke all on function public.generate_course_schedule(uuid, date) from anon;
grant execute on function public.generate_course_schedule(uuid, date) to authenticated;

do $$
declare
  wrong_slot_count integer;
begin
  select count(*) into wrong_slot_count
  from public.master_sessions
  where curriculum_version = 'mvp-2026'
    and is_archived = false
    and (
      (class_type = 'VA' and weekday <> 'Friday')
      or (class_type = 'QA' and weekday <> 'Saturday')
      or (class_type = 'DI' and weekday <> 'Sunday')
      or class_type = 'ORIENTATION'
    );

  if wrong_slot_count <> 0 then
    raise exception 'Final curriculum assertion failed for % active rows', wrong_slot_count;
  end if;
end
$$;

commit;
