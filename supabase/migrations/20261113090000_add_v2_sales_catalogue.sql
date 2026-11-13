-- Public sales metadata projects only the latest published course revision.
-- Private materials, meetings, rosters and draft documents remain inaccessible.
begin;

create or replace function public.list_v2_sales_catalogue()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId', b.id,
    'publicationRevision', pub.revision,
    'productCode', b.product_code,
    'entitlementProductCode', p.code,
    'title', pub.document->>'title',
    'sections', to_jsonb(p.sections),
    'timeZone', 'Asia/Kolkata',
    'accessMonths', 6,
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
      'key', item->>'key', 'title', item->>'title', 'section', item->>'section'
    ) order by n) from jsonb_array_elements(coalesce(pub.document->'sessions','[]')) with ordinality s(item,n)), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'key', item->>'key', 'title', item->>'title', 'section', item->>'section',
      'kind', item->>'kind', 'startsAt', item->>'startsAt', 'endsAt', item->>'endsAt'
    ) order by n) from jsonb_array_elements(coalesce(pub.document->'events','[]')) with ordinality e(item,n)
      where item->>'kind'='live'), '[]'::jsonb)
  ) order by b.product_code, pub.document->>'title', b.id), '[]'::jsonb)
  from public.v2_course_batches b
  join lateral (
    select r.revision, r.document from public.v2_batch_publication_revisions r
    where r.batch_id=b.id order by r.revision desc limit 1
  ) pub on pub.document->>'state'='published'
  join public.v2_products p on p.code=public.v2_entitlement_product_code(b.product_code)
    and p.available_for_purchase;
$$;

revoke all on function public.list_v2_sales_catalogue() from public, anon, authenticated, service_role;
grant execute on function public.list_v2_sales_catalogue() to anon, authenticated;
commit;
