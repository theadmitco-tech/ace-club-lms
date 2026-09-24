begin;

-- A package asset is identified by its namespace-scoped external ID. Two
-- independently authored packages may legitimately contain identical bytes,
-- so the content hash remains indexed for duplicate warnings but cannot be an
-- identity constraint. Storage paths and external IDs remain unique.
alter table public.mock_media
  drop constraint mock_media_namespace_id_sha256_key;

create index mock_media_namespace_sha256_idx
  on public.mock_media(namespace_id, sha256);

commit;
