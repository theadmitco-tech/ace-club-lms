-- Session feedback may also arrive from the approved Tally form. The server verifies the Tally
-- signature and a signed link that names the student and obligation before calling this function;
-- the function is service-only and never trusts browser-supplied identities.
-- Existing LMS submissions, obligations and audit history are unchanged.
begin;

alter table public.v2_session_feedback drop constraint if exists v2_session_feedback_provider_check;
alter table public.v2_session_feedback add constraint v2_session_feedback_provider_check check (provider in ('lms', 'tally'));

create or replace function public.record_v2_tally_feedback(p_obligation_id uuid, p_student_id uuid, p_submission_id text, p_response jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.v2_feedback_obligations%rowtype;
  v_saved public.v2_session_feedback%rowtype;
  v_reference text;
begin
  if p_submission_id is null or p_submission_id !~ '^[A-Za-z0-9_-]{1,120}$' then raise exception 'Invalid Tally submission' using errcode = '22023'; end if;
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 20000 then raise exception 'Invalid Tally response' using errcode = '22023'; end if;
  v_reference := 'tally:' || p_submission_id;

  perform 1 from public.profiles where id = p_student_id and is_active for update;
  if not found then raise exception 'Feedback owner unavailable' using errcode = '42501'; end if;
  select * into o from public.v2_feedback_obligations where id = p_obligation_id and student_id = p_student_id for update;
  if not found then raise exception 'Feedback obligation unavailable' using errcode = '42501'; end if;

  -- A repeated delivery of the same submission is a no-op.
  select * into v_saved from public.v2_session_feedback where confirmation_reference = v_reference;
  if found then
    if v_saved.student_id <> p_student_id then raise exception 'Tally submission belongs to another student' using errcode = '42501'; end if;
    return jsonb_build_object('submitted', true, 'replayed', true);
  end if;

  -- One submission per student and session; a later form submission for an answered session is ignored.
  select * into v_saved from public.v2_session_feedback
  where student_id = p_student_id and session_key = o.session_key
    and public.v2_curriculum_identity(batch_id, session_key) = public.v2_curriculum_identity(o.batch_id, o.session_key);
  if not found then
    insert into public.v2_session_feedback(student_id, batch_id, session_key, request_id, confirmation_reference, provider, response)
    values (p_student_id, o.batch_id, o.session_key, md5(v_reference)::uuid, v_reference, 'tally', p_response)
    returning * into v_saved;
  end if;
  update public.v2_feedback_obligations set feedback_id = v_saved.id
  where student_id = p_student_id and session_key = o.session_key and feedback_id is null
    and public.v2_curriculum_identity(batch_id, session_key) = public.v2_curriculum_identity(o.batch_id, o.session_key);
  return jsonb_build_object('submitted', true, 'replayed', false);
end; $$;

revoke all on function public.record_v2_tally_feedback(uuid, uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.record_v2_tally_feedback(uuid, uuid, text, jsonb) to service_role;

commit;
