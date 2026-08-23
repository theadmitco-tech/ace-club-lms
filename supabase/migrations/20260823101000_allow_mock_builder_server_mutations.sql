begin;

-- Mock Builder mutations are performed only by server routes after an active
-- Admin check. Keep browser roles read-only and grant the server client only
-- the operations used by create/save/publish/assign.
grant insert, update on table public.mock_assessments to service_role;
grant insert on table public.mock_assessment_sections to service_role;
grant insert, delete on table public.mock_assessment_items to service_role;
grant insert on table public.mock_assessment_versions to service_role;
grant insert on table public.mock_assessment_assignments to service_role;
grant insert on table public.mock_assessment_audit to service_role;

commit;
