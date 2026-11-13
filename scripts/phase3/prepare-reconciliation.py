"""Build read-only Phase 3 ledger, routine and preservation diagnostics."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/phase3-preview-activation'
report=json.loads(Path(sys.argv[1]).read_text())
manifest=json.loads((OUT/'migration-manifest.json').read_text())
assert report['sourceSerializationVerified'] and report['ledgerMatches'] and all(t['matches'] for t in report['tables'])
lit=lambda v:"'"+str(v).replace("'","''")+"'"
js=lambda v:lit(json.dumps(v,separators=(',',':')))+'::jsonb'
versions=[]
for m in manifest['migrations']:
 raw=(ROOT/'supabase/migrations'/m['file']).read_text()
 assert hashlib.sha256(raw.encode()).hexdigest()==m['sha256']
 version,name=m['file'][:-4].split('_',1)
 versions.append({'version':version,'name':name,'sha256':m['sha256']})
rows=[{'name':t['table'],'rows':t['rows'],'md5':t['md5']} for t in report['tables']]
sql=f'''-- Read-only Phase 3 reconciliation; no migrations, grants or records are changed.
-- The operator verifies staging project eyphkkginlgoaxflauog before execution.
-- The first statement clears the failed SQL Editor transaction.
rollback;
begin isolation level repeatable read read only;
set local timezone='UTC';
set local statement_timeout='60s';
set local lock_timeout='3s';
with expected_versions as(select * from jsonb_to_recordset({js(versions)}) as x(version text,name text,sha256 text)),
versions as(select e.version,m.version is not null present,coalesce(m.name=e.name,false) name_matches,
 coalesce(encode(sha256(convert_to(array_to_string(m.statements,E'\\n'),'UTF8')),'hex')=e.sha256,false) source_matches
 from expected_versions e left join supabase_migrations.schema_migrations m using(version)),
expected_functions as(select * from jsonb_to_recordset({js(manifest['functions'])}) as x(signature text,"sourceMd5" text,"securityDefiner" boolean,configuration jsonb,volatility text,language text,roles jsonb)),
routines as(select e.signature,p.oid is not null present,
 coalesce(md5(p.prosrc)=e."sourceMd5",false) source_matches,
 coalesce(p.prosecdef=e."securityDefiner" and to_jsonb(p.proconfig)=e.configuration and p.provolatile::text=e.volatility and l.lanname=e.language,false) security_metadata_matches,
 (select coalesce(jsonb_agg(r order by r),'[]') from unnest(array['anon','authenticated','service_role']) r where has_function_privilege(r,p.oid,'EXECUTE'))=e.roles grants_match,
 not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') public_execute_denied,
 (select count(*)=1 from pg_proc other where other.pronamespace='public'::regnamespace and other.proname=split_part(e.signature,'(',1)) no_unexpected_overloads
 from expected_functions e left join pg_proc p on p.oid=to_regprocedure('public.'||e.signature) left join pg_language l on l.oid=p.prolang),
expected_tables as(select jsonb_array_elements_text({js(manifest['tables'])}) name),
tables as(select e.name,c.oid is not null present,coalesce(c.relkind='r' and c.relrowsecurity,false) rls_enabled,
 (select coalesce(jsonb_agg(r order by r),'[]') from unnest(array['anon','authenticated','service_role']) r where has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) direct_privilege_roles
 from expected_tables e left join pg_class c on c.oid=to_regclass('public.'||quote_ident(e.name))),
expected_rows as(select * from jsonb_to_recordset({js(rows)}) as x(name text,rows bigint,md5 text)),
row_proofs as(select e.*,to_regclass('public.'||quote_ident(e.name)) is not null present,
 case when to_regclass('public.'||quote_ident(e.name)) is null then null else
 ((xpath('/row/proof/text()',query_to_xml(format('select jsonb_build_object(''count'',count(*),''md5'',md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text)) proof from public.%I r',e.name),false,true,'')))[1]::text)::jsonb end actual
 from expected_rows e),
row_report as(select name,present,rows expected_count,(actual->>'count')::bigint actual_count,coalesce((actual->>'count')::bigint=rows and actual->>'md5'=md5,false) rows_match from row_proofs),
expected_triggers(schema_name,table_name,trigger_name,function_name,trigger_type) as(values
 ('auth','users','z_v2_signup_candidate','v2_mark_signup_candidate',5),
 ('public','profiles','v2_signup_activation_guard','v2_invalidate_signup_candidate',17),
 ('public','v2_live_registrations','v2_live_capacity','v2_enforce_live_capacity',23)),
triggers as(select e.trigger_name,t.oid is not null present,
 coalesce(t.tgenabled='O' and t.tgtype=e.trigger_type and t.tgfoid=to_regprocedure('public.'||e.function_name||'()') and not t.tgisinternal and t.tgqual is null and t.tgnargs=0
 and case when e.trigger_name='v2_signup_activation_guard' then
 (select array_agg(a.attname::text order by a.attname) from pg_attribute a where a.attrelid=t.tgrelid and a.attnum=any(t.tgattr::smallint[]))=array['is_active','role']
 else t.tgattr::text='' end,false) definition_matches
 from expected_triggers e left join pg_trigger t on t.tgrelid=to_regclass(format('%I.%I',e.schema_name,e.table_name)) and t.tgname=e.trigger_name)
select jsonb_build_object(
 'check','phase3_activation_reconciliation','read_only',current_setting('transaction_read_only'),
 'scope','Installed schema and preservation checks; separate from provider, OAuth and website acceptance.',
 'expected_version_count',3,'present_version_count',(select count(*) from versions where present),
 'all_migration_sources_match',(select bool_and(present and name_matches and source_matches) from versions),
 'versions',(select jsonb_agg(to_jsonb(v) order by version) from versions v),
 'old_draft_versions_present',(select coalesce(jsonb_agg(version order by version),'[]') from supabase_migrations.schema_migrations where version in('20261102140000','20261102150000','20261102160000')),
 'original_ledger_preserved',(select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m where version not in(select version from expected_versions))={lit(report['ledgerMd5'])},
 'all_routine_guards_match',(select bool_and(present and source_matches and security_metadata_matches and grants_match and public_execute_denied and no_unexpected_overloads) from routines),
 'routines',(select jsonb_agg(to_jsonb(r) order by signature) from routines r),
 'all_private_table_guards_match',(select bool_and(present and rls_enabled and direct_privilege_roles='[]'::jsonb) from tables),
 'tables',(select jsonb_agg(to_jsonb(t) order by name) from tables t),
 'all_trigger_guards_match',(select bool_and(present and definition_matches) from triggers),
 'triggers',(select jsonb_agg(to_jsonb(t) order by trigger_name) from triggers t),
 'live_provenance_constraint',(select pg_get_constraintdef(oid) from pg_constraint where conrelid=to_regclass('public.v2_live_registrations') and conname='v2_live_registrations_provenance_check'),
 'existing_application_data_preserved',(select bool_and(present and rows_match) from row_report),
 'original_application_table_count',(select count(*) from row_report),
 'current_application_table_count',(select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r'),
 'original_application_tables',(select jsonb_agg(to_jsonb(r) order by name) from row_report r),
 'baseline_captured_at',{lit(report['capturedAt'])},'hosted_acceptance','separate'
);
rollback;
'''
dest=Path(sys.argv[2]) if len(sys.argv)>2 else OUT/'RECONCILE-ACTIVATION.sql'
dest.write_text(sql)
print(json.dumps({'readOnlyPacketPrepared':True,'expectedVersions':3,'functions':len(manifest['functions']),'baselineTables':len(rows)}))
