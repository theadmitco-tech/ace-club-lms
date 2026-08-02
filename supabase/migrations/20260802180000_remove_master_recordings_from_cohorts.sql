begin;

create or replace function public.remove_master_recording(p_master_material_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  master_type text;
  removed_copies integer;
begin
  if not public.is_portal_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select material.type
  into master_type
  from public.master_materials as material
  where material.id = p_master_material_id;

  if master_type is distinct from 'video' then
    raise exception 'Master recording not found' using errcode = 'P0002';
  end if;

  delete from public.materials as material
  where material.master_material_id = p_master_material_id;

  get diagnostics removed_copies = row_count;

  delete from public.master_materials as material
  where material.id = p_master_material_id
    and material.type = 'video';

  return jsonb_build_object('linked_materials_removed', removed_copies);
end;
$$;

revoke all on function public.remove_master_recording(uuid) from public;
grant execute on function public.remove_master_recording(uuid) to authenticated;

commit;
