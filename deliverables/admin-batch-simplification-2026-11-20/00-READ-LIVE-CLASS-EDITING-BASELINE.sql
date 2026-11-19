-- Read-only preflight evidence. Output remains outside version control when it contains environment metadata.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object(
 'readOnly',current_setting('transaction_read_only'),
 'publicTableCount',(select count(*) from pg_class where relnamespace='public'::regnamespace and relkind in('r','p')),
 'publicTables',(select jsonb_agg(relname order by relname) from pg_class where relnamespace='public'::regnamespace and relkind in('r','p')),
 'migrationLedger',(select jsonb_agg(jsonb_build_object('version',version,'name',name,'statementsMd5',md5(statements::text)) order by version) from supabase_migrations.schema_migrations),
 'reviewedFunctions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'sourceMd5',md5(p.prosrc),'definition',pg_get_functiondef(p.oid),
   'acl',p.proacl::text,'owner',p.proowner,'configuration',p.proconfig,'securityDefiner',p.prosecdef,'volatility',p.provolatile) order by p.oid::regprocedure::text)
   from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in('assert_v2_batch_request','build_v2_batch_draft','build_v2_batch_publication','assert_v2_completed_class_preservation'))
);
commit;
