-- Ace Club LMS Phase 1: supplemental read-only schema-definition inventory
-- Run in the production Supabase SQL editor after supabase-inventory.sql.
-- This query does not change database state or read application row data.

select jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    'database', current_database(),
    'constraints', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.table_name, c.constraint_name), '[]'::jsonb)
      from (
        select
          rel.relname as table_name,
          con.conname as constraint_name,
          con.contype as constraint_type,
          pg_get_constraintdef(con.oid, true) as definition
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace n on n.oid = rel.relnamespace
        where n.nspname = 'public'
      ) c
    ),
    'indexes', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.table_name, i.index_name), '[]'::jsonb)
      from (
        select
          tablename as table_name,
          indexname as index_name,
          indexdef as definition
        from pg_indexes
        where schemaname = 'public'
      ) i
    ),
    'functions', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.function_name, f.arguments), '[]'::jsonb)
      from (
        select
          p.proname as function_name,
          pg_get_function_identity_arguments(p.oid) as arguments,
          pg_get_functiondef(p.oid) as definition
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
      ) f
    ),
    'triggers', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.table_schema, t.table_name, t.trigger_name), '[]'::jsonb)
      from (
        select
          n.nspname as table_schema,
          rel.relname as table_name,
          trg.tgname as trigger_name,
          pg_get_triggerdef(trg.oid, true) as definition
        from pg_trigger trg
        join pg_class rel on rel.oid = trg.tgrelid
        join pg_namespace n on n.oid = rel.relnamespace
        where not trg.tgisinternal
          and n.nspname in ('public', 'auth')
      ) t
    ),
    'views', (
      select coalesce(jsonb_agg(to_jsonb(v) order by v.view_name), '[]'::jsonb)
      from (
        select
          c.relname as view_name,
          case c.relkind
            when 'm' then 'materialized'
            else 'view'
          end as view_type,
          pg_get_viewdef(c.oid, true) as definition
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('v', 'm')
      ) v
    ),
    'enum_types', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.type_name, e.sort_order), '[]'::jsonb)
      from (
        select
          t.typname as type_name,
          e.enumsortorder as sort_order,
          e.enumlabel as value
        from pg_type t
        join pg_enum e on e.enumtypid = t.oid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
      ) e
    )
  )
) as phase_1_schema_definition_inventory;
