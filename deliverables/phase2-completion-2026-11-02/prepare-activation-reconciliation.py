"""Generate read-only activation equivalence checks from pinned local evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser()
parser.add_argument('--baseline', required=True, help='Aggregate PostgreSQL-derived recovery fingerprints; no application rows')
parser.add_argument('--qa-state', required=True, help='Private designated QA state; credentials are never emitted')
parser.add_argument('--operator-state', required=True, help='Private designated content-operator state; credentials are never emitted')
args = parser.parse_args()
here = Path(__file__).resolve().parent
root = here.parent.parent
manifest = json.loads((here / 'activation-manifest.json').read_text())
catalogue = json.loads((here / 'sql-editor/local-reference-catalogue.json').read_text())
baseline = json.loads(Path(args.baseline).read_text())
qa = json.loads(Path(args.qa_state).read_text())
operator = json.loads(Path(args.operator_state).read_text())
assert qa['project'] == operator['project'] == 'eyphkkginlgoaxflauog'
assert len(qa['users']) == 9 and operator['purpose'] == 'phase2_content_operator'
exclusions = [{'id': user['id'], 'label': user['label'], 'email': user['email']} for user in qa['users']]
assert all(user['email'] == f"ace-p2-{user['label']}-{qa['runId']}@example.invalid" for user in qa['users'])
assert operator['email'] == f"ace-content-operator-{operator['runId']}@example.invalid"
exclusions.append({'id': operator['userId'], 'label': 'content_operator', 'email': operator['email']})
assert len(set(item['id'] for item in exclusions)) == 10
assert baseline['designated_profiles_absent_from_snapshot'] is True
assert set(baseline['designated_new_profile_ids']) == {item['id'] for item in exclusions}
expected_rows = [{'name': name, **proof} for name, proof in baseline['tables'].items()]
assert len(expected_rows) == 60
literal = lambda value: "'" + value.replace("'", "''") + "'"
json_literal = lambda value: literal(json.dumps(value, sort_keys=True)) + '::jsonb'
files = manifest['migration_sha256']
ledger = []
sources = ''
for name, digest in files.items():
    raw = (root / 'supabase/migrations' / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == digest, name
    text = raw.decode()
    body = re.sub(r'^(?:begin|commit);[ \t]*\n?', '', text, flags=re.M | re.I)
    ledger.append({'version': name.split('_', 1)[0], 'name': name[:-4].split('_', 1)[1], 'body_md5': hashlib.md5(body.encode()).hexdigest()})
    sources += '\n' + text
names = sorted(set(re.findall(r'create (?:or replace )?function public\.(\w+)', sources, re.I)))
tables = sorted(set(re.findall(r'create table (?:if not exists )?public\.(\w+)', sources, re.I)))
assert len(ledger) == 10 and len(tables) == 18
routines = []
for routine in catalogue['routines']:
    name = routine['signature'].split('(', 1)[0].removeprefix('public.')
    if name not in names:
        continue
    definition = routine['definition']
    header, body = definition.split('AS $function$', 1)
    body = body.rsplit('$function$', 1)[0]
    routines.append({'signature': 'public.' + routine['signature'].removeprefix('public.'), 'name': name,
        'body_md5': hashlib.md5(body.encode()).hexdigest(), 'security_definer': routine['security_definer'],
        'config': routine['config'], 'language': re.search(r'LANGUAGE (\w+)', header).group(1),
        'volatility': 'i' if re.search(r'\bIMMUTABLE\b', header) else 's' if re.search(r'\bSTABLE\b', header) else 'v',
        'authenticated_execute': 'authenticated=X/' in (routine['acl'] or '')})
assert len(routines) == len(names)
expected_ledger = [{'version': version, 'row_md5': digest} for version, digest in baseline['ledger'].items()]
views = manifest['recovery_schema_reference']['ordinary_public_views']
sql = f'''-- Read-only activation reconciliation. No migrations, rows or grants are changed.
-- An earlier failed SQL Editor transaction is cleared before the read-only report.
-- Exact body hashes use prosrc rather than version-dependent function deparsing.
rollback;
begin read only;
set local statement_timeout='30s';
set local lock_timeout='2s';
set local time zone 'UTC';
with expected_versions as (select * from jsonb_to_recordset({json_literal(ledger)}) as x(version text,name text,body_md5 text)),
expected_prior_ledger as (select * from jsonb_to_recordset({json_literal(expected_ledger)}) as x(version text,row_md5 text)),
expected_routines as (select * from jsonb_to_recordset({json_literal(routines)}) as x(signature text,name text,body_md5 text,security_definer boolean,config jsonb,language text,volatility text,authenticated_execute boolean)),
expected_tables as (select jsonb_array_elements_text({json_literal(tables)}) as name),
client_roles as (select oid,rolname from pg_roles where rolname in ('anon','authenticated','service_role')),
ledger_report as (select e.version, m.version is not null as present,
  coalesce(m.name=e.name,false) as name_matches,
  coalesce(cardinality(m.statements)=1 and md5(m.statements[1])=e.body_md5,false) as exact_source_body_matches
  from expected_versions e left join supabase_migrations.schema_migrations m on m.version=e.version),
prior_report as (select e.version,m.version is not null as present,coalesce(md5(to_jsonb(m)::text)=e.row_md5,false) as original_row_matches
  from expected_prior_ledger e left join supabase_migrations.schema_migrations m on m.version=e.version),
table_report as (select e.name,c.oid is not null as present,coalesce(c.relkind='r',false) as ordinary_table,
  coalesce(c.relrowsecurity,false) as rls_enabled,
  (select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from client_roles r where has_table_privilege(r.oid,c.oid,'SELECT')) as read_roles,
  (select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from client_roles r where exists
    (select 1 from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) op where has_table_privilege(r.oid,c.oid,op))) as direct_write_roles
  from expected_tables e left join pg_class c on c.oid=to_regclass('public.'||e.name)),
routine_report as (select e.signature,p.oid is not null as present,coalesce(md5(p.prosrc)=e.body_md5,false) as source_body_matches,
  coalesce(p.prosecdef=e.security_definer,false) as security_definer_matches,
  coalesce(to_jsonb(p.proconfig)=e.config,false) as search_path_matches,
  coalesce(l.lanname=e.language,false) as language_matches,coalesce(p.provolatile::text=e.volatility,false) as volatility_matches,
  (select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]') from client_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE')) as execute_roles,
  coalesce(not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('service_role',p.oid,'EXECUTE')
    and has_function_privilege('authenticated',p.oid,'EXECUTE')=e.authenticated_execute,false) as grants_match,
  (select count(*) from pg_proc q where q.pronamespace='public'::regnamespace and q.proname=e.name)=1 as no_unexpected_overloads
  from expected_routines e left join pg_proc p on p.oid=to_regprocedure(e.signature) left join pg_language l on l.oid=p.prolang),
expected_profile_exclusions as (select * from jsonb_to_recordset({json_literal(exclusions)}) as x(id uuid,label text,email text)),
profile_exclusion_report as (select e.id,e.label,p.id is not null as profile_present,
  coalesce(u.email=e.email and p.email=e.email and u.created_at>={literal(baseline['captured_at'])}::timestamptz
    and p.created_at>={literal(baseline['captured_at'])}::timestamptz,false) as identity_verified
  from expected_profile_exclusions e left join auth.users u on u.id=e.id left join public.profiles p on p.id=e.id),
verified_profile_exclusions as (select coalesce(array_agg(id),'{{}}'::uuid[]) as ids from profile_exclusion_report where identity_verified),
expected_application_rows as (select * from jsonb_to_recordset({json_literal(expected_rows)}) as x(name text,row_count bigint,row_md5 text)),
application_row_proofs as (select e.*,to_regclass('public.'||quote_ident(e.name)) is not null as present,
  case when to_regclass('public.'||quote_ident(e.name)) is null then null else
    ((xpath('/row/proof/text()',query_to_xml(format(
      'select jsonb_build_object(''row_count'',count(*),''row_md5'',md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]''))) as proof from public.%I r %s',e.name,
      case when e.name='profiles' then format('where not (r.id=any(%L::uuid[]))',(select ids from verified_profile_exclusions)) else '' end
    ),false,true,'')))[1]::text)::jsonb end as actual from expected_application_rows e),
application_row_report as (select name,present,row_count as expected_count,(actual->>'row_count')::bigint as actual_count,
  coalesce((actual->>'row_count')::bigint=row_count and actual->>'row_md5'=row_md5,false) as rows_match
  from application_row_proofs)
select jsonb_build_object(
 'check','phase2_activation_reconciliation','read_only',current_setting('transaction_read_only'),
 'scope','Read-only schema and original application-row reconciliation. Only the ten designated new profiles may be excluded after identity and creation-time verification.',
 'expected_version_count',10,'present_version_count',(select count(*) from ledger_report where present),
 'all_ten_ledger_bodies_match',(select bool_and(present and name_matches and exact_source_body_matches) from ledger_report),
 'versions',(select jsonb_agg(to_jsonb(r) order by version) from ledger_report r),
 'original_ledger_preserved',(select bool_and(present and original_row_matches) from prior_report),
 'phase1_original_ledger_preserved',(select coalesce(bool_and(present and original_row_matches),false) from prior_report where version='20261018090000'),
 'prior_ledger',(select jsonb_agg(to_jsonb(r) order by version) from prior_report r),
 'unexpected_ledger_versions',(select coalesce(jsonb_agg(m.version order by m.version),'[]') from supabase_migrations.schema_migrations m
    where m.version not in(select version from expected_versions) and m.version not in(select version from expected_prior_ledger)),
 'all_private_table_guards_match',(select bool_and(present and ordinary_table and rls_enabled and read_roles='["authenticated"]'::jsonb and direct_write_roles='[]'::jsonb) from table_report),
 'tables',(select jsonb_agg(to_jsonb(r) order by name) from table_report r),
 'all_routine_guards_match',(select bool_and(present and source_body_matches and security_definer_matches and search_path_matches and language_matches and volatility_matches and grants_match and no_unexpected_overloads) from routine_report),
 'routines',(select jsonb_agg(to_jsonb(r) order by signature) from routine_report r),
 'legacy_view_hashes_match',(select coalesce(jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true))),'{{}}')={json_literal(views)} from pg_class where relnamespace='public'::regnamespace and relkind='v'),
 'unexpected_materialized_views',(select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='m'),
 'public_sequence_count',(select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='S'),
 'baseline_captured_at',{literal(baseline['captured_at'])},
 'baseline_hash_derivation','Fresh snapshot parsed and hashed directly in PostgreSQL; no JavaScript numeric conversion',
 'designated_profiles_absent_from_snapshot',true,
 'profile_exclusions',(select jsonb_agg(to_jsonb(r) order by label) from profile_exclusion_report r),
 'verified_profile_exclusion_count',(select count(*) from profile_exclusion_report where identity_verified),
 'existing_application_data_preserved',(select bool_and(present and rows_match) from application_row_report),
 'original_application_table_count',(select count(*) from application_row_report),
 'original_application_tables',(select jsonb_agg(to_jsonb(r) order by name) from application_row_report r),
 'hosted_acceptance','separate; this report does not imply website or material acceptance'
);
rollback;
'''
(here / 'RECONCILE-ACTIVATION.sql').write_text(sql)
print('Read-only activation reconciliation prepared; no database accessed by generation.')
