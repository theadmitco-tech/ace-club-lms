# Ace Club — calm study workspace

Status: locally implemented design iteration. No Stitch generation has been run.

## Intent

A quiet workspace for extended study. Use strong reading hierarchy and a small
number of purposeful actions. Avoid streaks, countdowns, gamified progress,
animated decoration, busy gradients, or low-contrast text intended to look soft.
The design aims to reduce distraction; comfort still requires learner feedback.

## Visual rules

- Warm neutral canvas `#f6f7f3`, white content surfaces, dark ink `#24352f`.
- Primary forest green `#205848`; supporting text `#58685f`; restrained borders.
- System sans-serif; body 15px. Reading copy 18px/1.75, at most 65ch.
- Optional larger reading copy 21px/1.8. Never lock page zoom or user spacing.
- A clear 28–34px page title; 19–23px section titles. Labels remain secondary.
- Underline subject navigation; green filled buttons identify the main action.
- Clear keyboard focus, comfortable button targets, restrained status colors.
- Text and labels explain status; color is never the only indication.

## Page hierarchy

My learning: subject navigation → one topic to open → all available sessions.
The outline is guidance, never a prerequisite lock.

Session: Prepare → Watch → Practise → Recap. These are navigation anchors, not
required steps. Keep a readable main column and quieter live/access/feedback
context. Focus mode hides navigation and context panels but retains the current
lesson and any required feedback action. Escape/Exit focus restores navigation.

Admin: use the same visual vocabulary with explicit draft state, content preview,
independent schedule and deliberate publication confirmation. Do not use focus
mode to hide publication scope, required confirmation or audit information.

Review-only scenario switches and simulations remain clearly marked and separate
from the proposed student interface. No visual control grants access, marks a
recording watched or records feedback. The named simulation controls remain
explicitly fictional.

## Preserve when refining in Stitch

Full Course = Quant + Verbal + DI; each is also a complete individual offering.
Sessions retain materials, recordings and meaningful pre/post reads. Live classes
alone need dates. Students only see entitled content and their enrolled batch.
Keep published/unpaid/expired boundaries; same-subject feedback locks; current
session access; valid non-attendance; verified confirmation; independent
pre/post titles; private Meet information; scoped publication; audited overrides.
Do not decide watched threshold, simultaneous obligations or reversal effects.

Start with the My learning, Session/reading, Admin editor and publication screens.
Refine one coherent direction, then apply it to all 23 scenario states.

## Accessibility references

Readable line measure and adjustable presentation informed the reading surface:
[W3C visual presentation](https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html).
The prototype also checks a user text-spacing override without horizontal overflow:
[W3C text spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html).
These limited checks do not establish full WCAG conformance.
