-- Pilot V3 Phase 3: server-authoritative Student attempt player.

create table public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.mock_assessment_assignments(id) on delete restrict,
  assessment_version_id uuid not null references public.mock_assessment_versions(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  section_order text[] not null check (
    cardinality(section_order) = 3
    and section_order <@ array['quant','verbal','data_insights']::text[]
    and cardinality(array_positions(section_order, 'quant')) = 1
    and cardinality(array_positions(section_order, 'verbal')) = 1
    and cardinality(array_positions(section_order, 'data_insights')) = 1
  ),
  current_section_index integer not null default 0 check (current_section_index between 0 and 3),
  current_item_id uuid,
  timing_boundary_at timestamptz,
  break_status text not null default 'available' check (break_status in ('available','active','consumed')),
  break_started_at timestamptz,
  break_deadline_at timestamptz,
  lock_version bigint not null default 1 check (lock_version > 0),
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (assignment_id, student_id)
);

create table public.mock_attempt_sections (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  section text not null check (section in ('quant','verbal','data_insights')),
  sequence_index integer not null check (sequence_index between 0 and 2),
  status text not null default 'pending' check (status in ('pending','active','review','submitted','timed_out')),
  time_limit_seconds integer not null check (time_limit_seconds between 60 and 7200),
  started_at timestamptz,
  deadline_at timestamptz,
  submitted_at timestamptz,
  review_started_at timestamptz,
  review_snapshot jsonb,
  review_edit_count integer not null default 0 check (review_edit_count between 0 and 3),
  unique (attempt_id, section),
  unique (attempt_id, sequence_index)
);

create table public.mock_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  attempt_section_id uuid not null references public.mock_attempt_sections(id) on delete restrict,
  question_revision_id uuid not null references public.mock_question_revisions(id) on delete restrict,
  stimulus_revision_id uuid references public.mock_stimulus_revisions(id) on delete restrict,
  section text not null check (section in ('quant','verbal','data_insights')),
  display_order integer not null check (display_order > 0),
  stimulus_group_key text,
  question_snapshot jsonb not null,
  stimulus_snapshot jsonb,
  response_config_snapshot jsonb not null,
  time_spent_ms bigint not null default 0 check (time_spent_ms >= 0),
  bookmarked boolean not null default false,
  unique (attempt_id, display_order, section),
  unique (attempt_id, question_revision_id)
);

alter table public.mock_attempts
  add constraint mock_attempts_current_item_fkey
  foreign key (current_item_id) references public.mock_attempt_items(id) on delete restrict;

create table public.mock_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  attempt_item_id uuid not null references public.mock_attempt_items(id) on delete restrict,
  response jsonb,
  response_version bigint not null default 1 check (response_version > 0),
  answered_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  unique (attempt_id, attempt_item_id)
);

create table public.mock_review_edits (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  attempt_section_id uuid not null references public.mock_attempt_sections(id) on delete restrict,
  attempt_item_id uuid not null references public.mock_attempt_items(id) on delete restrict,
  first_changed_at timestamptz not null default statement_timestamp(),
  unique (attempt_section_id, attempt_item_id)
);

create table public.mock_operation_receipts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  client_mutation_id uuid not null,
  operation text not null check (operation in ('start','begin','response','navigate','bookmark','review','submit','break')),
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (attempt_id, client_mutation_id)
);

create index mock_attempts_student_idx on public.mock_attempts(student_id, updated_at desc);
create index mock_attempt_sections_attempt_idx on public.mock_attempt_sections(attempt_id, sequence_index);
create index mock_attempt_items_section_idx on public.mock_attempt_items(attempt_section_id, display_order);
create index mock_responses_attempt_idx on public.mock_responses(attempt_id);
create index mock_review_edits_section_idx on public.mock_review_edits(attempt_section_id);
create index mock_operation_receipts_student_idx on public.mock_operation_receipts(student_id, created_at desc);

alter table public.mock_attempts enable row level security;
alter table public.mock_attempt_sections enable row level security;
alter table public.mock_attempt_items enable row level security;
alter table public.mock_responses enable row level security;
alter table public.mock_review_edits enable row level security;
alter table public.mock_operation_receipts enable row level security;

