begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.mock_source_namespaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9]{1,7}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table public.mock_source_namespace_members (
  namespace_id uuid not null references public.mock_source_namespaces(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  primary key (namespace_id, user_id)
);
create index mock_source_namespace_members_user_id_idx
  on public.mock_source_namespace_members(user_id) where is_active;

create table public.mock_topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  section text not null check (section in ('quant', 'verbal', 'data_insights')),
  parent_id uuid references public.mock_topics(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  unique (section, parent_id, label)
);
create index mock_topics_parent_id_idx on public.mock_topics(parent_id) where parent_id is not null;
create unique index mock_topics_root_label_key
  on public.mock_topics(section, lower(label)) where parent_id is null;
create unique index mock_topics_child_label_key
  on public.mock_topics(parent_id, lower(label)) where parent_id is not null;

create table public.mock_imports (
  id uuid primary key default gen_random_uuid(),
  package_id text not null unique check (length(btrim(package_id)) between 1 and 160),
  package_fingerprint text not null unique check (package_fingerprint ~ '^[0-9a-f]{64}$'),
  preview_digest text not null check (preview_digest ~ '^[0-9a-f]{64}$'),
  namespace_id uuid not null references public.mock_source_namespaces(id) on delete restrict,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('pending', 'completed', 'failed')),
  operation_manifest jsonb not null default '{}'::jsonb,
  result_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);
create index mock_imports_uploaded_by_idx on public.mock_imports(uploaded_by, created_at desc);
create index mock_imports_namespace_id_idx on public.mock_imports(namespace_id, created_at desc);

create table public.mock_stimuli (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.mock_source_namespaces(id) on delete restrict,
  source_external_id text not null check (source_external_id ~ '^STIM-[0-9a-fA-F-]{36}$'),
  current_draft_revision_id uuid,
  current_published_revision_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  unique (namespace_id, source_external_id)
);
create index mock_stimuli_namespace_id_idx on public.mock_stimuli(namespace_id);

