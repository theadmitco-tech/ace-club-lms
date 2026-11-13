"""Prepare an atomic staging packet from verified recovery and local metadata."""
from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/phase3-preview-activation'
report = json.loads(Path(sys.argv[1]).read_text())
manifest = json.loads((OUT / 'migration-manifest.json').read_text())
assert report['sourceSerializationVerified'] and report['ledgerMatches']
assert report['status'] == 'application-rows-restored' and all(t['matches'] for t in report['tables'])
assert len(report['routineGuards']) == 3
assert hashlib.sha256((ROOT / 'supabase/migrations/20261018090000_add_v2_product_entitlements.sql').read_bytes()).hexdigest() == 'ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7'
literal = lambda value: "'" + str(value).replace("'", "''") + "'"
json_sql = lambda value: literal(json.dumps(value, separators=(',', ':'))) + '::jsonb'
sql_array = lambda values: 'array[' + ','.join(map(literal, values)) + ']'
expected = [{'table':t['table'], 'rows':t['rows'], 'md5':t['md5']} for t in report['tables']]
versions = [m['file'].split('_')[0] for m in manifest['migrations']]
bodies = []
ledger = []
for migration in manifest['migrations']:
    raw = (ROOT / 'supabase/migrations' / migration['file']).read_text()
    assert hashlib.sha256(raw.encode()).hexdigest() == migration['sha256']
    bodies.append(re.sub(r'^(begin|commit);\s*$', '', raw, flags=re.M))
    version, name = migration['file'][:-4].split('_', 1)
    ledger.append(f'insert into supabase_migrations.schema_migrations(version,name,statements) values({literal(version)},{literal(name)},array[{literal(raw)}]);')

