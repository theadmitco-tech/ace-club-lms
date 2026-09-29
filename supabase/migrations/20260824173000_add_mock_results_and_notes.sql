-- Pilot V3 Phase 4: derived results metadata and Student-owned question notes.
begin;

create table public.mock_attempt_item_notes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  attempt_item_id uuid not null references public.mock_attempt_items(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (attempt_item_id, student_id)
);

create index mock_attempt_item_notes_attempt_idx on public.mock_attempt_item_notes(attempt_id, attempt_item_id);
create index mock_attempt_item_notes_student_idx on public.mock_attempt_item_notes(student_id, updated_at desc);

create or replace function private.enforce_mock_attempt_item_note_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.mock_attempts%rowtype;
begin
  select a.* into v_attempt
  from public.mock_attempts a
  join public.mock_attempt_items i on i.attempt_id = a.id
  where a.id = new.attempt_id and i.id = new.attempt_item_id;
  if not found or v_attempt.student_id <> new.student_id or v_attempt.status <> 'completed' then
    raise exception 'NOTE_ATTEMPT_MISMATCH' using errcode = '42501';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger enforce_mock_attempt_item_note_owner
before insert or update on public.mock_attempt_item_notes
for each row execute function private.enforce_mock_attempt_item_note_owner();
revoke all on function private.enforce_mock_attempt_item_note_owner() from public, anon, authenticated;

alter table public.mock_attempt_item_notes enable row level security;
create policy "Students read own mock notes" on public.mock_attempt_item_notes for select
using (student_id = (select auth.uid()));
create policy "Students create own mock notes" on public.mock_attempt_item_notes for insert
with check (student_id = (select auth.uid()));
create policy "Students edit own mock notes" on public.mock_attempt_item_notes for update
using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "Admins read mock notes" on public.mock_attempt_item_notes for select
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.is_active = true));
grant select, insert, update on public.mock_attempt_item_notes to authenticated;

create or replace function private.add_mock_attempt_taxonomy_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic text;
  v_subtopic text;
begin
  select topic.label, subtopic.label into v_topic, v_subtopic
  from public.mock_question_revisions q
  join public.mock_topics topic on topic.id = q.topic_id
  left join public.mock_topics subtopic on subtopic.id = q.subtopic_id
  where q.id = new.question_revision_id;
  new.question_snapshot := new.question_snapshot || jsonb_build_object('topic', v_topic, 'subtopic', v_subtopic);
  return new;
end;
$$;

create trigger add_mock_attempt_taxonomy_snapshot
before insert on public.mock_attempt_items
for each row execute function private.add_mock_attempt_taxonomy_snapshot();
revoke all on function private.add_mock_attempt_taxonomy_snapshot() from public, anon, authenticated;

update public.mock_attempt_items i
set question_snapshot = i.question_snapshot || jsonb_build_object('topic', topic.label, 'subtopic', subtopic.label)
from public.mock_question_revisions q
join public.mock_topics topic on topic.id = q.topic_id
left join public.mock_topics subtopic on subtopic.id = q.subtopic_id
where q.id = i.question_revision_id
  and not (i.question_snapshot ? 'topic');

commit;
