# Batch scheduling design brief

Prepared with the installed Google Labs Stitch `enhance-prompt` guidance. This is a source-informed brief, not a Stitch-generated screen. The Stitch MCP service is not configured in the current environment.

## Purpose

A desktop-first Admin form lets a nontechnical administrator name a live cohort and schedule its existing course classes. Class names come from the published curriculum. Only live classes receive dates. Introductory and concluding reading pages, recordings and materials stay linked to the course.

## Page structure

1. **Context:** Existing Admin navigation, an All batches return action and the Create a live batch heading.
2. **Batch details:** A batch-name field and subject selection in one short group. Existing subject-change confirmation protects entered dates.
3. **Schedule:** Prefilled class titles remain visible beside labeled date, start-time and duration controls. A quiet progress indicator reports classes with dates; it does not imply that all other validation has passed. The timezone remains explicit.
4. **Secondary actions:** Removal is available on every class, with Undo. An extra-class action remains below the curriculum. Naming inputs appear only for additional classes.
5. **Save:** One primary Save batch draft action remains accessible at the bottom. Copy explains that review and publication follow saving. Interrupted-save recovery remains unchanged.

## Interaction requirements

- Existing calendar, keyboard focus and accessible input labels remain intact.
- Titles wrap without obscuring scheduling controls.
- Empty curriculum, recovered edits and save failures retain actionable states.
- Destructive actions remain visually secondary and reversible where supported.
- No marketing graphics, extra dashboard metrics, new dependencies or artificial progress steps are required.

## Design-system context

The existing application uses white editing surfaces, muted green accents, dark readable text, restrained borders and visible focus rings. The refinement retains those established tokens. If generation is later performed in Stitch, those tokens belong in the project design system rather than being duplicated in the generation prompt.

## Undo and recovery refinement

Date fields expose Clear date. New-batch scheduling retains up to 30 recent field edits in memory for Undo last change; unrelated structural changes clear that history. Undo history is not retained across reloads, while the current edited values remain recoverable through the existing tab-scoped storage.

The shared recovery component presents Restore edits and Start fresh, with Keep edits / Discard edits confirmation before deleting the recovery copy. The new-batch form is hidden while that choice is pending. Other editors retain their existing blocked-input behavior. Recovery remains scoped to the signed-in account and current tab; no automatic server save or publication is introduced.

Local verification includes ten batch/calendar browser journeys, plus the shared worksheet/meeting/publication recovery journey. ESLint and TypeScript passed. Screenshots were reviewed with synthetic accounts; no hosted acceptance or deployment is claimed. The final new-batch recovery visibility adjustment is covered by a focused repeat of the recovery and interrupted-save journeys.

## Component reference refinement

The batch form and shared recovery panel adapt the official shadcn Item and Field composition patterns to the existing CSS-module implementation. No shadcn runtime or Tailwind migration is introduced. Class groups use compact outlined rows, visible sequence numbers, aligned labeled controls and secondary removal buttons with accessible names. Recovery uses a restrained neutral surface and consistent primary/outline actions. Existing save, undo, restoration and discard behavior remains intact.

References: https://ui.shadcn.com/docs/components/item and https://ui.shadcn.com/docs/components/field. The shadcn MCP supplied the official `item-demo` and `field-demo` examples and audit checklist.

The component refinement passed eight focused browser journeys, including a seven-class long-title layout with automated WCAG checks, date undo, recovery, and curriculum saves. The screenshot review identified an overlapping sticky Save bar; the final layout places saving below the list. The seven-class browser check passed again after that correction. ESLint, TypeScript and whitespace checks passed. Local login returned HTTP 200. Preview deployment and hosted verification remain separate.
