-- Full Course programme content remains undated and separate from subject grants.
begin;
create or replace function public.v2_course_sessions_valid(p_sessions jsonb, p_sections text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare v_session jsonb; v_ids text[]:=array[]::text[];
begin
  if p_sections is null or jsonb_typeof(p_sessions) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_sessions)>100 then return false; end if;
  for v_session in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(v_session) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(v_session))<>4 or not(v_session ?& array['key','title','section','content']) then return false; end if;
    if jsonb_typeof(v_session->'key') is distinct from 'string'
      or v_session->>'key' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_session->>'key')=any(v_ids)
      or jsonb_typeof(v_session->'title') is distinct from 'string'
      or length(v_session->>'title') not between 1 and 120
      or v_session->>'title'<>btrim(v_session->>'title',E' \t\n\r\f\013')
      or jsonb_typeof(v_session->'section') is distinct from 'string'
      or not((v_session->>'section')=any(p_sections)
        or ((v_session->>'section')='programme' and p_sections=array['quant','verbal','di']))
      or not public.v2_session_content_valid(v_session->'content') then return false; end if;
    v_ids:=array_append(v_ids,v_session->>'key');
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_course_sessions_valid(jsonb,text[]) from public,anon,authenticated,service_role;

create or replace function public.v2_session_content_valid(p_content jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare v_kind text; v_item jsonb; v_ids text[]:=array[]::text[];
begin
  if jsonb_typeof(p_content) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 4 or not (p_content ?& array['materials','recordings','preSessionReads','postSessionReads']) then return false; end if;
  foreach v_kind in array array['materials','recordings','preSessionReads','postSessionReads'] loop
    if jsonb_typeof(p_content->v_kind) is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_content->v_kind)>50 then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->v_kind) loop
      if jsonb_typeof(v_item) is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_object_keys(v_item))<>3 or not (v_item ?& array['key','title','url']) then return false; end if;
      if jsonb_typeof(v_item->'key') is distinct from 'string'
        or (v_item->>'key') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (v_item->>'key')=any(v_ids)
        or jsonb_typeof(v_item->'title') is distinct from 'string' or length(v_item->>'title') not between 1 and 120
        or v_item->>'title'<>btrim(v_item->>'title',E' \t\n\r\f\013')
        or jsonb_typeof(v_item->'url') is distinct from 'string' or length(v_item->>'url')>2048
        or not ((v_item->>'url') ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^\s\\]*)?$' or (v_item->>'url') ~* '^/api/materials/file\?path=(worksheets|session-materials)%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}%2F[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
        then return false; end if;
      v_ids:=array_append(v_ids,v_item->>'key');
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function public.v2_session_content_valid(jsonb) from public,anon,authenticated,service_role;

commit;
