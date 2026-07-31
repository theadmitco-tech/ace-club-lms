begin;

alter table public.master_sessions
  add column if not exists curriculum_key text,
  add column if not exists week_number integer,
  add column if not exists weekday text,
  add column if not exists class_type text,
  add column if not exists instructor text,
  add column if not exists curriculum_version text,
  add column if not exists is_archived boolean not null default false;

-- Production has a linked 16-session template. Preserve it as history while
-- excluding it from current curriculum and cohort-generation workflows.
update public.master_sessions
set
  curriculum_version = coalesce(curriculum_version, 'legacy-v1'),
  is_archived = true
where curriculum_key is null;

create unique index if not exists master_sessions_curriculum_key_key
  on public.master_sessions (curriculum_key);

drop index if exists public.master_sessions_session_number_key;

create unique index if not exists master_sessions_version_session_number_key
  on public.master_sessions (curriculum_version, session_number);

with curriculum (
  session_number, curriculum_key, week_number, weekday,
  title, class_type, instructor
) as (
  values
    (1,  'w00-fri-mock-1-diagnostic', 0, 'Friday', 'Mock 1 (Diagnostic)', 'MOCK', null),
    (2,  'w00-sat-individual-calls', 0, 'Saturday', 'Individual calls to analyse', 'SUPPORT', null),
    (3,  'w00-sun-individual-calls', 0, 'Sunday', 'Individual calls to analyse', 'SUPPORT', null),
    (4,  'w01-fri-orientation', 1, 'Friday', 'Orientation - 1hr', 'ORIENTATION', null),
    (5,  'w01-sat-verbal-1', 1, 'Saturday', 'Verbal 1', 'VA', 'Tanya'),
    (6,  'w01-sun-quant-1', 1, 'Sunday', 'Quant 1', 'QA', 'Unnati'),
    (7,  'w02-fri-di-1', 2, 'Friday', 'DI 1', 'DI', 'Ishan'),
    (8,  'w02-sat-verbal-2', 2, 'Saturday', 'Verbal 2', 'VA', 'Tanya'),
    (9,  'w02-sun-quant-2', 2, 'Sunday', 'Quant 2', 'QA', 'Unnati'),
    (10, 'w03-fri-di-2', 3, 'Friday', 'DI 2', 'DI', 'Ishan'),
    (11, 'w03-sat-verbal-3', 3, 'Saturday', 'Verbal 3', 'VA', 'Tanya'),
    (12, 'w03-sun-quant-3', 3, 'Sunday', 'Quant 3', 'QA', 'Unnati'),
    (13, 'w04-fri-break', 4, 'Friday', 'Break', 'BREAK', null),
    (14, 'w04-sat-mock-2', 4, 'Saturday', 'Mock 2', 'MOCK', null),
    (15, 'w04-sun-analysis-call', 4, 'Sunday', 'Group call: How to analyse mocks + individual calls over the week', 'SUPPORT', null),
    (16, 'w05-fri-di-3', 5, 'Friday', 'DI 3', 'DI', 'Ishan'),
    (17, 'w05-sat-verbal-4', 5, 'Saturday', 'Verbal 4', 'VA', 'Tanya'),
    (18, 'w05-sun-quant-4', 5, 'Sunday', 'Quant 4', 'QA', 'Unnati'),
    (19, 'w06-fri-di-4', 6, 'Friday', 'DI 4', 'DI', 'Ishan'),
    (20, 'w06-sat-verbal-5', 6, 'Saturday', 'Verbal 5', 'VA', 'Tanya'),
    (21, 'w06-sun-quant-5', 6, 'Sunday', 'Quant 5', 'QA', 'Unnati'),
    (22, 'w07-fri-di-5', 7, 'Friday', 'DI 5', 'DI', 'Ishan'),
    (23, 'w07-sat-verbal-6', 7, 'Saturday', 'Verbal 6', 'VA', 'Tanya'),
    (24, 'w07-sun-quant-6', 7, 'Sunday', 'Quant 6', 'QA', 'Unnati'),
    (25, 'w08-fri-break', 8, 'Friday', 'Break', 'BREAK', null),
    (26, 'w08-sat-mock-3', 8, 'Saturday', 'Mock 3', 'MOCK', null),
    (27, 'w08-sun-individual-calls', 8, 'Sunday', 'Individual calls over the week', 'SUPPORT', null),
    (28, 'w10-sat-mock', 10, 'Saturday', 'Mock session', 'MOCK', null),
    (29, 'w12-sat-mock', 12, 'Saturday', 'Mock session', 'MOCK', null),
    (30, 'w14-sat-mock', 14, 'Saturday', 'Mock session', 'MOCK', null),
    (31, 'w16-sat-mock', 16, 'Saturday', 'Mock session', 'MOCK', null)
)
insert into public.master_sessions (
  session_number, curriculum_key, week_number, weekday,
  title, class_type, instructor, curriculum_version, is_archived
)
select curriculum.*, 'mvp-2026', false from curriculum
on conflict (curriculum_key) do update set
  session_number = excluded.session_number,
  week_number = excluded.week_number,
  weekday = excluded.weekday,
  title = excluded.title,
  class_type = excluded.class_type,
  instructor = excluded.instructor,
  curriculum_version = excluded.curriculum_version,
  is_archived = excluded.is_archived;

commit;
