-- V2 Phase 1 only. Applying this migration requires separate environment approval.
-- Legacy courses, enrollments, material policies, and payment handlers are untouched.
begin;

create table if not exists public.v2_products (
  code text primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  product_kind text not null,
  sections text[] not null,
  available_for_purchase boolean not null default true,
  constraint v2_product_scope check (
    (code = 'full_batch' and product_kind = 'full_batch' and sections = array['quant', 'verbal', 'di'])
    or (code = 'quant_crash' and product_kind = 'crash_course' and sections = array['quant'])
    or (code = 'verbal_crash' and product_kind = 'crash_course' and sections = array['verbal'])
    or (code = 'di_crash' and product_kind = 'crash_course' and sections = array['di'])
  )
);

create table if not exists public.v2_price_versions (
  id uuid primary key default gen_random_uuid(),
  product_kind text not null,
  crash_count integer not null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  effective_from timestamptz not null,
  constraint v2_price_shape check (
    (product_kind = 'full_batch' and crash_count = 0)
    or (product_kind = 'crash_course' and crash_count between 1 and 3)
  ),
  unique (product_kind, crash_count, effective_from)
);

create table if not exists public.v2_purchases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  payment_reference text not null unique check (length(btrim(payment_reference)) between 1 and 200),
  price_version_id uuid not null references public.v2_price_versions(id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null check (currency = 'INR'),
  confirmed_at timestamptz not null check (isfinite(confirmed_at)),
  expires_at timestamptz generated always as (
    ((confirmed_at at time zone 'UTC') + interval '6 months') at time zone 'UTC'
  ) stored,
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp()
);

create table if not exists public.v2_product_grants (
  purchase_id uuid not null references public.v2_purchases(id) on delete restrict,
  product_code text not null references public.v2_products(code) on delete restrict,
  primary key (purchase_id, product_code)
);

create index if not exists v2_purchases_student_idx on public.v2_purchases(student_id, expires_at);

insert into public.v2_products (code, name, product_kind, sections) values
  ('full_batch', 'Full Batch', 'full_batch', array['quant', 'verbal', 'di']),
  ('quant_crash', 'Quant Crash Course', 'crash_course', array['quant']),
  ('verbal_crash', 'Verbal Crash Course', 'crash_course', array['verbal']),
  ('di_crash', 'DI Crash Course', 'crash_course', array['di'])
on conflict (code) do nothing;

-- Initial price revision; append effective-dated revisions instead of editing history.
-- All-three Crash Courses implements approved V2-DEC-03, not Full Batch access.
insert into public.v2_price_versions
  (id, product_kind, crash_count, amount_paise, effective_from) values
  ('a1000000-0000-4000-8000-000000000001', 'full_batch', 0, 2500000, '-infinity'),
  ('a1000000-0000-4000-8000-000000000002', 'crash_course', 1, 1000000, '-infinity'),
  ('a1000000-0000-4000-8000-000000000003', 'crash_course', 2, 1800000, '-infinity'),
  ('a1000000-0000-4000-8000-000000000004', 'crash_course', 3, 2500000, '-infinity')
on conflict (id) do nothing;

alter table public.v2_products enable row level security;
alter table public.v2_price_versions enable row level security;
alter table public.v2_purchases enable row level security;
alter table public.v2_product_grants enable row level security;

-- Explicit grants also neutralize broader project default privileges.
revoke all on public.v2_products, public.v2_price_versions,
  public.v2_purchases, public.v2_product_grants from public, anon, authenticated, service_role;
grant select on public.v2_products, public.v2_price_versions to anon, authenticated;
grant select on public.v2_purchases, public.v2_product_grants to authenticated;
-- The payment service writes through the validated security-definer grant RPC,
-- not unrestricted table mutations. Configuration changes use reviewed SQL.
grant select on public.v2_products, public.v2_price_versions,
  public.v2_purchases, public.v2_product_grants to service_role;

drop policy if exists v2_products_read on public.v2_products;
create policy v2_products_read on public.v2_products for select to anon, authenticated
  using (available_for_purchase or public.is_portal_admin());
drop policy if exists v2_prices_read on public.v2_price_versions;
create policy v2_prices_read on public.v2_price_versions for select to anon, authenticated
  using (effective_from <= statement_timestamp() or public.is_portal_admin());
