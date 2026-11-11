# Student access panel

The Admin student detail panel groups Quant, Verbal and DI libraries separately from live batches. The combined Full Course learning library is omitted from this management list. Existing purchases, enrollments and stored course titles remain unchanged; historical purchase names remain visible in purchase history. Actual live batches retain their enrollment and registration routes, including existing combined-product live batches. No library is relabeled as a live batch.

The revised panel uses compact status labels, named regions, ordered subject libraries, distinct accessible link names, visible keyboard focus and actions at least 44 pixels high. Mobile actions wrap without horizontal overflow. Cards retain their natural height. Empty groups and unavailable records have separate states; errors do not imply missing access. Enrollment and live registration continue to require active course access.

Validation passed 14 isolated Admin browser journeys, including new library/live grouping, route preservation, mobile accessibility, keyboard navigation, empty data and unavailable-record cases. Focused ESLint and an isolated webpack build including TypeScript passed. The build excludes unrelated Student landing edits. The report hashes identify the tested source.

The browser harness substitutes synthetic server data and does not establish new hosted authorization acceptance. Synthetic desktop and mobile screenshots were visually reviewed and contain no embedded text or EXIF metadata. No PDFs or archived patches were generated. Database records, applied migrations, Production and PR readiness remain unchanged. Preview publication awaits the branch push.
