# V2 conditional Production release plan

Updated: 2026-11-14 (Asia/Kolkata). State: **blocked; execution not authorized**.

## Candidate and targets

| Item | Recorded value |
| --- | --- |
| Preparation source baseline | `c593d2de13c563b72adbaf216cf37ed30a038cc7` |
| Combined source | Phase 3 integration on the current Admin/Student baseline; final hosted candidate pending |
| Observed remote `main` | `940ea7835734a8fb22a6451a30b31084b11d5c97` |
| Approved release candidate | None |
| Vercel project | `ace-club-lms` / `prj_2lW0zANcAnI81eURRZrJTMSCxuLr` |
| Vercel team | `team_QLYbRLmq67A0KhcbXftPVtx8` |
| Production Supabase project | Expected `owmlxsnzogfapotmjrqk`; actual release configuration still requires verification |
| Staging Supabase project | `eyphkkginlgoaxflauog`; excluded from Production builds |
| Expected Production site origin | `https://aceclub.theadmitco.com`; domain assignment must be checked at release time |
| Production branch | `main`, previously confirmed by the operator; connected project metadata omits this setting |
| Observed existing Production deployment | `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`, READY and listed as a rollback candidate |

The existing deployment's source SHA is absent from the connected response. The `main` ref must not be substituted as its provenance. Release engineering must resolve the old artifact's provenance and compatibility before accepting it as a usable rollback target.

## Blocking prerequisites

1. Phase 3 now supplies Razorpay Test Mode implementation and matching installed staging schema. Local tests cover fulfillment, signed callbacks, upgrades and the atomic eight-place batch limit. Actual Test Mode checkout/capture, Google sign-in, duplicate/delayed provider delivery and exact hosted cleanup remain required. Live registration is included in the configured package price. The older Phase 3 draft remains excluded; its migrations must not be applied.
2. Phase 6 must pass the complete combined candidate and obtain explicit Product Owner acceptance. The 14 RPC / 11 browser Phase 6 checks cover bounded conflicts and scoped access, not provider-backed payment acceptance.
3. The current source explicitly rejects Production in `v2Phase1Feature.ts`, `v2TemplateFeature.ts`, `v2LearningFeature.ts` and `v2Checkout.ts`; checkout/provider adapters accept only dedicated Test Mode configuration and exact staging identity. Production flags alone cannot enable V2. A separately reviewed release-enablement change must retain strict environment separation and pass an environment matrix and hosted regressions. This preparation makes no such change.
4. The stacked review branches must be reconciled into an exact candidate against current `main`, with reviewed migrations and no accidental inclusion of private exports, synthetic walkthrough grants, test purchases or QA identities. PR creation or a Draft-to-ready change is not release approval.
5. The Production baseline, backups, restore rehearsal, application rollback compatibility and required live-provider configuration must be verified. No current Production backup or database ledger is available in this evidence packet.

## Environment review

The historical platform observations in this plan must be refreshed before release. The release operator verifies effective Production values privately: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, approved V2 feature flags and separately reviewed Razorpay Live Mode settings. Public and service credentials must refer to the same Production project; secret values and signed URLs remain outside Git and reports. Existing build URL validation is necessary but does not itself verify key ownership.

Metadata inspection found the four Supabase/site variables separately scoped to Production. Legacy `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_WEBHOOK_SECRET` have shared Preview/Production targets. Their values and mode were not inspected, and they were not used or changed. Razorpay V2 requires separately reviewed test/live isolation and a Production-capable adapter; current `V2_RAZORPAY_TEST_*` settings cannot be repurposed as live settings; existing MVP payment behavior must be preserved. A field's presence is not proof that it is correct or safe for a new checkout path.

Production callback URLs, signing secrets, allowed origins, idempotency scope, Auth redirect URLs and private Storage policies require exact-candidate verification. Staging credentials, test webhooks and Preview protection links must not enter a Production build. Production resource references must resolve within the approved Production content/storage boundary, not the staging bucket.

## Database and content review

After the candidate is complete, an authorized operator verifies the Production dashboard project and runs the entire `READ-ONLY-PREFLIGHT.sql` in a new SQL Editor query. Its first statement clears a failed transaction; the inspection transaction is read-only and rolled back. It reads migration/catalogue metadata and one bucket's configuration, not application rows or object paths. A missing ledger/Storage catalogue causes an error and requires inspection; no bootstrap or migration is attempted.

The report cannot prove project identity. SQL fingerprints describe stored definitions; ledger statement MD5 hashes are fingerprints of stored JSON arrays, not the SHA-256 hashes of repository files. Engineering reconciles migration names, stored statements and installed definitions before preparing an exact missing set. A version match alone is insufficient. Existing or drifted versions must never be blindly reapplied or ledger-marked as equivalent.

The 20-file inventory is only the source difference from historically observed `main`; Production may already contain some objects or migrations. The ordered source sequence places the Phase 6 repair before the three November 13 Phase 3 migrations. The three Phase 3 versions already match staging; staging activation is not repeated. In particular, Phase 6 repairs guard exact older routine bodies, so reordering them after Phase 3 can invalidate their assumptions. The final ordered sequence must pass against a fresh Production-equivalent recovery copy, with all legacy migrations and operational schema present. The minimal local preflight test is not that rehearsal.

Course transfer is a separate data operation. The four published staging libraries, 19 imported assets and 33 placements do not establish a Production import or publication. Content operations reviews a Production-specific manifest, source rights, private destinations, current resource availability and per-offering placement. Any import, publication, purchase migration or enrollment change must be named in the release authorization. Existing MVP enrollments do not automatically become new V2 purchases. Staging sample sessions, simulated completions, account-specific grants and private walkthrough packets remain excluded.

## Ordered execution after approval

| Step | Owner role | Required evidence before the next step |
| --- | --- | --- |
| Freeze source | Engineering / QA | Exact SHA, clean tree, migration/content hashes, all CI and hosted gates, Product Owner acceptance |
| Freeze release method | Release operator | Confirmed Production branch, domain/alias mapping and mechanism preventing an unreviewed automatic deployment during merge |
| Capture recovery point | Database operator | Fresh backup and Storage inventory, isolated restore, old-app compatibility, agreed recovery objectives |
| Review preflight | Database operator / Engineering | Correct project, schema/ledger reconciliation, exact missing migration set, unchanged baseline |
| Record authorization | Product Owner | Exact merge/base, migrations, configuration, data operations, deployment, domain assignment, smoke writes and rollback limits |
| Apply approved database/configuration changes | Authorized operators | Reviewed transactional packets, timeouts, preserved legacy rows/ledger and post-change access checks |
| Prepare Production build | Release operator | Approved SHA and Production environment; staged Production artifact without public domain assignment where the selected method supports it |
| Run pre-assignment smoke | QA | Production-configured artifact behavior, authorized fixture-only writes, payments and private resources |
| Assign approved domains | Release operator | Explicit approval for the exact artifact; no rebuild or intervening source/environment change |
| Monitor and hand off | QA / Operations | Smoke results, runtime observations, cleanup receipts and final Product Owner decision |

The exact release method remains unselected. A merge into `main` may trigger Production automatically, so it is itself a release action. Any hold or deployment-check configuration change must be included in the authorization. No merge, CI deployment workflow, branch setting change or domain promotion is executed here.

A Preview build must not be treated as an unchanged Production artifact. Its compiled public environment can differ, and promoting Preview can cause a Production rebuild. The release operator verifies the actual Production-target artifact after its build and before assignment. Official behavior is documented in [Vercel promotion guidance](https://vercel.com/docs/deployments/promoting-a-deployment).