create policy "Students read own mock attempts" on public.mock_attempts for select
using (student_id = (select auth.uid()));
create policy "Students read own mock sections" on public.mock_attempt_sections for select
using (exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.student_id = (select auth.uid())));
create policy "Students read own mock items" on public.mock_attempt_items for select
using (exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.student_id = (select auth.uid())));
create policy "Students read own mock responses" on public.mock_responses for select
using (exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.student_id = (select auth.uid())));
create policy "Students read own review edits" on public.mock_review_edits for select
using (exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.student_id = (select auth.uid())));

grant select on public.mock_attempts, public.mock_attempt_sections, public.mock_attempt_items,
  public.mock_responses, public.mock_review_edits to authenticated;
revoke all on public.mock_operation_receipts from anon, authenticated;

create table private.mock_attempt_keys (
  attempt_item_id uuid primary key references public.mock_attempt_items(id) on delete restrict,
  answer_json jsonb not null,
  explanation_json jsonb,
  created_at timestamptz not null default statement_timestamp()
);
revoke all on private.mock_attempt_keys from anon, authenticated;

create or replace function private.is_eligible_mock_student(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.mock_assessment_assignments a
    join public.enrollments e on e.course_id = a.course_id and e.user_id = p_student_id
    join public.profiles p on p.id = p_student_id
    where a.id = p_assignment_id
      and a.release_at <= statement_timestamp()
      and p.role = 'student'
      and p.is_active = true
  );
$$;

