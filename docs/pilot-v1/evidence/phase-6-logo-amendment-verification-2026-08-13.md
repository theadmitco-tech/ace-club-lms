# Pilot V1 Phase 6 — Logo Amendment Verification

Date: 13 August 2026
Environment: Local automated/browser checks and staging-backed immutable Vercel Preview
Scope: Product Owner shared-logo amendment before Phase 7 acceptance

## Implementation

- Added the supplied `public/5.svg` dark treatment and `public/6.svg` light treatment as local assets.
- Added one shared `BrandLogo` component using the Next.js 16 image component with fixed intrinsic dimensions and no remote dependency.
- Public navigation and Student header use the light treatment.
- Login and Admin sidebar use the dark treatment.
- Temporary visible letter/text marks were removed. Interactive brand links retain explicit accessible names; non-interactive brand images have useful alternative text; login retains a visually hidden semantic `h1`.

## Automated result

| Gate | Result |
|---|---|
| `git diff --check` | Pass |
| Targeted ESLint for logo-touched TS/TSX | Pass with zero findings |
| `npx tsc --noEmit` | Pass |
| Next.js 16.2.4 Production build | Pass |
| Repository-wide ESLint | 22 errors and 2 warnings in untouched legacy files; one previous landing-page warning is resolved |

## Browser result

The local public and login routes were checked at 1440×900, 1024×768 and 390×844.

- Both routes loaded meaningful content with no framework error overlay or browser page error.
- Public navigation exposed one light logo with intrinsic 500×500 geometry, an `Ace Club home` link name and no logo-caused overflow.
- Login exposed one dark logo with useful alternative text, retained the `Ace Club` level-one heading and had no horizontal overflow.
- Both SVGs retained square aspect ratio and the supplied artwork was neither stretched nor clipped by its crop container.
- At 390px, the logo treatments remained legible and did not crowd the visible public Apply/Login actions or the login card.

The public page retains a pre-existing narrow-viewport curriculum-table overflow below the logo and hero. The logo is not an offending element; supported desktop width 1024px has no overflow. This amendment does not claim that unrelated landing-page behavior is resolved.

## Remaining manual item

The authenticated Student header and Admin sidebar require signed-in Phase 7 review at supported desktop widths and 200% text zoom. Those checks are explicit and unchecked in `docs/pilot-v1/manual-verification-checklist.md`.

## Preview result

Application commit `f822f17` deployed successfully to the immutable staging-backed Preview at `https://ace-club-lkcss1i2m-theadmitco-techs-projects.vercel.app`. The Vercel GitHub deployment reported success, and the repository Preview guard confirmed staging configuration without exposing variable values.

## Boundary

This is presentation-only evidence. No database, storage, identity, staging fixture or Production state was changed.
