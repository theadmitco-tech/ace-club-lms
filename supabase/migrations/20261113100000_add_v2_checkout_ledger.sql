-- Staging payment ledger. Provider verification remains a server-only responsibility.
begin;
create table public.v2_signup_candidates (
 student_id uuid primary key references auth.users(id), created_at timestamptz not null default statement_timestamp()
);
create function public.v2_mark_signup_candidate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'provider'='google' then
  insert into public.v2_signup_candidates(student_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end; $$;
create trigger z_v2_signup_candidate after insert on auth.users for each row execute function public.v2_mark_signup_candidate();
create function public.v2_invalidate_signup_candidate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.v2_signup_candidates where student_id=new.id;
 return new;
end; $$;
create trigger v2_signup_activation_guard after update of is_active,role on public.profiles for each row execute function public.v2_invalidate_signup_candidate();

create table public.v2_checkout_intents (
 id uuid primary key, student_id uuid not null references public.profiles(id),
 products text[] not null, batches jsonb not null, live_batches uuid[] not null,
 full_name text not null, whatsapp text not null, email text not null,
 amount_paise integer not null check(amount_paise>0), currency text not null check(currency='INR'),
 price_version_id uuid not null references public.v2_price_versions(id),
 base_purchase_id uuid references public.v2_purchases(id), previous_products text[],
 previous_price_version_id uuid references public.v2_price_versions(id),
 state text not null default 'prepared' check(state in ('prepared','creating','ready','fulfilled','review')),
 provider_order_id text unique, provider_payment_id text unique, purchase_id uuid references public.v2_purchases(id),
 created_at timestamptz not null default statement_timestamp(), hold_until timestamptz not null default statement_timestamp()+interval '15 minutes',
 verified_at timestamptz, fulfilled_at timestamptz, issue text,
 check((base_purchase_id is null)=(previous_products is null))
);
create index v2_checkout_student_idx on public.v2_checkout_intents(student_id,created_at);
create table public.v2_purchase_upgrades (
 checkout_id uuid primary key references public.v2_checkout_intents(id),
 purchase_id uuid not null references public.v2_purchases(id), products text[] not null,
 amount_paise integer not null check(amount_paise>0), confirmed_at timestamptz not null,
 revoked_at timestamptz
);
create table public.v2_payment_events (
 event_id text primary key, payload_sha256 text not null, checkout_id uuid not null references public.v2_checkout_intents(id),
 received_at timestamptz not null default statement_timestamp()
);
create function public.v2_effective_purchase_products(p_purchase uuid) returns text[] language sql stable security definer set search_path='' as $$
 select array_agg(distinct code order by code) from (
 select product_code code from public.v2_product_grants where purchase_id=p_purchase
 union select unnest(products) from public.v2_purchase_upgrades where purchase_id=p_purchase and revoked_at is null
 ) g;
$$;
create or replace function public.can_access_v2_product(p_product_code text,p_section text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role='student' and s.is_active and product.code=p_product_code
 and (p_section is null or p_section=any(product.sections))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create or replace function public.get_my_v2_access() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('product_code',code,'sections',sections,'expires_at',expires_at) order by code),'[]') from (
 select product.code,product.sections,max(p.expires_at) expires_at from public.profiles s
 join public.v2_purchases p on p.student_id=s.id
 join public.v2_products product on product.code=any(public.v2_effective_purchase_products(p.id))
 where s.id=auth.uid() and s.role='student' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp())
 group by product.code,product.sections) a;
$$;
create or replace function public.v2_student_has_product(p_student uuid,p_product text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join public.v2_purchases p on p.student_id=s.id
 where s.id=p_student and s.role='student' and s.is_active
 and public.v2_entitlement_product_code(p_product)=any(public.v2_effective_purchase_products(p.id))
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()));
$$;
create function public.get_my_v2_purchase_packages() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'products',public.v2_effective_purchase_products(p.id),'expiresAt',p.expires_at) order by p.id),'[]')
 from public.v2_purchases p join public.profiles s on s.id=p.student_id where s.id=auth.uid() and s.role='student' and s.is_active
 and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
$$;
create function public.v2_checkout_buyer_eligible(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles s join auth.users u on u.id=s.id where s.id=p_student and s.role='student'
 and u.email_confirmed_at is not null and u.raw_app_meta_data->>'provider'='google'
 and (s.is_active or exists(select 1 from public.v2_signup_candidates c where c.student_id=s.id)));
$$;
create function public.v2_live_occupied(p_batch uuid,p_exclude uuid default null) returns integer language sql stable security definer set search_path='' as $$
 select count(distinct student_id)::integer from (
 select student_id from public.v2_live_registrations where batch_id=p_batch and active
 union all select student_id from public.v2_checkout_intents where p_batch=any(live_batches)
 and state in ('prepared','creating','ready') and hold_until>statement_timestamp() and id is distinct from p_exclude
 ) places;
$$;
create function public.list_v2_live_availability() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('batchId',item->>'batchId','placesRemaining',greatest(0,8-public.v2_live_occupied((item->>'batchId')::uuid)),'capacity',8)),'[]')
 from jsonb_array_elements(public.list_v2_sales_catalogue()) item where jsonb_array_length(item->'events')>0;
