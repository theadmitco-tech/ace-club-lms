begin;

-- The Production project is on Supabase Free and has no managed physical
-- backups or PITR. Preserve only the data and database definitions touched by
-- the reviewed Phase 5 migration set before any of those migrations run.
-- Student profiles, enrollments, registrations, payments, and tracker data are
-- deliberately outside this snapshot because Phase 5 does not mutate them.
create schema if not exists phase5_rollback_20260802;

revoke all on schema phase5_rollback_20260802 from public;
revoke all on schema phase5_rollback_20260802 from anon;
revoke all on schema phase5_rollback_20260802 from authenticated;

create table phase5_rollback_20260802.master_sessions
as table public.master_sessions;

create table phase5_rollback_20260802.master_materials
as table public.master_materials;

create table phase5_rollback_20260802.sessions
as table public.sessions;

create table phase5_rollback_20260802.materials
as table public.materials;

create table phase5_rollback_20260802.function_definitions as
select
  procedure.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(procedure.oid) as identity_arguments,
  pg_catalog.pg_get_functiondef(procedure.oid) as definition
from pg_catalog.pg_proc as procedure
join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public';

create table phase5_rollback_20260802.constraint_definitions as
select
  constraint_record.conrelid::regclass::text as table_name,
  constraint_record.conname as constraint_name,
  pg_catalog.pg_get_constraintdef(constraint_record.oid) as definition
from pg_catalog.pg_constraint as constraint_record
where constraint_record.conrelid in (
  'public.master_sessions'::regclass,
  'public.master_materials'::regclass,
  'public.sessions'::regclass,
  'public.materials'::regclass
);

create table phase5_rollback_20260802.trigger_definitions as
select
  trigger_record.tgrelid::regclass::text as table_name,
  trigger_record.tgname as trigger_name,
  pg_catalog.pg_get_triggerdef(trigger_record.oid) as definition
from pg_catalog.pg_trigger as trigger_record
where trigger_record.tgrelid in (
  'public.master_sessions'::regclass,
  'public.master_materials'::regclass,
  'public.sessions'::regclass,
  'public.materials'::regclass
)
  and not trigger_record.tgisinternal;

create table phase5_rollback_20260802.index_definitions as
select
  index_record.tablename as table_name,
  index_record.indexname as index_name,
  index_record.indexdef as definition
from pg_catalog.pg_indexes as index_record
where index_record.schemaname = 'public'
  and index_record.tablename in (
    'master_sessions',
    'master_materials',
    'sessions',
    'materials'
  );

create table phase5_rollback_20260802.snapshot_metadata (
  created_at timestamptz not null,
  purpose text not null,
  master_session_rows bigint not null,
  master_material_rows bigint not null,
  session_rows bigint not null,
  material_rows bigint not null
);

insert into phase5_rollback_20260802.snapshot_metadata (
  created_at,
  purpose,
  master_session_rows,
  master_material_rows,
  session_rows,
  material_rows
)
select
  statement_timestamp(),
  'Pre-Phase 5 Production rollout recovery snapshot',
  (select count(*) from phase5_rollback_20260802.master_sessions),
  (select count(*) from phase5_rollback_20260802.master_materials),
  (select count(*) from phase5_rollback_20260802.sessions),
  (select count(*) from phase5_rollback_20260802.materials);

do $$
begin
  if (select count(*) from phase5_rollback_20260802.master_sessions)
      <> (select count(*) from public.master_sessions)
    or (select count(*) from phase5_rollback_20260802.master_materials)
      <> (select count(*) from public.master_materials)
    or (select count(*) from phase5_rollback_20260802.sessions)
      <> (select count(*) from public.sessions)
    or (select count(*) from phase5_rollback_20260802.materials)
      <> (select count(*) from public.materials)
  then
    raise exception 'Phase 5 rollback snapshot row-count verification failed';
  end if;
end
$$;

revoke all on all tables in schema phase5_rollback_20260802 from public;
revoke all on all tables in schema phase5_rollback_20260802 from anon;
revoke all on all tables in schema phase5_rollback_20260802 from authenticated;

commit;
