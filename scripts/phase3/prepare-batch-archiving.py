"""Generate the staging archive installation packet with current-data preservation."""
from pathlib import Path
import hashlib
import re
root = Path(__file__).resolve().parents[2]
source = (root/'supabase/migrations/20261120110000_add_v2_batch_archiving.sql').read_text()
body = re.sub(r'^(begin|commit);\s*$', '', source, flags=re.M)
literal = "'" + source.replace("'", "''") + "'"
packet = """-- Staging installation only; no batches are archived by this packet.
rollback;
begin;
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$begin
 if to_regclass('public.v2_batch_archive_history') is not null or exists(select 1 from supabase_migrations.schema_migrations where version='20261120110000') then raise exception 'Batch archiving already exists; reconciliation required';end if;
end $$;
create temporary table archive_preserved_rows(name text,n bigint,h text) on commit drop;
do $$declare t record;n bigint;h text;begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('lock table public.%I in share mode',t.tablename);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  insert into archive_preserved_rows values(t.tablename,n,h);
 end loop;
end $$;
create temporary table archive_preserved_functions on commit drop as select oid,pg_get_functiondef(oid) definition,proacl::text acl from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table archive_preserved_relations on commit drop as select oid,relacl::text acl,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace;
create temporary table archive_preserved_ledger on commit drop as select to_jsonb(m) document from supabase_migrations.schema_migrations m;
""" + body + """
do $verify$declare t record;n bigint;h text;begin
 for t in select * from archive_preserved_rows loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.name) into n,h;
  if n<>t.n or h<>t.h then raise exception 'Existing rows changed: %',t.name;end if;
 end loop;
 if exists(select 1 from archive_preserved_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or pg_get_functiondef(p.oid) is distinct from f.definition or p.proacl::text is distinct from f.acl) then raise exception 'Existing functions changed';end if;
 if exists(select 1 from archive_preserved_relations r left join pg_class c on c.oid=r.oid where c.oid is null or c.relacl::text is distinct from r.acl or c.relrowsecurity<>r.relrowsecurity or c.relforcerowsecurity<>r.relforcerowsecurity) then raise exception 'Existing permissions changed';end if;
 if exists((select document from archive_preserved_ledger except select to_jsonb(m) from supabase_migrations.schema_migrations m) union all (select to_jsonb(m) from supabase_migrations.schema_migrations m except select document from archive_preserved_ledger)) then raise exception 'Original ledger changed';end if;
end $verify$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261120110000','add_v2_batch_archiving',array["""+literal+"""]);
notify pgrst,'reload schema';
select jsonb_build_object('check','batch_archiving','migration','20261120110000','existingRowsPreserved',true,'originalLedgerPreserved',true,'existingPermissionsPreserved',true,'publicTablesPreserved',(select count(*) from archive_preserved_rows),'archivedBatches',0);
commit;
"""
out=root/'deliverables/admin-batch-archiving-2026-11-20'
out.mkdir(parents=True,exist_ok=True)
(out/'RUN-BATCH-ARCHIVING.sql').write_text('-- Source SHA-256: '+hashlib.sha256(source.encode()).hexdigest()+'\n'+packet)
