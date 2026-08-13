begin;

-- This function exists only as the materials-table trigger target. It does not
-- need to be callable through the Data API by signed-out or signed-in users.
-- Revoke direct grants as well as the default PUBLIC grant because the staging
-- project carries an explicit anon EXECUTE grant from its historical defaults.
revoke all on function public.enforce_batch_session_material()
from public, anon, authenticated;

commit;
