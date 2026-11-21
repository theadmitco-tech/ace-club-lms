from pathlib import Path
from hashlib import sha256

root = Path(__file__).resolve().parents[1]
source = (root / 'supabase/migrations/20261121100000_add_v2_curriculum_links.sql').read_text()
body = source.removeprefix('begin;\n').removesuffix('commit;\n')
modified = "'v2_compose_content','v2_content_placements','v2_content_scope','v2_learning_session_open','v2_add_feedback_obligation','v2_store_session_feedback','get_my_v2_learning_state'"
packet = '''-- Staging project: eyphkkginlgoaxflauog. No existing cohorts are linked by installation.
rollback;
begin;
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$begin
 if to_regclass('public.v2_batch_curriculum_links') is not null or exists(select 1 from supabase_migrations.schema_migrations where version='20261121100000') then raise exception 'Curriculum links already exist; reconciliation required';end if;
end $$;
create temporary table curriculum_preserved_rows(name text,n bigint,h text) on commit drop;
do $$declare t record;n bigint;h text;begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('lock table public.%I in share mode',t.tablename);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  insert into curriculum_preserved_rows values(t.tablename,n,h);
 end loop;
end $$;
create temporary table curriculum_preserved_functions on commit drop as select oid,proname,pg_get_functiondef(oid) definition,proacl::text acl,proowner,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table curriculum_preserved_relations on commit drop as select oid,relacl::text acl,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace;
create temporary table curriculum_preserved_ledger on commit drop as select to_jsonb(m) document from supabase_migrations.schema_migrations m;
'''
packet += body
packet += '''
do $$declare t record;n bigint;h text;begin
 for t in select * from curriculum_preserved_rows loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.name) into n,h;
  if n<>t.n or h<>t.h then raise exception 'Existing application rows changed: %',t.name;end if;
 end loop;
 if exists(select 1 from curriculum_preserved_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or p.proacl::text is distinct from f.acl or p.proowner<>f.proowner or p.prosecdef<>f.prosecdef or p.proconfig is distinct from f.proconfig or (f.proname not in (MODIFIED) and pg_get_functiondef(p.oid) is distinct from f.definition)) then raise exception 'Unexpected function or permission changes';end if;
 if exists(select 1 from curriculum_preserved_relations r left join pg_class c on c.oid=r.oid where c.oid is null or c.relacl::text is distinct from r.acl or c.relrowsecurity<>r.relrowsecurity or c.relforcerowsecurity<>r.relforcerowsecurity) then raise exception 'Existing relation security changed';end if;
 if exists(select document from curriculum_preserved_ledger except select to_jsonb(m) from supabase_migrations.schema_migrations m) then raise exception 'Original migration ledger changed';end if;
 if exists(select 1 from public.v2_batch_curriculum_links) then raise exception 'Unexpected existing-batch link';end if;
end $$;
'''.replace('MODIFIED', modified)
packet += "insert into supabase_migrations.schema_migrations(version,name,statements) values('20261121100000','add_v2_curriculum_links',array['" + source.replace("'", "''") + "']);\n"
packet += "notify pgrst,'reload schema';\nselect jsonb_build_object('check','shared_curriculum','migration','20261121100000','sourceSha256','" + sha256(source.encode()).hexdigest() + "','existingRowsPreserved',true,'existingPermissionsPreserved',true,'originalLedgerPreserved',true,'existingBatchesLinked',0,'publicTablesPreserved',(select count(*) from curriculum_preserved_rows));\ncommit;\n"
(root / 'deliverables/shared-curriculum-2026-11-21/RUN-SHARED-CURRICULUM.sql').write_text(packet)
