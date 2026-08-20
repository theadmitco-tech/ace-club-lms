begin;

alter table public.course_template_resources
  add column resource_format text,
  add column notion_url text,
  add column file_url text,
  add column text_content text;

update public.course_template_resources as resource
set
  resource_format = case resource.resource_type
    when 'worksheet' then 'pdf'
    when 'pre_read' then 'notion'
    else 'text'
  end,
  notion_url = case when resource.resource_type = 'pre_read' then master.notion_url end,
  file_url = case when resource.resource_type = 'worksheet' then master.file_url end,
  text_content = case when resource.resource_type = 'starter' then resource.title end
from public.master_materials as master
where master.id = resource.master_material_id;

update public.course_template_resources
set resource_format = coalesce(resource_format, 'text'),
    text_content = case when resource_format is null then title else text_content end;

alter table public.course_template_resources
  alter column resource_format set not null,
  add constraint course_template_resources_format_check check (resource_format in ('notion', 'pdf', 'text')),
  add constraint course_template_resources_content_check check (
    (resource_type = 'starter' and resource_format in ('notion', 'text'))
    or (resource_type = 'pre_read' and resource_format = 'notion')
    or (resource_type = 'worksheet' and resource_format = 'pdf')
  ),
  add constraint course_template_resources_shape_check check (
    (resource_format = 'notion' and file_url is null and text_content is null and (notion_url is not null or master_material_id is not null))
    or (resource_format = 'pdf' and notion_url is null and text_content is null and (file_url is not null or master_material_id is not null))
    or (resource_format = 'text' and notion_url is null and file_url is null and text_content is not null)
  );

create or replace function public.prepare_course_template_resource_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resource_format is null then
    new.resource_format := case new.resource_type when 'worksheet' then 'pdf' when 'pre_read' then 'notion' else 'text' end;
  end if;
  if new.master_material_id is not null then
    select
      case when new.resource_format = 'notion' then material.notion_url end,
      case when new.resource_format = 'pdf' then material.file_url end
    into new.notion_url, new.file_url
    from public.master_materials as material
    where material.id = new.master_material_id;
  elsif new.resource_format = 'notion' and new.notion_url is null then
    new.notion_url := 'https://notion.site/pending-template-resource';
  elsif new.resource_format = 'pdf' and new.file_url is null then
    new.file_url := '/api/materials/file?path=worksheets%2F00000000-0000-4000-8000-000000000000%2F00000000-0000-4000-8000-000000000000.pdf';
  elsif new.resource_format = 'text' and new.text_content is null then
    new.text_content := new.title;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_course_template_resource_content on public.course_template_resources;
create trigger prepare_course_template_resource_content
before insert on public.course_template_resources
for each row execute function public.prepare_course_template_resource_content();

