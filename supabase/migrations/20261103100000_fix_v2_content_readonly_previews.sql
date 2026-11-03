-- Admin workspace and Student-view preview remain compatible with read-only RPC transactions.
begin;
create or replace function public.list_v2_content_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 -- Read-only authorization uses the statement snapshot; write operations retain their locking guard.
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active) then
  raise exception 'Active Admin access required' using errcode='42501';
 end if;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('document',r.document) order by r.created_at desc),'[]') from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision),
 'courses',(select coalesce(jsonb_agg(jsonb_build_object('batchId',b.id,'title',p.document->>'title','productCode',b.product_code,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]'),'anchors',public.v2_compose_content(jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'sessions',coalesce(d.document->'sessions','[]')))->'sessions') order by b.id),'[]')
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions d on d.batch_id=b.id and d.revision=p.batch_revision));
end;$$;

create or replace function public.read_v2_content_preview(p_batch_id uuid,p_item_id uuid,p_revision integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;d jsonb;
begin
 -- Read-only authorization uses the statement snapshot; write operations retain their locking guard.
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active) then
  raise exception 'Active Admin access required' using errcode='42501';
 end if;
 if p_item_id is not null then
  select r.document into d from public.v2_content_items i join public.v2_content_item_revisions r on r.item_id=i.id and r.revision=i.draft_revision
  where i.id=p_item_id and i.draft_revision=p_revision and not i.deleted;
  if d is null or not exists(select 1 from jsonb_array_elements(d->'targets') t where t->>'batchId'=p_batch_id::text) then raise exception 'Preview revision unavailable' using errcode='40001';end if;
 end if;
 select jsonb_build_object('batchId',b.id,'publicationRevision',p.revision,'batchRevision',p.batch_revision,'title',p.document->>'title','productCode',b.product_code,'sessions',coalesce(r.document->'sessions','[]')) into c
 from public.v2_course_batches b join lateral(select * from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1)p on p.document->>'state'='published'
 join public.v2_course_batch_revisions r on r.batch_id=b.id and r.revision=p.batch_revision where b.id=p_batch_id;
 if c is null then raise exception 'Published course unavailable' using errcode='22023';end if;
 c:=public.v2_compose_content(c,p_item_id,p_revision);
 return jsonb_build_object('course',c,'placements',public.v2_content_placements(c,p_item_id,p_revision));
end;$$;
commit;
