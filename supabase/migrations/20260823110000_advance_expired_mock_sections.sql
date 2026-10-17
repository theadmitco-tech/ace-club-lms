create or replace function public.advance_mock_attempt_timeout(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_attempt public.mock_attempts%rowtype;
  v_section public.mock_attempt_sections%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  select * into v_attempt
  from public.mock_attempts
  where id = p_attempt_id and student_id = v_student_id
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND' using errcode = '42501';
  end if;

  if v_attempt.status = 'completed' or v_attempt.current_section_index not between 0 and 2 then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'lock_version', v_attempt.lock_version,
      'status', v_attempt.status,
      'current_section_index', v_attempt.current_section_index,
      'break_status', v_attempt.break_status,
      'transitioned', false
    );
  end if;

  select * into v_section
  from public.mock_attempt_sections
  where attempt_id = p_attempt_id and sequence_index = v_attempt.current_section_index
  for update;

  if v_section.status = 'pending' then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'lock_version', v_attempt.lock_version,
      'status', v_attempt.status,
      'current_section_index', v_attempt.current_section_index,
      'break_status', v_attempt.break_status,
      'transitioned', false
    );
  end if;

  if v_section.status in ('active', 'review') then
    if v_section.deadline_at is null or v_section.deadline_at > v_now then
      raise exception 'SECTION_TIME_REMAINING' using errcode = '22023';
    end if;
    update public.mock_attempt_sections
    set status = 'timed_out', submitted_at = coalesce(submitted_at, v_now)
    where id = v_section.id;
  elsif v_section.status <> 'timed_out' then
    raise exception 'SECTION_NOT_TIMEOUT_ELIGIBLE' using errcode = '22023';
  end if;

  if v_attempt.current_section_index = 2 then
    update public.mock_attempts
    set status = 'completed', completed_at = coalesce(completed_at, v_now),
      current_section_index = 3, current_item_id = null, timing_boundary_at = null,
      lock_version = lock_version + 1, updated_at = v_now
    where id = p_attempt_id
    returning * into v_attempt;
  else
    update public.mock_attempts
    set current_section_index = current_section_index + 1,
      current_item_id = null, timing_boundary_at = null,
      lock_version = lock_version + 1, updated_at = v_now
    where id = p_attempt_id
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'lock_version', v_attempt.lock_version,
    'status', v_attempt.status,
    'current_section_index', v_attempt.current_section_index,
    'break_status', v_attempt.break_status,
    'transitioned', true
  );
end;
$$;

revoke all on function public.advance_mock_attempt_timeout(uuid) from public, anon;
grant execute on function public.advance_mock_attempt_timeout(uuid) to authenticated;
