-- Metadata-only inspection for an authorized operator in verified staging.
-- This file neither applies migrations nor reads students, purchases or drafts.
-- Confirm the project in the dashboard before running; SQL cannot prove that
-- a selected hosted database is staging. Missing objects are reported as absent.
begin read only;
set local statement_timeout = '5s';
set local lock_timeout = '2s';

with expected_tables(name) as (
  values ('v2_products'), ('v2_price_versions'), ('v2_purchases'), ('v2_product_grants'),
    ('v2_course_offerings'), ('v2_course_templates'), ('v2_course_template_revisions'), ('v2_course_batches'),
    ('v2_course_batch_revisions'), ('v2_batch_meeting_revisions'), ('v2_batch_publication_revisions'), ('v2_batch_enrollments')
), expected_routines(signature) as (
  values ('public.quote_v2_products(text[])'),
    ('public.can_access_v2_product(text,text)'), ('public.get_my_v2_access()'),
    ('public.grant_v2_purchase(uuid,text[],text,timestamptz,uuid,integer,text)'),
    ('public.save_v2_template_draft(uuid,text,integer,uuid,jsonb)'),
    ('public.list_v2_template_drafts()'), ('public.preview_v2_batch_draft(jsonb)'),
    ('public.save_v2_batch_draft(jsonb,text)'), ('public.list_v2_batch_drafts()'),
    ('public.read_v2_meeting_draft(uuid)'), ('public.save_v2_meeting_draft(jsonb)'),
    ('public.preview_v2_batch_publication(jsonb)'), ('public.save_v2_batch_publication(jsonb,text)'),
    ('public.list_v2_batch_publications()'), ('public.get_my_v2_batch_schedules()'),
    ('public.list_v2_batch_enrollment_options(uuid)'), ('public.set_v2_batch_enrollment(uuid,uuid,boolean,integer)')
), client_roles as (
  select oid, rolname from pg_catalog.pg_roles where rolname in ('anon', 'authenticated', 'service_role')
), tables as (
  select e.name, c.oid, c.relkind, c.relrowsecurity
  from expected_tables e left join pg_catalog.pg_class c
    on c.oid = pg_catalog.to_regclass('public.' || e.name)
), routines as (
  select e.signature, p.oid, p.prosecdef
  from expected_routines e left join pg_catalog.pg_proc p
    on p.oid = pg_catalog.to_regprocedure(e.signature)
)
select jsonb_build_object(
  'check', 'v2_schema_metadata_only',
  'transaction_read_only', current_setting('transaction_read_only'),
  'scope', 'Object presence and privileges only; not staging identity, schema-cache health, migration equivalence or acceptance.',
  'migration_ledger_present', pg_catalog.to_regclass('supabase_migrations.schema_migrations') is not null,
  'tables', (select jsonb_agg(jsonb_build_object(
    'name', t.name, 'present', t.oid is not null,
    'ordinary_table', coalesce(t.relkind = 'r', false),
    'rls_enabled', coalesce(t.relrowsecurity, false),
    'read_roles', (select coalesce(jsonb_agg(r.rolname order by r.rolname), '[]'::jsonb)
      from client_roles r where pg_catalog.has_table_privilege(r.oid, t.oid, 'SELECT')),
    'direct_write_roles', (select coalesce(jsonb_agg(r.rolname order by r.rolname), '[]'::jsonb)
      from client_roles r where exists (
        select 1 from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
        where pg_catalog.has_table_privilege(r.oid, t.oid, privilege)
      ))
  ) order by t.name) from tables t),
  'routines', (select jsonb_agg(jsonb_build_object(
    'signature', p.signature, 'present', p.oid is not null,
    'security_definer', coalesce(p.prosecdef, false),
    'execute_roles', (select coalesce(jsonb_agg(r.rolname order by r.rolname), '[]'::jsonb)
      from client_roles r where pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE'))
  ) order by p.signature) from routines p)
);

rollback;