$$;

create function public.prepare_v2_checkout(p_id uuid,p_products text[],p_batch_ids uuid[],p_live_ids uuid[],p_name text,p_whatsapp text,p_upgrade boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_student uuid:=auth.uid(); v_codes text[]; v_old public.v2_checkout_intents%rowtype;
 v_quote jsonb; v_prior_quote jsonb; v_base public.v2_purchases%rowtype; v_current text[]; v_count integer;
 v_batch uuid; v_item jsonb; v_batches jsonb:='[]'; v_mapped text[]:='{}'; v_amount integer; v_email text;
begin
 if v_student is null then raise exception 'Verified Google sign-in required' using errcode='42501'; end if;
 perform 1 from public.profiles where id=v_student for update;
 if not public.v2_checkout_buyer_eligible(v_student) then raise exception 'Student checkout is unavailable for this account' using errcode='42501'; end if;
 if p_id is null or p_upgrade is null or length(btrim(p_name)) not between 1 and 120 or p_name is null
 or p_whatsapp is null or p_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Name and international WhatsApp number required' using errcode='22023'; end if;
 select product_codes into v_codes from public.v2_purchase_shape(p_products);
 if p_batch_ids is null or cardinality(p_batch_ids)<>cardinality(v_codes) or p_live_ids is null
 or cardinality(p_live_ids)>cardinality(p_batch_ids) or not p_live_ids<@p_batch_ids
 or cardinality(p_batch_ids)<>(select count(distinct x) from unnest(p_batch_ids) x)
 or cardinality(p_live_ids)<>(select count(distinct x) from unnest(p_live_ids) x) then raise exception 'Invalid batch selection' using errcode='22023'; end if;
 select * into v_old from public.v2_checkout_intents where id=p_id;
 if found then
  if v_old.student_id<>v_student or v_old.products<>v_codes or v_old.live_batches<>(select coalesce(array_agg(x order by x),'{}') from unnest(p_live_ids) x)
   or (v_old.base_purchase_id is not null)<>p_upgrade or v_old.full_name<>btrim(p_name) or v_old.whatsapp<>p_whatsapp
   or (select array_agg((x->>'batchId')::uuid order by x->>'batchId') from jsonb_array_elements(v_old.batches) x)<>(select array_agg(x order by x) from unnest(p_batch_ids) x)
  then raise exception 'Checkout identifier already used' using errcode='22023'; end if;
  return jsonb_build_object('id',v_old.id,'amountPaise',v_old.amount_paise,'currency',v_old.currency,'state',v_old.state,'holdUntil',v_old.hold_until);
 end if;
 if exists(select 1 from public.v2_checkout_intents where student_id=v_student and state in ('prepared','creating','ready') and hold_until>statement_timestamp()) then
  raise exception 'An active checkout already exists; resume it or wait for its expiry' using errcode='22023'; end if;
 if (select count(*) from public.v2_checkout_intents where student_id=v_student and created_at>statement_timestamp()-interval '1 day')>=20 then raise exception 'Checkout limit reached' using errcode='22023'; end if;
 v_quote:=public.quote_v2_products(v_codes); v_amount:=(v_quote->>'amount_paise')::integer;
 select count(*) into v_count from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp());
 if p_upgrade then
  if v_count<>1 or 'full_batch'=any(v_codes) then raise exception 'Exactly one active individual package required' using errcode='22023'; end if;
  select * into v_base from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) for update;
  v_current:=public.v2_effective_purchase_products(v_base.id);
  if 'full_batch'=any(v_current) or not v_current<@v_codes or cardinality(v_current)>=cardinality(v_codes) then raise exception 'A larger individual package is required' using errcode='22023'; end if;
  v_prior_quote:=public.quote_v2_products(v_current); v_amount:=v_amount-(v_prior_quote->>'amount_paise')::integer;
  if v_amount<=0 then raise exception 'Upgrade price unavailable' using errcode='22023'; end if;
 elsif exists(select 1 from public.v2_purchases p where p.student_id=v_student and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&v_codes) then
  raise exception 'Selected access is already active; use an eligible upgrade' using errcode='22023';
 end if;
 for v_batch in select x from unnest(p_batch_ids) x order by x loop
  perform 1 from public.v2_course_batches where id=v_batch for update;
  select x into v_item from jsonb_array_elements(public.list_v2_sales_catalogue()) x where x->>'batchId'=v_batch::text;
  if v_item is null then raise exception 'Published batch unavailable' using errcode='22023'; end if;
  v_mapped:=array_append(v_mapped,v_item->>'entitlementProductCode');
  if v_batch=any(p_live_ids) then
   if not exists(select 1 from jsonb_array_elements(v_item->'events') e where (e->>'endsAt')::timestamptz>statement_timestamp()) then raise exception 'Upcoming live batch required' using errcode='22023'; end if;
   if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=v_student and active)
   and public.v2_live_occupied(v_batch)>=8 then raise exception 'Live batch is full' using errcode='22023'; end if;
  end if;
  v_batches:=v_batches||jsonb_build_array(jsonb_build_object('batchId',v_batch,'publicationRevision',v_item->'publicationRevision'));
 end loop;
 if (select array_agg(x order by x) from unnest(v_mapped) x)<>v_codes then raise exception 'Batches must match selected products exactly' using errcode='22023'; end if;
 select lower(email) into v_email from auth.users where id=v_student;
 insert into public.v2_checkout_intents(id,student_id,products,batches,live_batches,full_name,whatsapp,email,amount_paise,currency,price_version_id,base_purchase_id,previous_products,previous_price_version_id)
 values(p_id,v_student,v_codes,v_batches,(select coalesce(array_agg(x order by x),'{}') from unnest(p_live_ids) x),btrim(p_name),p_whatsapp,v_email,v_amount,'INR',(v_quote->>'price_version_id')::uuid,v_base.id,v_current,(v_prior_quote->>'price_version_id')::uuid);
 return jsonb_build_object('id',p_id,'amountPaise',v_amount,'currency','INR','state','prepared','holdUntil',statement_timestamp()+interval '15 minutes','expiresAt',v_base.expires_at);
