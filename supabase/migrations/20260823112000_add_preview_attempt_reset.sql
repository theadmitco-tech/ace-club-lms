create or replace function public.reset_mock_attempt_for_testing(
  p_attempt_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.mock_attempts
    where id = p_attempt_id and student_id = p_student_id
  ) then
    raise exception 'ATTEMPT_NOT_FOUND' using errcode = '42501';
  end if;

  update public.mock_attempts set current_item_id = null where id = p_attempt_id;
  delete from private.mock_attempt_keys
  where attempt_item_id in (select id from public.mock_attempt_items where attempt_id = p_attempt_id);
  delete from public.mock_operation_receipts where attempt_id = p_attempt_id;
  delete from public.mock_review_edits where attempt_id = p_attempt_id;
  delete from public.mock_responses where attempt_id = p_attempt_id;
  delete from public.mock_attempt_items where attempt_id = p_attempt_id;
  delete from public.mock_attempt_sections where attempt_id = p_attempt_id;
  delete from public.mock_attempts where id = p_attempt_id and student_id = p_student_id;
end;
$$;

revoke all on function public.reset_mock_attempt_for_testing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reset_mock_attempt_for_testing(uuid, uuid) to service_role;
