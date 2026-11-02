export function bootstrap({query,apply}){
 query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
 for(const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql','20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql','20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql','20261102100000_add_v2_programme_content.sql','20261102110000_add_v2_student_delivery.sql','20261102120000_add_v2_content_imports.sql','20261102130000_add_v2_publication_scopes.sql','20261102170000_add_v2_learning_feedback.sql'])apply(file);
}
