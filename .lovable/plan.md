# Instant Purchase Access and Certificates

## Goal
Make every successful course or webinar payment unlock the exact purchased item immediately, deliver that access link by email and WhatsApp, and issue the certificate as soon as the required viewing is completed.

## Changes
- Make payment verification idempotent and treat access creation as part of successful payment completion, with explicit failure handling.
- Redirect paid course buyers directly to the course player and paid webinar buyers directly to the recording or session page.
- Send the same direct access link automatically by email and WhatsApp after payment.
- Track actual direct-video playback where available and preserve progress between visits; keep secure elapsed viewing for embedded media.
- Issue course and webinar certificates automatically at the configured completion threshold, then refresh certificate views immediately.
- Ensure purchased courses and webinars remain available for lifetime in My Learning and the dashboard.
- Verify signed-in purchase/access paths and public catalogue pages without changing unrelated features.

## Technical details
- Keep privileged payment finalisation on the server and make duplicate callbacks safe.
- Use database-owned progress/certificate routines so browser updates cannot forge access or credentials.
- Reuse the existing email, WhatsApp, Razorpay, and certificate systems.