create or replace function public.create_course_template_revision_v2(
  p_template_id uuid,
  p_expected_revision_id uuid,
  p_title text,
  p_sections jsonb,
  p_events jsonb,
  p_resources jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision_id uuid;
  v_resource jsonb;
  v_format text;
  v_type text;
  v_notion_url text;
  v_file_url text;
  v_text_content text;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  for v_resource in select value from jsonb_array_elements(p_resources)
  loop
    v_format := v_resource->>'format';
    v_type := v_resource->>'resourceType';
    v_notion_url := nullif(btrim(v_resource->>'notionUrl'), '');
    v_file_url := nullif(btrim(v_resource->>'fileUrl'), '');
    v_text_content := nullif(btrim(v_resource->>'textContent'), '');
    if (v_type = 'starter' and v_format not in ('notion', 'text'))
      or (v_type = 'pre_read' and v_format <> 'notion')
      or (v_type = 'worksheet' and v_format <> 'pdf') then
      raise exception 'Reusable resource type and format do not match';
    end if;
    if v_format = 'notion' and nullif(v_resource->>'masterMaterialId', '') is null
      and (v_notion_url is null or v_notion_url !~* '^https://([a-z0-9-]+[.])?notion[.](so|site)/') then
      raise exception 'Reusable Notion resource needs a valid HTTPS link';
    end if;
    if v_format = 'pdf' and nullif(v_resource->>'masterMaterialId', '') is null
      and (v_file_url is null or v_file_url !~* '^/api/materials/file[?]path=worksheets%2f[0-9a-f-]+%2f[0-9a-f-]+[.]pdf$') then
      raise exception 'Reusable worksheet needs a protected PDF';
    end if;
    if v_format = 'text' and (v_text_content is null or length(v_text_content) > 2000) then
      raise exception 'Reusable text must be between 1 and 2000 characters';
    end if;
  end loop;

  v_revision_id := public.create_course_template_revision(
    p_template_id, p_expected_revision_id, p_title, p_sections, p_events, p_resources
  );

  for v_resource in select value from jsonb_array_elements(p_resources)
  loop
    update public.course_template_resources
    set
      resource_format = v_resource->>'format',
      notion_url = case when v_resource->>'format' = 'notion' then nullif(btrim(v_resource->>'notionUrl'), '') else null end,
      file_url = case when v_resource->>'format' = 'pdf' then nullif(btrim(v_resource->>'fileUrl'), '') else null end,
      text_content = case when v_resource->>'format' = 'text' then nullif(btrim(v_resource->>'textContent'), '') else null end
    where revision_id = v_revision_id and resource_key = v_resource->>'key';
  end loop;
  return v_revision_id;
end;
$$;

revoke all on function public.create_course_template_revision(uuid, uuid, text, jsonb, jsonb, jsonb) from authenticated;
revoke all on function public.create_course_template_revision_v2(uuid, uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_course_template_revision_v2(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;

alter table public.materials
  add column course_id uuid references public.courses(id) on delete cascade,
  add column category text,
  add column resource_scope text,
  add column section_key text,
  add column resource_format text,
  add column text_content text,
  add column source_template_resource_id uuid references public.course_template_resources(id) on delete restrict;

update public.materials as material
set
  course_id = session.course_id,
  category = case material.type
    when 'pre_read' then 'pre_read'
    when 'worksheet' then 'worksheet'
    when 'video' then 'recording'
    when 'session_material' then 'session_material'
    else 'post_class'
  end,
  resource_scope = 'event',
  resource_format = case material.type
    when 'pre_read' then 'notion'
    when 'worksheet' then 'pdf'
    when 'video' then 'youtube'
    when 'session_material' then 'pdf'
    else case
      when material.notion_url is not null then 'notion'
      when material.file_url is not null then 'pdf'
      when material.video_url is not null then 'youtube'
      else 'text'
    end
  end
from public.sessions as session
where session.id = material.session_id;

alter table public.materials
  alter column session_id drop not null,
  alter column course_id set not null,
  alter column category set not null,
  alter column resource_scope set not null,
  alter column resource_format set not null,
  add constraint materials_category_check check (category in (
    'starter_pack', 'pre_read', 'worksheet', 'session_material',
    'recording', 'post_class', 'reference', 'other'
  )),
  add constraint materials_resource_scope_check check (resource_scope in (
    'batch', 'section', 'event', 'standalone'
  )),
  add constraint materials_resource_format_check check (resource_format in (
    'notion', 'pdf', 'youtube', 'text'
  )),
  add constraint materials_section_key_check check (
    section_key is null or section_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  add constraint materials_text_content_check check (
    text_content is null or length(btrim(text_content)) between 1 and 2000
  ),
  add constraint materials_resource_association_check check (
    (resource_scope = 'event' and session_id is not null and section_key is null)
    or (resource_scope = 'section' and session_id is null and section_key is not null)
    or (resource_scope in ('batch', 'standalone') and session_id is null and section_key is null)
  ),
  add constraint materials_batch_owned_resource_check check (
    category not in ('recording', 'session_material')
    or (resource_scope = 'event' and session_id is not null and master_material_id is null)
  ),
  add constraint materials_reusable_origin_check check (
    (master_material_id is null or category in ('pre_read', 'worksheet'))
    and (source_template_resource_id is null or category in ('starter_pack', 'pre_read', 'worksheet'))
  ),
  add constraint materials_category_type_check check (
    (category = 'pre_read' and type = 'pre_read')
    or (category = 'worksheet' and type = 'worksheet')
    or (category = 'recording' and type = 'video')
    or (category = 'session_material' and type = 'session_material')
    or (category in ('starter_pack', 'post_class', 'reference', 'other') and type = 'class_material')
  ),
  add constraint materials_format_shape_check check (
    (resource_format = 'notion' and file_url is null and video_url is null and text_content is null)
    or (resource_format = 'pdf' and notion_url is null and video_url is null and text_content is null)
    or (resource_format = 'youtube' and notion_url is null and file_url is null and text_content is null)
    or (resource_format = 'text' and notion_url is null and file_url is null and video_url is null)
  );

create index materials_course_scope_idx
  on public.materials(course_id, resource_scope, category, created_at);
create index materials_course_section_idx
  on public.materials(course_id, section_key, category, created_at)
  where section_key is not null;
create index materials_source_template_resource_idx
  on public.materials(source_template_resource_id)
  where source_template_resource_id is not null;
create unique index materials_course_template_resource_key
  on public.materials(course_id, source_template_resource_id)
  where source_template_resource_id is not null;

create or replace function public.enforce_flexible_resource_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  if new.session_id is not null then
    select * into v_session from public.sessions where id = new.session_id;
    if not found then raise exception 'Batch event not found' using errcode = 'P0002'; end if;
    if new.course_id is null then new.course_id := v_session.course_id; end if;
    if new.course_id is distinct from v_session.course_id then
      raise exception 'Resource event does not belong to the selected batch';
    end if;
  end if;

  if new.course_id is null then raise exception 'Resource batch is required'; end if;
  if nullif(btrim(new.title), '') is null then raise exception 'Resource title is required'; end if;
  new.title := btrim(new.title);

  -- Compatibility for established generation and sync functions. New Phase 3
  -- writes supply these fields explicitly; older event-linked writes are
  -- classified without changing their release or ownership behavior.
  if new.category is null then
    new.category := case new.type
      when 'pre_read' then 'pre_read'
      when 'worksheet' then 'worksheet'
      when 'video' then 'recording'
      when 'session_material' then 'session_material'
      else 'post_class'
    end;
  end if;
  if new.resource_scope is null then new.resource_scope := 'event'; end if;
  if new.resource_format is null then
    new.resource_format := case
      when new.type = 'pre_read' then 'notion'
      when new.type in ('worksheet', 'session_material') then 'pdf'
      when new.type = 'video' then 'youtube'
      when new.notion_url is not null then 'notion'
      when new.file_url is not null then 'pdf'
      when new.video_url is not null then 'youtube'
      else 'text'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_flexible_resource_shape on public.materials;
create trigger enforce_flexible_resource_shape
before insert or update on public.materials
for each row execute function public.enforce_flexible_resource_shape();

create or replace function public.protect_released_batch_owned_resource()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.category not in ('recording', 'session_material')
    or old.available_from > statement_timestamp() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Released resources cannot be changed or withdrawn';
end;
$$;

drop trigger if exists protect_released_batch_owned_resource on public.materials;
create trigger protect_released_batch_owned_resource
before update or delete on public.materials
for each row execute function public.protect_released_batch_owned_resource();

create or replace function public.save_batch_resource(
  p_course_id uuid,
  p_title text,
  p_category text,
  p_resource_scope text,
  p_resource_format text,
  p_section_key text default null,
  p_session_id uuid default null,
  p_notion_url text default null,
  p_file_url text default null,
  p_video_url text default null,
  p_text_content text default null,
  p_material_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_session public.sessions;
  v_existing public.materials;
  v_saved public.materials;
  v_type text;
  v_available_from timestamptz;
  v_notion_url text := nullif(btrim(p_notion_url), '');
  v_file_url text := nullif(btrim(p_file_url), '');
  v_video_url text := nullif(btrim(p_video_url), '');
  v_text_content text := nullif(btrim(p_text_content), '');
  v_previous_file_url text;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 160 then
    raise exception 'Resource title is required and must be at most 160 characters';
  end if;
  if p_category not in ('starter_pack', 'pre_read', 'worksheet', 'session_material', 'recording', 'post_class', 'reference', 'other') then
    raise exception 'Unsupported resource category';
  end if;
  if p_resource_scope not in ('batch', 'section', 'event', 'standalone') then
    raise exception 'Unsupported resource association';
  end if;
  if p_resource_format not in ('notion', 'pdf', 'youtube', 'text') then
    raise exception 'Unsupported resource format';
  end if;

  select * into v_course from public.courses where id = p_course_id for share;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;

  if p_resource_scope = 'event' then
    select * into v_session
    from public.sessions
    where id = p_session_id and course_id = p_course_id
    for share;
    if not found then raise exception 'The selected event does not belong to this batch' using errcode = 'P0002'; end if;
  elsif p_session_id is not null then
    raise exception 'Only event resources can be attached to an event';
  end if;
  if p_resource_scope = 'section' then
    if nullif(btrim(p_section_key), '') is null then raise exception 'Section is required'; end if;
  elsif p_section_key is not null then
    raise exception 'Only Section resources can carry a Section association';
  end if;
  if p_category in ('recording', 'session_material') and p_resource_scope <> 'event' then
    raise exception 'Recordings and Session materials must belong to one batch event';
  end if;

  if p_category = 'pre_read' and p_resource_format <> 'notion' then raise exception 'Pre-reads use Notion links'; end if;
  if p_category in ('worksheet', 'session_material') and p_resource_format <> 'pdf' then raise exception 'This category uses a protected PDF'; end if;
  if p_category = 'recording' and p_resource_format <> 'youtube' then raise exception 'Recordings use YouTube links'; end if;
  if p_category = 'starter_pack' and p_resource_format not in ('notion', 'text') then raise exception 'Starter packs use Notion links or text'; end if;

  if p_resource_format = 'notion' and (
    v_notion_url is null or v_notion_url !~* '^https://([a-z0-9-]+[.])?notion[.](so|site)/'
  ) then raise exception 'Enter a valid Notion HTTPS link'; end if;
  if p_resource_format = 'youtube' and not public.is_supported_youtube_url(v_video_url) then
    raise exception 'Enter a valid YouTube or youtu.be link';
  end if;
  if p_resource_format = 'text' and (v_text_content is null or length(v_text_content) > 2000) then
    raise exception 'Text instructions are required and must be at most 2000 characters';
  end if;
  if p_resource_format = 'pdf' then
    if p_category = 'worksheet' and v_file_url !~* '^/api/materials/file[?]path=worksheets%2f[0-9a-f-]+%2f[0-9a-f-]+[.]pdf$' then
      raise exception 'Upload a protected worksheet PDF';
    end if;
    if p_category = 'session_material' and v_file_url !~* (
      '^/api/materials/file[?]path=session-materials%2f' || p_session_id::text || '%2f[0-9a-f-]+[.]pdf$'
    ) then raise exception 'Upload a protected PDF for the selected batch event'; end if;
  end if;

  v_type := case p_category
    when 'pre_read' then 'pre_read'
    when 'worksheet' then 'worksheet'
    when 'recording' then 'video'
    when 'session_material' then 'session_material'
    else 'class_material'
  end;
  v_available_from := case
    when p_category = 'starter_pack' then v_course.created_at
    when p_resource_scope = 'event' and p_category = 'pre_read' then v_session.session_date - interval '7 days'
    when p_resource_scope = 'event' and p_category in ('worksheet', 'recording', 'session_material', 'post_class') then v_session.session_end_at
    else statement_timestamp()
  end;
  if v_available_from is null then raise exception 'The selected event needs an end time before adding this resource'; end if;

  if p_material_id is not null then
    select * into v_existing
    from public.materials
    where id = p_material_id and course_id = p_course_id
    for update;
    if not found then raise exception 'Batch resource not found' using errcode = 'P0002'; end if;
    if v_existing.available_from <= statement_timestamp() then
      raise exception 'Released resources cannot be changed or withdrawn';
    end if;
    if v_existing.file_url is distinct from v_file_url then
      v_previous_file_url := v_existing.file_url;
    end if;
  end if;

  if p_material_id is null then
    insert into public.materials (
      course_id, session_id, master_material_id, type, category, resource_scope,
      section_key, resource_format, title, notion_url, file_url, video_url,
      text_content, available_from
    ) values (
      p_course_id, p_session_id, null, v_type, p_category, p_resource_scope,
      case when p_resource_scope = 'section' then btrim(p_section_key) else null end,
      p_resource_format, btrim(p_title),
      case when p_resource_format = 'notion' then v_notion_url else null end,
      case when p_resource_format = 'pdf' then v_file_url else null end,
      case when p_resource_format = 'youtube' then v_video_url else null end,
      case when p_resource_format = 'text' then v_text_content else null end,
      v_available_from
    ) returning * into v_saved;
  else
    update public.materials
    set
      session_id = p_session_id,
      master_material_id = null,
      source_template_resource_id = null,
      type = v_type,
      category = p_category,
      resource_scope = p_resource_scope,
      section_key = case when p_resource_scope = 'section' then btrim(p_section_key) else null end,
      resource_format = p_resource_format,
      title = btrim(p_title),
      notion_url = case when p_resource_format = 'notion' then v_notion_url else null end,
      file_url = case when p_resource_format = 'pdf' then v_file_url else null end,
      video_url = case when p_resource_format = 'youtube' then v_video_url else null end,
      text_content = case when p_resource_format = 'text' then v_text_content else null end,
      available_from = v_available_from
    where id = p_material_id
    returning * into v_saved;
  end if;

  return jsonb_build_object(
    'id', v_saved.id,
    'availableFrom', v_saved.available_from,
    'previousFileUrl', v_previous_file_url
  );
end;
$$;

create or replace function public.remove_unreleased_batch_resource(
  p_course_id uuid,
  p_material_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed public.materials;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  delete from public.materials
  where id = p_material_id
    and course_id = p_course_id
    and available_from > statement_timestamp()
  returning * into v_removed;
  if v_removed.id is null then
    raise exception 'Released resources cannot be changed or withdrawn' using errcode = 'P0002';
  end if;
  return jsonb_build_object('id', v_removed.id, 'fileUrl', v_removed.file_url);
end;
$$;

create or replace function public.confirm_template_batch_v2(
  p_name text,
  p_template_id uuid,
  p_expected_revision_id uuid,
  p_start_date date,
  p_publication_state text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_course_id uuid;
  v_linked integer;
  v_inserted integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  v_result := public.confirm_template_batch(
    p_name, p_template_id, p_expected_revision_id, p_start_date, p_publication_state, p_idempotency_key
  );
  v_course_id := (v_result->>'courseId')::uuid;

  update public.materials as material
  set source_template_resource_id = resource.id
  from public.course_template_resources as resource
  join public.sessions as session
    on session.course_id = v_course_id and session.source_template_event_id = resource.event_id
  where resource.revision_id = p_expected_revision_id
    and resource.master_material_id is not null
    and material.course_id = v_course_id
    and material.session_id = session.id
    and material.master_material_id = resource.master_material_id
    and material.source_template_resource_id is null;
  get diagnostics v_linked = row_count;

  insert into public.materials (
    course_id, session_id, master_material_id, type, category, resource_scope,
    section_key, resource_format, title, notion_url, file_url, video_url,
    text_content, question_count, available_from, source_template_resource_id
  )
  select
    course.id,
    session.id,
    resource.master_material_id,
    case resource.resource_type when 'pre_read' then 'pre_read' when 'worksheet' then 'worksheet' else 'class_material' end,
    case resource.resource_type when 'starter' then 'starter_pack' else resource.resource_type end,
    case resource.resource_scope when 'template' then 'batch' else resource.resource_scope end,
    case when resource.resource_scope = 'section' then section.section_key end,
    resource.resource_format,
    resource.title,
    case when resource.resource_format = 'notion' then coalesce(resource.notion_url, master.notion_url) end,
    case when resource.resource_format = 'pdf' then coalesce(resource.file_url, master.file_url) end,
    null,
    case when resource.resource_format = 'text' then resource.text_content end,
    master.question_count,
    case
      when resource.resource_type = 'starter' then course.created_at
      when resource.resource_scope = 'event' and resource.resource_type = 'pre_read' then session.session_date - interval '7 days'
      when resource.resource_scope = 'event' and resource.resource_type = 'worksheet' then session.session_end_at
      else course.created_at
    end,
    resource.id
  from public.courses as course
  join public.course_template_resources as resource on resource.revision_id = course.source_template_revision_id
  left join public.course_template_sections as section on section.id = resource.section_id
  left join public.sessions as session
    on resource.resource_scope = 'event'
    and session.course_id = course.id
    and session.source_template_event_id = resource.event_id
  left join public.master_materials as master on master.id = resource.master_material_id
  where course.id = v_course_id
    and not exists (
      select 1 from public.materials as existing
      where existing.course_id = course.id and existing.source_template_resource_id = resource.id
    );
  get diagnostics v_inserted = row_count;

  return v_result || jsonb_build_object(
    'materials', (
      select count(*) from public.materials
      where course_id = v_course_id and source_template_resource_id is not null
    ),
    'resourcesLinked', v_linked,
    'resourcesInserted', v_inserted
  );
end;
$$;

revoke all on function public.confirm_template_batch(text, uuid, uuid, date, text, uuid) from authenticated;
revoke all on function public.confirm_template_batch_v2(text, uuid, uuid, date, text, uuid) from public, anon;
grant execute on function public.confirm_template_batch_v2(text, uuid, uuid, date, text, uuid) to authenticated;

create or replace function public.preview_course_template_resource_sync(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_current_revision_id uuid;
  v_resource record;
  v_existing public.materials;
  v_session_id uuid;
  v_add jsonb := '[]'::jsonb;
  v_update jsonb := '[]'::jsonb;
  v_preserve jsonb := '[]'::jsonb;
  v_unmatched jsonb := '[]'::jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.source_template_id is null then raise exception 'Template batch not found' using errcode = 'P0002'; end if;
  select current_revision_id into v_current_revision_id from public.course_templates where id = v_course.source_template_id;

  for v_resource in
    select resource.*, event.event_key
    from public.course_template_resources as resource
    left join public.course_template_events as event on event.id = resource.event_id
    where resource.revision_id = v_current_revision_id
    order by resource.display_order, resource.id
  loop
    v_session_id := null;
    if v_resource.resource_scope = 'event' then
      select session.id into v_session_id
      from public.sessions as session
      join public.course_template_events as source_event on source_event.id = session.source_template_event_id
      where session.course_id = p_course_id and source_event.event_key = v_resource.event_key;
      if v_session_id is null then
        v_unmatched := v_unmatched || jsonb_build_array(jsonb_build_object('key', v_resource.resource_key, 'title', v_resource.title));
        continue;
      end if;
    end if;
    select material.* into v_existing
    from public.materials as material
    join public.course_template_resources as source on source.id = material.source_template_resource_id
    where material.course_id = p_course_id and source.resource_key = v_resource.resource_key
    limit 1;
    if not found then
      v_add := v_add || jsonb_build_array(jsonb_build_object('key', v_resource.resource_key, 'title', v_resource.title));
    elsif v_existing.available_from <= statement_timestamp() then
      v_preserve := v_preserve || jsonb_build_array(jsonb_build_object('key', v_resource.resource_key, 'title', v_existing.title));
    elsif (v_existing.title, v_existing.session_id, v_existing.resource_scope, v_existing.section_key,
      v_existing.resource_format, v_existing.notion_url, v_existing.file_url, v_existing.text_content)
      is distinct from
      (v_resource.title, v_session_id, case v_resource.resource_scope when 'template' then 'batch' else v_resource.resource_scope end,
       case when v_resource.resource_scope = 'section' then (select section_key from public.course_template_sections where id = v_resource.section_id) end,
       v_resource.resource_format, v_resource.notion_url, v_resource.file_url, v_resource.text_content) then
      v_update := v_update || jsonb_build_array(jsonb_build_object('key', v_resource.resource_key, 'title', v_resource.title));
    end if;
  end loop;
  return jsonb_build_object('revisionId', v_current_revision_id, 'add', v_add, 'update', v_update, 'preserveReleased', v_preserve, 'unmatched', v_unmatched);
end;
$$;

create or replace function public.sync_course_template_resources(p_course_id uuid, p_expected_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses;
  v_current_revision_id uuid;
  v_resource record;
  v_existing public.materials;
  v_session public.sessions;
  v_section_key text;
  v_scope text;
  v_type text;
  v_category text;
  v_available_from timestamptz;
  v_added integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_preserved integer := 0;
  v_unmatched integer := 0;
begin
  if not public.is_portal_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_course from public.courses where id = p_course_id for update;
  if not found or v_course.source_template_id is null then raise exception 'Template batch not found' using errcode = 'P0002'; end if;
  select current_revision_id into v_current_revision_id from public.course_templates where id = v_course.source_template_id;
  if v_current_revision_id is distinct from p_expected_revision_id then
    raise exception 'Template resources changed after review. Review consequences again.' using errcode = 'P0001';
  end if;

  for v_resource in
    select resource.*, section.section_key, event.event_key,
      coalesce(resource.notion_url, master.notion_url) as effective_notion_url,
      coalesce(resource.file_url, master.file_url) as effective_file_url,
      master.question_count as effective_question_count
    from public.course_template_resources as resource
    left join public.course_template_sections as section on section.id = resource.section_id
    left join public.course_template_events as event on event.id = resource.event_id
    left join public.master_materials as master on master.id = resource.master_material_id
    where resource.revision_id = v_current_revision_id
    order by resource.display_order, resource.id
  loop
    v_session := null;
    if v_resource.resource_scope = 'event' then
      select session.* into v_session
      from public.sessions as session
      join public.course_template_events as source_event on source_event.id = session.source_template_event_id
      where session.course_id = p_course_id and source_event.event_key = v_resource.event_key;
      if v_session.id is null then v_unmatched := v_unmatched + 1; continue; end if;
    end if;
    v_scope := case v_resource.resource_scope when 'template' then 'batch' else v_resource.resource_scope end;
    v_section_key := case when v_resource.resource_scope = 'section' then v_resource.section_key end;
    v_type := case v_resource.resource_type when 'pre_read' then 'pre_read' when 'worksheet' then 'worksheet' else 'class_material' end;
    v_category := case v_resource.resource_type when 'starter' then 'starter_pack' else v_resource.resource_type end;
    v_available_from := case
      when v_resource.resource_type = 'starter' then v_course.created_at
      when v_resource.resource_scope = 'event' and v_resource.resource_type = 'pre_read' then v_session.session_date - interval '7 days'
      when v_resource.resource_scope = 'event' and v_resource.resource_type = 'worksheet' then v_session.session_end_at
      else statement_timestamp()
    end;

    select material.* into v_existing
    from public.materials as material
    join public.course_template_resources as source on source.id = material.source_template_resource_id
    where material.course_id = p_course_id and source.resource_key = v_resource.resource_key
    limit 1 for update of material;
    if not found then
      insert into public.materials (
        course_id, session_id, master_material_id, type, category, resource_scope, section_key,
        resource_format, title, notion_url, file_url, text_content, question_count,
        available_from, source_template_resource_id
      ) values (
        p_course_id, v_session.id, v_resource.master_material_id, v_type, v_category, v_scope, v_section_key,
        v_resource.resource_format, v_resource.title, v_resource.effective_notion_url,
        v_resource.effective_file_url, v_resource.text_content, v_resource.effective_question_count,
        v_available_from, v_resource.id
      );
      v_added := v_added + 1;
    elsif v_existing.available_from <= statement_timestamp() then
      v_preserved := v_preserved + 1;
    elsif (v_existing.title, v_existing.session_id, v_existing.resource_scope, v_existing.section_key,
      v_existing.resource_format, v_existing.notion_url, v_existing.file_url, v_existing.text_content)
      is distinct from
      (v_resource.title, v_session.id, v_scope, v_section_key, v_resource.resource_format,
       v_resource.effective_notion_url, v_resource.effective_file_url, v_resource.text_content) then
      update public.materials set
        session_id = v_session.id, master_material_id = v_resource.master_material_id,
        type = v_type, category = v_category, resource_scope = v_scope, section_key = v_section_key,
        resource_format = v_resource.resource_format, title = v_resource.title,
        notion_url = v_resource.effective_notion_url, file_url = v_resource.effective_file_url,
        text_content = v_resource.text_content, question_count = v_resource.effective_question_count,
        available_from = v_available_from, source_template_resource_id = v_resource.id
      where id = v_existing.id;
      v_updated := v_updated + 1;
    else
      v_unchanged := v_unchanged + 1;
    end if;
  end loop;
  return jsonb_build_object('added', v_added, 'updated', v_updated, 'unchanged', v_unchanged, 'preservedReleased', v_preserved, 'unmatched', v_unmatched);
end;
$$;

revoke all on function public.preview_course_template_resource_sync(uuid) from public, anon;
revoke all on function public.sync_course_template_resources(uuid, uuid) from public, anon;
grant execute on function public.preview_course_template_resource_sync(uuid) to authenticated;
grant execute on function public.sync_course_template_resources(uuid, uuid) to authenticated;

drop policy if exists "Authorised users can view materials" on public.materials;
create policy "Authorised users can view materials"
on public.materials
as permissive
for select
to public
using (
  available_from <= statement_timestamp()
  and (
    exists (
      select 1 from public.sessions as session
      where session.id = materials.session_id
        and session.is_published = true
        and public.can_access_course(session.course_id)
    )
    or (
      materials.session_id is null
      and exists (
        select 1 from public.courses as course
        where course.id = materials.course_id
          and course.is_active = true
          and public.can_access_course(course.id)
      )
    )
  )
);

revoke all on function public.enforce_flexible_resource_shape() from public;
revoke all on function public.protect_released_batch_owned_resource() from public;
revoke all on function public.save_batch_resource(uuid, text, text, text, text, text, uuid, text, text, text, text, uuid) from public;
revoke all on function public.remove_unreleased_batch_resource(uuid, uuid) from public;
revoke all on function public.save_batch_resource(uuid, text, text, text, text, text, uuid, text, text, text, text, uuid) from anon;
revoke all on function public.remove_unreleased_batch_resource(uuid, uuid) from anon;
grant execute on function public.save_batch_resource(uuid, text, text, text, text, text, uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.remove_unreleased_batch_resource(uuid, uuid) to authenticated;

commit;
