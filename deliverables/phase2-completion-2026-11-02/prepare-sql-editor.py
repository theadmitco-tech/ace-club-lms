"""Build a checksum-pinned SQL Editor packet from the migration source snapshot.

Only writes local deliverables. Does not connect to Supabase or apply SQL.
"""
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "sql-editor"
manifest = json.loads((HERE / "activation-manifest.json").read_text())
base = manifest["base_commit"]
phase1 = "20261018090000_add_v2_product_entitlements.sql"
phase1_sha = "ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7"
recovery_reference = manifest["recovery_schema_reference"]
view_hashes = recovery_reference["ordinary_public_views"]
assert set(view_hashes) == {"worksheet_question_catalog", "worksheet_question_log_catalog"}
assert all(re.fullmatch(r"[0-9a-f]{32}", value) for value in view_hashes.values())
assert recovery_reference["public_sequence_count"] == 0


def source(path):
    return (ROOT / path).read_bytes()


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def sql_array(values):
    return "array[" + ",".join(map(literal, values)) + "]::text[]"


def names(pattern, text):
    return sorted(set(re.findall(pattern, text, flags=re.I)))


p1 = source("supabase/migrations/" + phase1)
assert hashlib.sha256(p1).hexdigest() == phase1_sha
migrations = []
for filename, expected in manifest["migration_sha256"].items():
    raw = source("supabase/migrations/" + filename)
    assert hashlib.sha256(raw).hexdigest() == expected, filename
    text = raw.decode()
    assert len(re.findall(r"^begin;\s*$", text, re.M | re.I)) == 1
    assert len(re.findall(r"^commit;\s*$", text, re.M | re.I)) == 1
    body = re.sub(r"^(?:begin|commit);[ \t]*\n?", "", text, flags=re.M | re.I)
    migrations.append((filename, raw, body))

OUT.mkdir(exist_ok=True)
(OUT / "source-migrations").mkdir(exist_ok=True)
for filename, raw, _ in migrations:
    (OUT / "source-migrations" / filename).write_bytes(raw)

all_sql = "\n".join(body for _, _, body in migrations)
tables = names(r"create table (?:if not exists )?public\.(\w+)", all_sql)
routines = names(r"create (?:or replace )?function public\.(\w+)", all_sql)
p1_tables = names(r"create table (?:if not exists )?public\.(\w+)", p1.decode())
p1_routines = names(r"create (?:or replace )?function public\.(\w+)", p1.decode())
assert not set(tables) & set(p1_tables)
assert not set(routines) & set(p1_routines)
versions = [name.split("_", 1)[0] for name, _, _ in migrations]
authenticated_routines = sorted(set(name for block in re.findall(
    r"grant execute on function (.*?) to authenticated;", all_sql, re.I | re.S)
    for name in re.findall(r"public\.(\w+)\(", block)))

recovery_guard = f"""-- Archive-reference definitions are compared with the current database here.
-- Their presence in the manifest alone is not fresh staging verification.
do $ace_recovery_schema_guard$
declare
  expected_views jsonb := {literal(json.dumps(view_hashes, sort_keys=True))}::jsonb;
  actual_views jsonb;
begin
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='m') then
    raise exception 'Unexpected public materialized view; recovery metadata requires review';
  end if;
  select coalesce(jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true))),'{{}}')
    into actual_views from pg_class where relnamespace='public'::regnamespace and relkind='v';
  if actual_views is distinct from expected_views then
    raise exception 'Current public view definitions differ from the recovered archive reference; application stopped before migration writes';
  end if;
  if exists (select 1 from pg_class where relnamespace='public'::regnamespace and relkind='S') then
    raise exception 'Unexpected public sequence; recovery metadata requires review';
  end if;
end;
$ace_recovery_schema_guard$;
"""

recovery_schema_snapshot = """select jsonb_build_object(
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
    'definition_md5',md5(pg_get_viewdef(oid,true)),'acl',relacl::text,'options',reloptions)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind in ('v','m')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind='S')
) as fingerprint"""

(OUT / "04-view-and-sequence-metadata.sql").write_text("""-- Read-only recovery metadata; no application records or sequence values are returned.
-- This query supports review after a strict archive-reference guard mismatch.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
select jsonb_build_object(
  'check','phase2_public_view_and_sequence_metadata',
  'server_version',current_setting('server_version'),
  'read_only',current_setting('transaction_read_only'),
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
    'definition',pg_get_viewdef(oid,true),'definition_md5',md5(pg_get_viewdef(oid,true)),
    'acl',relacl::text,'options',reloptions) order by relname),'[]')
    from pg_class where relnamespace='public'::regnamespace and relkind in ('v','m')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text)
    order by relname),'[]') from pg_class where relnamespace='public'::regnamespace and relkind='S')
);
rollback;
""")

(OUT / "00-schema-preflight.sql").write_text(f"""-- Metadata-only inspection for verified staging; application records remain private.
-- Dashboard project identity and a missing-object review remain operator checks.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
with expected_tables(name) as (select unnest({sql_array(p1_tables + tables)})),
expected_routines(name) as (select unnest({sql_array(p1_routines + routines)})),
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
""")

