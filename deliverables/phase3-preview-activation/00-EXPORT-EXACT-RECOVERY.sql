-- Staging application recovery export; no persistent objects or rows are changed.
-- The result contains private application records and must remain outside Git/chat.
-- The operator verifies eyphkkginlgoaxflauog in the dashboard before execution.
-- This is an application-data snapshot, not an Auth/storage/platform backup.
rollback;
begin isolation level repeatable read;
set local timezone='UTC';
set local statement_timeout='60s';
set local lock_timeout='5s';
create function pg_temp.phase3_application_recovery()
returns jsonb language plpgsql as $function$
declare v_table record; rows jsonb; tables jsonb:='{}';
begin
  for v_table in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by c.relname
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from public.%I r',v_table.relname) into rows;
    tables:=tables||jsonb_build_object(v_table.relname,rows);
  end loop;
  return jsonb_build_object(
    'format','phase3-application-recovery-v1','capturedAt',transaction_timestamp(),
    'scope','Public application rows, schema catalogue and migration ledger; excludes Auth credentials, storage objects and platform configuration.',
    'tables',tables,
    'authUserColumns',(select jsonb_agg(jsonb_build_object('name',column_name,'type',udt_name) order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='users'),
    'authUserTriggers',(select jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid)) order by tgname) from pg_trigger where tgrelid=to_regclass('auth.users') and not tgisinternal),
    'columns',(select jsonb_agg(to_jsonb(c) order by table_name,ordinal_position) from information_schema.columns c where table_schema='public'),
    'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid)) order by c.relname,k.conname)
      from pg_constraint k join pg_class c on c.oid=k.conrelid where c.relnamespace='public'::regnamespace),
    'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public'),
    'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'),
    'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text) order by p.oid::regprocedure::text)
      from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f'),
    'triggers',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid)) order by c.relname,t.tgname)
      from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and not t.tgisinternal),
    'relations',(select jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'acl',c.relacl::text) order by c.relname)
      from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','v','m','S')),
    'ledger',(select jsonb_agg(to_jsonb(m) order by version) from supabase_migrations.schema_migrations m)
  );
end;
$function$;
-- The payload remains a string through dashboard JSON copying, preserving numeric scale.
with snapshot as materialized (select pg_temp.phase3_application_recovery()::text payload)
select jsonb_build_object('format','phase3-recovery-envelope-v2','payload',payload,
 'payloadSha256',encode(sha256(convert_to(payload,'UTF8')),'hex')) as application_recovery from snapshot;
rollback;
