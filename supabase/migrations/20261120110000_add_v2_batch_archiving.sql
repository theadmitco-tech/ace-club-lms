begin;
create table public.v2_batch_archive_history (
 batch_id uuid not null references public.v2_course_batches(id),
 revision integer not null check(revision>0), archived boolean not null,
 actor_id uuid not null references public.profiles(id), request_id uuid not null,
 request jsonb not null, created_at timestamptz not null default now(),
 primary key(batch_id,revision), unique(actor_id,request_id)
);
alter table public.v2_batch_archive_history enable row level security;
revoke all on public.v2_batch_archive_history from public,anon,authenticated,service_role;
create function public.list_v2_batch_archives() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_portal_admin() then raise exception 'Active Admin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('batchId',batch_id,'revision',revision,'archived',archived)),'[]') from (select distinct on(batch_id) * from public.v2_batch_archive_history order by batch_id,revision desc) a);
end $$;
create function public.set_v2_batch_archived(p_batch uuid,p_archived boolean,p_revision integer,p_draft integer,p_publication integer,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_revision integer; v_draft integer; v_pub integer; v_state boolean; v_request jsonb; v_prior public.v2_batch_archive_history%rowtype; v_input jsonb; v_preview jsonb;
begin
 perform 1 from public.profiles where id=v_actor and role='admin' and is_active for share;
 if not found then raise exception 'Active Admin access required' using errcode='42501'; end if;
 if p_batch is null or p_archived is null or p_revision is null or p_revision<0 or p_draft is null or p_draft<1 or p_publication is null or p_publication<0 or p_request is null then raise exception 'Invalid archive request' using errcode='22023'; end if;
 v_request:=jsonb_build_array(p_batch,p_archived,p_revision,p_draft,p_publication);
 perform pg_advisory_xact_lock(hashtextextended('v2-archive-request:'||v_actor::text||':'||p_request::text,0));
 select * into v_prior from public.v2_batch_archive_history where actor_id=v_actor and request_id=p_request;
 if found then
  if v_prior.request<>v_request then raise exception 'Request token reused' using errcode='22023'; end if;
  return jsonb_build_object('batchId',p_batch,'revision',v_prior.revision,'archived',v_prior.archived);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-batch:'||p_batch::text,0));
 perform 1 from public.v2_course_batches where id=p_batch for update;
 if not found then raise exception 'Batch unavailable' using errcode='22023'; end if;
 select coalesce(max(revision),0) into v_draft from public.v2_course_batch_revisions where batch_id=p_batch;
 select coalesce(max(revision),0) into v_pub from public.v2_batch_publication_revisions where batch_id=p_batch;
 select revision,archived into v_revision,v_state from public.v2_batch_archive_history where batch_id=p_batch order by revision desc limit 1;
 if coalesce(v_revision,0)<>p_revision or v_draft<>p_draft or v_pub<>p_publication then raise exception 'Batch changed; reload and review' using errcode='PT409'; end if;
 if coalesce(v_state,false)=p_archived then raise exception 'Batch already in requested state' using errcode='PT409'; end if;
 if p_archived and exists(select 1 from public.v2_batch_publication_revisions where batch_id=p_batch and revision=v_pub and document->>'state'='published') then
  v_input:=jsonb_build_object('batchId',p_batch,'batchRevision',v_draft,'expectedRevision',v_pub,'requestId',gen_random_uuid(),'action','unpublish');
  v_preview:=public.preview_v2_batch_publication(v_input);
  perform public.save_v2_batch_publication(v_input,v_preview->>'fingerprint');
 end if;
 insert into public.v2_batch_archive_history(batch_id,revision,archived,actor_id,request_id,request) values(p_batch,p_revision+1,p_archived,v_actor,p_request,v_request);
 return jsonb_build_object('batchId',p_batch,'revision',p_revision+1,'archived',p_archived);
end $$;
create function public.guard_v2_archived_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('v2-batch:'||new.batch_id::text,0));
 if new.document->>'state'='published' and coalesce((select archived from public.v2_batch_archive_history where batch_id=new.batch_id order by revision desc limit 1),false) then raise exception 'Restore this batch before publishing' using errcode='PT409'; end if;
 return new;
end $$;
create trigger v2_archived_publication before insert on public.v2_batch_publication_revisions for each row execute function public.guard_v2_archived_publication();
revoke all on function public.list_v2_batch_archives(),public.set_v2_batch_archived(uuid,boolean,integer,integer,integer,uuid),public.guard_v2_archived_publication() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_batch_archives(),public.set_v2_batch_archived(uuid,boolean,integer,integer,integer,uuid) to authenticated;
commit;
