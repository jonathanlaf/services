# Services

PC and Mac technician site, served at https://services.jonathanlafleur.ca (GitHub Pages, no build step).
French at `/`, English at `/en/`. Rules and layout: see `AGENTS.md`.

## Change a price

Edit `shared/tarifs.json` (both `fr` and `en` text), then run `python3 .githooks/check-i18n.py`.

## Run locally

    python3 -m http.server 8765    # then open http://localhost:8765/
    python3 -m unittest discover tests

Enable the pre-commit check once per clone: `git config core.hooksPath .githooks`.

## Booking form

Create a free Formspree form with fields named `name` (text, optional, max 100),
`email` (email, required, max 254), `message` (text, optional, max 2000),
`phone` (text, optional, max 40), `location` (text, optional: workshop/home/remote),
and `contact_time` (text, optional: day/evening).
Set and verify the recipient in Formspree. Put only its public
`https://formspree.io/f/...` endpoint in `shared/formulaire.json`.
Never put an email-service password or API secret in this static site.

Until the endpoint is configured, the form shows the existing contact alternatives
and keeps sending disabled. Submission errors retain the entered fields; successful
submissions preserve and lock them to prevent duplicate requests. A submission is a request, not a confirmed appointment.

For delivery checks, submit one real request, confirm it appears in the Formspree
dashboard, and check the receiving mailbox and spam folder. Inbox placement cannot
be guaranteed. The free plan currently allows 50 submissions per month; monitor
usage in Formspree. No files or automatic confirmation emails are used.

The form includes Formspree’s standard `_gotcha` honeypot. It stays in the submitted
FormData and is checked by Formspree, not just JavaScript. Keep it hidden and out
of keyboard navigation. It is excluded from visible-field validation.
