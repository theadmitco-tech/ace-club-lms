-- Staging metadata-only diagnosis; no application rows or backend sessions are changed.
-- The dashboard project must be eyphkkginlgoaxflauog.
rollback;
begin read only;
set local statement_timeout='10s';
select jsonb_build_object(
 'check','phase5_publishing_request_diagnostics',
 'runId','93a9ab13-1986-4124-9370-ea86b4355823',
 'onlyRecordedQaContent',not exists(select 1 from public.v2_content_items where id<>all(array['1b8f1049-d23e-4590-9ed8-9750e5671dee'::uuid,'9e541beb-2d4b-46a0-bff6-c8dbe8e23aae'::uuid,'6fc88c01-ef99-44c2-be0c-6f0184e63fff'::uuid,'8893680f-3da0-4c4d-ab74-d82ac16a0945'::uuid,'c5a8ff27-8a75-4a5f-a138-53bdfeffe571'::uuid,'b7bf5640-27c4-421b-9195-40155cb513fd'::uuid,'ecd3079a-8503-4602-92ff-c08cc2ee6599'::uuid,'84f003e4-6f3d-4a02-8713-e56004876818'::uuid]))
  and not exists(select 1 from public.v2_content_item_revisions where actor_id<>'a260283f-eb26-467a-b991-e804272b69f2'::uuid),
 'candidateBackends',(select coalesce(jsonb_agg(jsonb_build_object(
  'pid',pid,'backendStart',backend_start,'queryStart',query_start,'state',state,
  'elapsedSeconds',extract(epoch from clock_timestamp()-query_start)::integer,
  'waitType',wait_event_type,'waitEvent',wait_event) order by query_start),'[]'::jsonb)
 from pg_stat_activity where usename='authenticator' and pid<>pg_backend_pid()
  and query ilike '%publish_v2_content_item%'
  and query_start>='2026-11-03T10:28:14.868Z'::timestamptz
  and query_start<clock_timestamp()-interval '60 seconds')
);
rollback;
