begin;

create table public.course_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  course_mode text not null,
  current_revision_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint course_templates_key_check
    check (template_key in ('full-course', 'cr-crash-course', 'rc-crash-course', 'di-crash-course')),
  constraint course_templates_name_check check (length(btrim(name)) between 1 and 120),
  constraint course_templates_mode_check check (course_mode in ('full', 'crash'))
);

create table public.course_template_revisions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.course_templates(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  title text not null check (length(btrim(title)) between 1 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  unique (template_id, revision_number)
);

alter table public.course_templates
  add constraint course_templates_current_revision_fkey
  foreign key (current_revision_id)
  references public.course_template_revisions(id)
  on delete restrict;

create table public.course_template_sections (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.course_template_revisions(id) on delete restrict,
  section_key text not null check (section_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 80),
  display_order integer not null check (display_order > 0),
  unique (revision_id, section_key),
  unique (revision_id, display_order),
  unique (revision_id, id)
);

create table public.course_template_events (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.course_template_revisions(id) on delete restrict,
  section_id uuid not null references public.course_template_sections(id) on delete restrict,
  event_key text not null check (event_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  event_type text not null check (event_type in ('live_class', 'mock', 'orientation', 'break', 'support', 'window')),
  relative_day integer not null check (relative_day >= 0),
  display_order integer not null check (display_order > 0),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 720),
  instructor text check (instructor is null or length(btrim(instructor)) between 1 and 100),
  venue text check (venue is null or length(btrim(venue)) between 1 and 200),
  reporting_time time,
  instructions text check (instructions is null or length(instructions) <= 2000),
  is_published_by_default boolean not null default true,
  source_master_session_id uuid references public.master_sessions(id) on delete restrict,
  unique (revision_id, event_key),
  unique (revision_id, display_order),
  unique (revision_id, id),
  constraint course_template_events_revision_section_fkey
    foreign key (revision_id, section_id)
    references public.course_template_sections(revision_id, id)
    on delete restrict
);

create table public.course_template_resources (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.course_template_revisions(id) on delete restrict,
  section_id uuid references public.course_template_sections(id) on delete restrict,
  event_id uuid references public.course_template_events(id) on delete restrict,
  resource_key text not null check (resource_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  resource_type text not null check (resource_type in ('starter', 'pre_read', 'worksheet')),
  resource_scope text not null check (resource_scope in ('template', 'section', 'event', 'standalone')),
  master_material_id uuid references public.master_materials(id) on delete restrict,
  display_order integer not null check (display_order > 0),
  constraint course_template_resources_scope_check check (
    (resource_scope in ('template', 'standalone') and section_id is null and event_id is null)
    or (resource_scope = 'section' and section_id is not null and event_id is null)
    or (resource_scope = 'event' and event_id is not null)
  ),
  unique (revision_id, resource_key),
  constraint course_template_resources_revision_section_fkey
    foreign key (revision_id, section_id)
    references public.course_template_sections(revision_id, id)
    on delete restrict,
  constraint course_template_resources_revision_event_fkey
    foreign key (revision_id, event_id)
    references public.course_template_events(revision_id, id)
    on delete restrict
);

create index course_template_revisions_template_id_idx
  on public.course_template_revisions(template_id, revision_number desc);
create index course_template_sections_revision_id_idx
  on public.course_template_sections(revision_id, display_order);
create index course_template_events_revision_id_idx
  on public.course_template_events(revision_id, display_order);
create index course_template_events_section_id_idx
  on public.course_template_events(section_id);
create index course_template_resources_revision_id_idx
  on public.course_template_resources(revision_id, display_order);
create index course_template_resources_section_id_idx
  on public.course_template_resources(section_id) where section_id is not null;
create index course_template_resources_event_id_idx
  on public.course_template_resources(event_id) where event_id is not null;
create unique index course_template_resources_master_material_id_key
  on public.course_template_resources(revision_id, master_material_id)
  where master_material_id is not null;

create or replace function public.enforce_course_template_current_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.current_revision_id is not null and not exists (
    select 1
    from public.course_template_revisions
    where id = new.current_revision_id and template_id = new.id
  ) then
    raise exception 'Current revision must belong to the same course template';
  end if;
  return new;
end;
$$;

create trigger enforce_course_template_current_revision
before insert or update of current_revision_id on public.course_templates
for each row execute function public.enforce_course_template_current_revision();

revoke all on function public.enforce_course_template_current_revision() from public, anon, authenticated;

alter table public.course_templates enable row level security;
alter table public.course_template_revisions enable row level security;
alter table public.course_template_sections enable row level security;
alter table public.course_template_events enable row level security;
alter table public.course_template_resources enable row level security;

create policy "Admins view course templates"
  on public.course_templates for select to authenticated
  using ((select public.is_portal_admin()));
create policy "Admins update course templates"
  on public.course_templates for update to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));

