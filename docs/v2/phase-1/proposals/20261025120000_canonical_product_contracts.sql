-- PROPOSAL ONLY. Not in the automatic migration directory. Requires separate approval.
-- Apply after Phase 1 only; independent of all Phase 2 migrations.
-- Expand canonical contracts while retaining historical ledger keys and old RPCs.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.v2_products
  add column canonical_code text generated always as (case code
    when 'full_batch' then 'full_course' when 'quant_crash' then 'quant'
    when 'verbal_crash' then 'verbal' when 'di_crash' then 'di' end) stored not null,
  add constraint v2_products_canonical_code_key unique (canonical_code);

create view public.v2_canonical_products with (security_invoker = true) as
select canonical_code as code,
  case canonical_code when 'full_course' then 'Full Course' when 'quant' then 'Quant'
    when 'verbal' then 'Verbal' when 'di' then 'DI' end::text as name,
  case when canonical_code = 'full_course' then 'full_course' else 'individual' end::text as product_kind,
  sections, available_for_purchase
from public.v2_products;
revoke all on public.v2_canonical_products from public, anon, authenticated, service_role;
grant select on public.v2_canonical_products to anon, authenticated, service_role;

create function public.v2_contract_ledger_codes(p_codes text[])
returns text[] language plpgsql immutable set search_path = '' as $$
declare v_result text[];
begin
  if p_codes is null or coalesce(array_ndims(p_codes), 0) <> 1
    or cardinality(p_codes) not between 1 and 3
    or exists (select 1 from unnest(p_codes) c where c is null or c not in ('full_course','quant','verbal','di'))
    or (select count(distinct c) from unnest(p_codes) c) <> cardinality(p_codes)
    or ('full_course' = any(p_codes) and cardinality(p_codes) <> 1) then
    raise exception 'Select Full Course or one to three distinct individual offerings' using errcode='22023';
  end if;
  select array_agg(case c when 'full_course' then 'full_batch' when 'quant' then 'quant_crash'
    when 'verbal' then 'verbal_crash' when 'di' then 'di_crash' end order by n)
    into v_result from unnest(p_codes) with ordinality as input(c,n);
  return v_result;
end;
$$;
create function public.v2_contract_canonical_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select case p_code when 'full_batch' then 'full_course' when 'quant_crash' then 'quant'
    when 'verbal_crash' then 'verbal' when 'di_crash' then 'di' end;
$$;

create function public.quote_v2_course_products(p_product_codes text[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_quote jsonb; v_codes jsonb;
begin
  v_quote := public.quote_v2_products(public.v2_contract_ledger_codes(p_product_codes));
  select jsonb_agg(public.v2_contract_canonical_code(c) order by c) into v_codes
    from jsonb_array_elements_text(v_quote->'product_codes') c;
  return jsonb_set(v_quote, '{product_codes}', v_codes);
end;
$$;

create function public.grant_v2_course_purchase(
  p_student_id uuid, p_product_codes text[], p_payment_reference text,
  p_confirmed_at timestamptz, p_price_version_id uuid, p_amount_paise integer, p_currency text
) returns uuid language sql security definer set search_path = '' as $$
  select public.grant_v2_purchase(p_student_id, public.v2_contract_ledger_codes(p_product_codes),
    p_payment_reference, p_confirmed_at, p_price_version_id, p_amount_paise, p_currency);
$$;

create function public.can_access_v2_course_product(p_product_code text, p_section text default null)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_product_code is null or p_product_code not in ('full_course','quant','verbal','di') then return false; end if;
  return public.can_access_v2_product((public.v2_contract_ledger_codes(array[p_product_code]))[1], p_section);
end;
$$;

create function public.get_my_v2_course_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_set(item, '{product_code}',
    to_jsonb(public.v2_contract_canonical_code(item->>'product_code'))) order by item->>'product_code'), '[]'::jsonb)
  from jsonb_array_elements(public.get_my_v2_access()) item;
$$;

-- Neutralize broad platform default privileges, including service_role.
revoke all on function public.v2_contract_ledger_codes(text[]), public.v2_contract_canonical_code(text),
  public.quote_v2_course_products(text[]), public.can_access_v2_course_product(text,text),
  public.get_my_v2_course_access(), public.grant_v2_course_purchase(uuid,text[],text,timestamptz,uuid,integer,text)
  from public, anon, authenticated, service_role;
grant execute on function public.quote_v2_course_products(text[]) to anon, authenticated, service_role;
grant execute on function public.can_access_v2_course_product(text,text), public.get_my_v2_course_access() to authenticated;
grant execute on function public.grant_v2_course_purchase(uuid,text[],text,timestamptz,uuid,integer,text) to service_role;
commit;
