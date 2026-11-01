import {readFileSync} from 'node:fs';
import {buildCleanupSql} from './phase1-sql-editor-fixtures.mjs';
import {check,literal} from './phase1-hosted-closeout-config.mjs';
export function buildLegacyEditorRepair(state,baseline){
  check(/^[0-9a-f]{32}$/.test(baseline.md5)&&Number.isSafeInteger(baseline.table_count)&&baseline.table_count>0,'Invalid baseline fingerprint');
  const cleanup=buildCleanupSql(state).split("select jsonb_build_object('check','phase1_qa_purchase_cleanup'")[0];
  // Additive subset only: intentionally excludes the old script's heuristic UPDATE.
  const ddl=readFileSync(new URL('../supabase_master_question_metadata.sql',import.meta.url),'utf8').split('UPDATE public.master_practice_questions')[0];
  return cleanup+`
-- Phase 1 legacy compatibility repair; no original migration or ledger changes.
-- First prove exact QA purchase cleanup restored the operator's 60-table baseline.
create temporary table phase1_repair_baseline as select pg_temp.phase1_public_fingerprint() as value;
do $$ begin
 if (select value from phase1_repair_baseline) <> ${literal(JSON.stringify(baseline))}::jsonb
 then raise exception 'Public-data baseline differs. Transaction rolled back; do not bypass this guard.'; end if;
end $$;
create temporary table phase1_editor_added_columns as
 select name from unnest(array['question_type','di_question_type','answer_mode','stimulus_group_key','stimulus_title','stimulus_text','stimulus_data','content_format','admin_notes']) name
 where not exists(select 1 from pg_attribute where attrelid='public.master_practice_questions'::regclass and attname=name and not attisdropped);
${ddl}
create or replace function pg_temp.phase1_compat_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; aggregate_hashes text := ''; tables_count integer := 0; omitted text[];
begin
 select coalesce(array_agg(name),'{}'::text[]) into omitted from phase1_editor_added_columns;
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='master_practice_questions' then
   execute format('select md5(coalesce(string_agg(md5((to_jsonb(r)-$1)::text), '''' order by md5((to_jsonb(r)-$1)::text)), '''')) from public.%I r',t.tablename) into h using omitted;
  else
   execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',t.tablename) into h;
  end if;
  aggregate_hashes := aggregate_hashes || t.tablename || ':' || h || ';'; tables_count := tables_count+1;
 end loop;
 return jsonb_build_object('table_count',tables_count,'md5',md5(aggregate_hashes));
end $$;
do $$ begin
 if pg_temp.phase1_compat_fingerprint() <> (select value from phase1_repair_baseline)
 then raise exception 'Existing column values changed. Transaction rolled back.'; end if;
end $$;
notify pgrst, 'reload schema';
select jsonb_build_object('check','phase1_cleanup_and_legacy_editor_repair',
 'run_id',${literal(state.runId)},
 'remaining_fixture_purchases',(select count(*) from public.v2_purchases p join phase1_qa_plan q on p.payment_reference=q.reference and p.student_id=q.student_id),
 'after_purchase_cleanup',(select value from phase1_repair_baseline),
 'baseline_restored',true,'existing_column_values_preserved',true,
 'added_columns',(select coalesce(jsonb_agg(name order by name),'[]'::jsonb) from phase1_editor_added_columns),
 'after_additive_schema_repair',pg_temp.phase1_public_fingerprint(),
 'original_phase1_migration_reapplied',false,'phase2_activated',false);
commit;
`;
}
