begin;

-- Reusable pre-reads and worksheets are owned by Master Base. Older schema
-- behavior detached cohort copies when a master item was removed, leaving
-- stale actions visible to Students. First recover any link that can be proven
-- by its source URL, then remove only rows with no corresponding master item.
update public.materials as material
set master_material_id = master.id
from public.sessions as session
join public.master_materials as master
  on master.master_session_id = session.master_session_id
where material.session_id = session.id
  and material.master_material_id is null
  and material.type = master.type
  and material.type in ('pre_read', 'worksheet')
  and case
    when material.type = 'pre_read' then material.notion_url = master.notion_url
    else material.file_url = master.file_url
  end;

delete from public.materials as material
using public.sessions as session
where material.session_id = session.id
  and material.type in ('pre_read', 'worksheet')
  and material.master_material_id is null
  and session.master_session_id is not null
  and not exists (
    select 1
    from public.master_materials as master
    where master.master_session_id = session.master_session_id
      and master.type = material.type
      and case
        when material.type = 'pre_read' then material.notion_url = master.notion_url
        else material.file_url = master.file_url
      end
  );

alter table public.materials
  drop constraint if exists materials_master_material_id_fkey;

alter table public.materials
  add constraint materials_master_material_id_fkey
  foreign key (master_material_id)
  references public.master_materials(id)
  on delete cascade;

commit;
