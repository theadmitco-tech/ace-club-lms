-- Staging only. Read-only structural/privilege checks, not browser acceptance.
begin read only;
set local statement_timeout='30s';
do $ace_postflight$
declare t text; r text; op text; f record;
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version=any(array['20261019090000','20261019100000','20261019110000','20261020090000','20261020100000','20261025100000']::text[])) <> 6 then
    raise exception 'Phase 2 ledger is incomplete';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; do not rerun Phase 1';
  end if;
  foreach t in array array['v2_batch_enrollments','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_course_batch_revisions','v2_course_batches','v2_course_offerings','v2_course_template_revisions','v2_course_templates']::text[] loop
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
  foreach r in array array['assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_batch_draft','build_v2_batch_publication','get_my_v2_batch_schedules','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_template_drafts','preview_v2_batch_draft','preview_v2_batch_publication','read_v2_meeting_draft','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_template_draft','set_v2_batch_enrollment','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_session_content_valid','v2_student_has_product','v2_template_document_valid']::text[] loop
    if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r) <> 1 then
      raise exception 'Missing or unexpected overload of Phase 2 routine: %',r;
    end if;
  end loop;
  for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace
    and proname=any(array['assert_v2_batch_request','assert_v2_meeting_request','assert_v2_publication_request','build_v2_batch_draft','build_v2_batch_publication','get_my_v2_batch_schedules','list_v2_batch_drafts','list_v2_batch_enrollment_options','list_v2_batch_publications','list_v2_template_drafts','preview_v2_batch_draft','preview_v2_batch_publication','read_v2_meeting_draft','save_v2_batch_draft','save_v2_batch_publication','save_v2_meeting_draft','save_v2_template_draft','set_v2_batch_enrollment','v2_batch_date','v2_course_sessions_valid','v2_entitlement_product_code','v2_session_content_valid','v2_student_has_product','v2_template_document_valid']::text[]) loop
    if has_function_privilege('anon',f.oid,'EXECUTE')
      or has_function_privilege('service_role',f.oid,'EXECUTE') then
      raise exception 'Unexpected RPC grant: %',f.proname;
    end if;
    if has_function_privilege('authenticated',f.oid,'EXECUTE') is distinct from
       (f.proname ~ '^(save_|list_|preview_|read_|set_|get_my_)') then
      raise exception 'Incorrect authenticated RPC grant: %',f.proname;
    end if;
  end loop;
  if (select jsonb_object_agg(code,entitlement_product_code) from public.v2_course_offerings)
    is distinct from '{"quant":"quant_crash","verbal":"verbal_crash","di":"di_crash","full_course":"full_batch"}'::jsonb then
    raise exception 'Canonical offering/Phase 1 compatibility mapping mismatch';
  end if;
end;
$ace_postflight$;
select 'Phase 2 structural and privilege checks passed; hosted acceptance remains pending' as result;
rollback;
