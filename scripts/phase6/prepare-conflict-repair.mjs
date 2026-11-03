import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {bootstrapCandidate} from './helpers.mjs';
import {literal} from '../phase1-hosted-closeout-config.mjs';

const version='20261103120000',name='fix_v2_integration_conflicts';
await withDisposablePostgres(async db=>{
 bootstrapCandidate(db);
 const routines=JSON.parse(db.query(`select jsonb_agg(jsonb_build_object('signature','public.'||p.proname||'('||oidvectortypes(p.proargtypes)||')','before',md5(p.prosrc),'definition',pg_get_functiondef(p.oid),'source',p.prosrc) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%v2%' and p.prosrc like '%''40001''%'`));
 assert(routines.length>0);
 for(const r of routines){assert(/errcode\s*=\s*'40001'/i.test(r.source));r.changed=r.definition.replace(/(errcode\s*=\s*)'40001'/gi,"$1'PT409'");r.after=createHash('md5').update(r.source.replace(/(errcode\s*=\s*)'40001'/gi,"$1'PT409'")).digest('hex');}
 const manifest=routines.map(({signature,before,after})=>({signature,before,after}));
 const guard=`do $guard$declare r jsonb;begin
 for r in select value from jsonb_array_elements(${literal(JSON.stringify(manifest))}::jsonb) loop
  if not exists(select 1 from pg_proc where oid=to_regprocedure(r->>'signature') and md5(prosrc)=r->>'before') then raise exception 'Integration conflict repair source mismatch: %',r->>'signature';end if;
 end loop;
end;$guard$;`;
 const migration=`-- Deterministic revision conflicts return HTTP 409 without serialization retries.\n-- Existing function signatures, permissions and migration records remain preserved.\nbegin;\n${guard}\n${routines.map(r=>r.changed+';').join('\n')}\ncommit;\n`;
 writeFileSync(`supabase/migrations/${version}_${name}.sql`,migration);
 const sourceHash=createHash('sha256').update(migration).digest('hex');
 const packet=`-- STAGING ONLY: the selected dashboard project must be eyphkkginlgoaxflauog.
-- This additive function repair preserves current application rows and applied ledger entries.
rollback;
begin;
set local statement_timeout='60s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
create temporary table phase6_prior_ledger on commit drop as select * from supabase_migrations.schema_migrations;
create temporary table phase6_prior_routines on commit drop as
 select p.oid,p.proacl,p.proowner,p.prosecdef,p.provolatile,p.proconfig,p.proparallel,p.proleakproof,p.proisstrict from pg_proc p
 where p.oid in (select to_regprocedure(r->>'signature') from jsonb_array_elements(${literal(JSON.stringify(manifest))}::jsonb) r);
create function pg_temp.phase6_rows() returns jsonb language plpgsql as $$
declare t record;h text;n bigint;result jsonb:='[]';begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  result:=result||jsonb_build_array(jsonb_build_object('table',t.tablename,'rows',n,'md5',h));
 end loop;return result;
end;$$;
do $preflight$declare t record;begin
 if exists(select 1 from supabase_migrations.schema_migrations where version='${version}') then raise exception 'Integration repair already recorded; reconciliation required';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261103110000') then raise exception 'Applied Phase 5 conflict repair required';end if;
 if exists(select 1 from supabase_migrations.schema_migrations where version in ('20261102140000','20261102150000','20261102160000')) then raise exception 'Phase 3 is present; combined candidate review required';end if;
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop execute format('lock table public.%I in share mode',t.tablename);end loop;
end;$preflight$;
create temporary table phase6_before_rows on commit drop as select pg_temp.phase6_rows() snapshot;
${guard}
${routines.map(r=>r.changed+';').join('\n')}
do $verification$declare r jsonb;begin
 for r in select value from jsonb_array_elements(${literal(JSON.stringify(manifest))}::jsonb) loop
  if not exists(select 1 from pg_proc where oid=to_regprocedure(r->>'signature') and md5(prosrc)=r->>'after') then raise exception 'Integration repair definition verification failed';end if;
 end loop;
 if exists(select 1 from phase6_prior_routines b left join pg_proc p on p.oid=b.oid where p.oid is null or row(p.proacl,p.proowner,p.prosecdef,p.provolatile,p.proconfig,p.proparallel,p.proleakproof,p.proisstrict) is distinct from row(b.proacl,b.proowner,b.prosecdef,b.provolatile,b.proconfig,b.proparallel,b.proleakproof,b.proisstrict)) then raise exception 'Function security metadata changed';end if;
 if (select snapshot from phase6_before_rows) is distinct from pg_temp.phase6_rows() then raise exception 'Application rows changed';end if;
 if exists((select * from phase6_prior_ledger except select * from supabase_migrations.schema_migrations) union all (select * from supabase_migrations.schema_migrations except select * from phase6_prior_ledger)) then raise exception 'Prior ledger changed';end if;
end;$verification$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${literal(migration)}]);
notify pgrst,'reload schema';
select jsonb_build_object('check','phase6_integration_conflict_repair','migrationVersion','${version}','sourceSha256','${sourceHash}','functionsRepaired',${routines.length},'existingRowsPreserved',true,'originalLedgerPreserved',true,'functionSecurityMetadataPreserved',true,'phase3Activated',false,'existingApplicationTables',(select count(*) from pg_tables where schemaname='public'),'hostedAcceptance','separate');
commit;
`;
 writeFileSync('deliverables/phase6-staging-acceptance/REPAIR-INTEGRATION-CONFLICTS.sql',packet);
 writeFileSync('deliverables/phase6-staging-acceptance/conflict-routines.json',JSON.stringify({check:'phase6_conflict_inventory',candidate:'879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d',migrationVersion:version,sourceSha256:sourceHash,routines:manifest},null,2)+'\n');
 console.info(JSON.stringify({functions:routines.length,sourceSha256:sourceHash}));
});
