"""Generate an additive, guarded repair for hosted read-only content RPCs."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/phase5-preview-activation'
original = (ROOT / 'supabase/migrations/20261103090000_add_v2_content_publishing.sql').read_text()
filename = '20261103100000_fix_v2_content_readonly_previews.sql'
repair = (ROOT / 'supabase/migrations' / filename).read_text()
version, name = filename.split('_', 1)
name = name[:-4]
literal = lambda value: "'" + str(value).replace("'", "''") + "'"
checks = []
for routine, signature in [('list_v2_content_workspace', 'list_v2_content_workspace()'), ('read_v2_content_preview', 'read_v2_content_preview(uuid,uuid,integer)')]:
    pattern = r'create (?:or replace )?function public\.' + routine + r'\(.*?as \$\$(.*?)\$\$;'
    old = re.search(pattern, original, re.S).group(1)
    new = re.search(pattern, repair, re.S).group(1)
    checks.append({'signature': signature, 'before': hashlib.md5(old.encode()).hexdigest(), 'after': hashlib.md5(new.encode()).hexdigest()})
expected = literal(json.dumps(checks)) + '::jsonb'
body = re.sub(r'^(begin|commit);\s*$', '', repair, flags=re.M)
packet = f"""-- STAGING ONLY: eyphkkginlgoaxflauog must be verified in the dashboard.
-- The additive repair changes two read functions; applied migration files remain unchanged.
rollback;
begin;
set local statement_timeout='60s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase5_repair_ledger on commit drop as select * from supabase_migrations.schema_migrations;
create temporary table phase5_repair_routines on commit drop as
 select p.oid,p.proacl,p.prosecdef,p.provolatile,p.proconfig from pg_proc p
 where p.oid in ('public.list_v2_content_workspace()'::regprocedure,'public.read_v2_content_preview(uuid,uuid,integer)'::regprocedure);
create function pg_temp.phase5_repair_rows() returns jsonb language plpgsql as $$
declare t record;h text;n bigint;result jsonb:='[]';begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  result:=result||jsonb_build_array(jsonb_build_object('table',t.tablename,'rows',n,'md5',h));
 end loop;return result;
end;$$;
do $repair_guard$declare r jsonb;t record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version='{version}') then raise exception 'Read-only repair already recorded; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103090000' and statements=array[{literal(original)}]::text[])
 or not exists(select 1 from supabase_migrations.schema_migrations where version='20261103091000') then raise exception 'Expected Phase 5 activation ledger required';end if;
 for r in select value from jsonb_array_elements({expected}) loop
  if not exists(select 1 from pg_proc where oid=to_regprocedure('public.'||(r->>'signature')) and md5(prosrc)=r->>'before' and prosecdef and provolatile='s' and proconfig=array['search_path=""']) then raise exception 'Read function differs from reviewed source';end if;
 end loop;
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop execute format('lock table public.%I in share mode',t.tablename);end loop;
end;$repair_guard$;
create temporary table phase5_repair_baseline on commit drop as select pg_temp.phase5_repair_rows() rows;
{body}
do $repair_verified$declare r jsonb;begin
 for r in select value from jsonb_array_elements({expected}) loop
  if not exists(select 1 from pg_proc where oid=to_regprocedure('public.'||(r->>'signature')) and md5(prosrc)=r->>'after') then raise exception 'Repaired source mismatch';end if;
 end loop;
 if exists(select 1 from phase5_repair_routines b join pg_proc p on p.oid=b.oid where p.proacl is distinct from b.proacl or p.prosecdef is distinct from b.prosecdef or p.provolatile is distinct from b.provolatile or p.proconfig is distinct from b.proconfig) then raise exception 'Function security metadata changed';end if;
 if pg_temp.phase5_repair_rows() is distinct from (select rows from phase5_repair_baseline) then raise exception 'Existing application rows changed';end if;
 if (select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]') from supabase_migrations.schema_migrations m) is distinct from (select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]') from phase5_repair_ledger m) then raise exception 'Original ledger changed';end if;
end;$repair_verified$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',array[{literal(repair)}]);
notify pgrst,'reload schema';
select jsonb_build_object('check','phase5_readonly_repair','migrationVersion','{version}',
 'sourceSha256','{hashlib.sha256(repair.encode()).hexdigest()}','functionsRepaired',2,
 'existingRowsPreserved',true,'originalLedgerPreserved',true,'functionSecurityMetadataPreserved',true,
 'existingApplicationTables',(select jsonb_array_length(rows) from phase5_repair_baseline));
commit;
"""
(OUT / 'REPAIR-READONLY-PREVIEWS.sql').write_text(packet)
print(json.dumps({'repairPrepared': True, 'functions': 2, 'hostedExecution': False}))
