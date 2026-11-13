import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {preparePhase3Database} from '../helpers/v2-phase3-fixture.mjs';

// Expected metadata is derived from PostgreSQL in an isolated local fixture.
const files=['20261113090000_add_v2_sales_catalogue.sql','20261113100000_add_v2_checkout_ledger.sql','20261113110000_add_v2_payment_fulfillment.sql'];
const replacements=['can_access_v2_product','get_my_v2_access','v2_student_has_product'];
const names=files.flatMap(file=>[...readFileSync(`supabase/migrations/${file}`,'utf8').matchAll(/create (?:or replace )?function public\.(\w+)/g)].map(match=>match[1]));
if(new Set(names).size!==names.length)throw Error('Duplicate migration function');
await withDisposablePostgres(async db=>{
 preparePhase3Database(db);
 for(const file of files)db.apply(file);
 const functions=JSON.parse(db.query(`select jsonb_agg(jsonb_build_object(
  'signature',p.oid::regprocedure::text,'sourceMd5',md5(p.prosrc),
  'securityDefiner',p.prosecdef,'configuration',to_jsonb(p.proconfig),'volatility',p.provolatile,
  'language',(select lanname from pg_language where oid=p.prolang),
  'roles',(select coalesce(jsonb_agg(r order by r),'[]') from unnest(array['anon','authenticated','service_role']) r where has_function_privilege(r,p.oid,'EXECUTE')),
  'publicExecute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')
 ) order by p.oid::regprocedure::text) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array[${names.map(n=>`'${n}'`).join(',')}])`));
 if(functions.length!==names.length||functions.some(f=>f.publicExecute))throw Error('Unexpected routine inventory or PUBLIC grant');
 const manifest={check:'phase3_expected_migration_metadata',scope:'Disposable local PostgreSQL; no hosted execution.',
  migrations:files.map(file=>({file,sha256:createHash('sha256').update(readFileSync(`supabase/migrations/${file}`)).digest('hex')})),
  replacementNames:replacements,newFunctionNames:names.filter(name=>!replacements.includes(name)),
  tables:['v2_signup_candidates','v2_checkout_intents','v2_purchase_upgrades','v2_payment_events'],functions};
 writeFileSync('deliverables/phase3-preview-activation/migration-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({check:manifest.check,functions:functions.length,tables:manifest.tables.length,hostedExecution:false}));
});
