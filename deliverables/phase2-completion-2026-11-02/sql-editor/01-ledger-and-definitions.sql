-- Metadata-only staging catalogue; the operator verifies project eyphkkginlgoaxflauog.
-- Results contain definitions and hashes, without application rows or migration bodies.
begin read only;
set local statement_timeout = '30s';
set local lock_timeout = '2s';

select jsonb_build_object(
  'check', 'v2_activation_catalogue',
  'server_version', current_setting('server_version'),
  'read_only', current_setting('transaction_read_only'),
  'ledger', (select jsonb_agg(jsonb_build_object(
    'version', version, 'name', name, 'row_md5', md5(to_jsonb(m)::text)
  ) order by version) from supabase_migrations.schema_migrations m),
  'ledger_columns', (select jsonb_agg(to_jsonb(c) order by ordinal_position)
    from information_schema.columns c
    where table_schema='supabase_migrations' and table_name='schema_migrations'),
  'tables', (select jsonb_agg(jsonb_build_object(
    'name', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity,
    'force_rls', c.relforcerowsecurity, 'acl', c.relacl::text
  ) order by c.relname) from pg_class c
    where c.relnamespace='public'::regnamespace and c.relname like 'v2\_%' escape '\'),
  'columns', (select jsonb_agg(to_jsonb(c) order by table_name, ordinal_position)
    from information_schema.columns c
    where table_schema='public' and table_name like 'v2\_%' escape '\'),
  'constraints', (select jsonb_agg(jsonb_build_object(
    'table', c.conrelid::regclass::text, 'name', c.conname,
    'definition', pg_get_constraintdef(c.oid)
  ) order by c.conrelid::regclass::text, c.conname) from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relnamespace='public'::regnamespace and t.relname like 'v2\_%' escape '\'),
  'indexes', (select jsonb_agg(to_jsonb(i) order by tablename, indexname)
    from pg_indexes i where schemaname='public' and tablename like 'v2\_%' escape '\'),
  'policies', (select jsonb_agg(to_jsonb(p) order by tablename, policyname)
    from pg_policies p where schemaname='public' and tablename like 'v2\_%' escape '\'),
  'triggers', (select jsonb_agg(jsonb_build_object(
    'table', t.tgrelid::regclass::text, 'name', t.tgname,
    'definition', pg_get_triggerdef(t.oid)
  ) order by t.tgrelid::regclass::text, t.tgname) from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    where c.relnamespace='public'::regnamespace and c.relname like 'v2\_%' escape '\'
      and not t.tgisinternal),
  'routines', (select jsonb_agg(jsonb_build_object(
    'signature', p.oid::regprocedure::text, 'definition', pg_get_functiondef(p.oid),
    'security_definer', p.prosecdef, 'config', p.proconfig, 'acl', p.proacl::text
  ) order by p.oid::regprocedure::text) from pg_proc p
    where p.pronamespace='public'::regnamespace and p.prokind='f'
      and (p.proname like '%v2%' or p.proname='is_portal_admin'))
);
rollback;
