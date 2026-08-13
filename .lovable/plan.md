# AceEdX PrincipalX — phased build

Your brief describes a full ecosystem (community + LMS + AI studio + monetization + admin console). That is far more than one build can deliver reliably, so this plan sequences it. The existing app already has courses, webinars, lessons, community posts, resources, certificates, Razorpay and a basic admin panel — those get extended, not rebuilt.

## Phase 1 — Identity foundation (build first)

**Principal verification**
- Extend the member profile with: mobile, school name, school affiliation number, board, designation, city, state, country, school website, LinkedIn, photo.
- New `school_verifications` record created at signup; account state becomes `pending_verification`.
- Affiliation number never exposed publicly — private column, admin-only read.
- Admin **Verification Queue** tab: applicant, school, affiliation number, board, website, submitted date, notes, Approve / Reject / Suspend.
- Access rule: unverified users see public/free content only; verified users get community + learning. Toggle for this lives in platform settings.

**Resource Principal system**
- `resource_principal_applications` with statuses: applicant, under review, approved, active, suspended, rejected.
- Public application form; admin approval workflow tab.
- Approved Resource Principals get an enhanced public profile (expertise, speaking topics, sessions, credentials, socials) and appear in a **Find a Resource Principal** directory.
- Only admin + approved Resource Principals can be assigned webinars/courses/masterclasses.

**Roles & security**
- Extend `app_role` handling so permissions are enforced in the database (RLS), not just the UI.
- Fix an open security issue found in the current app: paid lesson content (video and document URLs) is currently readable by anyone, including signed-out visitors. Lessons will be restricted to published courses, with full content limited to free courses or enrolled users.

**Positioning**
- Landing page repositioned to "PrincipalX — Where Principals Learn. Lead. Connect. Influence." with the Join the Principal Network / Explore Learning CTAs.

## Phase 2 — Community
Feed with post types (discussion, question, poll, achievement, resource, webinar, course, article, announcement), reactions, comments, saves, follows (people/topics/groups), groups with membership modes, reporting + admin moderation centre, notifications.

## Phase 3 — Learning hub
Masterclasses added alongside courses/webinars. Learning Hub tabs (live, upcoming, masterclasses, courses, workshops, recordings, certificates, my learning). Webinar lifecycle statuses, speaker assignment, registrations/attendance views, reminder email schedule, certificate rules per program type.

## Phase 4 — Monetization
Subscription plans (Free / Professional / Elite / Institution) with admin-configurable pricing, coupons, trials; paid courses, webinars and masterclasses through Razorpay; revenue-share config per Resource Principal with an earnings dashboard; sponsorships.

## Phase 5 — AI studio
AI Webinar Builder, transcript → repurposed content (YouTube, blog, LinkedIn, Instagram, reels, newsletter), Content Studio table with approval workflow (default: admin approval required), quality-check warnings, AI usage/cost tracking.

## Phase 6 — Distribution & advanced
OAuth social account connections and multi-handle publishing queue, media/video library, messaging, recommendation engine, learning paths, Principal AI assistant, full analytics suite, audit log, CSV exports, PWA manifest.

## Admin console
Grows each phase into the tab set you listed (Overview, Principals, Community, Learning, Content Studio, Audience, Revenue, Social, Analytics, Settings). A tab only appears once it is functional — no decorative navigation.

## Technical notes
- New tables use UUIDs, timestamps, foreign keys, indexes, RLS with grants; roles stay in `user_roles` checked via a security-definer function.
- Server logic uses server functions; no client-side permission checks as the security boundary.
- Secrets (Razorpay, AI, OAuth) stay server-side.

## What I'll do next
Build Phase 1 end to end (schema + verification queue + Resource Principal applications + directory + repositioned landing page + the lesson-access security fix), then check in before Phase 2.
