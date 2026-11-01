"""Build the SQL Editor packet from the reviewed Git commit, never the worktree.

Only writes local deliverables. Does not connect to Supabase or apply SQL.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "sql-editor"
manifest = json.loads((HERE / "activation-manifest.json").read_text())
base = manifest["base"]
phase1 = "20261018090000_add_v2_product_entitlements.sql"
phase1_sha = "ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7"


def source(path):
    return subprocess.check_output(["git", "show", f"{base}:{path}"], cwd=ROOT)


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
(OUT / "00-schema-preflight.sql").write_bytes(source("scripts/v2-schema-preflight.sql"))

all_sql = "\n".join(body for _, _, body in migrations)
tables = names(r"create table if not exists public\.(\w+)", all_sql)
routines = names(r"create or replace function public\.(\w+)", all_sql)
p1_tables = names(r"create table if not exists public\.(\w+)", p1.decode())
p1_routines = names(r"create or replace function public\.(\w+)", p1.decode())
assert not set(tables) & set(p1_tables)
assert not set(routines) & set(p1_routines)
versions = [name.split("_", 1)[0] for name, _, _ in migrations]

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
       (f.proname ~ '^(save_|list_|preview_|read_|set_|get_my_)') then
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

bundle = f"""-- Generated from PR #24 commit {base}; see ../activation-manifest.json.
-- STAGING ONLY: eyphkkginlgoaxflauog. Never run on Production.
-- ALL-SIX-MISSING PATH ONLY. Existing Phase 2 objects/ledger cause a hard stop.
-- Run 00 and 01 first, inspect drift, and complete a fresh backup/restore rehearsal.
-- Edit only the two acknowledgements below after those external checks pass.
-- These acknowledgements do not independently establish database identity/recovery.
-- The six source SQL bodies are unchanged except their transaction boundaries
-- are replaced by ONE atomic transaction containing all six ledger inserts.
-- Run this entire file, not a highlighted fragment. On error execute ROLLBACK.
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
create temporary table ace_phase1_before on commit drop as {snapshot};

"""
for filename, _, body in migrations:
    version, name = filename[:-4].split('_', 1)
    assert '$ace_source$' not in body
    bundle += f"-- BEGIN APPROVED SOURCE: {filename}\n{body}\n-- END APPROVED SOURCE\n"
    bundle += f"insert into supabase_migrations.schema_migrations(version,name,statements)\nvalues ({literal(version)},{literal(name)},array[$ace_source${body}$ace_source$]);\n\n"
bundle += assertions
bundle += f"""
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
select 'Phase 2 six-migration transaction committed; run 00, 01, 03 and hosted acceptance next' as result;
"""
(OUT / "02-apply-all-six-if-absent.sql").write_text(bundle)
(OUT / "03-postflight.sql").write_text(
    "-- Staging only. Read-only structural/privilege checks, not browser acceptance.\n"
    "begin read only;\nset local statement_timeout='30s';\n" + assertions +
    "select 'Phase 2 structural and privilege checks passed; hosted acceptance remains pending' as result;\nrollback;\n"
)
checksums = {p.relative_to(OUT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted(OUT.rglob('*.sql'))}
(OUT / "checksums.json").write_text(json.dumps({
    "source_commit": base, "staging_project": manifest['staging_project'],
    "phase1_preserved_sha256": phase1_sha, "files": checksums,
}, indent=2) + "\n")
print(f"Prepared {len(migrations)} checksum-verified sources and guarded SQL Editor steps at {OUT}")