create table public.mock_stimulus_revisions (
  id uuid primary key default gen_random_uuid(),
  stimulus_id uuid not null references public.mock_stimuli(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  import_state text not null default 'ready' check (import_state in ('pending', 'ready')),
  stimulus_kind text not null check (stimulus_kind in ('rich_text', 'passage', 'graphic', 'sortable_table', 'tabbed_content', 'two_part_context')),
  title text check (title is null or length(btrim(title)) between 1 and 160),
  content_json jsonb not null,
  config_json jsonb not null default '{}'::jsonb,
  revision_note text check (revision_note is null or length(revision_note) <= 1000),
  content_fingerprint text not null check (content_fingerprint ~ '^[0-9a-f]{64}$'),
  import_id uuid references public.mock_imports(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  unique (stimulus_id, revision_number)
);
create index mock_stimulus_revisions_stimulus_id_idx on public.mock_stimulus_revisions(stimulus_id, revision_number desc);
create index mock_stimulus_revisions_import_id_idx on public.mock_stimulus_revisions(import_id) where import_id is not null;
create index mock_stimulus_revisions_fingerprint_idx on public.mock_stimulus_revisions(content_fingerprint);

alter table public.mock_stimuli
  add constraint mock_stimuli_current_draft_revision_fkey
  foreign key (current_draft_revision_id) references public.mock_stimulus_revisions(id) on delete restrict,
  add constraint mock_stimuli_current_published_revision_fkey
  foreign key (current_published_revision_id) references public.mock_stimulus_revisions(id) on delete restrict;

create table public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.mock_source_namespaces(id) on delete restrict,
  source_external_id text not null check (source_external_id ~ '^Q-(PS|DS|CR|RC|GI|TI|MSR|TPA)-[0-9a-fA-F-]{36}$'),
  current_draft_revision_id uuid,
  current_published_revision_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  unique (namespace_id, source_external_id)
);
create index mock_questions_namespace_id_idx on public.mock_questions(namespace_id);

create table public.mock_question_revisions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.mock_questions(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  import_state text not null default 'ready' check (import_state in ('pending', 'ready')),
  section text not null check (section in ('quant', 'verbal', 'data_insights')),
  question_type text not null check (question_type in ('PS', 'DS', 'CR', 'RC', 'GI', 'TI', 'MSR', 'TPA')),
  response_type text not null check (response_type in ('single_choice', 'dropdowns', 'binary_matrix', 'two_part_matrix')),
  topic_id uuid not null references public.mock_topics(id) on delete restrict,
  subtopic_id uuid references public.mock_topics(id) on delete restrict,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  stem_json jsonb not null,
  interaction_json jsonb not null,
  stimulus_revision_id uuid references public.mock_stimulus_revisions(id) on delete restrict,
  stimulus_group_order integer check (stimulus_group_order is null or stimulus_group_order > 0),
  source_reference text not null check (length(btrim(source_reference)) between 1 and 1000),
  content_fingerprint text not null check (content_fingerprint ~ '^[0-9a-f]{64}$'),
  answer_confirmation text not null check (answer_confirmation in ('FOUNDER_CONFIRMED', 'SOURCE_CONFIRMED')),
  answer_check text not null check (answer_check in ('PASS', 'UNVERIFIABLE_REVIEW')),
  asset_check text not null check (asset_check in ('PASS', 'NOT_APPLICABLE')),
  validation_status text not null check (validation_status in ('READY', 'REVIEW')),
  validation_notes text check (validation_notes is null or length(validation_notes) <= 4000),
  import_id uuid references public.mock_imports(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  unique (question_id, revision_number),
  constraint mock_question_revision_stimulus_order_check check (
    (stimulus_revision_id is null and stimulus_group_order is null)
    or (stimulus_revision_id is not null and stimulus_group_order is not null)
  ),
  constraint mock_question_revision_type_section_check check (
    (question_type in ('PS', 'DS') and section = 'quant')
    or (question_type in ('CR', 'RC') and section = 'verbal')
    or (question_type in ('GI', 'TI', 'MSR', 'TPA') and section = 'data_insights')
  ),
  constraint mock_question_revision_type_response_check check (
    (question_type in ('PS', 'DS', 'CR', 'RC') and response_type = 'single_choice')
    or (question_type = 'GI' and response_type in ('single_choice', 'dropdowns'))
    or (question_type = 'MSR' and response_type in ('single_choice', 'dropdowns'))
    or (question_type = 'TI' and response_type = 'binary_matrix')
    or (question_type = 'TPA' and response_type = 'two_part_matrix')
  )
);
create index mock_question_revisions_question_id_idx on public.mock_question_revisions(question_id, revision_number desc);
create index mock_question_revisions_topic_id_idx on public.mock_question_revisions(topic_id);
create index mock_question_revisions_subtopic_id_idx on public.mock_question_revisions(subtopic_id) where subtopic_id is not null;
create index mock_question_revisions_stimulus_revision_id_idx on public.mock_question_revisions(stimulus_revision_id) where stimulus_revision_id is not null;
create index mock_question_revisions_import_id_idx on public.mock_question_revisions(import_id) where import_id is not null;
create index mock_question_revisions_fingerprint_idx on public.mock_question_revisions(content_fingerprint);
create index mock_question_revisions_filter_idx on public.mock_question_revisions(section, question_type, difficulty, status);

alter table public.mock_questions
  add constraint mock_questions_current_draft_revision_fkey
  foreign key (current_draft_revision_id) references public.mock_question_revisions(id) on delete restrict,
  add constraint mock_questions_current_published_revision_fkey
  foreign key (current_published_revision_id) references public.mock_question_revisions(id) on delete restrict;

create table public.mock_question_options (
  id uuid primary key default gen_random_uuid(),
  question_revision_id uuid not null references public.mock_question_revisions(id) on delete restrict,
  response_slot_id text not null check (response_slot_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  option_id text not null check (option_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  display_order integer not null check (display_order > 0),
  content_json jsonb not null,
  unique (question_revision_id, response_slot_id, option_id),
  unique (question_revision_id, response_slot_id, display_order)
);
create index mock_question_options_revision_id_idx on public.mock_question_options(question_revision_id);

create table private.mock_question_keys (
  question_revision_id uuid primary key references public.mock_question_revisions(id) on delete restrict,
  answer_json jsonb not null,
  explanation_json jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create table public.mock_media (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.mock_source_namespaces(id) on delete restrict,
  source_external_id text not null check (source_external_id ~ '^ASSET-[0-9a-fA-F-]{36}$'),
  import_id uuid references public.mock_imports(id) on delete restrict,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  width_px integer not null check (width_px between 1 and 20000),
  height_px integer not null check (height_px between 1 and 20000),
  alt_text text not null check (length(btrim(alt_text)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'ready', 'quarantined')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  unique (namespace_id, source_external_id),
  unique (namespace_id, sha256)
);
create index mock_media_namespace_id_idx on public.mock_media(namespace_id);
create index mock_media_import_id_idx on public.mock_media(import_id) where import_id is not null;

create table public.mock_question_media (
  question_revision_id uuid not null references public.mock_question_revisions(id) on delete restrict,
  media_id uuid not null references public.mock_media(id) on delete restrict,
  usage text not null check (usage in ('stem', 'interaction', 'option')),
  primary key (question_revision_id, media_id, usage)
);
create index mock_question_media_media_id_idx on public.mock_question_media(media_id);

create table public.mock_stimulus_media (
  stimulus_revision_id uuid not null references public.mock_stimulus_revisions(id) on delete restrict,
  media_id uuid not null references public.mock_media(id) on delete restrict,
  usage text not null check (usage in ('content', 'panel', 'tab')),
  primary key (stimulus_revision_id, media_id, usage)
);
create index mock_stimulus_media_media_id_idx on public.mock_stimulus_media(media_id);

create table public.mock_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.mock_imports(id) on delete restrict,
  item_kind text not null check (item_kind in ('question', 'stimulus', 'asset')),
  source_external_id text not null,
  action text not null check (action in ('create', 'new_revision', 'skip')),
  entity_id uuid,
  revision_id uuid,
  outcome text not null check (outcome in ('pending', 'completed')),
  unique (import_id, item_kind, source_external_id)
);
create index mock_import_items_import_id_idx on public.mock_import_items(import_id);

create or replace function private.is_mock_namespace_member(p_namespace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mock_source_namespace_members member
    join public.mock_source_namespaces namespace on namespace.id = member.namespace_id
    join public.profiles profile on profile.id = member.user_id
    where member.namespace_id = p_namespace_id
      and member.user_id = p_user_id
      and member.is_active
      and namespace.is_active
      and profile.is_active
      and profile.role = 'admin'
  );
$$;
revoke all on function private.is_mock_namespace_member(uuid, uuid) from public, anon, authenticated;

create or replace function public.enforce_mock_question_revision_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.import_state = 'pending' and new.import_state = 'ready'
     and (to_jsonb(new) - 'import_state') = (to_jsonb(old) - 'import_state') then
    return new;
  end if;
  if old.status = 'published' and new.status = 'retired'
     and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
    return new;
  end if;
  if old.status <> 'draft' or old.import_state <> 'ready' then
    raise exception 'Published, retired, or pending mock question revisions are immutable' using errcode = '55000';
  end if;
  if new.id <> old.id or new.created_at <> old.created_at or new.created_by <> old.created_by
     or new.question_id <> old.question_id or new.revision_number <> old.revision_number then
    raise exception 'Mock revision identity fields are immutable' using errcode = '55000';
  end if;
  if new.status not in ('draft', 'published') then
    raise exception 'A Draft may only remain Draft or become Published' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_mock_stimulus_revision_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.import_state = 'pending' and new.import_state = 'ready'
     and (to_jsonb(new) - 'import_state') = (to_jsonb(old) - 'import_state') then
    return new;
  end if;
  if old.status = 'published' and new.status = 'retired'
     and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
    return new;
  end if;
  if old.status <> 'draft' or old.import_state <> 'ready' then
    raise exception 'Published, retired, or pending mock stimulus revisions are immutable' using errcode = '55000';
  end if;
  if new.id <> old.id or new.created_at <> old.created_at or new.created_by <> old.created_by
     or new.stimulus_id <> old.stimulus_id or new.revision_number <> old.revision_number then
    raise exception 'Mock revision identity fields are immutable' using errcode = '55000';
  end if;
  if new.status not in ('draft', 'published') then
    raise exception 'A Draft may only remain Draft or become Published' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enforce_mock_question_revision_immutability
before update on public.mock_question_revisions
for each row execute function public.enforce_mock_question_revision_immutability();
create trigger enforce_mock_stimulus_revision_immutability
before update on public.mock_stimulus_revisions
for each row execute function public.enforce_mock_stimulus_revision_immutability();
revoke all on function public.enforce_mock_question_revision_immutability() from public, anon, authenticated;
revoke all on function public.enforce_mock_stimulus_revision_immutability() from public, anon, authenticated;

create or replace function public.begin_mock_question_import(
  p_package_id text,
  p_package_fingerprint text,
  p_preview_digest text,
  p_namespace_code text,
  p_payload jsonb,
  p_operation_manifest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_namespace_id uuid;
  v_import public.mock_imports;
  v_item jsonb;
  v_identity_id uuid;
  v_revision_id uuid;
  v_revision_number integer;
  v_stimulus_revision_id uuid;
  v_topic_id uuid;
  v_subtopic_id uuid;
  v_action text;
  v_option jsonb;
  v_answer jsonb;
  v_asset jsonb;
  v_media_id uuid;
begin
  if v_user_id is null or not public.is_portal_admin() then
    raise exception 'Active Admin access required' using errcode = '42501';
  end if;

  select id into v_namespace_id
  from public.mock_source_namespaces
  where code = upper(btrim(p_namespace_code)) and is_active;
  if v_namespace_id is null or not private.is_mock_namespace_member(v_namespace_id, v_user_id) then
    raise exception 'Uploader is not an active member of namespace %', p_namespace_code using errcode = '42501';
  end if;

  select * into v_import from public.mock_imports where package_fingerprint = p_package_fingerprint;
  if found then
    if v_import.status = 'completed' and v_import.preview_digest = p_preview_digest then
      return jsonb_build_object('importId', v_import.id, 'idempotent', true, 'status', 'completed', 'result', v_import.result_report);
    end if;
    raise exception 'This package fingerprint already has a non-completed or changed import' using errcode = '23505';
  end if;
  if exists (select 1 from public.mock_imports where package_id = p_package_id) then
    raise exception 'The package ID already exists with different bytes' using errcode = '23505';
  end if;

  insert into public.mock_imports (
    package_id, package_fingerprint, preview_digest, namespace_id, uploaded_by,
    status, operation_manifest
  ) values (
    p_package_id, p_package_fingerprint, p_preview_digest, v_namespace_id, v_user_id,
    'pending', coalesce(p_operation_manifest, '{}'::jsonb)
  ) returning * into v_import;

  for v_asset in select value from jsonb_array_elements(coalesce(p_payload->'assets', '[]'::jsonb)) loop
    if upper(v_asset->>'sourceNamespace') <> upper(p_namespace_code) then
      raise exception 'Cross-namespace asset in package' using errcode = '42501';
    end if;
    insert into public.mock_media (
      namespace_id, source_external_id, import_id, storage_path, mime_type, byte_size,
      sha256, width_px, height_px, alt_text, status, created_by
    ) values (
      v_namespace_id, v_asset->>'sourceAssetId', v_import.id, v_asset->>'finalPath',
      v_asset->>'mimeType', (v_asset->>'byteSize')::bigint, v_asset->>'sha256',
      (v_asset->>'widthPx')::integer, (v_asset->>'heightPx')::integer,
      v_asset->>'altText', 'pending', v_user_id
    ) returning id into v_identity_id;
    insert into public.mock_import_items(import_id, item_kind, source_external_id, action, entity_id, outcome)
    values (v_import.id, 'asset', v_asset->>'sourceAssetId', 'create', v_identity_id, 'pending');
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'stimuli', '[]'::jsonb)) loop
    if upper(v_item->>'sourceNamespace') <> upper(p_namespace_code) then
      raise exception 'Cross-namespace stimulus in package' using errcode = '42501';
    end if;
    v_action := v_item->>'action';
    select id into v_identity_id from public.mock_stimuli
      where namespace_id = v_namespace_id and source_external_id = v_item->>'sourceStimulusId';
    if v_identity_id is not null and v_action = 'reject' then
      raise exception 'Stimulus conflict requires an explicit decision: %', v_item->>'sourceStimulusId' using errcode = '23505';
    elsif v_identity_id is not null and v_action = 'skip' then
      insert into public.mock_import_items(import_id, item_kind, source_external_id, action, entity_id, outcome)
      values (v_import.id, 'stimulus', v_item->>'sourceStimulusId', 'skip', v_identity_id, 'completed');
      continue;
    elsif v_identity_id is null then
      insert into public.mock_stimuli(namespace_id, source_external_id)
      values (v_namespace_id, v_item->>'sourceStimulusId') returning id into v_identity_id;
      v_action := 'create';
    elsif v_action <> 'new_revision' then
      raise exception 'Invalid stimulus conflict action' using errcode = '23514';
    end if;
    select coalesce(max(revision_number), 0) + 1 into v_revision_number
      from public.mock_stimulus_revisions where stimulus_id = v_identity_id;
    insert into public.mock_stimulus_revisions (
      stimulus_id, revision_number, status, import_state, stimulus_kind, title,
      content_json, config_json, revision_note, content_fingerprint, import_id, created_by
    ) values (
      v_identity_id, v_revision_number, 'draft', 'pending', v_item->>'stimulusType',
      nullif(v_item->>'title', ''), v_item->'content', coalesce(v_item->'config', '{}'::jsonb),
      nullif(v_item->>'revisionNote', ''), v_item->>'contentFingerprint', v_import.id, v_user_id
    ) returning id into v_revision_id;
    update public.mock_stimuli set current_draft_revision_id = v_revision_id where id = v_identity_id;
    if (v_item->>'stimulusType') = 'graphic' then
      if nullif(v_item->'content'->>'asset_id', '') is null then
        raise exception 'Graphic stimulus requires an asset_id' using errcode = '23514';
      end if;
      select id into v_media_id from public.mock_media
      where namespace_id = v_namespace_id
        and source_external_id = v_item->'content'->>'asset_id'
        and (status = 'ready' or import_id = v_import.id);
      if v_media_id is null then raise exception 'Graphic stimulus asset is unresolved' using errcode = '23503'; end if;
      insert into public.mock_stimulus_media(stimulus_revision_id, media_id, usage)
      values (v_revision_id, v_media_id, 'content');
    end if;
    insert into public.mock_import_items(import_id, item_kind, source_external_id, action, entity_id, revision_id, outcome)
    values (v_import.id, 'stimulus', v_item->>'sourceStimulusId', v_action, v_identity_id, v_revision_id, 'pending');
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'questions', '[]'::jsonb)) loop
    if upper(v_item->>'sourceNamespace') <> upper(p_namespace_code) then
      raise exception 'Cross-namespace question in package' using errcode = '42501';
    end if;
    select id into v_topic_id from public.mock_topics
      where is_active and section = v_item->>'section' and lower(label) = lower(v_item->>'topic') and parent_id is null;
    if v_topic_id is null then
      raise exception 'Unknown or ambiguous topic: %', v_item->>'topic' using errcode = '23514';
    end if;
    v_subtopic_id := null;
    if nullif(v_item->>'subtopic', '') is not null then
      select id into v_subtopic_id from public.mock_topics
        where is_active and parent_id = v_topic_id and lower(label) = lower(v_item->>'subtopic');
      if v_subtopic_id is null then
        raise exception 'Unknown or ambiguous subtopic: %', v_item->>'subtopic' using errcode = '23514';
      end if;
    end if;
    v_stimulus_revision_id := null;
    if nullif(v_item->>'sourceStimulusId', '') is not null then
      select coalesce(stimulus.current_draft_revision_id, stimulus.current_published_revision_id)
      into v_stimulus_revision_id
      from public.mock_stimuli stimulus
      where stimulus.namespace_id = v_namespace_id
        and stimulus.source_external_id = v_item->>'sourceStimulusId';
      if v_stimulus_revision_id is null then
        raise exception 'Unresolved stimulus: %', v_item->>'sourceStimulusId' using errcode = '23503';
      end if;
    end if;
    v_action := v_item->>'action';
    v_identity_id := null;
    select id into v_identity_id from public.mock_questions
      where namespace_id = v_namespace_id and source_external_id = v_item->>'sourceQuestionId';
    if v_identity_id is not null and v_action = 'reject' then
      raise exception 'Question conflict requires an explicit decision: %', v_item->>'sourceQuestionId' using errcode = '23505';
    elsif v_identity_id is not null and v_action = 'skip' then
      insert into public.mock_import_items(import_id, item_kind, source_external_id, action, entity_id, outcome)
      values (v_import.id, 'question', v_item->>'sourceQuestionId', 'skip', v_identity_id, 'completed');
      continue;
    elsif v_identity_id is null then
      insert into public.mock_questions(namespace_id, source_external_id)
      values (v_namespace_id, v_item->>'sourceQuestionId') returning id into v_identity_id;
      v_action := 'create';
    elsif v_action <> 'new_revision' then
      raise exception 'Invalid question conflict action' using errcode = '23514';
    end if;
    select coalesce(max(revision_number), 0) + 1 into v_revision_number
      from public.mock_question_revisions where question_id = v_identity_id;
    insert into public.mock_question_revisions (
      question_id, revision_number, status, import_state, section, question_type,
      response_type, topic_id, subtopic_id, difficulty, stem_json, interaction_json,
      stimulus_revision_id, stimulus_group_order, source_reference, content_fingerprint,
      answer_confirmation, answer_check, asset_check, validation_status, validation_notes,
      import_id, created_by
    ) values (
      v_identity_id, v_revision_number, 'draft', 'pending', v_item->>'section',
      v_item->>'questionType', v_item->>'responseType', v_topic_id, v_subtopic_id,
      v_item->>'difficulty', v_item->'stem', v_item->'interaction', v_stimulus_revision_id,
      nullif(v_item->>'stimulusGroupOrder', '')::integer, v_item->>'sourceReference',
      v_item->>'contentFingerprint', v_item->>'answerConfirmation', v_item->>'answerCheck',
      v_item->>'assetCheck', v_item->>'validationStatus', nullif(v_item->>'validationNotes', ''),
      v_import.id, v_user_id
    ) returning id into v_revision_id;
    update public.mock_questions set current_draft_revision_id = v_revision_id where id = v_identity_id;
    v_answer := '{}'::jsonb;
    for v_option in select value from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb)) loop
      insert into public.mock_question_options(question_revision_id, response_slot_id, option_id, display_order, content_json)
      values (v_revision_id, v_option->>'slotId', v_option->>'optionId', (v_option->>'displayOrder')::integer, v_option->'content');
      if (v_option->>'isCorrect')::boolean then
        if v_answer ? (v_option->>'slotId') then
          raise exception 'Every response slot must have exactly one correct option' using errcode = '23514';
        end if;
        v_answer := jsonb_set(v_answer, array[v_option->>'slotId'], to_jsonb(v_option->>'optionId'), true);
      end if;
    end loop;
    if v_answer = '{}'::jsonb then
      raise exception 'Question has no protected answer key: %', v_item->>'sourceQuestionId' using errcode = '23514';
    end if;
    if jsonb_object_length(v_answer) <> (
      select count(distinct option.response_slot_id) from public.mock_question_options option where option.question_revision_id = v_revision_id
    ) then
      raise exception 'Every response slot must have exactly one correct option' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.mock_question_options option where option.question_revision_id = v_revision_id
      group by option.response_slot_id having count(*) < 2
    ) then
      raise exception 'Every response slot needs at least two options' using errcode = '23514';
    end if;
    if (v_item->>'questionType') in ('PS', 'DS', 'CR', 'RC') and (
      select count(*) from public.mock_question_options option where option.question_revision_id = v_revision_id
    ) <> 5 then
      raise exception '% requires exactly five response options', v_item->>'questionType' using errcode = '23514';
    end if;
    insert into private.mock_question_keys(question_revision_id, answer_json, explanation_json)
    values (v_revision_id, v_answer, nullif(v_item->'explanation', 'null'::jsonb));
    insert into public.mock_import_items(import_id, item_kind, source_external_id, action, entity_id, revision_id, outcome)
    values (v_import.id, 'question', v_item->>'sourceQuestionId', v_action, v_identity_id, v_revision_id, 'pending');
  end loop;

  for v_asset in select value from jsonb_array_elements(coalesce(p_payload->'assets', '[]'::jsonb)) loop
    select id into v_identity_id from public.mock_media
    where namespace_id = v_namespace_id and source_external_id = v_asset->>'sourceAssetId';
    if nullif(v_asset->>'sourceQuestionId', '') is not null then
      select question.current_draft_revision_id into v_revision_id
      from public.mock_questions question
      where question.namespace_id = v_namespace_id and question.source_external_id = v_asset->>'sourceQuestionId';
      if v_revision_id is null then raise exception 'Asset references unresolved question' using errcode = '23503'; end if;
      insert into public.mock_question_media(question_revision_id, media_id, usage)
      values (
        v_revision_id,
        v_identity_id,
        case v_asset->>'usage' when 'question_interaction' then 'interaction' when 'option_content' then 'option' else 'stem' end
      );
    end if;
    if nullif(v_asset->>'sourceStimulusId', '') is not null then
      select stimulus.current_draft_revision_id into v_revision_id
      from public.mock_stimuli stimulus
      where stimulus.namespace_id = v_namespace_id and stimulus.source_external_id = v_asset->>'sourceStimulusId';
      if v_revision_id is null then raise exception 'Asset references unresolved stimulus' using errcode = '23503'; end if;
      insert into public.mock_stimulus_media(stimulus_revision_id, media_id, usage)
      values (
        v_revision_id,
        v_identity_id,
        case v_asset->>'usage' when 'stimulus_panel' then 'panel' when 'stimulus_tab' then 'tab' else 'content' end
      ) on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object('importId', v_import.id, 'idempotent', false, 'status', 'pending');
