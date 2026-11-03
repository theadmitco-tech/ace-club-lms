"""Build a guarded staging packet from reviewed source and sanitized recovery evidence."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/phase5-preview-activation'
report=json.loads((OUT/'application-recovery-report.json').read_text())
assert report.get('sourceSerializationVerified') is True and report['status']=='application-rows-restored' and report['ledgerMatches'] and all(t['matches'] for t in report['tables'])
filename='20261103090000_add_v2_content_publishing.sql'
raw=(ROOT/'supabase/migrations'/filename).read_text()
assert hashlib.sha256((ROOT/'supabase/migrations/20261018090000_add_v2_product_entitlements.sql').read_bytes()).hexdigest()=='ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7'
storage_filename='20261103091000_add_v2_private_content_storage.sql'
storage_raw=(ROOT/'supabase/migrations'/storage_filename).read_text()
body=re.sub(r'^(begin|commit);\s*$', '',raw,flags=re.M)+re.sub(r'^(begin|commit);\s*$', '',storage_raw,flags=re.M)
lit=lambda s:"'"+str(s).replace("'","''")+"'"
js=lambda x:lit(json.dumps(x,separators=(',',':')))+'::jsonb'
tables=re.findall(r'create table public\.(\w+)',raw)
functions=[]
authenticated=set()
for grant in re.findall(r'grant execute on function (.*?) to authenticated;',raw,re.S):authenticated.update(re.findall(r'public\.(\w+)\(',grant))
for m in re.finditer(r'create (?:or replace )?function public\.(\w+)\((.*?)\)\s*returns (.*?)as \$\$(.*?)\$\$;',raw,re.S):
 name,args,header,source=m.groups()
 types=','.join(a.strip().split()[1] for a in args.split(',') if a.strip())
 functions.append({'signature':f'{name}({types})','sourceMd5':hashlib.md5(source.encode()).hexdigest(),'securityDefiner':'security definer' in header,'volatility':'s' if ' stable ' in header else 'i' if ' immutable ' in header else 'v','roles':['authenticated'] if name in authenticated else []})
assert len(tables)==3 and len(functions)==len(re.findall(r'create (?:or replace )?function public\.',raw))
new_names=[f['signature'].split('(')[0] for f in functions if f['signature'] not in [r['signature'] for r in report['routineGuards']]]
version=filename.split('_')[0];name=filename[len(version)+1:-4]
expected=[{'table':t['table'],'rows':t['rows'],'md5':t['md5']} for t in report['tables']]
check_rows=f"""create temporary table phase5_expected_rows on commit drop as select * from jsonb_to_recordset({js(expected)}) as t("table" text,rows bigint,md5 text);
create function pg_temp.phase5_assert_preserved() returns void language plpgsql as $$
declare t record;n bigint;h text;begin
 for t in select * from phase5_expected_rows order by "table" loop
  if to_regclass('public.'||quote_ident(t."table")) is null then raise exception 'Existing table missing: %',t."table";end if;
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t."table") into n,h;
  if n<>t.rows or h<>t.md5 then raise exception 'Existing application data differs: %; transaction aborted',t."table";end if;
 end loop;
