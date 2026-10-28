-- PREPARED READ-ONLY INSPECTION. Do not execute on a shared project without approval.
-- Verify staging project identity outside SQL. Save actual reports privately.
-- Compares Phase 1 ledger values before expansion, after expansion and after rollback.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '10s';
set local row_security = off;

with ledger as (
  select 'v2_products'::text as name, count(*) as rows,
    encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(p)-'canonical_code' order by code),'[]'::jsonb)::text,'UTF8')),'hex') as fingerprint
    from public.v2_products p
  union all
  select 'v2_price_versions', count(*),
    encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(p) order by id),'[]'::jsonb)::text,'UTF8')),'hex')
    from public.v2_price_versions p
  union all
  select 'v2_purchases', count(*),
    encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(p) order by id),'[]'::jsonb)::text,'UTF8')),'hex')
    from public.v2_purchases p
  union all
  select 'v2_product_grants', count(*),
    encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(p) order by purchase_id,product_code),'[]'::jsonb)::text,'UTF8')),'hex')
    from public.v2_product_grants p
), routines(signature, added) as (values
  ('public.v2_purchase_shape(text[])',false),
  ('public.quote_v2_products(text[])',false),
  ('public.grant_v2_purchase(uuid,text[],text,timestamptz,uuid,integer,text)',false),
  ('public.can_access_v2_product(text,text)',false),
  ('public.get_my_v2_access()',false),
  ('public.v2_access_window_contains(timestamptz,timestamptz,timestamptz,timestamptz)',false),
  ('public.reject_v2_price_rewrite()',false),
  ('public.v2_contract_ledger_codes(text[])',true),
  ('public.v2_contract_canonical_code(text)',true),
  ('public.quote_v2_course_products(text[])',true),
  ('public.grant_v2_course_purchase(uuid,text[],text,timestamptz,uuid,integer,text)',true),
  ('public.can_access_v2_course_product(text,text)',true),
  ('public.get_my_v2_course_access()',true)
)
select jsonb_build_object(
  'check','canonical_contract_proposal_inspection',
  'transaction_read_only',current_setting('transaction_read_only'),
  'server_version_num',current_setting('server_version_num'),
  'ledger', (select jsonb_agg(to_jsonb(l) order by name) from ledger l),
  'canonical_column_present',exists(select 1 from pg_attribute where attrelid='public.v2_products'::regclass and attname='canonical_code' and not attisdropped),
  'canonical_view_present',to_regclass('public.v2_canonical_products') is not null,
  'phase2_offerings_present',to_regclass('public.v2_course_offerings') is not null,
  'routines',(select jsonb_agg(jsonb_build_object(
    'signature',r.signature,'added_by_proposal',r.added,'present',p.oid is not null,
    'definition_hash',case when p.oid is not null then encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') end,
    'security_definer',p.prosecdef,'configuration',p.proconfig,
    'execute_roles',case when p.oid is not null then (select jsonb_agg(role_name order by role_name)
      from unnest(array['anon','authenticated','service_role']) role_name where has_function_privilege(role_name,p.oid,'EXECUTE')) end
  ) order by r.signature) from routines r left join pg_proc p on p.oid=to_regprocedure(r.signature))
) as report;
rollback;