end;
$$;
revoke all on function public.begin_mock_question_import(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.begin_mock_question_import(text, text, text, text, jsonb, jsonb) to authenticated;

create or replace function public.finalize_mock_question_import(p_import_id uuid, p_result_report jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_portal_admin() then
    raise exception 'Active Admin access required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.mock_imports import
    where import.id = p_import_id and import.uploaded_by = v_user_id and import.status = 'pending'
  ) then
    raise exception 'Pending import not found' using errcode = 'P0002';
  end if;
  update public.mock_media set status = 'ready' where import_id = p_import_id and status = 'pending';
  update public.mock_stimulus_revisions set import_state = 'ready' where import_id = p_import_id and import_state = 'pending';
  update public.mock_question_revisions set import_state = 'ready' where import_id = p_import_id and import_state = 'pending';
  update public.mock_import_items set outcome = 'completed' where import_id = p_import_id;
  update public.mock_imports
  set status = 'completed', result_report = coalesce(p_result_report, '{}'::jsonb), completed_at = statement_timestamp()
  where id = p_import_id;
  return jsonb_build_object('importId', p_import_id, 'status', 'completed');
end;
$$;
revoke all on function public.finalize_mock_question_import(uuid, jsonb) from public, anon;
grant execute on function public.finalize_mock_question_import(uuid, jsonb) to authenticated;

create or replace function public.fail_mock_question_import(p_import_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_portal_admin() then
    raise exception 'Active Admin access required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.mock_imports import
    where import.id = p_import_id and import.uploaded_by = v_user_id and import.status = 'pending'
  ) then
    return;
  end if;
  update public.mock_questions question set current_draft_revision_id = null
  where current_draft_revision_id in (select id from public.mock_question_revisions where import_id = p_import_id);
  update public.mock_stimuli stimulus set current_draft_revision_id = null
  where current_draft_revision_id in (select id from public.mock_stimulus_revisions where import_id = p_import_id);
  delete from private.mock_question_keys where question_revision_id in (
    select id from public.mock_question_revisions where import_id = p_import_id
  );
  delete from public.mock_question_media where question_revision_id in (
    select id from public.mock_question_revisions where import_id = p_import_id
  );
  delete from public.mock_stimulus_media where stimulus_revision_id in (
    select id from public.mock_stimulus_revisions where import_id = p_import_id
  );
  delete from public.mock_question_options where question_revision_id in (
    select id from public.mock_question_revisions where import_id = p_import_id
  );
  delete from public.mock_import_items where import_id = p_import_id;
  delete from public.mock_question_revisions where import_id = p_import_id;
  delete from public.mock_stimulus_revisions where import_id = p_import_id;
  delete from public.mock_media where import_id = p_import_id;
  delete from public.mock_questions question where not exists (
    select 1 from public.mock_question_revisions revision where revision.question_id = question.id
  );
  delete from public.mock_stimuli stimulus where not exists (
    select 1 from public.mock_stimulus_revisions revision where revision.stimulus_id = stimulus.id
  );
  update public.mock_imports
  set status = 'failed', result_report = jsonb_build_object('error', left(coalesce(p_reason, 'Import failed'), 2000)),
      completed_at = statement_timestamp()
  where id = p_import_id;
end;
$$;
revoke all on function public.fail_mock_question_import(uuid, text) from public, anon;
grant execute on function public.fail_mock_question_import(uuid, text) to authenticated;

create or replace function public.set_mock_question_lifecycle(p_revision_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.mock_question_revisions;
  v_new_revision_id uuid;
  v_new_revision_number integer;
begin
  if v_user_id is null or not public.is_portal_admin() then
    raise exception 'Active Admin access required' using errcode = '42501';
  end if;
  select * into v_revision from public.mock_question_revisions where id = p_revision_id for update;
  if not found then raise exception 'Question revision not found' using errcode = 'P0002'; end if;
  if p_action = 'publish' then
    if v_revision.status <> 'draft' or v_revision.import_state <> 'ready' then
      raise exception 'Only a ready Draft can be published' using errcode = '23514';
    end if;
    if not exists (select 1 from private.mock_question_keys where question_revision_id = p_revision_id)
       or not exists (select 1 from public.mock_question_options where question_revision_id = p_revision_id) then
      raise exception 'A complete answer key and response options are required' using errcode = '23514';
    end if;
    update public.mock_question_revisions set status = 'published', published_at = statement_timestamp() where id = p_revision_id;
    update public.mock_questions set current_published_revision_id = p_revision_id, current_draft_revision_id = null where id = v_revision.question_id;
  elsif p_action = 'retire' then
    if v_revision.status <> 'published' then raise exception 'Only a Published revision can be retired' using errcode = '23514'; end if;
    update public.mock_question_revisions set status = 'retired' where id = p_revision_id;
    update public.mock_questions set current_published_revision_id = null where id = v_revision.question_id and current_published_revision_id = p_revision_id;
  elsif p_action = 'revise' then
    if v_revision.status not in ('published', 'retired') then raise exception 'Only frozen content can start a new revision' using errcode = '23514'; end if;
    select coalesce(max(revision_number), 0) + 1 into v_new_revision_number
    from public.mock_question_revisions where question_id = v_revision.question_id;
    insert into public.mock_question_revisions (
      question_id, revision_number, status, import_state, section, question_type, response_type,
      topic_id, subtopic_id, difficulty, stem_json, interaction_json, stimulus_revision_id,
      stimulus_group_order, source_reference, content_fingerprint, answer_confirmation,
      answer_check, asset_check, validation_status, validation_notes, created_by
    ) select
      question_id, v_new_revision_number, 'draft', 'ready', section, question_type, response_type,
      topic_id, subtopic_id, difficulty, stem_json, interaction_json, stimulus_revision_id,
      stimulus_group_order, source_reference, content_fingerprint, answer_confirmation,
      answer_check, asset_check, validation_status, 'Draft revision created from revision ' || revision_number, v_user_id
    from public.mock_question_revisions where id = p_revision_id
    returning id into v_new_revision_id;
    insert into public.mock_question_options(question_revision_id, response_slot_id, option_id, display_order, content_json)
    select v_new_revision_id, response_slot_id, option_id, display_order, content_json
    from public.mock_question_options where question_revision_id = p_revision_id;
    insert into private.mock_question_keys(question_revision_id, answer_json, explanation_json)
    select v_new_revision_id, answer_json, explanation_json from private.mock_question_keys where question_revision_id = p_revision_id;
    insert into public.mock_question_media(question_revision_id, media_id, usage)
    select v_new_revision_id, media_id, usage from public.mock_question_media where question_revision_id = p_revision_id;
    update public.mock_questions set current_draft_revision_id = v_new_revision_id where id = v_revision.question_id;
    return jsonb_build_object('revisionId', v_new_revision_id, 'status', 'draft');
  else
    raise exception 'Unsupported lifecycle action' using errcode = '23514';
  end if;
  return jsonb_build_object('revisionId', p_revision_id, 'status', case when p_action = 'publish' then 'published' else 'retired' end);
end;
$$;
revoke all on function public.set_mock_question_lifecycle(uuid, text) from public, anon;
grant execute on function public.set_mock_question_lifecycle(uuid, text) to authenticated;

create or replace function public.update_mock_question_draft(
  p_revision_id uuid,
  p_stem jsonb,
  p_interaction jsonb,
  p_source_reference text,
  p_validation_notes text,
  p_content_fingerprint text,
  p_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision public.mock_question_revisions;
  v_namespace_id uuid;
  v_option jsonb;
  v_answer jsonb := '{}'::jsonb;
begin
  if v_user_id is null or not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode = '42501'; end if;
  select revision.* into v_revision
  from public.mock_question_revisions revision
  where revision.id = p_revision_id for update;
  if not found then raise exception 'Question revision not found' using errcode = 'P0002'; end if;
  select question.namespace_id into v_namespace_id
  from public.mock_questions question
  where question.id = v_revision.question_id;
  if v_revision.status <> 'draft' or v_revision.import_state <> 'ready' then raise exception 'Only a ready Draft can be edited' using errcode = '23514'; end if;
  if not private.is_mock_namespace_member(v_namespace_id, v_user_id) then raise exception 'Namespace membership required' using errcode = '42501'; end if;
  if length(btrim(p_source_reference)) not between 1 and 1000 or p_content_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'Invalid Draft content metadata' using errcode = '23514'; end if;
  update public.mock_question_revisions set
    stem_json = p_stem, interaction_json = p_interaction, source_reference = btrim(p_source_reference),
    validation_notes = nullif(btrim(p_validation_notes), ''), content_fingerprint = p_content_fingerprint
  where id = p_revision_id;
  delete from public.mock_question_options where question_revision_id = p_revision_id;
  delete from private.mock_question_keys where question_revision_id = p_revision_id;
  for v_option in select value from jsonb_array_elements(coalesce(p_options, '[]'::jsonb)) loop
    insert into public.mock_question_options(question_revision_id, response_slot_id, option_id, display_order, content_json)
    values (p_revision_id, v_option->>'slotId', v_option->>'optionId', (v_option->>'displayOrder')::integer, v_option->'content');
    if (v_option->>'isCorrect')::boolean then
      if v_answer ? (v_option->>'slotId') then raise exception 'Every response slot must have one correct option' using errcode = '23514'; end if;
      v_answer := jsonb_set(v_answer, array[v_option->>'slotId'], to_jsonb(v_option->>'optionId'), true);
    end if;
  end loop;
  if v_answer = '{}'::jsonb or jsonb_object_length(v_answer) <> (
    select count(distinct option.response_slot_id) from public.mock_question_options option where option.question_revision_id = p_revision_id
  ) then raise exception 'Every response slot must have exactly one correct option' using errcode = '23514'; end if;
  insert into private.mock_question_keys(question_revision_id, answer_json) values (p_revision_id, v_answer);
  return jsonb_build_object('revisionId', p_revision_id, 'status', 'draft');
end;
$$;
revoke all on function public.update_mock_question_draft(uuid, jsonb, jsonb, text, text, text, jsonb) from public, anon;
grant execute on function public.update_mock_question_draft(uuid, jsonb, jsonb, text, text, text, jsonb) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mock_source_namespaces', 'mock_source_namespace_members', 'mock_topics', 'mock_imports',
    'mock_stimuli', 'mock_stimulus_revisions', 'mock_questions', 'mock_question_revisions',
    'mock_question_options', 'mock_media', 'mock_question_media', 'mock_stimulus_media', 'mock_import_items'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;
alter table private.mock_question_keys enable row level security;
alter table private.mock_question_keys force row level security;
revoke all on table private.mock_question_keys from public, anon, authenticated;

insert into public.mock_source_namespaces(code, display_name)
values ('UNNATI', 'Unnati'), ('TANYA', 'Tanya'), ('ISHAN', 'Ishan');

insert into public.mock_topics(code, label, section) values
  ('arithmetic', 'Arithmetic', 'quant'),
  ('algebra', 'Algebra', 'quant'),
  ('critical-reasoning', 'Critical Reasoning', 'verbal'),
  ('reading-comprehension', 'Reading Comprehension', 'verbal'),
  ('graphics-interpretation', 'Graphics Interpretation', 'data_insights'),
  ('table-analysis', 'Table Analysis', 'data_insights'),
  ('multi-source-reasoning', 'Multi-Source Reasoning', 'data_insights'),
  ('two-part-analysis', 'Two-Part Analysis', 'data_insights');

insert into public.mock_topics(code, label, section, parent_id)
select child.code, child.label, parent.section, parent.id
from (values
  ('percentages', 'Percentages', 'arithmetic'),
  ('linear-equations', 'Linear equations', 'algebra'),
  ('strengthen', 'Strengthen', 'critical-reasoning'),
  ('inference', 'Inference', 'reading-comprehension'),
  ('percent-change', 'Percent change', 'graphics-interpretation'),
  ('classification', 'Classification', 'table-analysis'),
  ('synthesis', 'Synthesis', 'multi-source-reasoning'),
  ('optimization', 'Optimization', 'two-part-analysis')
) as child(code, label, parent_code)
join public.mock_topics parent on parent.code = child.parent_code;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mock-media', 'mock-media', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client Storage policies are created. Authenticated browser clients cannot list,
-- upload, update, or read mock-media. Admin Route Handlers use the server-only
-- service role after an active-Admin and namespace-membership check.

commit;