end;$$;
"""
pre=f"""-- STAGING ONLY: eyphkkginlgoaxflauog. The dashboard project must be verified before execution.
-- This atomic packet adds Phase 5 only. Phase 1/2 ledger rows and all existing application records are preserved.
-- Recovery source SHA256: {report['snapshotSha256']}
rollback;
begin;
set local timezone='UTC';
set local statement_timeout='60s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
{check_rows}
do $phase5_preflight$ declare t record;r jsonb;p record;begin
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261018090000') then raise exception 'Phase 1 ledger missing';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261102170000') then raise exception 'Phase 4 ledger missing';end if;
 if exists(select 1 from supabase_migrations.schema_migrations where version in ('{version}','20261103091000')) then raise exception 'Phase 5 already recorded; use reconciliation instead';end if;
 if exists(select 1 from storage.buckets where id='v2-course-content') then raise exception 'Content bucket already exists; reconciliation required';end if;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>{lit(report['ledgerMd5'])} then raise exception 'Migration ledger differs from fresh recovery; reconcile before activation';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>{len(expected)} then raise exception 'Application table inventory changed';end if;
 for t in select * from phase5_expected_rows order by "table" loop execute format('lock table public.%I in share mode',t."table");end loop;
 perform pg_temp.phase5_assert_preserved();
 for r in select value from jsonb_array_elements({js(report['routineGuards'])}) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or to_jsonb(p.proconfig) is distinct from r->'configuration' then raise exception 'Existing delivery function changed: %',r->>'signature';end if;
 end loop;
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any(array[{','.join(lit(n) for n in new_names)}])) then raise exception 'Unrecorded Phase 5 function exists';end if;
end;$phase5_preflight$;
"""
post=f"""
select pg_temp.phase5_assert_preserved();
do $phase5_postflight$ declare t text;r jsonb;p record;role_name text;actual_roles jsonb;begin
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>{len(expected)+len(tables)} then raise exception 'Unexpected table inventory after activation';end if;
 foreach t in array array[{','.join(lit(t) for t in tables)}] loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relkind='r' and relrowsecurity) then raise exception 'Private table guard missing';end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected direct table privilege';end if;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements({js(functions)}) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or p.provolatile::text<>r->>'volatility' or p.proconfig is distinct from array['search_path=""'] then raise exception 'Function guard mismatch: %',r->>'signature';end if;
  select coalesce(jsonb_agg(v order by v),'[]') into actual_roles from unnest(array['anon','authenticated','service_role']) v where has_function_privilege(v,p.oid,'EXECUTE');
  if actual_roles<>r->'roles' then raise exception 'Unexpected function privileges: %',r->>'signature';end if;
 end loop;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>{lit(report['ledgerMd5'])} then raise exception 'Prior migration ledger changed';end if;
end;$phase5_postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('{version}',{lit(name)},array[{lit(raw)}]);
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261103091000','add_v2_private_content_storage',array[{lit(storage_raw)}]);
do $storage_guards$ begin
 if not exists(select 1 from storage.buckets where id='v2-course-content' and not public and file_size_limit=52428800 and allowed_mime_types=array['video/mp4','video/webm','application/pdf']) then raise exception 'Private content bucket configuration mismatch';end if;
 if not exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='v2_private_content_no_browser_access' and not polpermissive) then raise exception 'Private storage restriction missing';end if;
end;$storage_guards$;
notify pgrst,'reload schema';
select jsonb_build_object('check','phase5_activation','migrationVersion','{version}','sourceSha256','{hashlib.sha256(raw.encode()).hexdigest()}',
 'existingApplicationTables',{len(expected)},'existingRowsPreserved',true,'phase1LedgerPreserved',true,'newPrivateTables',{len(tables)},'functionsVerified',{len(functions)},'phase3Activated',false,'hostedAcceptance','separate','privateStorageBucket',true,'storageMigrationSha256','{hashlib.sha256(storage_raw.encode()).hexdigest()}') as result;
commit;
"""
(OUT/'RUN-ACTIVATION.sql').write_text(pre+body+post)
(OUT/'activation-manifest.json').write_text(json.dumps({'storageMigration':storage_filename,'storageSha256':hashlib.sha256(storage_raw.encode()).hexdigest(),'migration':filename,'sha256':hashlib.sha256(raw.encode()).hexdigest(),'snapshotSha256':report['snapshotSha256'],'snapshotCapturedAt':report.get('capturedAt'),'tableCount':len(expected),'tablesAdded':tables,'functions':functions},indent=2)+'\n')
print(json.dumps({'packetPrepared':True,'existingTables':len(expected),'newTables':len(tables),'functions':len(functions),'hostedExecution':False}))