existing_before = """create temporary table ace_existing_before (
  table_name text primary key, row_count bigint not null, row_md5 text not null
) on commit drop;
do $ace_existing_baseline$
declare t record; n bigint; h text;
begin
  for t in select c.relname from pg_class c where c.relnamespace='public'::regnamespace
    and c.relkind='r' order by c.relname loop
    execute format('lock table public.%I in share mode',t.relname);
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from public.%I r',t.relname) into n,h;
    insert into ace_existing_before values(t.relname,n,h);
  end loop;
end;
$ace_existing_baseline$;
"""
existing_after = f"""do $ace_existing_preservation$
declare t record; n bigint; h text;
begin
  for t in select * from ace_existing_before order by table_name loop
    if to_regclass('public.'||quote_ident(t.table_name)) is null then raise exception 'Existing application table missing: %',t.table_name; end if;
    execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from public.%I r',t.table_name) into n,h;
    if n is distinct from t.row_count or h is distinct from t.row_md5 then
      raise exception 'Existing application data changed: %; rolling back all Phase 2 changes',t.table_name;
    end if;
  end loop;
  if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r')
     <> (select count(*) from ace_existing_before)+{len(tables)} then
    raise exception 'Unexpected public table inventory changed';
  end if;
end;
$ace_existing_preservation$;
"""

snapshot = f"""select jsonb_build_object(
  'earlier_ledger', (select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'[]'))
    from supabase_migrations.schema_migrations m where version <> all({sql_array(versions)})),
  'phase1_tables', (select md5(jsonb_agg(jsonb_build_object('name',relname,'rls',relrowsecurity,
    'acl',relacl::text) order by relname)::text) from pg_class
    where relnamespace='public'::regnamespace and relname=any({sql_array(p1_tables)})),
  'phase1_columns', (select md5(jsonb_agg(to_jsonb(c) order by table_name,ordinal_position)::text)
    from information_schema.columns c where table_schema='public' and table_name=any({sql_array(p1_tables)})),
  'phase1_constraints', (select md5(jsonb_agg(jsonb_build_object('name',c.conname,
    'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname)::text)
    from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relnamespace='public'::regnamespace and t.relname=any({sql_array(p1_tables)})),
  'phase1_indexes', (select md5(jsonb_agg(to_jsonb(i) order by tablename,indexname)::text)
    from pg_indexes i where schemaname='public' and tablename=any({sql_array(p1_tables)})),
  'phase1_policies', (select md5(jsonb_agg(to_jsonb(p) order by tablename,policyname)::text)
    from pg_policies p where schemaname='public' and tablename=any({sql_array(p1_tables)})),
  'phase1_triggers', (select md5(jsonb_agg(jsonb_build_object('name',t.tgname,
    'definition',pg_get_triggerdef(t.oid)) order by t.tgrelid,t.tgname)::text)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal
      and c.relnamespace='public'::regnamespace and c.relname=any({sql_array(p1_tables)})),
  'phase1_routines', (select md5(jsonb_agg(jsonb_build_object('name',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'acl',proacl::text) order by oid::regprocedure::text)::text)
    from pg_proc where pronamespace='public'::regnamespace and proname=any({sql_array(p1_routines)})),
  {','.join(literal(table) + ", (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public." + table + " t)" for table in p1_tables)}
) as fingerprint"""

assertions = f"""do $ace_postflight$
declare t text; r text; op text; f record;
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version=any({sql_array(versions)})) <> {len(versions)} then
    raise exception 'Phase 2 ledger is incomplete';
  end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; do not rerun Phase 1';
  end if;
  foreach t in array {sql_array(tables)} loop
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
  foreach r in array {sql_array(routines)} loop
    if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r) <> 1 then
      raise exception 'Missing or unexpected overload of Phase 2 routine: %',r;
    end if;
  end loop;
  for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace
    and proname=any({sql_array(routines)}) loop
    if has_function_privilege('anon',f.oid,'EXECUTE')
      or has_function_privilege('service_role',f.oid,'EXECUTE') then
      raise exception 'Unexpected RPC grant: %',f.proname;
    end if;
    if has_function_privilege('authenticated',f.oid,'EXECUTE') is distinct from
       (f.proname=any({sql_array(authenticated_routines)})) then
      raise exception 'Incorrect authenticated RPC grant: %',f.proname;
    end if;
  end loop;
  if (select jsonb_object_agg(code,entitlement_product_code) from public.v2_course_offerings)
    is distinct from '{{"quant":"quant_crash","verbal":"verbal_crash","di":"di_crash","full_course":"full_batch"}}'::jsonb then
    raise exception 'Canonical offering/Phase 1 compatibility mapping mismatch';
  end if;
end;
$ace_postflight$;
"""

