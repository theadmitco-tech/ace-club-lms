-- Metadata-only inspection for verified staging; application records remain private.
-- Dashboard project identity and a missing-object review remain operator checks.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
with expected_tables(name) as (select unnest(array['v2_price_versions','v2_product_grants','v2_products','v2_purchases','v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_content_asset_placements','v2_content_asset_replacements','v2_content_imports','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates','v2_live_class_completions','v2_live_registration_audit','v2_live_registrations','v2_publication_scope_requests','v2_published_meetings','v2_shared_content_asset_revisions','v2_shared_content_assets']::text[])),
expected_routines(name) as (select unnest(array['can_access_v2_product','get_my_v2_access','grant_v2_purchase','quote_v2_products','reject_v2_price_rewrite','v2_access_window_contains','v2_purchase_shape','apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[])),
roles as (select oid,rolname from pg_roles where rolname in ('anon','authenticated','service_role'))
select jsonb_build_object(
 'check','phase2_completion_metadata_only','transaction_read_only',current_setting('transaction_read_only'),
 'migration_ledger_present',to_regclass('supabase_migrations.schema_migrations') is not null,
 'scope','Metadata and privileges only; not project identity, recovery, migration equivalence or hosted acceptance.',
 'tables',(select jsonb_agg(jsonb_build_object('name',e.name,'present',c.oid is not null,
   'rls_enabled',coalesce(c.relrowsecurity,false),'ordinary_table',coalesce(c.relkind='r',false),
   'read_roles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from roles r where has_table_privilege(r.oid,c.oid,'SELECT')),
   'direct_write_roles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from roles r where exists
     (select 1 from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) op where has_table_privilege(r.oid,c.oid,op)))) order by e.name)
   from expected_tables e left join pg_class c on c.oid=to_regclass('public.'||e.name)),
 'routines',(select jsonb_agg(jsonb_build_object('name',e.name,'present',p.oid is not null,
   'signature',p.oid::regprocedure::text,'security_definer',coalesce(p.prosecdef,false),
   'execute_roles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from roles r where has_function_privilege(r.oid,p.oid,'EXECUTE'))) order by e.name)
   from expected_routines e left join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=e.name)
);
rollback;