create policy "Admins view course template revisions"
  on public.course_template_revisions for select to authenticated
  using ((select public.is_portal_admin()));
create policy "Admins create course template revisions"
  on public.course_template_revisions for insert to authenticated
  with check ((select public.is_portal_admin()));

create policy "Admins view course template sections"
  on public.course_template_sections for select to authenticated
  using ((select public.is_portal_admin()));
create policy "Admins create course template sections"
  on public.course_template_sections for insert to authenticated
  with check ((select public.is_portal_admin()));

create policy "Admins view course template events"
  on public.course_template_events for select to authenticated
  using ((select public.is_portal_admin()));
create policy "Admins create course template events"
  on public.course_template_events for insert to authenticated
  with check ((select public.is_portal_admin()));

create policy "Admins view course template resources"
  on public.course_template_resources for select to authenticated
  using ((select public.is_portal_admin()));
create policy "Admins create course template resources"
  on public.course_template_resources for insert to authenticated
  with check ((select public.is_portal_admin()));

revoke all on table public.course_templates from anon;
revoke all on table public.course_template_revisions from anon;
revoke all on table public.course_template_sections from anon;
revoke all on table public.course_template_events from anon;
revoke all on table public.course_template_resources from anon;
grant select on table public.course_templates to authenticated;
grant update (current_revision_id, updated_at) on table public.course_templates to authenticated;
grant select, insert on table public.course_template_revisions to authenticated;
grant select, insert on table public.course_template_sections to authenticated;
grant select, insert on table public.course_template_events to authenticated;
grant select, insert on table public.course_template_resources to authenticated;

insert into public.course_templates (id, template_key, name, course_mode)
values
  ('10000000-0000-4000-8000-000000000001', 'full-course', 'Full Course', 'full'),
  ('10000000-0000-4000-8000-000000000002', 'cr-crash-course', 'Critical Reasoning Crash Course', 'crash'),
  ('10000000-0000-4000-8000-000000000003', 'rc-crash-course', 'Reading Comprehension Crash Course', 'crash'),
  ('10000000-0000-4000-8000-000000000004', 'di-crash-course', 'Data Interpretation Crash Course', 'crash');

insert into public.course_template_revisions (id, template_id, revision_number, title)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'Full Course'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1, 'Critical Reasoning Crash Course'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 1, 'Reading Comprehension Crash Course'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 1, 'Data Interpretation Crash Course');

insert into public.course_template_sections (id, revision_id, section_key, title, display_order)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'programme', 'Programme', 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'va', 'Verbal', 2),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'qa', 'Quant', 3),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'di', 'Data Insights', 4),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'cr', 'Critical Reasoning', 1),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'rc', 'Reading Comprehension', 1),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', 'di', 'Data Interpretation', 1);

insert into public.course_template_events (
  revision_id, section_id, event_key, title, event_type, relative_day,
  display_order, start_time, duration_minutes, instructor,
  is_published_by_default, source_master_session_id
)
select
  '20000000-0000-4000-8000-000000000001',
  case master.class_type
    when 'VA' then '30000000-0000-4000-8000-000000000002'::uuid
    when 'QA' then '30000000-0000-4000-8000-000000000003'::uuid
    when 'DI' then '30000000-0000-4000-8000-000000000004'::uuid
    else '30000000-0000-4000-8000-000000000001'::uuid
  end,
  master.curriculum_key,
  master.title,
  case master.class_type
    when 'MOCK' then 'mock'
    when 'ORIENTATION' then 'orientation'
    when 'BREAK' then 'break'
    when 'SUPPORT' then 'support'
    else 'live_class'
  end,
  master.week_number * 7 + case master.weekday when 'Friday' then 0 when 'Saturday' then 1 else 2 end,
  master.session_number,
  case master.weekday when 'Friday' then time '20:00' else time '10:00' end,
  case when master.class_type = 'ORIENTATION' then 60 else 120 end,
  master.instructor,
  true,
  master.id
