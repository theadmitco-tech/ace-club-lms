# Guided live batch creation

Create batch opens a guided setup even when no live template or saved course exists. The workflow offers Quant, Verbal and DI, a batch name, optional copying of saved subject sessions, and independently dated live classes with IST calendar/time controls. Existing source courses remain unchanged. A live-only batch can start without copied learning materials.

The initial review performs no database write. Explicit schedule confirmation saves a new private template through the existing authorized Server Action. The existing batch editor then performs its server preview and explicit draft confirmation. Publication remains a separate reviewed action. The backend requirement that a new batch derives from a saved template is preserved; the interface handles that prerequisite within the batch workflow.

The reviewed template request is retained for retries and tab-scoped recovery. An interrupted confirmation reuses the same identifiers and payload. A saved schedule can remain as a private template if batch creation is abandoned; it is not automatically published or deleted. Existing authorization, revision guards, enrollment rules and payment boundaries remain unchanged.

The batch list has aligned search/status controls, clear empty states and filter reset. Setup uses labeled fields, keyboard focus on review, minimum 44-pixel controls and a responsive single-column mobile layout. The React checklist covered state ownership, stable request identity, native controls, focus, source immutability and unchanged server authorization.

Validation passed 17 isolated Admin browser journeys, including batch creation without a live template, creation without any saved template, exact class dates/times, copied sessions, original-course preservation, required fields, automated mobile accessibility, interrupted-save replay, and existing publication/enrollment regressions. Three existing template-authoring, batch-authoring and draft-recovery test files passed. Focused ESLint and an isolated webpack build including TypeScript passed. The build excludes unrelated local Student landing edits.

The browser harness substitutes synthetic server data and does not establish new hosted authorization or database acceptance. Report hashes identify the tested source. Synthetic screenshots were visually reviewed and contain no text or EXIF metadata. No PDFs or archived patches were generated. No hosted course, registration, migration, Production or PR readiness changes were made. Preview publication awaits the branch push.
