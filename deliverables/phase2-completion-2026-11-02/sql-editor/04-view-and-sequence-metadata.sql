-- Read-only recovery metadata; no application records or sequence values are returned.
-- This query supports review after a strict archive-reference guard mismatch.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
select jsonb_build_object(
  'check','phase2_public_view_and_sequence_metadata',
  'server_version',current_setting('server_version'),
  'read_only',current_setting('transaction_read_only'),
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
    'definition',pg_get_viewdef(oid,true),'definition_md5',md5(pg_get_viewdef(oid,true)),
    'acl',relacl::text,'options',reloptions) order by relname),'[]')
    from pg_class where relnamespace='public'::regnamespace and relkind in ('v','m')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind='S')
);
rollback;