end; $$;

create function public.get_my_v2_checkouts() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'products',c.products,'batches',c.batches,'liveBatches',c.live_batches,'amountPaise',c.amount_paise,'currency',c.currency,'state',c.state,'holdUntil',c.hold_until,'createdAt',c.created_at,'confirmedAt',c.verified_at,'expiresAt',p.expires_at,'upgrade',c.base_purchase_id is not null) order by c.created_at desc),'[]')
 from (select * from public.v2_checkout_intents where student_id=auth.uid() order by created_at desc limit 20) c
 left join public.v2_purchases p on p.id=c.purchase_id;
$$;
create function public.read_v2_checkout_service(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(c) from public.v2_checkout_intents c where id=p_id;
$$;
create function public.find_v2_checkout_order(p_order text) returns uuid language sql stable security definer set search_path='' as $$
 select id from public.v2_checkout_intents where provider_order_id=p_order;
$$;
create function public.claim_v2_checkout_order(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.v2_checkout_intents set state='creating' where id=p_id and state='prepared' and hold_until>statement_timestamp();
 return found;
end; $$;
create function public.attach_v2_checkout_order(p_id uuid,p_order text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_order is null or p_order !~ '^order_[A-Za-z0-9]+$' then raise exception 'Invalid provider order'; end if;
 update public.v2_checkout_intents set state='ready',provider_order_id=p_order where id=p_id and state='creating' and provider_order_id is null;
 if not found and not exists(select 1 from public.v2_checkout_intents where id=p_id and provider_order_id=p_order) then raise exception 'Order cannot be attached'; end if;
end; $$;
create function public.record_v2_payment_event(p_event text,p_hash text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_event is null or length(p_event) not between 1 and 200 or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid event'; end if;
 insert into public.v2_payment_events(event_id,payload_sha256,checkout_id) values(p_event,p_hash,p_id) on conflict do nothing;
 if not exists(select 1 from public.v2_payment_events where event_id=p_event and payload_sha256=p_hash and checkout_id=p_id) then raise exception 'Event replay mismatch'; end if;
end; $$;

-- Table access is deliberately unavailable even to the service role; narrow RPCs own transitions.
alter table public.v2_signup_candidates enable row level security;
alter table public.v2_checkout_intents enable row level security;
alter table public.v2_purchase_upgrades enable row level security;
alter table public.v2_payment_events enable row level security;
revoke all on public.v2_signup_candidates,public.v2_checkout_intents,public.v2_purchase_upgrades,public.v2_payment_events from public,anon,authenticated,service_role;
revoke all on function public.v2_mark_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_invalidate_signup_candidate() from public,anon,authenticated,service_role;
revoke all on function public.v2_effective_purchase_products(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_checkout_buyer_eligible(uuid) from public,anon,authenticated,service_role;
revoke all on function public.v2_live_occupied(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_my_v2_purchase_packages() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_purchase_packages() to authenticated;
revoke all on function public.list_v2_live_availability() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_live_availability() to anon,authenticated;
revoke all on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.prepare_v2_checkout(uuid,text[],uuid[],uuid[],text,text,boolean) to authenticated;
revoke all on function public.get_my_v2_checkouts() from public,anon,authenticated,service_role;
grant execute on function public.get_my_v2_checkouts() to authenticated;
revoke all on function public.read_v2_checkout_service(uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_v2_checkout_service(uuid) to service_role;
revoke all on function public.find_v2_checkout_order(text) from public,anon,authenticated,service_role;
grant execute on function public.find_v2_checkout_order(text) to service_role;
revoke all on function public.claim_v2_checkout_order(uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_v2_checkout_order(uuid) to service_role;
revoke all on function public.attach_v2_checkout_order(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.attach_v2_checkout_order(uuid,text) to service_role;
revoke all on function public.record_v2_payment_event(text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_v2_payment_event(text,text,uuid) to service_role;
commit;
