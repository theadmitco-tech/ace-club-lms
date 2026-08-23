-- Pilot V3 Phase 2: curated mocks, immutable published versions and batch release.
create table public.mock_assessments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  purpose text not null default 'standard' check (purpose in ('standard','diagnostic')),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  draft_version integer not null default 1 check (draft_version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);
create table public.mock_assessment_sections (
  assessment_id uuid not null references public.mock_assessments(id) on delete restrict,
  section text not null check (section in ('quant','verbal','data_insights')),
  question_count integer not null check (question_count between 1 and 100),
  time_limit_seconds integer not null check (time_limit_seconds between 60 and 7200),
  display_order integer not null check (display_order between 1 and 3),
  primary key (assessment_id, section), unique (assessment_id, display_order)
);
create table public.mock_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.mock_assessments(id) on delete restrict,
  section text not null check (section in ('quant','verbal','data_insights')),
  question_revision_id uuid not null references public.mock_question_revisions(id) on delete restrict,
  display_order integer not null check (display_order > 0),
  stimulus_group_key text,
  unique (assessment_id, section, display_order), unique (assessment_id, question_revision_id)
);
create index mock_assessment_items_order_idx on public.mock_assessment_items(assessment_id, section, display_order);
create table public.mock_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.mock_assessments(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  published_at timestamptz not null default statement_timestamp(),
  published_by uuid not null references auth.users(id) on delete restrict,
  unique (assessment_id, version_number)
);
create table public.mock_assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.mock_assessment_versions(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  release_at timestamptz not null,
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  unique (assessment_version_id, course_id), check (due_at is null or due_at >= release_at)
);
create table public.mock_assessment_audit (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.mock_assessments(id) on delete restrict,
  version_id uuid references public.mock_assessment_versions(id) on delete restrict,
  assignment_id uuid references public.mock_assessment_assignments(id) on delete restrict,
  action text not null check (action in ('created','updated','published','assigned','retired')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);
alter table public.mock_assessments enable row level security;
alter table public.mock_assessment_sections enable row level security;
alter table public.mock_assessment_items enable row level security;
alter table public.mock_assessment_versions enable row level security;
alter table public.mock_assessment_assignments enable row level security;
alter table public.mock_assessment_audit enable row level security;
create policy "Admins manage mock assessments" on public.mock_assessments for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
create policy "Admins manage mock sections" on public.mock_assessment_sections for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
create policy "Admins manage mock items" on public.mock_assessment_items for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
create policy "Admins manage mock versions" on public.mock_assessment_versions for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
create policy "Admins manage mock assignments" on public.mock_assessment_assignments for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
create policy "Admins read mock audit" on public.mock_assessment_audit for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.is_active = true));
-- Phase 2 exposes only released assignments to active enrolled Students; attempts/player policies arrive in Phase 3.
create policy "Eligible Students view released mock assignments" on public.mock_assessment_assignments for select using (
  release_at <= statement_timestamp() and exists (
    select 1 from public.enrollments e join public.profiles p on p.id = e.user_id
    where e.user_id = auth.uid() and e.course_id = mock_assessment_assignments.course_id and p.role = 'student' and p.is_active = true
  )
);
create policy "Eligible Students view released mock versions" on public.mock_assessment_versions for select using (exists (
  select 1 from public.mock_assessment_assignments a where a.assessment_version_id = mock_assessment_versions.id and a.release_at <= statement_timestamp()
  and exists (select 1 from public.enrollments e join public.profiles p on p.id = e.user_id where e.user_id = auth.uid() and e.course_id = a.course_id and p.role = 'student' and p.is_active = true)
));
grant select on public.mock_assessment_versions, public.mock_assessment_assignments to authenticated;
