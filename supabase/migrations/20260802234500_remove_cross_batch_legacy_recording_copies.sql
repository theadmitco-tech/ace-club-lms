begin;

-- The first batch-recording migration detached already-synced recordings from
-- Master Base. If the same master recording had previously been synced to
-- several batches, that left an identical standalone copy in every batch.
-- Keep only the most recently created copy so the old inheritance is no longer
-- presented as cross-batch sharing. Future recordings are created directly on
-- one batch session and are never generated or synced.
with ranked_recordings as (
  select
    material.id,
    row_number() over (
      partition by session.master_session_id, lower(btrim(material.video_url))
      order by material.created_at desc, material.id desc
    ) as copy_number
  from public.materials as material
  join public.sessions as session on session.id = material.session_id
  where material.type = 'video'
    and material.master_material_id is null
    and material.video_url is not null
    and session.master_session_id is not null
)
delete from public.materials as material
using ranked_recordings as ranked
where material.id = ranked.id
  and ranked.copy_number > 1;

commit;
