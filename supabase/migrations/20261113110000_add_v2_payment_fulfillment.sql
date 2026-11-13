-- Capture confirmation and enrollment commit together; failed transitions retain an exception for review.
begin;
alter table public.v2_live_registrations drop constraint v2_live_registrations_provenance_check;
alter table public.v2_live_registrations add constraint v2_live_registrations_provenance_check check(provenance in ('admin_manual','verified_payment'));
create function public.v2_enforce_live_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_occupied integer;
begin
 if new.active then
  perform 1 from public.v2_course_batches where id=new.batch_id for update;
  select count(distinct student_id) into v_occupied from (
   select student_id from public.v2_live_registrations where batch_id=new.batch_id and active and student_id<>new.student_id
   union all select student_id from public.v2_checkout_intents where new.batch_id=any(live_batches)
   and student_id<>new.student_id and state in ('prepared','creating','ready') and hold_until>statement_timestamp()
  ) places;
  if v_occupied>=8 then raise exception 'Live batch is full' using errcode='22023'; end if;
 end if;
 return new;
end; $$;
create trigger v2_live_capacity before insert or update on public.v2_live_registrations for each row execute function public.v2_enforce_live_capacity();

create function public.fulfill_v2_checkout(p_id uuid,p_order text,p_payment text,p_amount integer,p_currency text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.v2_checkout_intents%rowtype; v_base public.v2_purchases%rowtype;
 v_batch uuid; v_entry jsonb; v_pub public.v2_batch_publication_revisions%rowtype; v_revision integer; v_purchase uuid;
begin
 select student_id into c.student_id from public.v2_checkout_intents where id=p_id;
 if not found then raise exception 'Checkout unavailable'; end if;
 perform 1 from public.profiles where id=c.student_id for update;
 select * into strict c from public.v2_checkout_intents where id=p_id for update;
 if p_order is null or p_order is distinct from c.provider_order_id or p_amount is distinct from c.amount_paise or p_currency is distinct from c.currency
 or p_payment is null or p_payment !~ '^pay_[A-Za-z0-9]+$' then raise exception 'Verified payment does not match checkout'; end if;
 if c.provider_payment_id is not null and c.provider_payment_id<>p_payment then raise exception 'Checkout already has a different captured payment'; end if;
 if c.state='fulfilled' then return jsonb_build_object('state','fulfilled','id',c.id,'replayed',true); end if;
 if c.state not in ('ready','review') then raise exception 'Checkout is not ready'; end if;
 update public.v2_checkout_intents set provider_payment_id=p_payment,verified_at=coalesce(verified_at,statement_timestamp()) where id=c.id returning * into c;
 begin
  if not public.v2_checkout_buyer_eligible(c.student_id) then raise exception 'Account no longer eligible'; end if;
  if c.base_purchase_id is not null then
   select * into strict v_base from public.v2_purchases where id=c.base_purchase_id for update;
   if v_base.student_id<>c.student_id or not public.v2_access_window_contains(v_base.confirmed_at,v_base.expires_at,v_base.revoked_at,statement_timestamp())
    or public.v2_effective_purchase_products(v_base.id) is distinct from c.previous_products
    or (select count(*) from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()))<>1
   then raise exception 'Upgrade eligibility changed'; end if;
  elsif exists(select 1 from public.v2_purchases p where p.student_id=c.student_id and public.v2_access_window_contains(p.confirmed_at,p.expires_at,p.revoked_at,statement_timestamp()) and public.v2_effective_purchase_products(p.id)&&c.products) then
   raise exception 'Purchased access is already active';
  end if;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>'batchId' loop
   v_batch:=(v_entry->>'batchId')::uuid;
   perform 1 from public.v2_course_batches where id=v_batch for update;
   select * into v_pub from public.v2_batch_publication_revisions where batch_id=v_batch order by revision desc limit 1;
   if v_pub.document->>'state' is distinct from 'published' or v_pub.revision is distinct from (v_entry->>'publicationRevision')::integer then raise exception 'Publication changed'; end if;
   if v_batch=any(c.live_batches) then
    if not exists(select 1 from jsonb_array_elements(v_pub.document->'events') e where e->>'kind'='live' and (e->>'endsAt')::timestamptz>statement_timestamp()) then raise exception 'Live batch ended'; end if;
    if not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active)
     and public.v2_live_occupied(v_batch,c.id)>=8 then raise exception 'Live batch is full'; end if;
   end if;
  end loop;
  if c.base_purchase_id is null then
   v_purchase:=public.grant_v2_purchase(c.student_id,c.products,'razorpay_test:'||p_payment,c.verified_at,c.price_version_id,c.amount_paise,c.currency);
  else
   v_purchase:=c.base_purchase_id;
   insert into public.v2_purchase_upgrades(checkout_id,purchase_id,products,amount_paise,confirmed_at)
   values(c.id,v_purchase,c.products,c.amount_paise,c.verified_at);
  end if;
  -- Only a newly marked signup may be activated; existing disabled accounts are excluded above.
  update public.profiles set is_active=true,full_name=c.full_name where id=c.student_id and not is_active;
  for v_entry in select x from jsonb_array_elements(c.batches) x order by x->>'batchId' loop
   v_batch:=(v_entry->>'batchId')::uuid;
   insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id)
    values(v_batch,c.student_id,true,1,c.student_id)
    on conflict(batch_id,student_id) do update set active=true,revision=public.v2_batch_enrollments.revision+1,actor_id=c.student_id,updated_at=statement_timestamp();
   if v_batch=any(c.live_batches) and not exists(select 1 from public.v2_live_registrations where batch_id=v_batch and student_id=c.student_id and active) then
    insert into public.v2_live_registrations(batch_id,student_id,active,provenance,revision,actor_id)
     values(v_batch,c.student_id,true,'verified_payment',1,c.student_id)
     on conflict(batch_id,student_id) do update set active=true,provenance='verified_payment',revision=public.v2_live_registrations.revision+1,actor_id=c.student_id,updated_at=statement_timestamp()
     returning revision into v_revision;
    insert into public.v2_live_registration_audit(batch_id,student_id,revision,active,actor_id) values(v_batch,c.student_id,v_revision,true,c.student_id);
   end if;
  end loop;
  update public.v2_checkout_intents set state='fulfilled',purchase_id=v_purchase,fulfilled_at=statement_timestamp(),issue=null where id=c.id;
 exception when others then
  -- The subtransaction rolls back all grants, activation and enrollment before recording review state.
  update public.v2_checkout_intents set state='review',issue='fulfillment_conflict' where id=c.id;
  return jsonb_build_object('state','review','id',c.id,'replayed',false);
 end;
 return jsonb_build_object('state','fulfilled','id',c.id,'replayed',false);
end; $$;
create function public.list_v2_checkout_exceptions() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'state',state,'amountPaise',amount_paise,'products',products,'createdAt',created_at,'issue',issue) order by created_at),'[]')
 from public.v2_checkout_intents where state='review' or (state in ('creating','ready') and hold_until<=statement_timestamp()));
end; $$;
revoke all on function public.v2_enforce_live_capacity(),public.fulfill_v2_checkout(uuid,text,text,integer,text),public.list_v2_checkout_exceptions() from public,anon,authenticated,service_role;
grant execute on function public.fulfill_v2_checkout(uuid,text,text,integer,text) to service_role;
grant execute on function public.list_v2_checkout_exceptions() to authenticated;
commit;
