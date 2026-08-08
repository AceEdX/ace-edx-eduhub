# Finish the remaining AceEdX items

Six items are still open. Plan below closes all of them.

## 1. Resource library PDFs — expand to 5+ pages
The 20 documents are live and downloadable but run 2–3 pages. Expand every document with additional sections (implementation timeline, roles and responsibilities, monitoring indicators, compliance checklist, annexures/templates) so each renders at least 5 pages, then regenerate and re-upload to the same `library/<slug>.pdf` paths so existing links keep working.

## 2. Certificate seal — orange star
Replace the round green "Verified Credential" seal with a filled orange star badge, in both the PDF and the on-screen certificate. Update the footer verification text to `www.aceedx.com`.

## 3. Admin-only console
Add a route-level guard on `/admin` so non-admins are redirected away with a clear message instead of seeing the console. The header link is already admin-gated.

## 4. Admin resource management
New "Resources" tab in the admin console: upload a PDF (file picker → storage upload → new row with title, description, category, type, toolkit flag, free/paid), edit those fields inline, and delete a resource (removes the row and the stored file).

## 5. Policy pages + domain
New `/policies` page with anchored sections: Refund & Cancellation, Terms of Service, Privacy Policy, Cookie Policy, Disclaimer, and Contact. Link them from the footer, and show `www.aceedx.com` in the footer branding.

## 6. Certificate gating on actual completion
- Free recorded webinars: pressing "Join webinar" opens the recording inline immediately. The certificate button unlocks only after the recording has been watched (playback time tracked to ~90%).
- Live webinars: unchanged — attendance confirmation after the session.
- Courses: certificate issues only when every lesson is marked complete; document lessons require scrolling to the end of the reading before they can be marked done.

## 7. Google sign-in
Add a "Continue with Google" button on both sign-in and sign-up screens using the managed Google provider, plus a download button on the public verification page.

## Technical notes
- PDFs regenerated with reportlab and re-uploaded via storage upload to the private `resources` bucket; downloads keep using short-lived signed URLs.
- Star seal drawn as a vector polygon in `certificate-pdf.ts`; CSS clip-path star in `CertificateArtwork.tsx`.
- Admin guard uses the existing `useAdmin` hook and the server-side `has_role` check that already backs the RLS policies.
- Webinar watch tracking stores progress in `webinar_registrations.attendance_minutes` / `attended`, so it survives reloads.
