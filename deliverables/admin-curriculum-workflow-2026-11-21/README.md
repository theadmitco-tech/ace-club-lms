# Curriculum-first batch workflow

The product correction makes saved subject-course sessions the starting point for batch creation. Class names are prefilled; dates and times remain explicit Admin inputs. Course-content editing and publication stay within Course content.

## Source and scope

The supplied timetable describes six Quant sessions, six Verbal sessions and five DI sessions. The subsequent product clarification limits scheduling to live classes. Existing curriculum is reused rather than replaced with a hardcoded copy of the brochure. Fixed before/after reading pages remain in the course library and are not scheduled. An extra-class action supports additional live teaching when needed.

The description above is a paraphrase. Original supplied PDF SHA-256: `7c4981025aeba051024cab4acc3d06a3cf633b3c5fa5239a34062897b87d59c7`.

## Implemented behavior

- Subject selection loads the saved teaching sessions; fixed reading pages are excluded from class dates.
- Multiple course libraries expose a course selector; missing curriculum directs the Admin to Course content.
- The class duration defaults to 120 minutes, matching the approximate duration in the reference, and remains editable.
- Class removal supports Undo. Date and time edits survive interrupted batch saves through the existing recovery mechanism.
- Creating a batch copies selected sessions without modifying the original course library. Published resource overlays are included when the library draft matches its publication.
- Course additions, deletions and reorder reviews open a dedicated course review page. Old library links into Batches redirect there.
- Course draft editing offers session resources without date, meeting or batch-student controls. Course draft and publication recovery are scoped to that course.
- The two fixed reading pages remain visible in the course outline, with Reading material as their only resource section.

## Boundaries

No staging records were mutated during verification. No new migration is required. The local implementation is not a verified hosted deployment. Production and payment configuration are unchanged.

## Verification

- The Admin browser regression passed 36 journeys; one outdated blank-class fixture failed and was corrected.
- The focused follow-up passed all seven journeys, including curriculum creation/publication, combined subjects, missing curriculum, interrupted-save replay, removal/Undo focus and course review.
- Final compact course review and course-scoped recovery were checked in a further passing browser journey.
- All 50 course-content browser regressions passed, including both fixed reading pages, resource editing, session changes and Student rendering.
- The course README, batch authoring and draft recovery local suites passed. The curriculum helper checks passed. TypeScript and optimized synthetic browser builds passed. Repository lint reported no errors; two existing unused-destructuring warnings remain in the batch-authoring test.

Reports retain individual source hashes and run attribution. The runs use synthetic server adapters; they do not establish hosted acceptance.
