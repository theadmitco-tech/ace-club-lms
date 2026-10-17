begin;

alter table public.course_template_resources
  add column question_count integer;

update public.course_template_resources as resource
set question_count = master.question_count
from public.master_materials as master
where resource.resource_type = 'worksheet'
  and resource.master_material_id = master.id
  and master.question_count is not null;

alter table public.course_template_resources
  add constraint course_template_resources_question_count_check check (
    question_count is null
    or (resource_type = 'worksheet' and question_count > 0)
  );

create or replace function public.apply_template_resource_question_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_question_count integer;
begin
  if new.type <> 'worksheet' or new.source_template_resource_id is null then
    return new;
  end if;

  select coalesce(resource.question_count, master.question_count)
  into v_question_count
  from public.course_template_resources as resource
  left join public.master_materials as master on master.id = resource.master_material_id
  where resource.id = new.source_template_resource_id;

  if v_question_count is not null then
    new.question_count := v_question_count;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_template_resource_question_count on public.materials;
create trigger apply_template_resource_question_count
before insert or update of source_template_resource_id, type, question_count
on public.materials
for each row execute function public.apply_template_resource_question_count();

revoke all on function public.apply_template_resource_question_count() from public, anon, authenticated;

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
    if v_type = 'worksheet'
      and coalesce(v_resource->>'questionCount', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Reusable worksheet needs a positive number of questions';
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
      text_content = case when v_resource->>'format' = 'text' then nullif(btrim(v_resource->>'textContent'), '') else null end,
      question_count = case when v_resource->>'resourceType' = 'worksheet' then (v_resource->>'questionCount')::integer else null end
    where revision_id = v_revision_id and resource_key = v_resource->>'key';
  end loop;
  return v_revision_id;
end;
$$;

revoke all on function public.create_course_template_revision_v2(uuid, uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_course_template_revision_v2(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;

commit;