create or replace function public.start_mock_attempt(
  p_assignment_id uuid,
  p_section_order text[],
  p_client_mutation_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_version public.mock_assessment_versions%rowtype;
  v_attempt public.mock_attempts%rowtype;
  v_item record;
  v_attempt_section_id uuid;
  v_attempt_item_id uuid;
  v_result jsonb;
  v_receipt public.mock_operation_receipts%rowtype;
begin
  if v_student_id is null or not private.is_eligible_mock_student(p_assignment_id, v_student_id) then
    raise exception 'MOCK_NOT_AVAILABLE' using errcode = '42501';
  end if;
  if cardinality(p_section_order) <> 3
    or not (p_section_order @> array['quant','verbal','data_insights']::text[] and p_section_order <@ array['quant','verbal','data_insights']::text[]) then
    raise exception 'INVALID_SECTION_ORDER' using errcode = '22023';
  end if;

  select a.* into v_attempt from public.mock_attempts a
  where a.assignment_id = p_assignment_id and a.student_id = v_student_id;
  if found then
    select r.* into v_receipt from public.mock_operation_receipts r
    where r.attempt_id = v_attempt.id and r.client_mutation_id = p_client_mutation_id;
    if found then
      if v_receipt.request_hash <> p_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023'; end if;
      return v_receipt.response;
    end if;
    if v_attempt.section_order <> p_section_order then
      raise exception 'SECTION_ORDER_ALREADY_CHOSEN' using errcode = '23505';
    end if;
    return jsonb_build_object('attempt_id', v_attempt.id, 'lock_version', v_attempt.lock_version, 'status', v_attempt.status);
  end if;

  select v.* into v_version
  from public.mock_assessment_assignments a
  join public.mock_assessment_versions v on v.id = a.assessment_version_id
  where a.id = p_assignment_id;

  insert into public.mock_attempts(assignment_id, assessment_version_id, student_id, section_order)
  values (p_assignment_id, v_version.id, v_student_id, p_section_order)
  returning * into v_attempt;

  for v_item in
    select section, time_limit_seconds, display_order - 1 as sequence_index
    from jsonb_to_recordset(v_version.snapshot->'sections')
      as s(section text, question_count integer, time_limit_seconds integer, display_order integer)
  loop
    insert into public.mock_attempt_sections(attempt_id, section, sequence_index, time_limit_seconds)
    values (v_attempt.id, v_item.section, array_position(p_section_order, v_item.section) - 1, 2700);
  end loop;

  for v_item in
    select i.section, i.question_revision_id, i.display_order, i.stimulus_group_key,
      q.question_type, q.response_type, q.stem_json, q.interaction_json, q.stimulus_revision_id,
      s.stimulus_kind, s.title as stimulus_title, s.content_json as stimulus_content, s.config_json as stimulus_config,
      coalesce((select jsonb_agg(jsonb_build_object(
        'response_slot_id', o.response_slot_id, 'option_id', o.option_id,
        'display_order', o.display_order, 'content', o.content_json
      ) order by o.response_slot_id, o.display_order) from public.mock_question_options o where o.question_revision_id = q.id), '[]'::jsonb) as options,
      coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'source_external_id', m.source_external_id, 'alt_text', m.alt_text, 'usage', qm.usage))
        from public.mock_question_media qm join public.mock_media m on m.id = qm.media_id where qm.question_revision_id = q.id and m.status = 'ready'), '[]'::jsonb) as question_media,
      coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'source_external_id', m.source_external_id, 'alt_text', m.alt_text, 'usage', sm.usage))
        from public.mock_stimulus_media sm join public.mock_media m on m.id = sm.media_id where sm.stimulus_revision_id = s.id and m.status = 'ready'), '[]'::jsonb) as stimulus_media,
      k.answer_json, k.explanation_json
    from jsonb_to_recordset(v_version.snapshot->'items')
      as i(id uuid, section text, display_order integer, stimulus_group_key text, question_revision_id uuid, mock_question_revisions jsonb)
    join public.mock_question_revisions q on q.id = i.question_revision_id and q.status = 'published'
    left join public.mock_stimulus_revisions s on s.id = q.stimulus_revision_id
    join private.mock_question_keys k on k.question_revision_id = q.id
    order by array_position(p_section_order, i.section), i.display_order
  loop
    select id into v_attempt_section_id from public.mock_attempt_sections
      where attempt_id = v_attempt.id and section = v_item.section;
    insert into public.mock_attempt_items(
      attempt_id, attempt_section_id, question_revision_id, stimulus_revision_id, section,
      display_order, stimulus_group_key, question_snapshot, stimulus_snapshot, response_config_snapshot
    ) values (
      v_attempt.id, v_attempt_section_id, v_item.question_revision_id, v_item.stimulus_revision_id,
      v_item.section, v_item.display_order, v_item.stimulus_group_key,
      jsonb_build_object('question_type', v_item.question_type, 'stem', v_item.stem_json, 'media', v_item.question_media),
      case when v_item.stimulus_revision_id is null then null else jsonb_build_object(
        'kind', v_item.stimulus_kind, 'title', v_item.stimulus_title,
        'content', v_item.stimulus_content, 'config', v_item.stimulus_config, 'media', v_item.stimulus_media
      ) end,
      jsonb_build_object('response_type', v_item.response_type, 'interaction', v_item.interaction_json, 'options', v_item.options)
    ) returning id into v_attempt_item_id;
    insert into public.mock_responses(attempt_id, attempt_item_id) values (v_attempt.id, v_attempt_item_id);
    insert into private.mock_attempt_keys(attempt_item_id, answer_json, explanation_json)
      values (v_attempt_item_id, v_item.answer_json, v_item.explanation_json);
  end loop;

  v_result := jsonb_build_object('attempt_id', v_attempt.id, 'lock_version', v_attempt.lock_version, 'status', v_attempt.status);
  insert into public.mock_operation_receipts(attempt_id, student_id, client_mutation_id, operation, request_hash, response)
    values (v_attempt.id, v_student_id, p_client_mutation_id, 'start', p_request_hash, v_result);
  return v_result;
end;
$$;

