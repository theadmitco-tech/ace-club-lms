# Reversible resource locations

The resource-location editor uses one searchable checklist. Selected destinations remain interactive and can be removed by unchecking. Optional order, reading placement and recording-anchor controls are collapsed within each selected row. Nested selection panels and the separate hidden placement-removal control were replaced.

Unchecking and rechecking during one editing session restores the target metadata, including replacement identity, order and recording anchor. Cancel and Escape discard staged location changes. Apply updates the editor draft; publication retains its existing review boundary. An empty selection explains the requirement for a location. Saved resources without other unsaved edits offer Review removal everywhere, leading to the existing deletion review rather than immediate deletion. New resources and unsaved edits receive contextual recovery guidance.

The official shadcn MCP was configured and connected, and its checkbox/command registry items were inspected. The checkbox and search patterns informed the design; the implementation uses the existing React Aria checkbox and project CSS instead of adding a second component foundation. References: https://ui.shadcn.com/docs/components/radix/checkbox and https://ui.shadcn.com/docs/components/base/combobox.

## Verification

The full synthetic browser run recorded 47 passing journeys and two test-selector failures. The focused rerun corrected the selectors and passed all four location journeys. Together, the reports establish 49 distinct passing journeys against identical UI source hashes. Earlier selector failures remain visible in the regression report. Tests cover saved-target removal, metadata restoration, keyboard unchecking, last-location deletion review and cancellation, search, Escape, source-order preservation, publication, and existing content flows. Automated accessibility checks, TypeScript and targeted ESLint passed. Desktop and narrow captures were visually reviewed.

The fixture substitutes server responses and does not establish hosted authorization acceptance. No staging content was modified and no deployment was performed. The persistent interaction rule is recorded in docs/v2/admin-ui-principles.md.
