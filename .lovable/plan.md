# Policy pages, footer, and certificate gating

Two pieces of work: the legal/policy surface with proper www.aceedx.com branding, and making certificates something you actually have to earn.

## 1. Policy pages

Five new public pages, each with its own SEO metadata and a shared readable layout:

- `/refund-policy` — refunds for paid courses and webinars, cancellation window, how a refund is processed, non-refundable cases (certificate issued, course substantially completed).
- `/terms` — account rules, acceptable use, content ownership, certificate validity, payment terms, governing law (India).
- `/privacy-policy` — what data is collected (profile, learning progress, payments), how it's used, storage, third parties (payments, email), user rights, DPDP Act 2023 alignment.
- `/cookie-policy` — essential vs analytics cookies, session storage, how to control them.
- `/disclaimer` — educational content is guidance, not legal/regulatory advice; policy references (NEP 2020, NCF, RTE) are summaries of public documents.

Every page carries the AceEdX contact block with **www.aceedx.com** and the support email, plus a "last updated" date.

## 2. Footer + branding

- Add a third footer column, "Company", linking to About-style items and all five policy pages.
- Show **www.aceedx.com** in the footer bottom bar next to the copyright, linked to the live site.
- Add the website address to the central brand config so the certificate PDF, verification page, and footer all read from one value.

## 3. Certificate gating

Certificates stop being issued on a button press.

**Recorded webinars (free or paid):** pressing "Join webinar" opens the recording inline on the page instead of instantly marking attendance. Watch progress is tracked while the recording plays; the participation certificate is issued only once at least 80% of the runtime has been watched. Until then the page shows a progress bar and "Certificate unlocks at 80% watched".

**Live webinars:** joining opens the meeting link and records a join timestamp. The certificate is issued when the user returns and confirms attendance, but only after the session's scheduled end time has passed — not before.

**Courses:** the certificate already requires all lessons marked complete; this is tightened so document lessons must be opened and scrolled to the end before they can be marked complete, and the "Mark as complete" button stays disabled until the lesson's media has actually been engaged with (video played to near the end, or document scrolled through).

Wherever a certificate is not yet unlocked, the UI states exactly what remains.

## Technical notes

- New route files under `src/routes/` (`refund-policy.tsx`, `terms.tsx`, `privacy-policy.tsx`, `cookie-policy.tsx`, `disclaimer.tsx`) sharing a `PolicyPage` presentation component; each defines its own `head()` with canonical and og tags.
- `src/lib/brand.ts` gains `site: "www.aceedx.com"` / `siteUrl`, consumed by `SiteFooter`, `certificate-pdf.ts`, and the verify page.
- Webinar watch tracking uses the existing `webinar_registrations.attendance_minutes` column, updated periodically from the player's `timeupdate`; certificate insert moves behind the 80% threshold check. No schema change needed.
- Lesson engagement gating is client-side state in the course player plus the existing `lesson_progress` writes; no schema change.
