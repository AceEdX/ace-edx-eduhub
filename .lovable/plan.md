# Full Webinar Engine for Resource Principals

Turn the current "webinar record + external link" setup into a complete webinar engine that an approved Resource Principal can run end to end — registration, reminders, live room, engagement, follow-up and analytics — matching and going past Zoom Webinars / WebinarJam / BigMarker on the parts that matter for school leaders.

## What a Resource Principal gets

**1. Session builder (Studio → Webinars)**
- Type: Live, Recorded, or Evergreen (auto-play at a scheduled time / on-demand replay).
- Schedule with timezone, duration, series support (recurring weekly/monthly with one registration).
- Streaming source: Zoom, YouTube Live, Google Meet, or a built-in browser room (embedded player + chat) — provider fields with validation and a "test link" check.
- Pricing (Free / Paid ₹), seat cap, waiting-room open time, certificate on/off, attendance threshold.
- AI assist for title, description, and agenda outline (plain text, no markdown symbols).

**2. Registration & landing**
- Public webinar landing page with speaker bio, agenda, countdown, seats-left, social proof (registered count).
- Custom registration questions (school name, role, city) defined by the host.
- Instant confirmation email with the join link, plus "Add to calendar" (Google/Outlook/ICS).
- Approval mode: auto-approve or host-approves each registrant.

**3. Automated reminder & follow-up flow**
- Scheduled emails: on registration, 24h before, 1h before, "we're live now", and after the session.
- Post-session branches: attended → thank-you + certificate + replay link; no-show → replay link + next session invite.
- Runs on a scheduled backend job so it fires without the host doing anything.

**4. Live room (on-site experience)**
- Host console: start/end session, live attendee list, elapsed timer, attendance tracking.
- Attendee room: embedded stream, live chat, Q&A with upvotes, polls, reactions, handouts/resource downloads, and timed CTA offers (pin a course/masterclass for sale mid-session).
- Host moderates: answer/dismiss Q&A, launch polls, push a CTA, pin a message.
- Attendance is recorded server-side from real presence heartbeats, not client claims.

**5. After the session**
- Auto-publish the recording to the replay page; registrants get access, others see the paywall.
- Certificates issue automatically once the attendance threshold is met.
- One-click remix into reels/shorts/LinkedIn posts (existing Clip Studio + Social Posts, wired to the session).

**6. Analytics dashboard**
- Per-session: registrations, show-up rate, average watch time, peak concurrency, poll results, Q&A log, CTA clicks, revenue and the host's share.
- Exportable attendee CSV.

## What the Admin gets

- Approve/reject each session before it goes public (quality gate), plus the existing hide/price controls.
- Revenue share % per session, payout ledger, and a view of every host's sessions in one place.
- Green-dot alerts for sessions awaiting approval.

## Technical approach

Database (one migration, with grants + RLS on every new table):
- Extend `webinars`: `timezone`, `session_type`, `seat_cap`, `waiting_room_min`, `attendance_threshold_pct`, `approval_status`, `series_id`, `registration_questions`, `cta` fields.
- New tables: `webinar_questions` (Q&A + upvotes), `webinar_polls` / `webinar_poll_votes`, `webinar_chat`, `webinar_handouts`, `webinar_attendance_events` (heartbeats), `webinar_email_jobs` (reminder queue), `webinar_series`.
- New RPCs: `webinar_heartbeat`, `webinar_analytics(_webinar_id)`, `register_for_webinar` (handles seat cap, approval, custom answers).
- Realtime enabled on chat, Q&A and polls so the room updates live.

App:
- `src/routes/live.$slug.tsx` — the live room (host + attendee views from one route).
- Studio: rebuilt Webinars tab with the session builder, plus new "Live sessions" and "Session analytics" panels.
- Reminder dispatch: a public cron route (`/api/public/webinar-reminders`) that drains `webinar_email_jobs` through the existing email templates; new templates for reminder, live-now, thank-you and no-show.
- Admin: session approval queue in the existing admin console.

Existing webinar detail, certificate issuing, payments and email plumbing are reused, not replaced.

## Notes

- Video hosting stays with Zoom/YouTube/Meet (embedded); the platform owns registration, room, engagement, automation and analytics. Building our own WebRTC broadcast infrastructure is out of scope.
- Rollout order: database + registration/automation → live room → analytics → admin approval.
