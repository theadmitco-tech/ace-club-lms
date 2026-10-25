-- PROPOSAL ONLY. First revert consumers to legacy contracts; approval required.
-- No CASCADE: unexpected downstream dependencies must stop rollback.
-- Purchases created through canonical RPCs remain valid in the legacy ledger.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
drop function public.get_my_v2_course_access();
drop function public.can_access_v2_course_product(text,text);
drop function public.grant_v2_course_purchase(uuid,text[],text,timestamptz,uuid,integer,text);
drop function public.quote_v2_course_products(text[]);
drop function public.v2_contract_canonical_code(text);
drop function public.v2_contract_ledger_codes(text[]);
drop view public.v2_canonical_products;
alter table public.v2_products drop constraint v2_products_canonical_code_key, drop column canonical_code;
commit;
