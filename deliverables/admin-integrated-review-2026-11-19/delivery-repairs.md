# Delivery workflow repairs

The publication review now explains the feedback-session confirmation required after publishing and republishing, including meeting-only changes. A successful live-batch publication offers **Set up class completion**, opening the mapping section directly. Unpublishing removes that next-step link.

Legacy batches with no suitable published sessions receive **Add a course session**, followed by explicit save, publish and mapping instructions. The publication review also identifies the missing-session condition before confirmation. Existing mapping permissions, publication-revision checks and explicit confirmation remain unchanged; no session mappings are created automatically.

The original audit remains unchanged in `delivery-workflow.md` and `delivery-evidence.json`.

## Verification

- One focused Chromium publication lifecycle passed: first publication guidance, republication warning, exact next-step destination, removal of stale guidance on review, and no completion link after unpublication. The shared publication panel ran inside the existing older-workspace fixture with synthetic server responses.
- Three actual component/page render tests passed: empty or wrong-subject outlines show a recovery link instead of an empty select; prior-publication mappings are not silently reused; the setup link opens the mapping details while an ordinary live-page visit stays compact. Admin authorization remained invoked. The test is included in `verify-v2-phase4.mjs` for CI execution.
- Ten connected database assertions passed using the **exact template request captured from the repaired batch-creation browser journey**. That request contained two classes with identical visible titles and four distinct session/event identities. The request was saved and replayed without duplication, then continued through actual database batch review/save, enrollment, resource preparation, publication, manual mapping, completion and Student feedback.
- All four resource types were added to the unpublished draft; Student delivery remained unavailable until publication. The publication delivered both sessions and the prepared resources. Completion remained denied before explicit mapping. Both classes then completed with distinct obligations; the first response resolved only its session, and the second completed the journey. Missed-class responses supplied no ratings or invented attendance.

The publication screenshot was inspected: the next-step explanation and missing-session recovery link are visible and wrap within the review column. The screenshot is retained privately. This is agent inspection, not human usability approval.

## Evidence and reproduction

`delivery-repairs.json` contains the captured synthetic template request, its original file hash, complete replay runner and hash, the 23 applied migration hashes, owned-source hashes, browser results, commands and limitations. The database replay can be reconstructed from that file from the repository root:

```sh
node --input-type=module -e "import fs from 'node:fs'; const e=JSON.parse(fs.readFileSync('deliverables/admin-integrated-review-2026-11-19/delivery-repairs.json','utf8')); fs.writeFileSync('/tmp/ace-delivery-repair-database.mjs',e.database.runnerSource); fs.writeFileSync('/tmp/ace-delivery-repair-input.json',JSON.stringify(e.database.capturedRequest));"
node /tmp/ace-delivery-repair-database.mjs /tmp/ace-delivery-repair-input.json
node scripts/v2-live-mapping-guidance.test.mjs
```

The reconstructed JSON has equivalent content but different serialization from the originally captured file, so its file hash may differ. The original capture hash remains separately recorded.

The browser capture and database replay are connected by the exact request document, but were separate executions. They do not establish a single authenticated browser-to-database session or hosted provider acceptance. No application database migration, hosted account, payment configuration or Production setting changed. A first harness run incorrectly supplied `events: null` for an existing batch edit; the corrected harness sends the saved event fields. The final replay passed all ten assertions.