bundle = f"""-- Migration snapshot based on PR #24 commit {base}; source SHA256 values are pinned in ../activation-manifest.json.
-- New migration bodies may postdate that base; the manifest does not claim an exact final source commit.
-- STAGING ONLY: eyphkkginlgoaxflauog. Production execution is prohibited.
-- ALL-TEN-MISSING PATH ONLY. Existing Phase 2 objects/ledger cause a hard stop.
-- Preflight 00/01 and a fresh successful backup/restore rehearsal precede application.
-- The two acknowledgement values are completed only after those external checks pass.
-- These acknowledgements do not independently establish database identity/recovery.
-- The ten source SQL bodies are unchanged except their transaction boundaries
-- are replaced by ONE atomic transaction containing all ten ledger inserts.
-- The entire file executes as one transaction. Any error requires ROLLBACK.
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $ace_gate$
declare
  verified_project_ref text := 'REPLACE_WITH_VERIFIED_PROJECT_REF';
  backup_restore_evidence text := 'REPLACE_WITH_BACKUP_RESTORE_EVIDENCE';
  t text;
begin
  if verified_project_ref <> 'eyphkkginlgoaxflauog' then
    raise exception 'Verify staging dashboard identity before application';
  end if;
  if backup_restore_evidence = 'REPLACE_WITH_BACKUP_RESTORE_EVIDENCE'
    or length(btrim(backup_restore_evidence)) < 10 then
    raise exception 'Record fresh backup and successful disposable restore-rehearsal evidence first';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Migration ledger missing; inspect before proceeding';
  end if;
  perform pg_advisory_xact_lock(20261028,24);
end;
$ace_gate$;
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $ace_preconditions$
declare t text;
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version='20261018090000') then
    raise exception 'Phase 1 ledger entry missing; reconcile without rerunning Phase 1';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version=any({sql_array(versions)})) then
    raise exception 'A Phase 2 version is already recorded; inspect definitions and prepare only the reconciled missing set';
  end if;
  foreach t in array {sql_array(tables)} loop
    if to_regclass('public.'||t) is not null then raise exception 'Existing Phase 2 object: %; stop for drift review',t; end if;
  end loop;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname=any({sql_array(routines)})) then
    raise exception 'Existing Phase 2 routine; stop for drift review';
  end if;
  foreach t in array {sql_array(p1_tables + ['profiles'])} loop
    if to_regclass('public.'||t) is null then raise exception 'Missing dependency: %',t; end if;
  end loop;
  if to_regprocedure('public.is_portal_admin()') is null then raise exception 'Missing Admin authorization dependency'; end if;
end;
$ace_preconditions$;
{recovery_guard}
create temporary table ace_recovery_schema_before on commit drop as {recovery_schema_snapshot};
{existing_before}
create temporary table ace_phase1_before on commit drop as {snapshot};

"""
for filename, _, body in migrations:
    version, name = filename[:-4].split('_', 1)
    assert '$ace_source$' not in body
    bundle += f"-- BEGIN APPROVED SOURCE: {filename}\n{body}\n-- END APPROVED SOURCE\n"
    bundle += f"insert into supabase_migrations.schema_migrations(version,name,statements)\nvalues ({literal(version)},{literal(name)},array[$ace_source${body}$ace_source$]);\n\n"
bundle += assertions
bundle += existing_after
bundle += recovery_guard
bundle += f"""
do $ace_recovery_schema_preservation$
declare after_fingerprint jsonb;
begin
  {recovery_schema_snapshot.replace(' as fingerprint', '')} into after_fingerprint;
  if after_fingerprint is distinct from (select fingerprint from ace_recovery_schema_before) then
    raise exception 'Existing view definitions or privileges changed; rolling back Phase 2';
  end if;
end;
$ace_recovery_schema_preservation$;
do $ace_preservation$
declare after_fingerprint jsonb;
begin
  {snapshot.replace(' as fingerprint', '')} into after_fingerprint;
  if after_fingerprint is distinct from (select fingerprint from ace_phase1_before) then
    raise exception 'Phase 1 or earlier migration ledger changed; rolling back the complete Phase 2 transaction';
  end if;
end;
$ace_preservation$;
notify pgrst, 'reload schema';
commit;
select jsonb_build_object('check','phase2_schema_activation','status','transaction committed',
  'migration_count',10,'phase1_migration_reapplied',false,'existing_public_data_preserved',true,
  'existing_view_definitions','matched archive reference at application and preserved',
  'public_sequence_count',0,'hosted_acceptance','pending') as result;
"""
(OUT / "02-apply-all-ten-if-absent.sql").write_text(bundle)
(OUT / "03-postflight.sql").write_text(
    "-- Staging only. Read-only structural/privilege checks, not browser acceptance.\n"
    "begin read only;\nset local statement_timeout='30s';\n" + assertions + recovery_guard +
    "select 'Phase 2 structural and privilege checks passed; hosted acceptance remains pending' as result;\nrollback;\n"
)
checksums = {p.relative_to(OUT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted(OUT.rglob('*.sql'))}
(OUT / "checksums.json").write_text(json.dumps({
    "source_commit": None, "base_commit": base, "source_kind": "checksum-pinned working-tree snapshot", "staging_project": manifest['staging_project'],
    "phase1_preserved_sha256": phase1_sha, "files": checksums,
}, indent=2) + "\n")
print(f"Prepared {len(migrations)} checksum-verified sources and guarded SQL Editor steps.")