create or replace function public.mutate_mock_attempt(
  p_attempt_id uuid,
  p_operation text,
  p_payload jsonb,
  p_expected_lock_version bigint,
  p_client_mutation_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_attempt public.mock_attempts%rowtype;
  v_section public.mock_attempt_sections%rowtype;
  v_item public.mock_attempt_items%rowtype;
  v_response public.mock_responses%rowtype;
  v_now timestamptz := statement_timestamp();
  v_result jsonb;
  v_changed boolean;
  v_existing jsonb;
  v_elapsed bigint;
begin
  select r.response into v_result from public.mock_operation_receipts r
    where r.attempt_id = p_attempt_id and r.student_id = v_student_id and r.client_mutation_id = p_client_mutation_id;
  if found then
    if (select request_hash from public.mock_operation_receipts where attempt_id = p_attempt_id and client_mutation_id = p_client_mutation_id) <> p_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    return v_result;
  end if;

  select * into v_attempt from public.mock_attempts
    where id = p_attempt_id and student_id = v_student_id for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND' using errcode = '42501'; end if;
  if v_attempt.lock_version <> p_expected_lock_version then raise exception 'STALE_ATTEMPT' using errcode = 'P0001'; end if;
  if v_attempt.status = 'completed' then raise exception 'ATTEMPT_COMPLETED' using errcode = '22023'; end if;

  if v_attempt.current_section_index between 0 and 2 then
    select * into v_section from public.mock_attempt_sections
      where attempt_id = p_attempt_id and sequence_index = v_attempt.current_section_index for update;
    if v_section.status in ('active','review') and v_section.deadline_at <= v_now then
      update public.mock_attempt_sections set status = 'timed_out', submitted_at = v_now where id = v_section.id;
      update public.mock_attempts set current_item_id = null, timing_boundary_at = null where id = p_attempt_id;
      v_section.status := 'timed_out';
    end if;
  end if;

  if p_operation = 'begin' then
    if v_attempt.break_status = 'active' and v_attempt.break_deadline_at > v_now then raise exception 'BREAK_ACTIVE' using errcode = '22023'; end if;
    if v_attempt.break_status = 'active' and v_attempt.break_deadline_at <= v_now then
      update public.mock_attempts set break_status = 'consumed', break_deadline_at = null where id = p_attempt_id;
    end if;
    if v_attempt.break_status = 'available' and v_attempt.current_section_index > 0 then
      update public.mock_attempts set break_status = 'consumed' where id = p_attempt_id;
    end if;
    if v_attempt.current_section_index > 2 then raise exception 'NO_SECTION_REMAINING' using errcode = '22023'; end if;
    select * into v_section from public.mock_attempt_sections where attempt_id = p_attempt_id and sequence_index = v_attempt.current_section_index for update;
    if v_section.status = 'pending' then
      update public.mock_attempt_sections set status = 'active', started_at = v_now,
        deadline_at = v_now + make_interval(secs => time_limit_seconds) where id = v_section.id returning * into v_section;
    elsif v_section.status not in ('active','review') then
      raise exception 'SECTION_NOT_STARTABLE' using errcode = '22023';
    end if;
    select * into v_item from public.mock_attempt_items where attempt_section_id = v_section.id order by display_order limit 1;
    update public.mock_attempts set current_item_id = coalesce(current_item_id, v_item.id), timing_boundary_at = coalesce(timing_boundary_at, v_now) where id = p_attempt_id;

  elsif p_operation = 'navigate' then
    if v_section.status not in ('active','review') then raise exception 'SECTION_NOT_ACTIVE' using errcode = '22023'; end if;
    select * into v_item from public.mock_attempt_items where id = (p_payload->>'attempt_item_id')::uuid and attempt_section_id = v_section.id;
    if not found then raise exception 'ITEM_NOT_IN_SECTION' using errcode = '22023'; end if;
    if v_attempt.current_item_id is not null and v_attempt.timing_boundary_at is not null then
      v_elapsed := greatest(0, floor(extract(epoch from (v_now - v_attempt.timing_boundary_at)) * 1000));
      update public.mock_attempt_items set time_spent_ms = time_spent_ms + v_elapsed where id = v_attempt.current_item_id;
    end if;
    update public.mock_attempts set current_item_id = v_item.id, timing_boundary_at = v_now where id = p_attempt_id;

  elsif p_operation = 'bookmark' then
    if v_section.status not in ('active','review') then raise exception 'SECTION_NOT_ACTIVE' using errcode = '22023'; end if;
    select * into v_item from public.mock_attempt_items where id = (p_payload->>'attempt_item_id')::uuid and attempt_section_id = v_section.id;
    if not found then raise exception 'ITEM_NOT_IN_SECTION' using errcode = '22023'; end if;
    update public.mock_attempt_items set bookmarked = coalesce((p_payload->>'bookmarked')::boolean, not bookmarked) where id = v_item.id;

  elsif p_operation = 'response' then
    if v_section.status not in ('active','review') then raise exception 'SECTION_NOT_ACTIVE' using errcode = '22023'; end if;
    select * into v_item from public.mock_attempt_items where id = (p_payload->>'attempt_item_id')::uuid and attempt_section_id = v_section.id;
    if not found then raise exception 'ITEM_NOT_IN_SECTION' using errcode = '22023'; end if;
    select * into v_response from public.mock_responses where attempt_item_id = v_item.id for update;
    if v_response.response_version <> (p_payload->>'expected_response_version')::bigint then raise exception 'STALE_RESPONSE' using errcode = 'P0001'; end if;
    v_changed := v_response.response is distinct from (p_payload->'response');
    if v_section.status = 'review' and v_changed and not exists(select 1 from public.mock_review_edits where attempt_section_id = v_section.id and attempt_item_id = v_item.id) then
      if v_section.review_edit_count >= 3 then raise exception 'REVIEW_EDIT_LIMIT' using errcode = '22023'; end if;
      insert into public.mock_review_edits(attempt_id, attempt_section_id, attempt_item_id) values (p_attempt_id, v_section.id, v_item.id);
      update public.mock_attempt_sections set review_edit_count = review_edit_count + 1 where id = v_section.id;
    end if;
    update public.mock_responses set response = p_payload->'response', response_version = response_version + 1,
      answered_at = case when p_payload->'response' is null then null else coalesce(answered_at, v_now) end, updated_at = v_now
      where id = v_response.id;

  elsif p_operation = 'review' then
    if v_section.status <> 'active' then raise exception 'SECTION_NOT_ACTIVE' using errcode = '22023'; end if;
    update public.mock_attempt_sections set status = 'review', review_started_at = v_now,
      review_snapshot = (select coalesce(jsonb_object_agg(i.id::text, r.response), '{}'::jsonb)
        from public.mock_attempt_items i join public.mock_responses r on r.attempt_item_id = i.id where i.attempt_section_id = v_section.id)
      where id = v_section.id;

  elsif p_operation = 'submit' then
    if v_section.status not in ('active','review','timed_out') then raise exception 'SECTION_NOT_SUBMITTABLE' using errcode = '22023'; end if;
    update public.mock_attempt_sections set status = case when v_section.status = 'timed_out' then 'timed_out' else 'submitted' end,
      submitted_at = coalesce(submitted_at, v_now) where id = v_section.id;
    if v_attempt.current_section_index = 2 then
      update public.mock_attempts set status = 'completed', completed_at = v_now, current_section_index = 3,
        current_item_id = null, timing_boundary_at = null where id = p_attempt_id;
    else
      update public.mock_attempts set current_section_index = current_section_index + 1,
        current_item_id = null, timing_boundary_at = null where id = p_attempt_id;
    end if;

  elsif p_operation = 'break' then
    if v_attempt.current_section_index not in (1,2) or v_attempt.break_status = 'consumed' then raise exception 'BREAK_NOT_AVAILABLE' using errcode = '22023'; end if;
    if p_payload->>'action' = 'take' then
      update public.mock_attempts set break_status = 'active', break_started_at = v_now, break_deadline_at = v_now + interval '10 minutes' where id = p_attempt_id;
    elsif p_payload->>'action' in ('skip','end') then
      update public.mock_attempts set break_status = 'consumed', break_deadline_at = null where id = p_attempt_id;
    else raise exception 'INVALID_BREAK_ACTION' using errcode = '22023'; end if;
  else
    raise exception 'INVALID_OPERATION' using errcode = '22023';
  end if;

  update public.mock_attempts set lock_version = lock_version + 1, updated_at = v_now where id = p_attempt_id returning * into v_attempt;
  v_result := jsonb_build_object('attempt_id', v_attempt.id, 'lock_version', v_attempt.lock_version,
    'status', v_attempt.status, 'current_section_index', v_attempt.current_section_index,
    'break_status', v_attempt.break_status);
  insert into public.mock_operation_receipts(attempt_id, student_id, client_mutation_id, operation, request_hash, response)
    values (p_attempt_id, v_student_id, p_client_mutation_id, p_operation, p_request_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.start_mock_attempt(uuid, text[], uuid, text) from public, anon;
revoke all on function public.mutate_mock_attempt(uuid, text, jsonb, bigint, uuid, text) from public, anon;
revoke all on function private.is_eligible_mock_student(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_mock_attempt(uuid, text[], uuid, text) to authenticated;
grant execute on function public.mutate_mock_attempt(uuid, text, jsonb, bigint, uuid, text) to authenticated;
