-- Practice logs for worksheets in V2 courses. A V2 worksheet item keeps the file address of the
-- worksheet it was transferred from, which identifies the master worksheet and its question rows.
-- Students may read and save only logs for worksheets they can currently open in their V2 course
-- (enrollment, active access, publication and feedback locks all apply). Older practice logs,
-- course enrollments and worksheet questions are unchanged.
begin;

create table public.v2_worksheet_logs (
  student_id uuid not null references public.profiles(id),
  batch_id uuid not null references public.v2_course_batches(id),
  session_key uuid not null,
  item_key uuid not null,
  question_id uuid not null references public.master_worksheet_questions(id) on delete cascade,
  status text check (status in ('done', 'review')),
  time_taken_seconds integer check (time_taken_seconds is null or time_taken_seconds >= 0),
  comment text check (comment is null or char_length(comment) <= 2000),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (student_id, batch_id, session_key, item_key, question_id)
);
alter table public.v2_worksheet_logs enable row level security;
revoke all on table public.v2_worksheet_logs from public, anon, authenticated;

-- The open worksheet item for the caller and the master worksheet behind it (null master when none).
create or replace function public.v2_my_worksheet_source(p_batch_id uuid, p_session_key uuid, p_item_key uuid)
returns table (master_material_id uuid, title text, session_title text, section text, url text)
language plpgsql stable security definer set search_path = '' as $$
declare v_course jsonb; v_session jsonb; v_item jsonb;
begin
  v_course := public.get_my_v2_published_course(p_batch_id);
  if v_course is null then raise exception 'Worksheet unavailable' using errcode = '42501'; end if;
  select s, item into v_session, v_item
  from jsonb_array_elements(v_course->'sessions') s
  cross join lateral jsonb_each(coalesce(s->'content', '{}'::jsonb)) kind
  cross join lateral jsonb_array_elements(case when jsonb_typeof(kind.value) = 'array' then kind.value else '[]'::jsonb end) item
  where s->>'key' = p_session_key::text and item->>'key' = p_item_key::text
  limit 1;
  if v_item is null then raise exception 'Worksheet unavailable' using errcode = '42501'; end if;
  return query
  select coalesce(
      (select m.master_material_id from public.materials m where m.file_url = v_item->>'url' and m.type = 'worksheet' and m.master_material_id is not null limit 1),
      (select mm.id from public.master_materials mm where mm.file_url = v_item->>'url' and mm.type = 'worksheet' limit 1)),
    coalesce(nullif(btrim(v_item->>'title'), ''), 'Worksheet'), v_session->>'title', v_session->>'section', v_item->>'url';
end; $$;

create or replace function public.get_my_v2_worksheet_log(p_batch_id uuid, p_session_key uuid, p_item_key uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_source record;
begin
  select * into v_source from public.v2_my_worksheet_source(p_batch_id, p_session_key, p_item_key);
  return jsonb_build_object('title', v_source.title, 'sessionTitle', v_source.session_title, 'section', v_source.section, 'url', v_source.url,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question_number', q.question_number, 'status', l.status,
      'time_taken_seconds', l.time_taken_seconds, 'comment', l.comment,
      'updated_at', case when l.status is not null or l.time_taken_seconds is not null or nullif(btrim(l.comment), '') is not null then l.updated_at end)
      order by q.question_number)
      from public.master_worksheet_questions q
      left join public.v2_worksheet_logs l on l.student_id = auth.uid() and l.batch_id = p_batch_id and l.session_key = p_session_key
        and l.item_key = p_item_key and l.question_id = q.id
      where q.master_material_id = v_source.master_material_id), '[]'::jsonb));
end; $$;

create or replace function public.update_my_v2_worksheet_log(p_batch_id uuid, p_session_key uuid, p_item_key uuid, p_question_id uuid,
  p_status text, p_time_taken_seconds integer, p_comment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_source record; v_saved public.v2_worksheet_logs%rowtype;
begin
  if p_status is not null and p_status not in ('done', 'review') then raise exception 'Invalid tracker status' using errcode = '22023'; end if;
  if p_time_taken_seconds is not null and p_time_taken_seconds < 0 then raise exception 'Invalid time taken' using errcode = '22023'; end if;
  if p_comment is not null and char_length(p_comment) > 2000 then raise exception 'Comment is too long' using errcode = '22023'; end if;
  select * into v_source from public.v2_my_worksheet_source(p_batch_id, p_session_key, p_item_key);
  perform 1 from public.master_worksheet_questions where id = p_question_id and master_material_id = v_source.master_material_id;
  if not found then raise exception 'Question log access required' using errcode = '42501'; end if;
  insert into public.v2_worksheet_logs(student_id, batch_id, session_key, item_key, question_id, status, time_taken_seconds, comment)
  values (auth.uid(), p_batch_id, p_session_key, p_item_key, p_question_id, p_status, p_time_taken_seconds, nullif(btrim(p_comment), ''))
  on conflict (student_id, batch_id, session_key, item_key, question_id) do update
    set status = coalesce(excluded.status, public.v2_worksheet_logs.status), time_taken_seconds = excluded.time_taken_seconds,
        comment = excluded.comment, updated_at = statement_timestamp()
  returning * into v_saved;
  return jsonb_build_object('id', v_saved.question_id, 'status', v_saved.status, 'time_taken_seconds', v_saved.time_taken_seconds,
    'comment', v_saved.comment, 'updated_at', v_saved.updated_at);
end; $$;

revoke all on function public.v2_my_worksheet_source(uuid, uuid, uuid), public.get_my_v2_worksheet_log(uuid, uuid, uuid),
  public.update_my_v2_worksheet_log(uuid, uuid, uuid, uuid, text, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.get_my_v2_worksheet_log(uuid, uuid, uuid),
  public.update_my_v2_worksheet_log(uuid, uuid, uuid, uuid, text, integer, text) to authenticated;

commit;
