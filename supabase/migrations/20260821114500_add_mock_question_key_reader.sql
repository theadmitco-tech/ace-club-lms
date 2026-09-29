create or replace function public.get_mock_question_keys(p_revision_ids uuid[])
returns table(question_revision_id uuid, answer_json jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select key.question_revision_id, key.answer_json
  from private.mock_question_keys key
  where key.question_revision_id = any(coalesce(p_revision_ids, '{}'::uuid[]));
$$;

revoke all on function public.get_mock_question_keys(uuid[]) from public, anon, authenticated;
grant execute on function public.get_mock_question_keys(uuid[]) to service_role;
