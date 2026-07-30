-- Ace Club LMS Phase 1: read-only Supabase inventory
-- Run in the Supabase SQL editor. This query does not change database state.
-- Review the output before sharing it; it describes schema, not row data.

select jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    'database', current_database(),
    'database_timezone', current_setting('TimeZone'),
    'tables', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.schema_name, t.table_name), '[]'::jsonb)
      from (
        select
          n.nspname as schema_name,
          c.relname as table_name,
          c.relrowsecurity as rls_enabled,
          c.relforcerowsecurity as rls_forced
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r', 'p')
          and n.nspname in ('public', 'storage')
      ) t
    ),
    'columns', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb)
      from (
        select
          table_schema,
          table_name,
          ordinal_position,
          column_name,
          data_type,
          is_nullable,
          column_default
        from information_schema.columns
        where table_schema = 'public'
      ) c
    ),
    'foreign_keys', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.table_name, f.constraint_name), '[]'::jsonb)
      from (
        select
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_schema as referenced_schema,
          ccu.table_name as referenced_table,
          ccu.column_name as referenced_column
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name
         and tc.constraint_schema = kcu.constraint_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.constraint_schema = tc.constraint_schema
        where tc.constraint_type = 'FOREIGN KEY'
          and tc.table_schema = 'public'
      ) f
    ),
    'policies', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.schemaname, p.tablename, p.policyname), '[]'::jsonb)
      from (
        select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        from pg_policies
        where schemaname in ('public', 'storage')
      ) p
    ),
    'triggers', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.event_object_schema, t.event_object_table, t.trigger_name), '[]'::jsonb)
      from (
        select
          event_object_schema,
          event_object_table,
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement
        from information_schema.triggers
        where event_object_schema in ('public', 'auth')
      ) t
    ),
    'functions', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.schema_name, f.function_name, f.arguments), '[]'::jsonb)
      from (
        select
          n.nspname as schema_name,
          p.proname as function_name,
          pg_get_function_identity_arguments(p.oid) as arguments,
          p.prosecdef as security_definer
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
      ) f
    ),
    'extensions', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.extension_name), '[]'::jsonb)
      from (
        select extname as extension_name, extversion as version
        from pg_extension
      ) e
    ),
    'cron_table_present', to_regclass('cron.job') is not null,
    'storage_buckets', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.name), '[]'::jsonb)
      from (
        select id, name, public, file_size_limit, allowed_mime_types
        from storage.buckets
      ) b
    )
  )
) as phase_1_inventory;