# Runtime metadata preservation covers all original functions, relation grants,
# policies, indexes and triggers. Only the three named function bodies and the
# live-registration provenance constraint are intentionally changed.
metadata = """create function pg_temp.phase3_original_metadata() returns jsonb language sql as $metadata$
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
  'definition',case when p.proname in ('can_access_v2_product','get_my_v2_access','v2_student_has_product') then null else pg_get_functiondef(p.oid) end,
  'acl',p.proacl::text,'owner',p.proowner,'definer',p.prosecdef,'configuration',p.proconfig,'volatility',p.provolatile,'language',p.prolang)
  order by p.oid::regprocedure::text) from pg_proc p join phase3_original_functions f on f.id=p.oid),
 'relations',(select jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl::text,'owner',c.relowner)
  order by c.relname) from pg_class c join phase3_original_relations r on r.id=c.oid),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where p.schemaname='public' and p.tablename in(select name from phase3_original_relations)),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname)
  from pg_constraint c where c.conrelid in(select id from phase3_original_relations)
  and not(c.conrelid='public.v2_live_registrations'::regclass and c.conname='v2_live_registrations_provenance_check')),
 'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public' and indexname in(select name from phase3_original_indexes)),
 'triggers',(select jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)
  order by t.tgrelid::regclass::text,t.tgname) from pg_trigger t join phase3_original_triggers x on x.id=t.oid)
);$metadata$;
"""
packet = f"""-- STAGING ONLY: eyphkkginlgoaxflauog. The operator verifies the dashboard project.
-- Atomic Phase 3 activation; no checkout, payment or course publication is performed.
-- Recovery SHA256: {report['snapshotSha256']}
rollback;
begin;
set local timezone='UTC';
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase3_expected_rows on commit drop as
select * from jsonb_to_recordset({json_sql(expected)}) as t("table" text,rows bigint,md5 text);
create function pg_temp.phase3_assert_rows() returns void language plpgsql as $$
declare t record;n bigint;h text;begin
 for t in select * from phase3_expected_rows order by "table" loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t."table") into n,h;
  if n<>t.rows or h<>t.md5 then raise exception 'Existing application data differs: %; transaction aborted',t."table";end if;
 end loop;
end;$$;
do $preflight$ declare t record;r jsonb;p record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version=any({sql_array(versions + ['20261102140000','20261102150000','20261102160000'])})) then raise exception 'A Phase 3 migration exists; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103120000') then raise exception 'Phase 6 conflict repair required';end if;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>{literal(report['ledgerMd5'])} then raise exception 'Migration ledger changed after recovery';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>{len(expected)} then raise exception 'Application table inventory changed';end if;
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any({sql_array(manifest['newFunctionNames'])})) then raise exception 'Unrecorded payment function exists';end if;
 if exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='z_v2_signup_candidate') then raise exception 'Unrecorded payment trigger exists';end if;
 for t in select * from phase3_expected_rows order by "table" loop execute format('lock table public.%I in share mode',t."table");end loop;
 perform pg_temp.phase3_assert_rows();
 for r in select value from jsonb_array_elements({json_sql(report['routineGuards'])}) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean or to_jsonb(p.proconfig) is distinct from r->'configuration' then raise exception 'Existing entitlement function changed: %',r->>'signature';end if;
 end loop;
end;$preflight$;
create temporary table phase3_original_functions on commit drop as select oid id from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table phase3_original_relations on commit drop as select oid id,relname name from pg_class where relnamespace='public'::regnamespace and relkind in('r','v','m','S');
create temporary table phase3_original_indexes on commit drop as select indexname name from pg_indexes where schemaname='public';
create temporary table phase3_original_triggers on commit drop as select oid id from pg_trigger where tgrelid in(select id from phase3_original_relations) or tgrelid='auth.users'::regclass;
{metadata}
create temporary table phase3_preserved_metadata on commit drop as select pg_temp.phase3_original_metadata() doc;
""" + '\n'.join(bodies) + f"""
do $postflight$ declare r jsonb;p record;t text;role_name text;roles jsonb;begin
 perform pg_temp.phase3_assert_rows();
 if pg_temp.phase3_original_metadata() is distinct from (select doc from phase3_preserved_metadata) then raise exception 'Original schema/security metadata changed outside the reviewed scope';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')<>{len(expected)+len(manifest['tables'])} then raise exception 'Unexpected table count';end if;
 foreach t in array {sql_array(manifest['tables'])} loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||t) and relkind='r' and relrowsecurity) then raise exception 'Payment table RLS missing';end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected direct payment table privilege';end if;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements({json_sql(manifest['functions'])}) loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||(r->>'signature'));
  if not found or md5(p.prosrc)<>r->>'sourceMd5' or p.prosecdef is distinct from (r->>'securityDefiner')::boolean
   or to_jsonb(p.proconfig) is distinct from r->'configuration' or p.provolatile::text<>r->>'volatility'
   or (select lanname from pg_language where oid=p.prolang)<>r->>'language' then raise exception 'Payment routine mismatch: %',r->>'signature';end if;
  select coalesce(jsonb_agg(v order by v),'[]') into roles from unnest(array['anon','authenticated','service_role']) v where has_function_privilege(v,p.oid,'EXECUTE');
  if roles<>r->'roles' or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'Payment routine privilege mismatch: %',r->>'signature';end if;
 end loop;
 if (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m)<>{literal(report['ledgerMd5'])} then raise exception 'Original migration ledger changed';end if;
end;$postflight$;
""" + '\n'.join(ledger) + f"""
notify pgrst,'reload schema';
select jsonb_build_object('check','phase3_activation','migrationVersions',to_jsonb({sql_array(versions)}),
 'existingApplicationTables',{len(expected)},'newPrivateTables',{len(manifest['tables'])},'functionsVerified',{len(manifest['functions'])},
 'existingRowsPreserved',true,'originalLedgerPreserved',true,'originalSecurityMetadataPreserved',true,
 'paymentsTaken',false,'checkoutEnabled',false,'hostedAcceptance','separate');
commit;
"""
destination = Path(sys.argv[2]) if len(sys.argv)>2 else OUT/'RUN-ACTIVATION.sql'
destination.write_text(packet)
print(json.dumps({'packetPrepared':True,'existingTables':len(expected),'newTables':len(manifest['tables']),'hostedExecution':False}))
