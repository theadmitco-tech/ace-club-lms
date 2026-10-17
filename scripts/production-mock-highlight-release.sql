begin;

do $$
declare
  v_actor_id constant uuid := 'befa6b3f-a71b-4175-bb3a-b3ee7afd2f19';
  v_assessment_id constant uuid := 'c8af4540-d653-4320-a780-1774baf3ba2e';
  v_old_version_id constant uuid := 'a85a3fdd-b57b-4692-929a-9b210d65de30';
  v_assignment_id constant uuid := '618d2a28-3843-49fc-af63-a59f5ce77c51';
  v_learning_old constant uuid := '31702ede-567c-4725-8c91-b0bd25ddca94';
  v_features_old constant uuid := '1e6ddc40-c14c-4df2-bce3-4fa91911d25f';
  v_learning_new uuid := gen_random_uuid();
  v_features_new uuid := gen_random_uuid();
  v_new_version_id uuid := gen_random_uuid();
  v_snapshot jsonb;
  v_attempt_count integer;
  v_completed_count integer;
  v_row_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active
  ) then
    raise exception 'Release actor is not an active Production Admin';
  end if;

  select count(*), count(*) filter (where status = 'completed')
  into v_attempt_count, v_completed_count
  from public.mock_attempts
  where assignment_id = v_assignment_id;
  if v_attempt_count <> 2 or v_completed_count <> 2 then
    raise exception 'Attempt precondition failed: expected exactly two completed attempts, found % total / % completed', v_attempt_count, v_completed_count;
  end if;

  if not exists (
    select 1 from public.mock_assessment_assignments
    where id = v_assignment_id
      and assessment_version_id = v_old_version_id
      and course_id = '4763d048-9cbe-4488-95dc-3df25d873299'::uuid
      and release_at = '2026-09-25T11:00:00Z'::timestamptz
      and due_at is null
  ) then
    raise exception 'Assignment precondition failed';
  end if;

  if exists (
    select 1 from public.mock_assessment_versions
    where assessment_id = v_assessment_id and version_number >= 2
  ) then
    raise exception 'Assessment already has version 2 or later';
  end if;

  if not exists (
    select 1
    from public.mock_questions q
    join public.mock_question_revisions r on r.id = q.current_published_revision_id
    where q.source_external_id = 'Q-RC-9628e8b8-7fd9-4ab0-8f86-bb25ab02d3e2'
      and r.id = v_learning_old and r.status = 'published'
      and not (r.interaction_json ? 'stimulus_display_config')
  ) or not exists (
    select 1
    from public.mock_questions q
    join public.mock_question_revisions r on r.id = q.current_published_revision_id
    where q.source_external_id = 'Q-RC-484bf9ff-c704-42d8-8ceb-f824845eed98'
      and r.id = v_features_old and r.status = 'published'
      and not (r.interaction_json ? 'stimulus_display_config')
  ) then
    raise exception 'Question revision precondition failed';
  end if;

  insert into public.mock_question_revisions (
    id, question_id, revision_number, status, import_state, section, question_type, response_type,
    topic_id, subtopic_id, difficulty, stem_json, interaction_json, stimulus_revision_id,
    stimulus_group_order, source_reference, content_fingerprint, answer_confirmation,
    answer_check, asset_check, validation_status, validation_notes, import_id, created_by
  )
  select
    v_learning_new, question_id, 2, 'draft', 'ready', section, question_type, response_type,
    topic_id, subtopic_id, difficulty, stem_json,
    interaction_json || '{"stimulus_display_config":{"highlights":[{"block_id":"p1","text":"the learning curve"}]}}'::jsonb,
    stimulus_revision_id, stimulus_group_order, source_reference,
    '8b22223d22c5e252b97231aaa9ac4c8c6f656fb69a5ced2a996b91a77efa2d26',
    answer_confirmation, answer_check, asset_check, validation_status,
    'Production revision preserving canonical workbook passage highlight', null, v_actor_id
  from public.mock_question_revisions where id = v_learning_old;

  insert into public.mock_question_revisions (
    id, question_id, revision_number, status, import_state, section, question_type, response_type,
    topic_id, subtopic_id, difficulty, stem_json, interaction_json, stimulus_revision_id,
    stimulus_group_order, source_reference, content_fingerprint, answer_confirmation,
    answer_check, asset_check, validation_status, validation_notes, import_id, created_by
  )
  select
    v_features_new, question_id, 2, 'draft', 'ready', section, question_type, response_type,
    topic_id, subtopic_id, difficulty, stem_json,
    interaction_json || '{"stimulus_display_config":{"highlights":[{"block_id":"p1","text":"nonfunctional features"}]}}'::jsonb,
    stimulus_revision_id, stimulus_group_order, source_reference,
    '10040391e9392e7222b6b28d585744fca27e165890b752fa53643fcf8c9a3604',
    answer_confirmation, answer_check, asset_check, validation_status,
    'Production revision preserving canonical workbook passage highlight', null, v_actor_id
  from public.mock_question_revisions where id = v_features_old;

  insert into public.mock_question_options (question_revision_id, response_slot_id, option_id, display_order, content_json)
  select v_learning_new, response_slot_id, option_id, display_order, content_json
  from public.mock_question_options where question_revision_id = v_learning_old;
  insert into public.mock_question_options (question_revision_id, response_slot_id, option_id, display_order, content_json)
  select v_features_new, response_slot_id, option_id, display_order, content_json
  from public.mock_question_options where question_revision_id = v_features_old;

  insert into private.mock_question_keys (question_revision_id, answer_json, explanation_json)
  select v_learning_new, answer_json, explanation_json
  from private.mock_question_keys where question_revision_id = v_learning_old;
  insert into private.mock_question_keys (question_revision_id, answer_json, explanation_json)
  select v_features_new, answer_json, explanation_json
  from private.mock_question_keys where question_revision_id = v_features_old;

  insert into public.mock_question_media (question_revision_id, media_id, usage)
  select v_learning_new, media_id, usage from public.mock_question_media where question_revision_id = v_learning_old;
  insert into public.mock_question_media (question_revision_id, media_id, usage)
  select v_features_new, media_id, usage from public.mock_question_media where question_revision_id = v_features_old;

  update public.mock_question_revisions
  set status = 'published', published_at = statement_timestamp()
  where id in (v_learning_new, v_features_new);

  update public.mock_questions
  set current_published_revision_id = case current_published_revision_id
    when v_learning_old then v_learning_new
    when v_features_old then v_features_new
  end,
  current_draft_revision_id = null
  where current_published_revision_id in (v_learning_old, v_features_old);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then raise exception 'Question current-revision switch updated % rows, expected 2', v_row_count; end if;

  update public.mock_assessment_items
  set question_revision_id = case question_revision_id
    when v_learning_old then v_learning_new
    when v_features_old then v_features_new
  end
  where assessment_id = v_assessment_id
    and question_revision_id in (v_learning_old, v_features_old);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then raise exception 'Assessment item update updated % rows, expected 2', v_row_count; end if;

  select replace(
    replace(snapshot::text, v_learning_old::text, v_learning_new::text),
    v_features_old::text, v_features_new::text
  )::jsonb into v_snapshot
  from public.mock_assessment_versions where id = v_old_version_id;

  insert into public.mock_assessment_versions (
    id, assessment_id, version_number, snapshot, published_by
  ) values (
    v_new_version_id, v_assessment_id, 2, v_snapshot, v_actor_id
  );

  update public.mock_assessments
  set status = 'published', draft_version = 2, updated_at = statement_timestamp()
  where id = v_assessment_id;

  update public.mock_assessment_assignments
  set assessment_version_id = v_new_version_id
  where id = v_assignment_id and assessment_version_id = v_old_version_id;
  if not found then raise exception 'Assignment version switch failed'; end if;

  insert into public.mock_assessment_audit (assessment_id, action, actor_id, details)
  values (v_assessment_id, 'updated', v_actor_id, jsonb_build_object(
    'reason', 'canonical workbook passage highlights',
    'oldQuestionRevisionIds', jsonb_build_array(v_learning_old, v_features_old),
    'newQuestionRevisionIds', jsonb_build_array(v_learning_new, v_features_new)
  ));
  insert into public.mock_assessment_audit (assessment_id, version_id, action, actor_id, details)
  values (v_assessment_id, v_new_version_id, 'published', v_actor_id, jsonb_build_object('versionNumber', 2));
  insert into public.mock_assessment_audit (assessment_id, version_id, assignment_id, action, actor_id, details)
  values (v_assessment_id, v_new_version_id, v_assignment_id, 'assigned', v_actor_id, jsonb_build_object(
    'priorVersionId', v_old_version_id,
    'releaseAtPreserved', '2026-09-25T11:00:00Z'
  ));

  raise notice 'Production highlight release complete: version %, learning revision %, features revision %',
    v_new_version_id, v_learning_new, v_features_new;
end;
$$;

commit;
