begin;

alter table public.master_materials
  add column if not exists question_count integer;

alter table public.materials
  add column if not exists question_count integer;

alter table public.materials
  add column if not exists master_material_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'master_materials_question_count_check'
      and conrelid = 'public.master_materials'::regclass
  ) then
    alter table public.master_materials
      add constraint master_materials_question_count_check
      check (
        question_count is null
        or (type = 'worksheet' and question_count > 0)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_question_count_check'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_question_count_check
      check (
        question_count is null
        or (type = 'worksheet' and question_count > 0)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_master_material_id_fkey'
      and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_master_material_id_fkey
      foreign key (master_material_id)
      references public.master_materials(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.link_copied_master_worksheet()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'worksheet' and new.file_url is not null and new.master_material_id is null then
    select master.id, master.question_count
      into new.master_material_id, new.question_count
    from public.master_materials as master
    where master.type = 'worksheet'
      and master.file_url = new.file_url
    order by master.created_at desc
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists link_copied_master_worksheet on public.materials;
create trigger link_copied_master_worksheet
before insert or update of file_url, type on public.materials
for each row execute function public.link_copied_master_worksheet();

create or replace function public.sync_master_worksheet_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.materials
  set question_count = new.question_count
  where master_material_id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_master_worksheet_count on public.master_materials;
create trigger sync_master_worksheet_count
after update of question_count on public.master_materials
for each row
when (new.type = 'worksheet')
execute function public.sync_master_worksheet_count();

revoke all on function public.link_copied_master_worksheet() from public;
revoke all on function public.sync_master_worksheet_count() from public;

update public.materials as material
set
  master_material_id = master.id,
  question_count = master.question_count
from public.master_materials as master
where material.type = 'worksheet'
  and material.file_url is not null
  and material.file_url = master.file_url
  and material.master_material_id is null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'course-materials',
  'course-materials',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
