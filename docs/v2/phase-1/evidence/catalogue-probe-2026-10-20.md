# Phase 1 catalogue probe — 20 October 2026

Status: Catalogue unavailable through the staging API; Phase 1 acceptance pending.

The manual tester supplied a browser-console screenshot from the exact Preview
previously mapped to application commit `3207cba41b0561ef78c0adf5a44302d753d48bdb`:
`https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app/admin`.
The [probe](../../../../scripts/v2-staging-catalogue-probe.browser.js) version is
`4ae6081d0b6d391e31dcc2f2617a00be7fd8d1f7`. The observed GET request targeted
`eyphkkginlgoaxflauog.supabase.co/rest/v1/v2_products`, the documented staging project.

## Observed result

```json
{
  "check": "phase1_public_catalogue",
  "catalogue": "PGRST205",
  "quote": "NOT_RUN",
  "catalogue_http": 404,
  "result": "CATALOGUE_UNAVAILABLE"
}
```

The browser ran the probe; the development agent did not independently execute
the hosted request. Only sanitized output is retained. The screenshot, keys,
request headers, account identifiers and session information are excluded.

## Interpretation

- Verified from the supplied output: the API did not resolve `v2_products` for
  this request. The price RPC was not called, so its presence and behavior remain
  unknown.
- [PostgREST documents PGRST205](https://docs.postgrest.org/en/stable/references/errors.html#group-2-schema-cache)
  as HTTP 404 for a table not found in the API schema cache.
- A missing Phase 1 migration is a plausible cause, not an established database
  fact. Stale schema metadata or API exposure configuration also require inspection.
- Successful existing Admin/Student navigation does not establish V2 schema
  availability. The Phase 1 catalogue and grants are separate from legacy data.
- The probe made read-only requests and stopped at the failed catalogue read.
  No migration, grant or fixture write was attempted.

## Next action and boundary

Available access was confirmed as Preview website only. Staging dashboard/SQL
access is not available through the tester's current access. An authorized staging
operator must inspect the existence of `public.v2_products`, related V2
tables/functions and the actual migration ledger before selecting a fix.
Do not infer that all migration
objects are absent, apply the migration blindly, weaken RLS, or refresh the schema
cache without determining the database state.

Alternatively, obtain staging-only database access through the normal invitation
process. No credential sharing is required. The proposed migration
remains [20261018090000_add_v2_product_entitlements.sql](../../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql),
SHA-256 `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
Any application or configuration change requires the existing separate staging
approval; this diagnostic result is not migration or release approval.
