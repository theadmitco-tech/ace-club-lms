begin;

-- Package validation permits new founder-supplied topic and subtopic labels.
-- The Admin import route materializes those labels before invoking the atomic
-- import RPC, so its server-only client needs the matching narrow table grant.
grant insert on table public.mock_topics to service_role;

commit;
