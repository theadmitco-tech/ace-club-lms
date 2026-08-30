# Worksheet count and course selection Production release

Date: 2026-08-30

## Release identity

- Frozen source commit: `0cac27e2c41097758c30bc8c083b43ba190363d5`
- Production Supabase project: `owmlxsnzogfapotmjrqk`
- New Vercel deployment: `dpl_9zmW6EnnAgUZ1otbvB4a2WSKUB3a`
- New immutable URL: `https://ace-club-jg2naehix-theadmitco-techs-projects.vercel.app`
- Production alias: `https://aceclub.theadmitco.com`
- Tier 1 rollback deployment: `dpl_DzZC5inr3jposbbgtkRc8WcPkeVm`

## Recovery snapshot

- Encrypted artifact: `/Users/tanishagarg/Documents/ChatGPT/Bugs/.production-recovery/ace-club-production-pre-course-selection-20260830-0cac27e.tar.gz.enc`
- Encryption: AES-256-CBC with PBKDF2, 200,000 iterations
- Encrypted SHA-256: `8e2537da85f51d9a3dcd741e80c398a4e1de2c85e5f634970e43521b17af1fb3`
- Size: 13,536 bytes
- Passphrase location: macOS Keychain service `Ace Club LMS Production recovery 20260830 0cac27e`
- Encryption round-trip and archive listing verified.
- Temporary plaintext was deleted after verification.

## Database release

The following hash-pinned migrations were applied to Production and the ledger was aligned to the exact repository versions:

| Version | Migration | SHA-256 |
| --- | --- | --- |
| `20260830112501` | `add_template_worksheet_question_count` | `d7e1bfc23e8637d96329e1f7db3ac6b43630943e2f142f4c6e0ff0e80fdcab2f` |
| `20260830133000` | `add_student_course_selection` | `65441dfcff5c0cff19aae5c1bb1bfdc18778772b85b3da53d4071dfe7e7f53e3` |
| `20260830133001` | `fix_template_worksheet_question_count_trigger_order` | `52b9ebf2048ae628332d8788f62ca38ceb2951f0d820dbf51acdfd95f0ae053a` |

Post-migration acceptance:

- `course_template_resources.question_count` exists with the positive worksheet-only constraint.
- `set_template_resource_question_count` exists and the old trigger name is absent.
- `student_course_preferences` has RLS enabled and no direct `public`, `anon`, or `authenticated` table grants.
- `get_student_course_options` and `select_student_course` are executable only by authenticated users.
- `resolve_student_course_id` has no direct authenticated execute grant.
- Preference rows: 0.
- Active-student resolver differences from the previous latest-enrollment default: 0.
- Baseline counts remained unchanged: 19 profiles, 3 courses, 42 sessions, 88 materials, 18 enrollments, 5,376 question-log rows, and 91 template resources.
- Supabase advisors returned no errors. New relevant notices were expected informational/warning findings for the intentionally guarded security-definer RPCs, RLS-with-no-policy table, and an unindexed preference foreign key.

## Application deployment and smoke

- Vercel status: READY, target Production, alias assigned.
- Production environment validation passed and confirmed environment URL separation.
- Next.js 16.2.4 build compiled successfully.
- TypeScript passed.
- Static generation passed: 53/53 pages.
- Build completed without errors.
- Anonymous route smoke:
  - `/`: 200
  - `/login`: 200
  - `/courses`: 307 to `/login`
  - `/dashboard`: 307 to `/login`
  - `/practice`: 307 to `/login`
  - `/admin/templates`: 307 to `/login`
- Runtime log scan after smoke: no logs/errors found.

## Pending final check

- Authenticated Production acceptance is paused at the Google account chooser pending action-time confirmation to transmit the selected test account identity to Production Supabase authentication.
- No rollback threshold has been observed.
