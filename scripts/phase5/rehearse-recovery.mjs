import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
// A disposable local cluster is the only execution target. Input records stay outside Git.
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node scripts/phase5/rehearse-recovery.mjs <private snapshot JSON> <sanitized report JSON>');
const info=statSync(input);
if(!info.isFile()||(info.mode&0o077)!==0)throw Error('Snapshot must be a private regular file with mode 600.');
const raw=readFileSync(input,'utf8');if(!raw.trim())throw Error('Snapshot is empty; SQL Editor export is still required.');
const delimiter='$snapshot_'+randomUUID().replaceAll('-','')+'$';if(raw.includes(delimiter))throw Error('Unexpected input delimiter');
const directory=mkdtempSync(join(tmpdir(),'ace-phase5-restore-'));
try{
 const packet=join(directory,'restore.private.sql');
 writeFileSync(packet,`set timezone='UTC';
set check_function_bodies=off;
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role postgres nologin;
create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',created_at timestamptz default now());
create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
create temporary table phase5_snapshot(doc jsonb);
insert into phase5_snapshot values(${delimiter}${raw}${delimiter}::jsonb);
update phase5_snapshot set doc=case when jsonb_typeof(doc)='array' then doc->0 else doc end;
update phase5_snapshot set doc=coalesce(doc->'application_recovery',doc);
update phase5_snapshot set doc=case when jsonb_typeof(doc)='string' then (doc#>>'{}')::jsonb else doc end;
do $restore$ declare s jsonb;t record;c record;f record;definitions text;columns_list text;type_name text;auth_column text;begin
 select doc into strict s from phase5_snapshot;
 if s->>'format'<>'phase5-application-recovery-v1' or jsonb_typeof(s->'tables')<>'object' then raise exception 'Unexpected recovery format';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(nullif(s->'relations','null'::jsonb),'[]'::jsonb)) r where r->>'kind' in ('S','m')) then raise exception 'Sequence or materialized view recovery requires separate review';end if;
 for t in select key from jsonb_each(s->'tables') order by key loop
  definitions:='';columns_list:='';
  for c in select * from jsonb_to_recordset(s->'columns') as x(table_name text,column_name text,ordinal_position integer,udt_schema text,udt_name text,is_nullable text,column_default text,is_generated text,generation_expression text,is_identity text) where table_name=t.key order by ordinal_position loop
   if c.udt_schema<>'pg_catalog' or c.is_identity='YES' then raise exception 'Unsupported custom type or identity column';end if;
   type_name:=case when left(c.udt_name,1)='_' then format('pg_catalog.%I[]',substr(c.udt_name,2)) else format('pg_catalog.%I',c.udt_name) end;
   definitions:=definitions||case when definitions='' then '' else ',' end||format('%I %s',c.column_name,type_name)
    ||case when c.is_generated='ALWAYS' then ' generated always as ('||c.generation_expression||') stored' when c.column_default is not null then ' default '||c.column_default else '' end
    ||case when c.is_nullable='NO' then ' not null' else '' end;
   if c.is_generated<>'ALWAYS' then columns_list:=columns_list||case when columns_list='' then '' else ',' end||quote_ident(c.column_name);end if;
  end loop;
  execute format('create table public.%I (%s)',t.key,definitions);
  execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I,$1)',t.key,columns_list,columns_list,t.key) using s->'tables'->t.key;
 end loop;
 if s->'tables' ? 'profiles' then insert into auth.users(id,email) select id,email from public.profiles;end if;
 for f in select value from jsonb_array_elements(coalesce(nullif(s->'constraints','null'::jsonb),'[]'::jsonb)) where value->>'definition' like 'FOREIGN KEY (%) REFERENCES auth.users(id)%' loop
  auth_column:=substring(f.value->>'definition' from 'FOREIGN KEY [(]([^)]*)[)]');
  if auth_column !~ '^[a-z_][a-z0-9_]*$' then raise exception 'Unsupported Auth reference column';end if;
  execute format('insert into auth.users(id) select distinct %I from public.%I where %I is not null on conflict(id) do nothing',auth_column,f.value->>'table',auth_column);
 end loop;
 for f in select key from jsonb_object_keys(s->'ledger'->0) key where key not in ('version','statements','name') loop
  execute format('alter table supabase_migrations.schema_migrations add column %I jsonb',f.key);
 end loop;
 insert into supabase_migrations.schema_migrations select * from jsonb_populate_recordset(null::supabase_migrations.schema_migrations,coalesce(s->'ledger','[]'));
 for f in select value from jsonb_array_elements(coalesce(nullif(s->'functions','null'::jsonb),'[]'::jsonb)) loop execute f.value->>'definition';end loop;
 -- Constraints and indexes are restored after the exact rows and helper functions.
 for f in select value from jsonb_array_elements(coalesce(nullif(s->'constraints','null'::jsonb),'[]'::jsonb)) order by case when value->>'definition' like 'FOREIGN KEY%' then 1 else 0 end loop
  execute format('alter table public.%I add constraint %I %s',f.value->>'table',f.value->>'name',f.value->>'definition');
 end loop;
 for f in select value from jsonb_array_elements(coalesce(nullif(s->'indexes','null'::jsonb),'[]'::jsonb)) loop
  if to_regclass('public.'||quote_ident(f.value->>'indexname')) is null then execute f.value->>'indexdef';end if;
 end loop;
 for f in select value from jsonb_array_elements(coalesce(nullif(s->'triggers','null'::jsonb),'[]'::jsonb)) where value->>'definition' like '%EXECUTE FUNCTION public.%' loop execute f.value->>'definition';end loop;
end;$restore$;
create function pg_temp.phase5_restored_rows() returns jsonb language plpgsql as $$
declare s jsonb;t record;actual jsonb;result jsonb:='[]';begin
 select doc into strict s from phase5_snapshot;
 for t in select key,value from jsonb_each(s->'tables') order by key loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'') from public.%I r',t.key) into actual;
  result:=result||jsonb_build_array(jsonb_build_object('table',t.key,'rows',jsonb_array_length(actual),'matches',actual=(select coalesce(jsonb_agg(v order by v::text collate "C"),'[]') from jsonb_array_elements(t.value) v),'md5',md5(actual::text)));
 end loop;return result;
end;$$;
select jsonb_build_object('check','phase5_application_row_recovery_rehearsal','capturedAt',(select doc->>'capturedAt' from phase5_snapshot),
 'tables',pg_temp.phase5_restored_rows(),
 'ledgerMd5',(select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m),
 'routineGuards',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'sourceMd5',md5(p.prosrc),'securityDefiner',p.prosecdef,'configuration',to_jsonb(p.proconfig)) order by p.oid::regprocedure::text) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('get_my_v2_published_course','get_my_v2_meeting','get_my_v2_batch_schedules','v2_learning_course_base')),
 'ledgerMatches',(select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]') from supabase_migrations.schema_migrations m)=(select doc->'ledger' from phase5_snapshot));
`,{mode:0o600});
 let report;
 await withDisposablePostgres(async db=>{
  report=JSON.parse(db.query(`\\i '${packet.replaceAll("'","''")}'`));
  if(!report.tables.every(t=>t.matches)||!report.ledgerMatches){writeFileSync('/tmp/ace-phase5-recovery-diff.private.json',JSON.stringify(report),{mode:0o600});throw Error('Restored rows or ledger mismatch');}
  if(process.argv[4]) {
   const activation=resolve(process.argv[4]);
   if(!activation.startsWith(resolve('deliverables/phase5-preview-activation')+'/'))throw Error('Unexpected activation packet path');
   db.query("create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;");
   report.storageRehearsal='Synthetic Storage catalogue only; no hosted objects or Storage API recovered.';
   report.activationRehearsal=JSON.parse(db.query(`\\i '${activation.replaceAll("'","''")}'`));
  }
 });
 report.snapshotSha256=createHash('sha256').update(raw).digest('hex');
 report.status='application-rows-restored';report.fullPlatformRecovery=false;
 report.limitations=['Auth identities are synthetic placeholders; credentials are not recovered.', 'Additional migration-ledger metadata is preserved as JSONB; its original column types are not included in the export.','Storage objects and platform configuration are excluded.','Views, relation grants, RLS policies and triggers calling private-schema functions are not restored by this application-row rehearsal.','Migration activation requires separate schema/privilege reconciliation and preservation checks.'];
 writeFileSync(resolve(output),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({check:report.check,status:report.status,tables:report.tables.length,rows:report.tables.reduce((n,t)=>n+t.rows,0),allRowsMatch:true,fullPlatformRecovery:false}));
}catch(error){writeFileSync('/tmp/ace-phase5-recovery-error.private.log',String(error?.stack??error),{mode:0o600});console.error('Recovery rehearsal failed; private diagnostics were retained outside Git.');process.exitCode=1;}
finally{rmSync(directory,{recursive:true,force:true});}
