import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

// This inventory identifies source differences only; it never applies migrations.
const source='298000058e862bb3b0a11525c40cd45cc0e0a039';
const main='940ea7835734a8fb22a6451a30b31084b11d5c97';
const directory='deliverables/phase7-release-preparation';
mkdirSync(directory,{recursive:true});
const changes=execFileSync('git',['diff','--name-status',main,source,'--','supabase/migrations'],{encoding:'utf8'}).trim().split('\n');
const migrations=changes.map(line=>{
 const [status,path]=line.split('\t');
 if(status!=='A'||!/^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/.test(path))throw new Error('Migration reconciliation requires manual review.');
 const original=execFileSync('git',['show',`${source}:${path}`]);
 if(!original.equals(readFileSync(path)))throw new Error('Source migration drift requires a refreshed release baseline.');
 const version=path.split('/').at(-1).slice(0,14);
 return {version,path,sourceSha256:createHash('sha256').update(original).digest('hex'),productionLedgerState:'not inspected',operation:'unapproved; reconcile before applying'};
});
const inventory={check:'phase7_source_migration_inventory',sourceBaseline:source,observedMain:main,releaseCandidate:null,approvedForExecution:false,phase3Included:false,scope:'Added repository migrations against the observed main commit; not a Production ledger diff or complete future release set.',migrations};
writeFileSync(`${directory}/migration-inventory.json`,JSON.stringify(inventory,null,2)+'\n');
const versions=migrations.map(m=>`('${m.version}')`).join(',\n  ');
const sql=`-- Metadata-only preflight; no migration, application row read or persistent write.
-- The operator must verify project owmlxsnzogfapotmjrqk in the dashboard.
-- SQL cannot attest the selected Supabase project. Missing V2 objects are inventory,
-- not a failed or passed release gate. The ledger and Storage catalogue must exist.
rollback;
begin read only;
set local statement_timeout='15s';
set local lock_timeout='2s';
with expected(version) as (values
  ${versions}
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
 'sourceBaseline','${source}',
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
   'executeRoles',(select coalesce(jsonb_agg(r.rolname order by r.rolname),'[]'::jsonb) from roles r where has_function_privilege(r.oid,p.oid,'EXECUTE'))
 ) order by p.oid::regprocedure::text),'[]'::jsonb) from routines p),
 'policyMetadata',(select coalesce(jsonb_agg(jsonb_build_object(
   'schema',schemaname,'table',tablename,'name',policyname,'mode',permissive,'roles',roles,'command',cmd,
   'usingMd5',md5(qual),'checkMd5',md5(with_check)
 ) order by schemaname,tablename,policyname),'[]'::jsonb) from pg_policies
   where (schemaname='public' and left(tablename,3)='v2_') or (schemaname='storage' and policyname='v2_private_content_no_browser_access')),
 'privateBucket',(select jsonb_build_object('present',true,'public',b.public,'fileSizeLimit',b.file_size_limit,'allowedMimeTypes',b.allowed_mime_types)
   from storage.buckets b where b.id='v2-course-content')
);
rollback;
`;
writeFileSync(`${directory}/READ-ONLY-PREFLIGHT.sql`,sql);
console.info(JSON.stringify({migrations:migrations.length,approvedForExecution:false,phase3Included:false}));