drop policy if exists v2_purchases_read on public.v2_purchases;
create policy v2_purchases_read on public.v2_purchases for select to authenticated
  using (
    public.is_portal_admin()
    or (student_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student' and p.is_active = true
    ))
  );
drop policy if exists v2_grants_read on public.v2_product_grants;
create policy v2_grants_read on public.v2_product_grants for select to authenticated
  using (exists (select 1 from public.v2_purchases p where p.id = purchase_id));

-- Internal validator. Not executable directly by a browser role.
create or replace function public.v2_purchase_shape(p_product_codes text[])
returns table (product_kind text, crash_count integer, product_codes text[])
language plpgsql stable security definer set search_path = '' as $$
declare
  v_codes text[];
  v_count integer;
begin
  if p_product_codes is null or coalesce(array_ndims(p_product_codes), 0) <> 1
    or cardinality(p_product_codes) not between 1 and 3 then
    raise exception 'Select one Full Batch or one to three distinct Crash Courses' using errcode = '22023';
  end if;
  select array_agg(p.code order by p.code), count(*) into v_codes, v_count
  from public.v2_products p where p.code = any(p_product_codes);
  if v_count <> cardinality(p_product_codes) then
    raise exception 'Unknown, null, or duplicate product selection' using errcode = '22023';
  end if;
  if 'full_batch' = any(v_codes) then
    if v_count <> 1 then
      raise exception 'Full Batch must be purchased separately' using errcode = '22023';
    end if;
    return query select 'full_batch'::text, 0, v_codes;
  else
    return query select 'crash_course'::text, v_count, v_codes;
  end if;
end;
$$;