from public.master_sessions as master
where master.curriculum_version = 'mvp-2026'
  and master.is_archived = false
order by master.session_number;

do $$
begin
  if (
    select count(*)
    from public.course_template_events
    where revision_id = '20000000-0000-4000-8000-000000000001'
  ) <> 31 then
    raise exception 'Full Course template requires exactly 31 active mvp-2026 Master events';
  end if;
end
$$;

with crash_events(template_revision_id, section_id, event_key, title, event_type, relative_day, display_order, instructor) as (
  values
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-01-boldface-inferences', 'CR (Boldface + Inferences)', 'live_class', 0, 1, 'Tanya'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-02-finding-assumptions', 'CR (Finding the Assumptions)', 'live_class', 1, 2, 'Tanya'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-03-strengthen-weaken', 'CR (Strengthen + Weaken the Conclusion)', 'live_class', 2, 3, 'Tanya'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-04-evaluate', 'CR (Evaluate the Conclusion)', 'live_class', 3, 4, 'Tanya'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-05-complete-paradoxes', 'CR (Complete the Argument + Paradoxes)', 'live_class', 4, 5, 'Tanya'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000005'::uuid, 'cr-06-mock', 'End-of-course Mock', 'mock', 5, 6, 'Tanya'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-01-mind-mapping-question-types', 'RC (Intro to Mind-Mapping + Question Types)', 'live_class', 0, 1, 'Unnati'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-02-primary-purpose', 'RC (Primary Purpose Qs)', 'live_class', 1, 2, 'Unnati'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-03-inference', 'RC (Inference Qs)', 'live_class', 2, 3, 'Unnati'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-04-point-of-view', 'RC (Point of View Qs)', 'live_class', 3, 4, 'Unnati'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-05-function-role', 'RC (Function & Role Qs)', 'live_class', 4, 5, 'Unnati'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000006'::uuid, 'rc-06-mock', 'End-of-course Mock', 'mock', 5, 6, 'Unnati'),
    ('20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000007'::uuid, 'di-01-ds-gi', 'DS + GI', 'live_class', 0, 1, 'Ishan'),
    ('20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000007'::uuid, 'di-02-ds-ta', 'DS + TA', 'live_class', 1, 2, 'Ishan'),
    ('20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000007'::uuid, 'di-03-tpa-msr', 'TPA + MSR', 'live_class', 2, 3, 'Ishan'),
    ('20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000007'::uuid, 'di-04-tpa-msr-non-math', 'TPA + MSR (Non-Math)', 'live_class', 3, 4, 'Ishan'),
    ('20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000007'::uuid, 'di-05-mock', 'End-of-course Mock', 'mock', 4, 5, 'Ishan')
)
insert into public.course_template_events (
  revision_id, section_id, event_key, title, event_type, relative_day,
  display_order, start_time, duration_minutes, instructor, is_published_by_default
)
select template_revision_id, section_id, event_key, title, event_type, relative_day,
  display_order, time '20:00', 60, instructor, true
from crash_events;

insert into public.course_template_resources (
  revision_id, event_id, resource_key, title, resource_type,
  resource_scope, master_material_id, display_order
)
select
  event.revision_id,
  event.id,
  'master-' || replace(material.id::text, '-', ''),
  material.title,
  material.type,
  'event',
  material.id,
  row_number() over (partition by event.id order by material.created_at, material.id)::integer
from public.course_template_events as event
join public.master_materials as material
  on material.master_session_id = event.source_master_session_id
where event.revision_id = '20000000-0000-4000-8000-000000000001'
  and material.type in ('pre_read', 'worksheet');

update public.course_templates
set current_revision_id = case template_key
  when 'full-course' then '20000000-0000-4000-8000-000000000001'::uuid
  when 'cr-crash-course' then '20000000-0000-4000-8000-000000000002'::uuid
  when 'rc-crash-course' then '20000000-0000-4000-8000-000000000003'::uuid
  when 'di-crash-course' then '20000000-0000-4000-8000-000000000004'::uuid
