-- Source SHA-256: 93cea5dbc222958f53b2709fe551a677a023b6a9b4960774c427d66b2ac463c1
-- Staging installation only; no batches are archived by this packet.
rollback;
begin;
set local statement_timeout='90s';
set local lock_timeout='3s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$begin
 if to_regclass('public.v2_batch_archive_history') is not null or exists(select 1 from supabase_migrations.schema_migrations where version='20261120110000') then raise exception 'Batch archiving already exists; reconciliation required';end if;
end $$;
create temporary table archive_preserved_rows(name text,n bigint,h text) on commit drop;
do $$declare t record;n bigint;h text;begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('lock table public.%I in share mode',t.tablename);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.tablename) into n,h;
  insert into archive_preserved_rows values(t.tablename,n,h);
 end loop;
end $$;
create temporary table archive_preserved_functions on commit drop as select oid,pg_get_functiondef(oid) definition,proacl::text acl from pg_proc where pronamespace='public'::regnamespace and prokind='f';
create temporary table archive_preserved_relations on commit drop as select oid,relacl::text acl,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='public'::regnamespace;
create temporary table archive_preserved_ledger on commit drop as select to_jsonb(m) document from supabase_migrations.schema_migrations m;

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

do $verify$declare t record;n bigint;h text;begin
 for t in select * from archive_preserved_rows loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'')::text) from public.%I r',t.name) into n,h;
  if n<>t.n or h<>t.h then raise exception 'Existing rows changed: %',t.name;end if;
 end loop;
 if exists(select 1 from archive_preserved_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or pg_get_functiondef(p.oid) is distinct from f.definition or p.proacl::text is distinct from f.acl) then raise exception 'Existing functions changed';end if;
 if exists(select 1 from archive_preserved_relations r left join pg_class c on c.oid=r.oid where c.oid is null or c.relacl::text is distinct from r.acl or c.relrowsecurity<>r.relrowsecurity or c.relforcerowsecurity<>r.relforcerowsecurity) then raise exception 'Existing permissions changed';end if;
 if exists((select document from archive_preserved_ledger except select to_jsonb(m) from supabase_migrations.schema_migrations m) union all (select to_jsonb(m) from supabase_migrations.schema_migrations m except select document from archive_preserved_ledger)) then raise exception 'Original ledger changed';end if;
end $verify$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261120110000','add_v2_batch_archiving',array['begin;
create table public.v2_batch_archive_history (
 batch_id uuid not null references public.v2_course_batches(id),
 revision integer not null check(revision>0), archived boolean not null,
 actor_id uuid not null references public.profiles(id), request_id uuid not null,
 request jsonb not null, created_at timestamptz not null default now(),
 primary key(batch_id,revision), unique(actor_id,request_id)
);
alter table public.v2_batch_archive_history enable row level security;
revoke all on public.v2_batch_archive_history from public,anon,authenticated,service_role;
create function public.list_v2_batch_archives() returns jsonb language plpgsql stable security definer set search_path='''' as $$
begin
 if not public.is_portal_admin() then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(''batchId'',batch_id,''revision'',revision,''archived'',archived)),''[]'') from (select distinct on(batch_id) * from public.v2_batch_archive_history order by batch_id,revision desc) a);
end $$;
create function public.set_v2_batch_archived(p_batch uuid,p_archived boolean,p_revision integer,p_draft integer,p_publication integer,p_request uuid) returns jsonb language plpgsql security definer set search_path='''' as $$
declare v_actor uuid:=auth.uid(); v_revision integer; v_draft integer; v_pub integer; v_state boolean; v_request jsonb; v_prior public.v2_batch_archive_history%rowtype; v_input jsonb; v_preview jsonb;
begin
 perform 1 from public.profiles where id=v_actor and role=''admin'' and is_active for share;
 if not found then raise exception ''Active Admin access required'' using errcode=''42501''; end if;
 if p_batch is null or p_archived is null or p_revision is null or p_revision<0 or p_draft is null or p_draft<1 or p_publication is null or p_publication<0 or p_request is null then raise exception ''Invalid archive request'' using errcode=''22023''; end if;
 v_request:=jsonb_build_array(p_batch,p_archived,p_revision,p_draft,p_publication);
 perform pg_advisory_xact_lock(hashtextextended(''v2-archive-request:''||v_actor::text||'':''||p_request::text,0));
 select * into v_prior from public.v2_batch_archive_history where actor_id=v_actor and request_id=p_request;
 if found then
  if v_prior.request<>v_request then raise exception ''Request token reused'' using errcode=''22023''; end if;
  return jsonb_build_object(''batchId'',p_batch,''revision'',v_prior.revision,''archived'',v_prior.archived);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(''v2-batch:''||p_batch::text,0));
 perform 1 from public.v2_course_batches where id=p_batch for update;
 if not found then raise exception ''Batch unavailable'' using errcode=''22023''; end if;
 select coalesce(max(revision),0) into v_draft from public.v2_course_batch_revisions where batch_id=p_batch;
 select coalesce(max(revision),0) into v_pub from public.v2_batch_publication_revisions where batch_id=p_batch;
 select revision,archived into v_revision,v_state from public.v2_batch_archive_history where batch_id=p_batch order by revision desc limit 1;
 if coalesce(v_revision,0)<>p_revision or v_draft<>p_draft or v_pub<>p_publication then raise exception ''Batch changed; reload and review'' using errcode=''PT409''; end if;
 if coalesce(v_state,false)=p_archived then raise exception ''Batch already in requested state'' using errcode=''PT409''; end if;
 if p_archived and exists(select 1 from public.v2_batch_publication_revisions where batch_id=p_batch and revision=v_pub and document->>''state''=''published'') then
  v_input:=jsonb_build_object(''batchId'',p_batch,''batchRevision'',v_draft,''expectedRevision'',v_pub,''requestId'',gen_random_uuid(),''action'',''unpublish'');
  v_preview:=public.preview_v2_batch_publication(v_input);
  perform public.save_v2_batch_publication(v_input,v_preview->>''fingerprint'');
 end if;
 insert into public.v2_batch_archive_history(batch_id,revision,archived,actor_id,request_id,request) values(p_batch,p_revision+1,p_archived,v_actor,p_request,v_request);
 return jsonb_build_object(''batchId'',p_batch,''revision'',p_revision+1,''archived'',p_archived);
end $$;
create function public.guard_v2_archived_publication() returns trigger language plpgsql security definer set search_path='''' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(''v2-batch:''||new.batch_id::text,0));
 if new.document->>''state''=''published'' and coalesce((select archived from public.v2_batch_archive_history where batch_id=new.batch_id order by revision desc limit 1),false) then raise exception ''Restore this batch before publishing'' using errcode=''PT409''; end if;
 return new;
end $$;
create trigger v2_archived_publication before insert on public.v2_batch_publication_revisions for each row execute function public.guard_v2_archived_publication();
revoke all on function public.list_v2_batch_archives(),public.set_v2_batch_archived(uuid,boolean,integer,integer,integer,uuid),public.guard_v2_archived_publication() from public,anon,authenticated,service_role;
grant execute on function public.list_v2_batch_archives(),public.set_v2_batch_archived(uuid,boolean,integer,integer,integer,uuid) to authenticated;
commit;
']);
notify pgrst,'reload schema';
select jsonb_build_object('check','batch_archiving','migration','20261120110000','existingRowsPreserved',true,'originalLedgerPreserved',true,'existingPermissionsPreserved',true,'publicTablesPreserved',(select count(*) from archive_preserved_rows),'archivedBatches',0);
commit;
