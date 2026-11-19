"""Prepare a scoped migration packet with dynamic row and metadata preservation."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[2]
out = root / 'deliverables/admin-batch-simplification-2026-11-20'
out.mkdir(parents=True, exist_ok=True)
name = '20261120100000_add_v2_live_class_editing.sql'
source = (root / 'supabase/migrations' / name).read_text()
old_outline = (root / 'supabase/migrations/20261020090000_add_v2_outline_schedules.sql').read_text()
old_latest = (root / 'supabase/migrations/20261103120000_fix_v2_integration_conflicts.sql').read_text()
changed = ['assert_v2_batch_request', 'build_v2_batch_draft', 'build_v2_batch_publication']
helper = 'assert_v2_completed_class_preservation'
def source_md5(text, routine):
    start = re.search(r'create(?: or replace)? function public\.' + routine + r'\(', text, re.I).start()
    body = re.search(r'\bas\s+(\$\w*\$)([\s\S]*?)\1', text[start:], re.I).group(2)
    return hashlib.md5(body.encode()).hexdigest()
literal = lambda value: "'" + str(value).replace("'", "''") + "'"
guards = [{'signature': routine + '(jsonb)', 'before': source_md5(old_outline if routine == changed[0] else old_latest, routine), 'after': source_md5(source, routine)} for routine in changed]
guards.append({'signature': helper + '(uuid,jsonb)', 'before': None, 'after': source_md5(source, helper)})
json_sql = literal(json.dumps(guards, separators=(',', ':'))) + '::jsonb'
header = f"""-- Staging application packet. The deployment operator verifies the target before execution.
-- The packet preserves every current public table dynamically, including all 92 expected staging tables.
-- Source SHA-256: {hashlib.sha256(source.encode()).hexdigest()}
-- No course publication, enrollment, purchase or payment operation is performed.
begin;
set local timezone='UTC';
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table live_class_expected_functions on commit drop as
select * from jsonb_to_recordset({json_sql}) as g(signature text,before text,after text);

do $preflight$ declare g record;p record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version='20261120100000') then raise exception 'Live-class editing migration already recorded; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103120000')
   or not exists(select 1 from supabase_migrations.schema_migrations where version='20261113110000') then raise exception 'Current integration and fulfillment baseline required';end if;
 for g in select * from live_class_expected_functions loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||g.signature);
  if g.before is null then
   if found then raise exception 'Unrecorded completed-class validator exists';end if;
  else
   if not found or md5(p.prosrc)<>g.before or p.proconfig is distinct from array['search_path=""']
      or p.provolatile::text<>(case when g.signature='assert_v2_batch_request(jsonb)' then 'i' else 's' end)
      or p.prosecdef is distinct from (g.signature<>'assert_v2_batch_request(jsonb)') then
     raise exception 'Reviewed function baseline mismatch: %',g.signature;
   end if;
   if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in(select oid from pg_roles where rolname in('anon','authenticated','service_role')))) then
     raise exception 'Unexpected baseline function privilege: %',g.signature;
   end if;
  end if;
 end loop;
end;$preflight$;

create temporary table live_class_relations on commit drop as
select oid,relname,relkind from pg_class where relnamespace='public'::regnamespace and relkind in('r','p','v','m','S');
create temporary table live_class_functions on commit drop as
select oid from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table live_class_rows(relation oid primary key,row_count bigint,row_md5 text) on commit drop;
do $capture$ declare t record;n bigint;h text;begin
 for t in select * from live_class_relations where relkind in('r','p') order by relname loop
  execute format('lock table public.%I in share mode',t.relname);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.relname) into n,h;
  insert into live_class_rows values(t.oid,n,h);
 end loop;
end;$capture$;
create temporary table live_class_ledger on commit drop as
select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]'::jsonb) document from supabase_migrations.schema_migrations m;

