begin;

create table if not exists public.master_worksheet_questions (
  id uuid primary key default gen_random_uuid(),
  master_material_id uuid not null
    references public.master_materials(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  created_at timestamptz not null default now(),
  unique (master_material_id, question_number)
);

alter table public.master_worksheet_questions enable row level security;

drop policy if exists "Admins manage master worksheet questions"
  on public.master_worksheet_questions;

create policy "Admins manage master worksheet questions"
  on public.master_worksheet_questions
  for all
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists "Enrolled users view master worksheet questions"
  on public.master_worksheet_questions;

create policy "Enrolled users view master worksheet questions"
  on public.master_worksheet_questions
  for select
  using (
    public.is_active_portal_user()
    and exists (
      select 1
      from public.enrollments
      where user_id = auth.uid()
    )
  );

create or replace function public.sync_master_worksheet_question_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.master_worksheet_questions
  where master_material_id = new.id
    and (
      new.type <> 'worksheet'
      or new.question_count is null
      or question_number > new.question_count
    );

  if new.type = 'worksheet' and new.question_count is not null then
    insert into public.master_worksheet_questions (
      master_material_id,
      question_number
    )
    select new.id, generate_series(1, new.question_count)
    on conflict (master_material_id, question_number) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_master_worksheet_question_rows() from public;

drop trigger if exists sync_master_worksheet_question_rows
  on public.master_materials;

create trigger sync_master_worksheet_question_rows
after insert or update of type, question_count
on public.master_materials
for each row execute function public.sync_master_worksheet_question_rows();

insert into public.master_worksheet_questions (
  master_material_id,
  question_number
)
select
  material.id,
  generate_series(1, material.question_count)
from public.master_materials material
where material.type = 'worksheet'
  and material.question_count is not null
on conflict (master_material_id, question_number) do nothing;

commit;
