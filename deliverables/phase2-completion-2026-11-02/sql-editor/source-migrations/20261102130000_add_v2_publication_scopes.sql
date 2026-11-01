-- Publication scopes pin every affected batch and private meeting revision.
-- Confirmation is atomic; a changed scope requires a fresh review.
begin;
create or replace function public.v2_publication_fingerprint(p_document jsonb)
returns text language sql stable security definer set search_path = '' as $$
  select md5(jsonb_build_object('document',p_document,'meetingRevision',coalesce((
    select max(revision) from public.v2_batch_meeting_revisions
    where batch_id=(p_document->>'batchId')::uuid
      and batch_revision=(p_document->>'batchRevision')::integer
  ),0))::text)
$$;
create or replace function public.preview_v2_batch_publication(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_document jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  v_document := public.build_v2_batch_publication(p_request);
  return jsonb_build_object('document',v_document,'fingerprint',public.v2_publication_fingerprint(v_document));
end;
$$;

create or replace function public.save_v2_batch_publication(p_request jsonb, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_id uuid; v_token uuid; v_document jsonb;
  v_saved public.v2_batch_publication_revisions%rowtype;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  perform public.assert_v2_publication_request(p_request);
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'Review publication before confirmation' using errcode='22023';
  end if;
  v_id := (p_request->>'batchId')::uuid;
  v_token := (p_request->>'requestId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('v2-publication-request:' || v_actor::text || ':' || v_token::text,0));
  select * into v_saved from public.v2_batch_publication_revisions where actor_id=v_actor and request_id=v_token;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different submission' using errcode='22023';
    end if;
    return jsonb_build_object('document',v_saved.document,'replayed',true);
  end if;
  -- Same batch lock order as draft saves. Recheck both the draft revision and
  -- publication revision after the lock so stale previews cannot win a race.
  perform pg_advisory_xact_lock(hashtextextended('v2-batch:' || v_id::text,0));
  perform 1 from public.v2_course_batches where id=v_id for update;
  v_document := public.build_v2_batch_publication(p_request);
  if public.v2_publication_fingerprint(v_document) <> p_fingerprint then raise exception 'Publication preview changed' using errcode='40001'; end if;
  insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
    values (v_id,(p_request->>'batchRevision')::integer,(v_document->>'revision')::integer,
      v_document,p_request,p_fingerprint,v_token,v_actor);
  return jsonb_build_object('document',v_document,'replayed',false);
end;
$$;


create table public.v2_publication_scope_requests (
  actor_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  request jsonb not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key(actor_id,request_id)
);
alter table public.v2_publication_scope_requests enable row level security;
revoke all on public.v2_publication_scope_requests from public,anon,authenticated,service_role;
grant select on public.v2_publication_scope_requests to authenticated;
create policy v2_scope_admin_read on public.v2_publication_scope_requests
  for select to authenticated using (public.is_portal_admin());

create or replace function public.preview_v2_publication_scope(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_batch record; v_input jsonb; v_document jsonb; v_items jsonb := '[]'; v_proposal jsonb;
begin
  if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid scope' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_request)) <> 3
    or not (p_request ?& array['requestId','action','productCodes'])
    or coalesce(p_request->>'action','') not in ('publish','unpublish')
    or coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_request->'productCodes') is distinct from 'array' then
    raise exception 'Invalid scope fields' using errcode='22023';
  end if;
  if jsonb_array_length(p_request->'productCodes') not between 1 and 4
    or exists(select 1 from jsonb_array_elements(p_request->'productCodes') p where
      jsonb_typeof(p) <> 'string' or p#>>'{}' not in ('full_course','quant','verbal','di'))
    or (select count(distinct p) from jsonb_array_elements(p_request->'productCodes') p) <> jsonb_array_length(p_request->'productCodes') then
    raise exception 'Invalid scope offerings' using errcode='22023';
  end if;
  for v_batch in
    select b.id,b.latest_revision,coalesce(p.revision,0) publication_revision
    from public.v2_course_batches b
    left join lateral (select revision,document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true
    where p_request->'productCodes' ? b.product_code
      and (p_request->>'action'='publish' or p.document->>'state'='published')
    order by b.id
  loop
    if jsonb_array_length(v_items)>=100 then raise exception 'Scope exceeds 100 batches' using errcode='22023'; end if;
    v_input := jsonb_build_object('batchId',v_batch.id,'batchRevision',v_batch.latest_revision,
      'expectedRevision',v_batch.publication_revision,'requestId',p_request->>'requestId','action',p_request->>'action');
    v_document := public.build_v2_batch_publication(v_input);
    v_items := v_items || jsonb_build_array(jsonb_build_object('input',v_input,'document',v_document,
      'fingerprint',public.v2_publication_fingerprint(v_document)));
  end loop;
  if jsonb_array_length(v_items)=0 then raise exception 'No batches match this scope' using errcode='22023'; end if;
  v_proposal := jsonb_build_object('action',p_request->>'action','items',v_items);
  return jsonb_build_object('proposal',v_proposal,'fingerprint',md5(v_proposal::text));
end;
$$;

create or replace function public.save_v2_publication_scope(p_request jsonb,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_saved public.v2_publication_scope_requests%rowtype;
  v_review jsonb; v_item jsonb; v_document jsonb; v_input jsonb; v_result jsonb;
begin
  perform 1 from public.profiles where id=v_actor and role='admin' and is_active=true for share;
  if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
  if coalesce(p_request->>'requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(p_fingerprint,'') !~ '^[0-9a-f]{32}$' then raise exception 'Scope review required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('v2-scope:' || v_actor::text || ':' || (p_request->>'requestId'),0));
  select * into v_saved from public.v2_publication_scope_requests where actor_id=v_actor and request_id=(p_request->>'requestId')::uuid;
  if found then
    if v_saved.request <> p_request or v_saved.fingerprint <> p_fingerprint then
      raise exception 'Request token belongs to a different scope' using errcode='22023';
    end if;
    return jsonb_build_object('documents',v_saved.result,'replayed',true);
  end if;
  -- Brief write locks stabilize membership, draft heads, meeting links and publication heads.
  -- Ordinary Student reads remain available throughout the transaction.
  lock table public.v2_course_batches in exclusive mode;
  lock table public.v2_batch_meeting_revisions in share row exclusive mode;
  lock table public.v2_batch_publication_revisions in share row exclusive mode;
  v_review := public.preview_v2_publication_scope(p_request);
  if v_review->>'fingerprint' <> p_fingerprint then raise exception 'Publication scope changed' using errcode='40001'; end if;
  v_result := '[]';
  for v_item in select value from jsonb_array_elements(v_review->'proposal'->'items') loop
    v_document := v_item->'document';
    v_input := jsonb_set(v_item->'input','{requestId}',to_jsonb(gen_random_uuid()::text));
    insert into public.v2_batch_publication_revisions(batch_id,batch_revision,revision,document,request,fingerprint,request_id,actor_id)
      values ((v_document->>'batchId')::uuid,(v_document->>'batchRevision')::integer,(v_document->>'revision')::integer,
        v_document,v_input,v_item->>'fingerprint',(v_input->>'requestId')::uuid,v_actor);
    v_result := v_result || jsonb_build_array(v_document);
  end loop;
  insert into public.v2_publication_scope_requests(actor_id,request_id,request,fingerprint,result)
    values(v_actor,(p_request->>'requestId')::uuid,p_request,p_fingerprint,v_result);
  return jsonb_build_object('documents',v_result,'replayed',false);
end;
$$;
revoke all on function public.v2_publication_fingerprint(jsonb),public.preview_v2_publication_scope(jsonb),
  public.save_v2_publication_scope(jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.preview_v2_publication_scope(jsonb),public.save_v2_publication_scope(jsonb,text) to authenticated;
commit;
