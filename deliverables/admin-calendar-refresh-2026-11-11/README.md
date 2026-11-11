# Admin scheduling calendar

The batch date control uses React DayPicker 9.14.0 with an integrated calendar trigger. The dialog provides month/year selection, Today/Tomorrow shortcuts, scheduled-class markers, an agenda and optional time suggestions. Date typing remains available. Dates use India Standard Time with a supported range of 2000–2099.

Calendar selection remains temporary until confirmation. Cancel, Close and Escape discard temporary changes and restore focus. Confirmation updates the form; the existing draft review/save and publication steps remain separate. The layout adapts to mobile, exposes visible keyboard focus and respects reduced-motion preferences.

## Component research

[React DayPicker accessibility guidance](https://daypicker.dev/v9/guides/accessibility) and [styling guidance](https://daypicker.dev/v9/docs/styling) informed the implementation. [React Aria DatePicker](https://react-aria.adobe.com/DatePicker) was also reviewed. DayPicker was selected for its keyboard navigation, controlled selection and adaptable calendar layout within the existing form.

## Verification

- All 21 local browser journeys passed using actual components and synthetic server adapters. Coverage includes keyboard selection, cancellation, focus restoration, leap-day navigation, mobile automated accessibility checks, no horizontal overflow and IST Today/Tomorrow behavior from a browser in another time zone.
- Focused ESLint checks and an isolated webpack build passed. The build used the committed baseline plus only the calendar component, styles and dependency manifests; unrelated Student work was excluded.
- The browser report records every source hash, including the existing working-tree components used by the harness. The separate source inventory identifies the calendar and dependency files checked against the isolated build.
- Desktop and mobile screenshots show synthetic class data. Image metadata was checked for embedded text and EXIF data.
- No advisories were reported for the newly added dependency tree in the local audit. The overall repository audit still reports existing advisories; this is not a clean repository-wide audit claim.

These results are local verification, not hosted acceptance. Preview deployment remains pending publication. No database, payment, Production or PR readiness changes form part of this update.
