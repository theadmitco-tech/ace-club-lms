begin;

do $$
declare
  v_actor_id constant uuid := 'befa6b3f-a71b-4175-bb3a-b3ee7afd2f19';
  v_assessment_id constant uuid := 'c8af4540-d653-4320-a780-1774baf3ba2e';
  v_assignment_id constant uuid := '618d2a28-3843-49fc-af63-a59f5ce77c51';
  v_old_version_id constant uuid := 'a85a3fdd-b57b-4692-929a-9b210d65de30';
  v_new_version_id constant uuid := '67707f60-1141-4243-be42-872baf9a6d1e';
  v_learning_old constant uuid := '31702ede-567c-4725-8c91-b0bd25ddca94';
  v_features_old constant uuid := '1e6ddc40-c14c-4df2-bce3-4fa91911d25f';
  v_learning_new constant uuid := '9e704cef-bea9-40cd-8fc5-9eafd6ad8339';
  v_features_new constant uuid := 'f8762a64-6552-4dc4-95e7-27e5806de998';
  v_row_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active
  ) then
    raise exception 'Rollback actor is not an active Production Admin';
  end if;

  if not exists (
    select 1 from public.mock_assessment_assignments
    where id = v_assignment_id and assessment_version_id = v_new_version_id
  ) then
    raise exception 'Assignment is not on the expected version 2';
  end if;

  if not exists (
    select 1 from public.mock_questions
    where current_published_revision_id = v_learning_new
  ) or not exists (
    select 1 from public.mock_questions
    where current_published_revision_id = v_features_new
  ) then
    raise exception 'Current question revisions do not match the release';
  end if;

  update public.mock_assessment_assignments
  set assessment_version_id = v_old_version_id
  where id = v_assignment_id and assessment_version_id = v_new_version_id;
  if not found then raise exception 'Assignment rollback failed'; end if;

  update public.mock_assessment_items
  set question_revision_id = case question_revision_id
    when v_learning_new then v_learning_old
    when v_features_new then v_features_old
  end
  where assessment_id = v_assessment_id
    and question_revision_id in (v_learning_new, v_features_new);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then raise exception 'Assessment rollback updated % rows, expected 2', v_row_count; end if;

  update public.mock_questions
  set current_published_revision_id = case current_published_revision_id
    when v_learning_new then v_learning_old
    when v_features_new then v_features_old
  end,
  current_draft_revision_id = null
  where current_published_revision_id in (v_learning_new, v_features_new);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then raise exception 'Question rollback updated % rows, expected 2', v_row_count; end if;

  update public.mock_question_revisions
  set status = 'retired'
  where id in (v_learning_new, v_features_new) and status = 'published';
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then raise exception 'Revision retirement updated % rows, expected 2', v_row_count; end if;

  update public.mock_assessments
  set status = 'published', updated_at = statement_timestamp()
  where id = v_assessment_id;

  insert into public.mock_assessment_audit (assessment_id, action, actor_id, details)
  values (v_assessment_id, 'updated', v_actor_id, jsonb_build_object(
    'reason', 'rollback passage-highlight release',
    'restoredQuestionRevisionIds', jsonb_build_array(v_learning_old, v_features_old),
    'retiredQuestionRevisionIds', jsonb_build_array(v_learning_new, v_features_new)
  ));
  insert into public.mock_assessment_audit (assessment_id, version_id, assignment_id, action, actor_id, details)
  values (v_assessment_id, v_old_version_id, v_assignment_id, 'assigned', v_actor_id, jsonb_build_object(
    'rolledBackFromVersionId', v_new_version_id
  ));

  raise notice 'Production highlight rollback complete: assignment restored to version 1';
end;
$$;

commit;