create or replace function public.quote_v2_products(p_product_codes text[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_shape record;
  v_price public.v2_price_versions%rowtype;
begin
  select * into v_shape from public.v2_purchase_shape(p_product_codes);
  if exists (select 1 from public.v2_products where code = any(v_shape.product_codes) and not available_for_purchase) then
    raise exception 'A selected product is unavailable for purchase' using errcode = '22023';
  end if;
  select * into v_price from public.v2_price_versions price
  where price.product_kind = v_shape.product_kind and price.crash_count = v_shape.crash_count
    and price.effective_from <= statement_timestamp()
  order by price.effective_from desc limit 1;
  if not found then raise exception 'Price is not configured' using errcode = '22023'; end if;
  return jsonb_build_object('product_codes', v_shape.product_codes,
    'price_version_id', v_price.id, 'amount_paise', v_price.amount_paise, 'currency', v_price.currency);
end;
$$;

-- Trusted payment integration only. Phase 3 must verify provider capture, amount,
-- currency, buyer, order, and immutable confirmation timestamp before invoking.
create or replace function public.grant_v2_purchase(
  p_student_id uuid, p_product_codes text[], p_payment_reference text,
  p_confirmed_at timestamptz, p_price_version_id uuid, p_amount_paise integer, p_currency text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_shape record;
  v_price public.v2_price_versions%rowtype;
  v_purchase public.v2_purchases%rowtype;
  v_existing_codes text[];
  v_inserted boolean;
begin
  select * into v_shape from public.v2_purchase_shape(p_product_codes);
  if p_confirmed_at is null or not isfinite(p_confirmed_at) or p_confirmed_at > statement_timestamp() then
    raise exception 'A valid past payment confirmation is required' using errcode = '22023';
  end if;
  if p_payment_reference is null or p_payment_reference <> btrim(p_payment_reference)
    or length(p_payment_reference) not between 1 and 200 then
    raise exception 'A canonical payment reference is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'Student profile is required' using errcode = '22023';
  end if;
  select * into v_price from public.v2_price_versions where id = p_price_version_id;
  if not found or v_price.product_kind <> v_shape.product_kind or v_price.crash_count <> v_shape.crash_count
    or v_price.effective_from > p_confirmed_at
    or p_amount_paise is distinct from v_price.amount_paise or p_currency is distinct from v_price.currency then
    raise exception 'Verified payment does not match the quoted price' using errcode = '22023';
  end if;

  insert into public.v2_purchases
    (student_id, payment_reference, price_version_id, amount_paise, currency, confirmed_at)
  values (p_student_id, p_payment_reference, p_price_version_id, p_amount_paise, p_currency, p_confirmed_at)
  on conflict (payment_reference) do nothing returning * into v_purchase;
  v_inserted := found;

  if not v_inserted then
    select * into strict v_purchase from public.v2_purchases
    where payment_reference = p_payment_reference for update;
    select array_agg(product_code order by product_code) into v_existing_codes
    from public.v2_product_grants where purchase_id = v_purchase.id;
    if v_purchase.student_id is distinct from p_student_id
      or v_purchase.confirmed_at is distinct from p_confirmed_at
      or v_purchase.price_version_id is distinct from p_price_version_id
      or v_purchase.amount_paise is distinct from p_amount_paise
      or v_purchase.currency is distinct from p_currency
      or v_existing_codes is distinct from v_shape.product_codes then
      raise exception 'Payment reference already has a different grant' using errcode = '22023';
    end if;
    return v_purchase.id;
  end if;

  -- Grant a verified, previously quoted purchase even if sales have since closed.
  insert into public.v2_product_grants (purchase_id, product_code)
    select v_purchase.id, unnest(v_shape.product_codes);
  return v_purchase.id;
end;
$$;

-- One access-window predicate for both the access list and direct authorization.
-- The supplied clock is internal; public authorization always uses database time.
create or replace function public.v2_access_window_contains(
  p_start timestamptz, p_end timestamptz, p_revoked_at timestamptz, p_at timestamptz
)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(isfinite(p_start) and isfinite(p_end) and p_revoked_at is null
    and p_start <= p_at and p_at < p_end, false);
$$;

create or replace function public.can_access_v2_product(p_product_code text, p_section text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles student
    join public.v2_purchases purchase on purchase.student_id = student.id
    join public.v2_product_grants entitlement on entitlement.purchase_id = purchase.id
    join public.v2_products product on product.code = entitlement.product_code
    where student.id = auth.uid() and student.role = 'student' and student.is_active = true
      and product.code = p_product_code
      and (p_section is null or p_section = any(product.sections))
      and public.v2_access_window_contains(purchase.confirmed_at, purchase.expires_at,
        purchase.revoked_at, statement_timestamp())
  );
$$;

-- Minimal DTO: no student IDs, payment references, or private purchase details.
create or replace function public.get_my_v2_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_code', access.code, 'sections', access.sections, 'expires_at', access.expires_at
  ) order by access.code), '[]'::jsonb)
  from (
    select product.code, product.sections, max(purchase.expires_at) as expires_at
    from public.profiles student
    join public.v2_purchases purchase on purchase.student_id = student.id
    join public.v2_product_grants entitlement on entitlement.purchase_id = purchase.id
    join public.v2_products product on product.code = entitlement.product_code
    where student.id = auth.uid() and student.role = 'student' and student.is_active = true
      and public.v2_access_window_contains(purchase.confirmed_at, purchase.expires_at,
        purchase.revoked_at, statement_timestamp())
    group by product.code, product.sections
  ) access;
$$;

-- Price history is immutable, including for service integrations. A reviewed
-- new revision changes future quotes without changing existing purchase evidence.
create or replace function public.reject_v2_price_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Append a new price version; existing prices are immutable' using errcode = '22023';
end;
$$;
drop trigger if exists v2_price_history_immutable on public.v2_price_versions;
create trigger v2_price_history_immutable before update or delete on public.v2_price_versions
  for each row execute function public.reject_v2_price_rewrite();

revoke all on function public.v2_purchase_shape(text[]), public.reject_v2_price_rewrite(),
  public.v2_access_window_contains(timestamptz, timestamptz, timestamptz, timestamptz),
  public.quote_v2_products(text[]), public.can_access_v2_product(text, text),
  public.get_my_v2_access(), public.grant_v2_purchase(uuid, text[], text, timestamptz, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.quote_v2_products(text[]) to anon, authenticated, service_role;
grant execute on function public.can_access_v2_product(text, text), public.get_my_v2_access() to authenticated;
grant execute on function public.grant_v2_purchase(uuid, text[], text, timestamptz, uuid, integer, text) to service_role;

commit;