end;

create or replace function public.create_course_template_revision(
  p_template_id uuid,
  p_expected_revision_id uuid,
  p_title text,
  p_sections jsonb,
  p_events jsonb,
  p_resources jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_revision_id uuid;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_section jsonb;
  v_event jsonb;
  v_resource jsonb;
  v_section_id uuid;
  v_event_id uuid;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 120 then
    raise exception 'Template title is required and must be at most 120 characters';
  end if;
  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) < 1 then
    raise exception 'At least one Section is required';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 then
    raise exception 'At least one event is required';
  end if;
  if jsonb_array_length(p_sections) > 20 or jsonb_array_length(p_events) > 100
    or jsonb_array_length(p_resources) > 300 then
    raise exception 'Template structure exceeds the supported limit';
  end if;

  select current_revision_id
  into v_current_revision_id
  from public.course_templates
  where id = p_template_id
  for update;

  if not found then
    raise exception 'Template not found';
  end if;
  if v_current_revision_id is distinct from p_expected_revision_id then
    raise exception 'Template changed after it was opened. Reload before saving.' using errcode = '40001';
  end if;

  select coalesce(max(revision_number), 0) + 1
  into v_revision_number
  from public.course_template_revisions
  where template_id = p_template_id;

  insert into public.course_template_revisions (
    id, template_id, revision_number, title, created_by
  ) values (
    v_revision_id, p_template_id, v_revision_number, btrim(p_title), auth.uid()
  );

  for v_section in select value from jsonb_array_elements(p_sections)
  loop
    insert into public.course_template_sections (
      revision_id, section_key, title, display_order
    ) values (
      v_revision_id,
      v_section->>'key',
      btrim(v_section->>'title'),
      (v_section->>'displayOrder')::integer
    );
  end loop;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    select id into v_section_id
    from public.course_template_sections
    where revision_id = v_revision_id and section_key = v_event->>'sectionKey';
    if v_section_id is null then
      raise exception 'Event % refers to an unknown Section', coalesce(v_event->>'title', '');
    end if;

    insert into public.course_template_events (
      revision_id, section_id, event_key, title, event_type, relative_day,
      display_order, start_time, duration_minutes, instructor, venue,
      reporting_time, instructions, is_published_by_default, source_master_session_id
    ) values (
      v_revision_id,
      v_section_id,
      v_event->>'key',
      btrim(v_event->>'title'),
      v_event->>'eventType',
      (v_event->>'relativeDay')::integer,
      (v_event->>'displayOrder')::integer,
      (v_event->>'startTime')::time,
      (v_event->>'durationMinutes')::integer,
      nullif(btrim(v_event->>'instructor'), ''),
      nullif(btrim(v_event->>'venue'), ''),
      nullif(v_event->>'reportingTime', '')::time,
      nullif(v_event->>'instructions', ''),
      coalesce((v_event->>'publishedByDefault')::boolean, true),
      nullif(v_event->>'sourceMasterSessionId', '')::uuid
    );
  end loop;

  for v_resource in select value from jsonb_array_elements(p_resources)
  loop
    select id into v_section_id
    from public.course_template_sections
    where revision_id = v_revision_id and section_key = v_resource->>'sectionKey';
    select id into v_event_id
    from public.course_template_events
    where revision_id = v_revision_id and event_key = v_resource->>'eventKey';

    insert into public.course_template_resources (
      revision_id, section_id, event_id, resource_key, title, resource_type,
      resource_scope, master_material_id, display_order
    ) values (
      v_revision_id,
      v_section_id,
      v_event_id,
      v_resource->>'key',
      btrim(v_resource->>'title'),
      v_resource->>'resourceType',
      v_resource->>'scope',
      nullif(v_resource->>'masterMaterialId', '')::uuid,
      (v_resource->>'displayOrder')::integer
    );
  end loop;

  update public.course_templates
  set current_revision_id = v_revision_id, updated_at = statement_timestamp()
  where id = p_template_id;

  return v_revision_id;
end;
$$;

revoke all on function public.create_course_template_revision(uuid, uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_course_template_revision(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;

commit;
