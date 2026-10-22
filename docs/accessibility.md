# Accessibility review — 2026-10-22

Target: WCAG 2.2 AA. This is an implementation review, not a certification.

## Verification

- Rendered Chrome checks with axe-core 4.10.3: WCAG A/AA and best-practice rules.
- French and English, light and dark themes, desktop and 320 CSS-pixel reflow.
- Keyboard focus, skip links, local navigation and external-link announcements.
- Reduced-motion and Windows forced-colour emulation.
- Text enlargement and visible focus indicators.

External HTTP(S) links open a new tab with noopener/noreferrer. A localized
description announces that behaviour without replacing the link's name.
Internal navigation and phone/email links keep their normal behaviour.

Automated checks do not establish full accessibility. A hands-on review with
NVDA/Firefox or VoiceOver/Safari, including pronunciation and reading order,
remains useful. Real email delivery is separate from browser form tests.

## Services-specific coverage

All four routes were checked, including English booking. Existing 30 Python tests
and the bilingual-content validator pass. Invalid submissions focus the first
field and expose a localized, associated error. A simulated successful send keeps
and locks field values and focuses the confirmation; no test email was sent.
The preference panel supports Escape and does not close over keyboard focus.
The largest built-in text size was checked at 320 CSS pixels.
