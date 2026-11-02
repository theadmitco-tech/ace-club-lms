-- Staging only. Read-only structural/privilege checks, not browser acceptance.
begin read only;
set local statement_timeout='30s';
do $ace_postflight$
declare t text; r text; op text; f record;
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000','20261102100000','20261102110000','20261102120000','20261102130000']::text[])) <> 10 then
    raise exception 'Phase 2 ledger is incomplete';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; do not rerun Phase 1';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_content_asset_placements','v2_content_asset_replacements','v2_content_imports','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates','v2_live_class_completions','v2_live_registration_audit','v2_live_registrations','v2_publication_scope_requests','v2_published_meetings','v2_shared_content_asset_revisions','v2_shared_content_assets']::text[] loop
    if not exists (select 1 from pg_class where oid=to_regclass('public.'||t)
      and relkind='r' and relrowsecurity) then raise exception 'Missing table/RLS: %',t; end if;
    foreach r in array array['anon','authenticated','service_role'] loop
      foreach op in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r,'public.'||t,op) then
          raise exception 'Unexpected direct write: % % %',r,t,op;
        end if;
      end loop;
    end loop;
    if has_table_privilege('anon','public.'||t,'SELECT')
      or has_table_privilege('service_role','public.'||t,'SELECT') then
      raise exception 'Unexpected private-table read grant: %',t;
    end if;
    if not has_table_privilege('authenticated','public.'||t,'SELECT') then
      raise exception 'Missing RLS-mediated authenticated read: %',t;
    end if;
  end loop;
  foreach r in array array['apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[] loop
    if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r) <> 1 then
      raise exception 'Missing or unexpected overload of Phase 2 routine: %',r;
    end if;
  end loop;
  for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace
    and proname=any(array['apply_v2_asset_replacement','apply_v2_content_import','assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_asset_replacement','build_v2_batch_draft','build_v2_batch_publication','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','pin_v2_published_meetings','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_publication_fingerprint','v2_session_content_valid','v2_student_has_product','v2_template_document_valid','validate_v2_content_import']::text[]) loop
    if has_function_privilege('anon',f.oid,'EXECUTE')
      or has_function_privilege('service_role',f.oid,'EXECUTE') then
      raise exception 'Unexpected RPC grant: %',f.proname;
    end if;
    if has_function_privilege('authenticated',f.oid,'EXECUTE') is distinct from
       (f.proname=any(array['apply_v2_asset_replacement','apply_v2_content_import','complete_v2_live_class','get_my_v2_batch_schedules','get_my_v2_meeting','get_my_v2_published_course','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_content_import_workspace','list_v2_live_class_status','list_v2_live_registration_options','list_v2_template_drafts','preview_v2_asset_replacement','preview_v2_batch_draft','preview_v2_batch_publication','preview_v2_content_import','preview_v2_publication_scope','read_v2_meeting_draft','recover_v2_content_import','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_publication_scope','save_v2_template_draft','set_v2_batch_enrollment','set_v2_live_registration']::text[])) then
      raise exception 'Incorrect authenticated RPC grant: %',f.proname;
    end if;
  end loop;
  if (select jsonb_object_agg(code,entitlement_product_code) from public.v2_course_offerings)
    is distinct from '{"quant":"quant_crash","verbal":"verbal_crash","di":"di_crash","full_course":"full_batch"}'::jsonb then
    raise exception 'Canonical offering/Phase 1 compatibility mapping mismatch';
  end if;
end;
$ace_postflight$;
-- Archive-reference definitions are compared with the current database here.
-- Their presence in the manifest alone is not fresh staging verification.
do $ace_recovery_schema_guard$
declare
  expected_views jsonb := '{"worksheet_question_catalog": "afbcbf74ed26ac711e97fa832bccd93b", "worksheet_question_log_catalog": "c55468134700b8fe3d37277edf568515"}'::jsonb;
  actual_views jsonb;
begin
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='m') then
    raise exception 'Unexpected public materialized view; recovery metadata requires review';
  end if;
  select coalesce(jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true))),'{}')
    into actual_views from pg_class where relnamespace='public'::regnamespace and relkind='v';
  if actual_views is distinct from expected_views then
    raise exception 'Current public view definitions differ from the recovered archive reference; application stopped before migration writes';
  end if;
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='S') then
    raise exception 'Unexpected public sequence; recovery metadata requires review';
  end if;
end;
$ace_recovery_schema_guard$;
select 'Phase 2 structural and privilege checks passed; hosted acceptance remains pending' as result;
rollback;
