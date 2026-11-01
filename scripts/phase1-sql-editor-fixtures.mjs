import { PROJECT, UUID, check, literal } from './phase1-hosted-closeout-config.mjs';

export const CASES = [
  {label:'q',products:['quant_crash']},{label:'v',products:['verbal_crash']},{label:'d',products:['di_crash']},
  {label:'qv',products:['quant_crash','verbal_crash']},{label:'qd',products:['quant_crash','di_crash']},
  {label:'vd',products:['verbal_crash','di_crash']},{label:'qvd',products:['quant_crash','verbal_crash','di_crash']},
  {label:'full',products:['full_batch']},{label:'expired',products:['quant_crash'],state:'expired'},
  {label:'revoked',products:['quant_crash'],state:'revoked'},
  {label:'inactive',products:['quant_crash'],state:'inactive'},
  {label:'multiple',products:['quant_crash'],extra:['verbal_crash']},
  {label:'mixed',products:['quant_crash'],state:'expired',extra:['verbal_crash']},
  {label:'empty',products:[]},{label:'admin',products:[],role:'admin'},
];
function validate(state) {
  check(state.project===PROJECT && UUID.test(state.runId),'Invalid staging fixture run.');
  check(state.users.length===CASES.length && new Set(state.users.map(u=>u.id)).size===CASES.length,'Incomplete or duplicate fixture users.');
  for(const item of CASES) {
    const user=state.users.find(u=>u.label===item.label);
    check(user && UUID.test(user.id) && user.email===`ace-p1-${item.label}-${state.runId}@example.invalid`,'Fixture user does not match the run.');
  }
}
function plan(state) {
  validate(state);
  return CASES.flatMap(item=>{
    const user=state.users.find(u=>u.label===item.label);
    return [item.products,item.extra].filter(codes=>codes?.length).map((codes,index)=>({
      label:item.label,id:user.id,codes,reference:`phase1-qa:${state.runId}:${item.label}:${index}`,
      state:index===0?(item.state??'active'):'active',amount:codes.includes('full_batch')?2500000:[0,1000000,1800000,2500000][codes.length],
    }));
  });
}
function header(state) {
  const rows=state.users.map(user=>`(${literal(user.label)},${literal(user.id)}::uuid,${literal(user.email)})`).join(',\n');
  return `-- STAGING ONLY: https://supabase.com/dashboard/project/${PROJECT}/sql/new
-- Verify the project in the dashboard; SQL cannot establish hosted project identity.
-- Dedicated QA run ${state.runId}; never changes existing accounts or migrations.
begin;
set local statement_timeout='30s';
set local lock_timeout='2s';
create temporary table phase1_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase1_qa_users values ${rows};
do $$ begin
  if (select count(*) from phase1_qa_users q join auth.users u on u.id=q.id
      and u.email=q.email and u.raw_user_meta_data->>'phase1_qa_run'=${literal(state.runId)}) <> ${CASES.length}
  then raise exception 'QA ownership check failed. Stop; do not substitute existing accounts.'; end if;
  if (select count(*) from phase1_qa_users q join public.profiles p on p.id=q.id and p.email=q.email
      and p.role=case when q.label='admin' then 'admin' else 'student' end
      and p.is_active=(q.label<>'inactive')) <> ${CASES.length}
  then raise exception 'QA profile state does not match the prepared run.'; end if;
end $$;
create temporary table phase1_qa_plan(label text,student_id uuid,product_codes text[],reference text unique,state text,amount integer) on commit drop;
insert into phase1_qa_plan values ${plan(state).map(p=>`(${literal(p.label)},${literal(p.id)}::uuid,array[${p.codes.map(literal).join(',')}]::text[],${literal(p.reference)},${literal(p.state)},${p.amount})`).join(',\n')};
`;
}
const fingerprint=`
-- Privacy-safe fingerprint: only hashes/counts leave the database, never row values.
create or replace function pg_temp.phase1_public_fingerprint() returns jsonb language plpgsql as $$
declare t record; h text; aggregate_hashes text := ''; tables_count integer := 0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',t.tablename) into h;
  aggregate_hashes := aggregate_hashes || t.tablename || ':' || h || ';'; tables_count := tables_count+1;
 end loop;
 return jsonb_build_object('table_count',tables_count,'md5',md5(aggregate_hashes));
end $$;
`;
export function buildSetupSql(state) {
  return header(state)+fingerprint+`
create temporary table phase1_qa_baseline on commit drop as select pg_temp.phase1_public_fingerprint() as fingerprint;
do $$ begin
 if (select count(*) from supabase_migrations.schema_migrations where version='20261018090000')<>1
 then raise exception 'Original Phase 1 migration ledger entry missing or ambiguous. Do not rerun migration.'; end if;
 if exists(select 1 from public.v2_purchases p join phase1_qa_plan q on p.payment_reference=q.reference)
 then raise exception 'This fixture run already has purchases. Stop; do not repeat setup.'; end if;
 if exists(select 1 from phase1_qa_plan p where (public.quote_v2_products(p.product_codes)->>'amount_paise')::integer<>p.amount)
 then raise exception 'Configured prices differ from approved tiers. Stop before fixture writes.'; end if;
end $$;
create temporary table phase1_qa_created on commit drop as
 select p.label,p.state,public.grant_v2_purchase(p.student_id,p.product_codes,p.reference,
 statement_timestamp()-interval '1 second',(q.quote->>'price_version_id')::uuid,p.amount,'INR') as purchase_id
 from phase1_qa_plan p cross join lateral (select public.quote_v2_products(p.product_codes) as quote) q;
-- Only synthetic purchases created above are adjusted to exercise these states.
update public.v2_purchases p set confirmed_at=statement_timestamp()-interval '7 months'
 from phase1_qa_created q where q.purchase_id=p.id and q.state='expired';
update public.v2_purchases p set revoked_at=statement_timestamp()
 from phase1_qa_created q where q.purchase_id=p.id and q.state='revoked';
select jsonb_build_object('check','phase1_qa_fixture_setup','run_id',${literal(state.runId)},
 'purchase_count',(select count(*) from phase1_qa_created),'qa_account_count',${CASES.length},
 'baseline_before_purchases',(select fingerprint from phase1_qa_baseline),
 'states',(select jsonb_agg(jsonb_build_object('label',label,'state',state) order by label,state) from phase1_qa_created));
commit;
`;
}
export function buildCleanupSql(state) {
  return header(state)+fingerprint+`
-- Execute after the browser/API tests; leaves Auth account deletion to the agent.
-- Match BOTH exact payment reference and generated owner; no broad prefix deletion.
delete from public.v2_product_grants g using public.v2_purchases p,phase1_qa_plan q
 where g.purchase_id=p.id and p.payment_reference=q.reference and p.student_id=q.student_id;
delete from public.v2_purchases p using phase1_qa_plan q
 where p.payment_reference=q.reference and p.student_id=q.student_id;
select jsonb_build_object('check','phase1_qa_purchase_cleanup','run_id',${literal(state.runId)},
 'remaining_fixture_purchases',(select count(*) from public.v2_purchases p join phase1_qa_plan q
 on p.payment_reference=q.reference and p.student_id=q.student_id),
 'after_purchase_cleanup',pg_temp.phase1_public_fingerprint());
commit;
`;
}
