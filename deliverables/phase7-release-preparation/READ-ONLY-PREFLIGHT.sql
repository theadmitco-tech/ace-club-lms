-- Metadata-only preflight; no migration, application row read or persistent write.
-- The operator must verify project owmlxsnzogfapotmjrqk in the dashboard.
-- SQL cannot attest the selected Supabase project. Missing V2 objects are inventory,
-- not a failed or passed release gate. The ledger and Storage catalogue must exist.
rollback;
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
with expected(version) as (values
  ('20261018090000'),
  ('20261019090000'),
  ('20261019100000'),
  ('20261019110000'),
  ('20261020090000'),
  ('20261020100000'),
  ('20261025100000'),
  ('20261102100000'),
  ('20261102110000'),
  ('20261102120000'),
  ('20261102130000'),
  ('20261102170000'),
  ('20261103090000'),
  ('20261103091000'),
  ('20261103100000'),
  ('20261103110000'),
  ('20261103120000'),
  ('20261113090000'),
  ('20261113100000'),
  ('20261113110000')
), roles as (
 select oid,rolname from pg_roles where rolname in ('anon','authenticated','service_role')
), relations as (
 select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and left(c.relname,3)='v2_' and c.relkind='r'
), routines as (
 select p.* from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and position('v2_' in p.proname)>0
)
select jsonb_build_object(
 'check','phase7_production_metadata_preflight',
 'transactionReadOnly',current_setting('transaction_read_only'),
 'projectIdentityVerifiedBySql',false,
 'releaseApproved',false,
 'sourceBaseline','c593d2de13c563b72adbaf216cf37ed30a038cc7',
 'scope','Metadata only; no backup, ledger equivalence, application compatibility or release acceptance is asserted.',
 'ledger',(select coalesce(jsonb_agg(jsonb_build_object(
   'version',e.version,'present',m.version is not null,'name',m.name,
   'storedStatementsMd5',md5(to_jsonb(m.statements)::text)
 ) order by e.version),'[]'::jsonb) from expected e left join supabase_migrations.schema_migrations m using(version)),
 'otherLedgerVersions',(select coalesce(jsonb_agg(m.version order by m.version),'[]'::jsonb)
   from supabase_migrations.schema_migrations m where not exists(select 1 from expected e where e.version=m.version)),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object(
   'name',t.relname,'rlsEnabled',t.relrowsecurity,'forceRls',t.relforcerowsecurity,
   'readRoles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]'::jsonb) from roles r where has_table_privilege(r.oid,t.oid,'SELECT')),
   'directWriteRoles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]'::jsonb) from roles r where exists(
     select 1 from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p where has_table_privilege(r.oid,t.oid,p)))
 ) order by t.relname),'[]'::jsonb) from relations t),
 'routines',(select coalesce(jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'bodyMd5',md5(p.prosrc),'securityDefiner',p.prosecdef,
   'configuration',p.proconfig,'volatility',p.provolatile,
   'publicExecute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
   'executeRoles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]'::jsonb) from roles r where has_function_privilege(r.oid,p.oid,'EXECUTE'))
 ) order by p.oid::regprocedure::text),'[]'::jsonb) from routines p),
 'paymentTriggers',(select coalesce(jsonb_agg(jsonb_build_object(
   'name',t.tgname,'schema',n.nspname,'table',c.relname,'enabled',t.tgenabled,'definitionMd5',md5(pg_get_triggerdef(t.oid))
 ) order by t.tgname),'[]'::jsonb) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not t.tgisinternal and t.tgname in ('v2_live_capacity','v2_signup_activation_guard','z_v2_signup_candidate')),
 'policyMetadata',(select coalesce(jsonb_agg(jsonb_build_object(
   'schema',schemaname,'table',tablename,'name',policyname,'mode',permissive,'roles',roles,'command',cmd,
   'usingMd5',md5(qual),'checkMd5',md5(with_check)
 ) order by schemaname,tablename,policyname),'[]'::jsonb) from pg_policies
   where (schemaname='public' and left(tablename,3)='v2_') or (schemaname='storage' and policyname='v2_private_content_no_browser_access')),
 'privateBucket',(select jsonb_build_object('present',true,'public',b.public,'fileSizeLimit',b.file_size_limit,'allowedMimeTypes',b.allowed_mime_types)
   from storage.buckets b where b.id='v2-course-content')
);
rollback;
