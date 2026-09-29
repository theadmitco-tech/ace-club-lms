begin;

-- Emergency application rollback: hide the material-backed catalog while preserving
-- every generated question and Student log row for a later safe re-enable.
create or replace view public.worksheet_question_catalog
with (security_invoker = true)
as
select
  material.id as material_id,
  question.id as question_id,
  question.question_number
from public.materials as material
join public.master_worksheet_questions as question
  on question.master_material_id = material.master_material_id
where material.type = 'worksheet'
  and material.master_material_id is not null;

revoke all on table public.worksheet_question_catalog from public, anon, authenticated;

create or replace function public.update_student_question_log(
  p_material_id uuid,
  p_question_id uuid,
  p_status text,
  p_time_taken_seconds integer,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  saved_log public.student_question_logs%rowtype;
begin
  if p_status is not null and p_status not in ('done', 'review') then
    raise exception 'Invalid tracker status' using errcode = '22023';
  end if;

  if p_time_taken_seconds is not null and p_time_taken_seconds < 0 then
    raise exception 'Invalid time taken' using errcode = '22023';
  end if;

  if p_comment is not null and char_length(p_comment) > 2000 then
    raise exception 'Comment is too long' using errcode = '22023';
  end if;

  update public.student_question_logs as log
  set
    status = coalesce(p_status, log.status),
    time_taken_seconds = p_time_taken_seconds,
    comment = nullif(btrim(p_comment), '')
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  where log.user_id = student_id
    and log.material_id = p_material_id
    and log.master_question_id = p_question_id
    and log.material_id = material.id
    and log.session_id = session.id
    and log.course_id = session.course_id
    and material.type = 'worksheet'
    and material.available_from <= statement_timestamp()
    and session.is_published = true
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = student_id
        and profile.role = 'student'
        and profile.is_active = true
    )
    and exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = student_id
        and enrollment.course_id = session.course_id
    )
  returning log.* into saved_log;

  if saved_log.id is null then
    raise exception 'Question log access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', saved_log.master_question_id,
    'status', saved_log.status,
    'time_taken_seconds', saved_log.time_taken_seconds,
    'comment', saved_log.comment,
    'updated_at', saved_log.updated_at
  );
end;
$$;

revoke all on function public.update_student_question_log(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.update_student_question_log(uuid, uuid, text, integer, text) to authenticated;

commit;
