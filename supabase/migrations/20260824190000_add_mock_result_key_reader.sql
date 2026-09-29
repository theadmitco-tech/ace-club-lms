-- Pilot V3 Phase 4 correction: expose completed-attempt keys only to the server role.
create or replace function public.get_completed_mock_attempt_keys(p_attempt_id uuid)
returns table(attempt_item_id uuid, answer_json jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select key.attempt_item_id, key.answer_json
  from private.mock_attempt_keys key
  join public.mock_attempt_items item on item.id = key.attempt_item_id
  join public.mock_attempts attempt on attempt.id = item.attempt_id
  where attempt.id = p_attempt_id
    and attempt.status = 'completed';
$$;

revoke all on function public.get_completed_mock_attempt_keys(uuid) from public, anon, authenticated;
grant execute on function public.get_completed_mock_attempt_keys(uuid) to service_role;
