# Simplified student access

The student detail page displays one access list at a time through Subject libraries and Live batches tabs. The course purchase summary keeps product, status and expiry visible; confirmation dates and renewal guidance expand under Details. Redundant descriptions, section counts and repeated headings were removed. Secondary student tools remain collapsed. Existing enrollment and live-registration destinations remain separate and unchanged.

React Aria tabs provide keyboard navigation and selected-panel semantics. Server components retain authorization and access reads; the client wrapper receives rendered panels. No backend, staging records or deployment settings changed.

Seven targeted journeys passed in the production-built synthetic fixture. Coverage includes keyboard tab switching, purchase disclosure, accessible actions, narrow layouts, independent enrollment/registration destinations, empty groups, expired purchases and unavailable records. Automated accessibility checks, TypeScript and targeted ESLint passed. The desktop library/live panels and narrow library panel were visually reviewed. The report records tested source hashes; synthetic adapters do not establish hosted database authorization.

These captures supersede the earlier access-layout-refinement screenshots. This change is local and has not been deployed.
