# Admin navigation refinement

The redesigned Admin workflow opens directly into Quant sessions. Quant, Verbal and DI remain the three subject choices. A compact subject switcher replaces the large course cards and separate library-selection step. Multiple published libraries within a subject remain selectable when present.

The session outline supports desktop search and numbered navigation, with a native session selector on smaller screens. Returning from resource editing preserves the selected subject, session and content view. Resource groups retain the pre-class read, recording, post-class read and worksheet order. Smaller headings, consistent line icons, fewer nested borders and shorter controls reduce visual clutter. The redundant Course content breadcrumb is omitted on the content landing page.

Full Course is excluded from the redesigned course browser, new placement choices, template choices, batch lists, new batch templates and multi-offering publication choices. Existing records, purchases, entitlements and server authorization remain unchanged. Existing resource placements and reviewed publication effects retain their actual course names; those records are not silently renamed, removed or transferred. Previously saved draft recovery and direct maintenance links remain available for existing records. The earlier template interface retains its behavior when the redesigned workflow is disabled.

## Validation

- The 28 Phase 2 local suites passed all 278 checks.
- The resource-order and Student-access guard suites passed.
- The content browser fixture passed 13 journeys, including subject switching, retained session selection, mobile selection, draft ordering, publication review, failed saves and conflict recovery.
- The Admin workflow fixture passed 11 journeys, including subject-only template and publishing choices, scheduling, navigation and Student access presentation.
- The inherited browser fixture passed 43 journeys across editing, scheduling, publication, recovery and Student delivery.
- Lint, TypeScript and webpack build passed. No migration or deployment configuration was edited.

The reports identify their source hashes and the preceding Git commit. Browser fixtures use synthetic identities, content and server responses. They do not establish hosted database acceptance. The content fixture substitutes its Auth context; the inherited fixture removes the external font import for isolated testing. Screenshots contain synthetic records and were visually inspected at desktop and mobile widths. No PDF was generated or changed.

Initial attempts encountered sandbox restrictions on local servers and child processes. Elevated local verification resolved those environment limitations. The first mobile check exposed an ambiguous session label; the final selector has an explicit accessible name and passed its rerun. Template page tests were updated for the existing content-workflow feature dependency.

Publication is limited to the Admin Preview branch. Push, remote CI and hosted verification are separate from the local evidence in this directory. Production, database contents and PR readiness remain outside this change.