create function pg_temp.live_class_metadata() returns jsonb language sql as $metadata$
select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('id',p.oid,'signature',p.oid::regprocedure::text,
   'definition',case when p.oid in(select to_regprocedure('public.'||signature) from live_class_expected_functions where before is not null) then null else pg_get_functiondef(p.oid) end,
   'acl',p.proacl::text,'owner',p.proowner,'definer',p.prosecdef,'configuration',p.proconfig,'volatility',p.provolatile,'language',p.prolang)
   order by p.oid) from pg_proc p join live_class_functions f on f.oid=p.oid),
 'relations',(select jsonb_agg(jsonb_build_object('id',c.oid,'name',c.relname,'kind',c.relkind,'owner',c.relowner,'acl',c.relacl::text,'rls',c.relrowsecurity,'forcedRls',c.relforcerowsecurity)
   order by c.oid) from pg_class c join live_class_relations r on r.oid=c.oid),
 'columns',(select jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum) from pg_attribute a where a.attrelid in(select oid from live_class_relations)),
 'defaults',(select jsonb_agg(jsonb_build_object('relation',d.adrelid,'column',d.adnum,'definition',pg_get_expr(d.adbin,d.adrelid)) order by d.adrelid,d.adnum)
   from pg_attrdef d where d.adrelid in(select oid from live_class_relations)),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname='public'),
 'constraints',(select jsonb_agg(jsonb_build_object('relation',c.conrelid,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname)
   from pg_constraint c where c.conrelid in(select oid from live_class_relations)),
 'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public'),
 'triggers',(select jsonb_agg(jsonb_build_object('relation',t.tgrelid,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) order by t.tgrelid,t.tgname)
   from pg_trigger t where t.tgrelid in(select oid from live_class_relations) or t.tgrelid='auth.users'::regclass),
 'views',(select jsonb_agg(jsonb_build_object('id',r.oid,'definition',pg_get_viewdef(r.oid,true)) order by r.oid) from live_class_relations r where relkind in('v','m'))
);$metadata$;
create temporary table live_class_preserved_metadata on commit drop as select pg_temp.live_class_metadata() document;

"""
body = re.sub(r'^(begin|commit);\s*$', '', source, flags=re.M)
footer = f"""
do $postflight$ declare t record;n bigint;h text;g record;p record;begin
 for t in select r.*,x.row_count,x.row_md5 from live_class_relations r join live_class_rows x on x.relation=r.oid loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.relname) into n,h;
  if n<>t.row_count or h<>t.row_md5 then raise exception 'Application data changed: %',t.relname;end if;
 end loop;
 if pg_temp.live_class_metadata() is distinct from (select document from live_class_preserved_metadata) then raise exception 'Existing schema or security metadata changed outside reviewed scope';end if;
 if (select count(*) from pg_class where relnamespace='public'::regnamespace and relkind in('r','p','v','m','S'))<>(select count(*) from live_class_relations) then raise exception 'Relation inventory changed';end if;
 if (select count(*) from pg_proc where pronamespace='public'::regnamespace and prokind='f')<>(select count(*)+1 from live_class_functions) then raise exception 'Function inventory changed outside reviewed scope';end if;
 for g in select * from live_class_expected_functions loop
  select * into p from pg_proc where oid=to_regprocedure('public.'||g.signature);
  if not found or md5(p.prosrc)<>g.after or p.proconfig is distinct from array['search_path=""']
    or p.provolatile::text<>(case when g.signature='assert_v2_batch_request(jsonb)' then 'i' else 's' end)
    or p.prosecdef is distinct from (g.signature<>'assert_v2_batch_request(jsonb)') then raise exception 'Installed function mismatch: %',g.signature;end if;
  if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in(select oid from pg_roles where rolname in('anon','authenticated','service_role')))) then raise exception 'Installed function privilege mismatch: %',g.signature;end if;
 end loop;
 if (select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations m) is distinct from (select document from live_class_ledger) then raise exception 'Original migration ledger changed';end if;
end;$postflight$;
insert into supabase_migrations.schema_migrations(version,name,statements)
values('20261120100000','add_v2_live_class_editing',array[{literal(source)}]);
notify pgrst,'reload schema';
select jsonb_build_object('check','live_class_editing','migration','20261120100000','publicTablesPreserved',(select count(*) from live_class_rows),
 'existingRowsPreserved',true,'existingMetadataPreserved',true,'originalLedgerPreserved',true,'publishedSchedulesChanged',false);
commit;
"""
packet = header + body + footer
(out / 'RUN-LIVE-CLASS-EDITING.sql').write_text(packet)
(out / 'migration-manifest.json').write_text(json.dumps({'status':'prepared; not applied to staging or Production', 'migration':name, 'sourceSha256':hashlib.sha256(source.encode()).hexdigest(), 'packetSha256':hashlib.sha256(packet.encode()).hexdigest(), 'expectedStagingPublicTables':92, 'tablePreservation':'all current public tables captured and verified dynamically within the transaction', 'functions':guards}, indent=2)+'\n')
