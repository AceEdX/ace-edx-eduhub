import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://eduhub.aceedx.com";
const BATCH = 40;

type Kind = "registration" | "reminder-24h" | "reminder-1h" | "live-now" | "followup";

const KIND: Record<string, Kind> = {
  "webinar-registration": "registration",
  "webinar-reminder-24h": "reminder-24h",
  "webinar-reminder-1h": "reminder-1h",
  "webinar-live-now": "live-now",
  "webinar-followup": "followup",
};

/**
 * Drains the automated webinar email queue (confirmation, 24h, 1h, live-now,
 * follow-up). Called by the scheduled backend job; idempotent — each job is
 * claimed before it is sent, so repeated calls never double-send.
 */
async function drain(request: Request) {
  const expected = process.env["WEBINAR_CRON_SECRET"];
  if (expected) {
    const got = request.headers.get("x-cron-key") ?? new URL(request.url).searchParams.get("key");
    if (got !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

  const { data: due, error } = await supabaseAdmin
    .from("webinar_email_jobs")
    .select("id, webinar_id, user_id, template, attempts")
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .lt("attempts", 3)
    .order("send_after", { ascending: true })
    .limit(BATCH);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!due?.length) return Response.json({ processed: 0 });

  // Claim the batch so a parallel run cannot pick the same jobs.
  const ids = due.map((j) => j.id);
  const { data: claimed } = await supabaseAdmin
    .from("webinar_email_jobs")
    .update({ status: "sending" })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");
  const claimedIds = new Set((claimed ?? []).map((j) => j.id));
  const jobs = due.filter((j) => claimedIds.has(j.id));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const finish = (status: string, err?: string) =>
      supabaseAdmin
        .from("webinar_email_jobs")
        .update({
          status,
          attempts: job.attempts + 1,
          error: err ?? null,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", job.id);

    try {
      const [{ data: w }, { data: reg }, { data: profile }, { data: authUser }] = await Promise.all([
        supabaseAdmin
          .from("webinars")
          .select(
            "id, slug, title, starts_at, duration_min, timezone, session_type, status, certificate, meeting_url, recording_url, published, principal_id, expert_id, experts(name), resource_principals(display_name)",
          )
          .eq("id", job.webinar_id)
          .maybeSingle(),
        supabaseAdmin
          .from("webinar_registrations")
          .select("attended, attendance_minutes")
          .eq("webinar_id", job.webinar_id)
          .eq("user_id", job.user_id)
          .maybeSingle(),
        supabaseAdmin.from("profiles").select("full_name").eq("id", job.user_id).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(job.user_id),
      ]);

      const email = authUser?.user?.email;
      if (!w || !reg || !email) {
        await finish("skipped", "missing webinar, registration or email");
        skipped++;
        continue;
      }

      const kind = KIND[job.template] ?? "registration";
      const isLive = w.session_type === "live" && w.status !== "recorded";
      // Reminders and live-now only make sense for live sessions.
      if (!isLive && (kind === "reminder-24h" || kind === "reminder-1h" || kind === "live-now")) {
        await finish("skipped", "not a live session");
        skipped++;
        continue;
      }
      // Never send a stale reminder long after the moment has passed.
      const startsAt = new Date(w.starts_at).getTime();
      if ((kind === "reminder-24h" && Date.now() > startsAt - 6 * 3600_000) || (kind === "reminder-1h" && Date.now() > startsAt) || (kind === "live-now" && Date.now() > startsAt + w.duration_min * 60_000)) {
        await finish("skipped", "window passed");
        skipped++;
        continue;
      }

      const hostName =
        (w as unknown as { resource_principals?: { display_name?: string } | null }).resource_principals?.display_name ??
        (w as unknown as { experts?: { name?: string } | null }).experts?.name ??
        "AceEdX Faculty";
      const startsAtText = new Date(w.starts_at).toLocaleString("en-IN", {
        timeZone: w.timezone || "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "short",
      });
      const pageUrl = `${SITE}/webinars/${w.slug}`;
      const joinUrl = `${SITE}/live/${w.slug}`;
      const whatsappUrl = `https://wa.me/919373387800?text=${encodeURIComponent(
        `Hello AceEdX, please send me the join link for "${w.title}". My session page: ${pageUrl}`,
      )}`;

      const result = await sendTemplateEmail(job.template, email, {
        idempotencyKey: `${job.template}-${job.webinar_id}-${job.user_id}-${job.attempts}`,
        templateData: {
          kind,
          name: profile?.full_name?.split(" ")[0] || "there",
          title: w.title,
          startsAtText,
          durationMin: w.duration_min,
          hostName,
          joinUrl,
          pageUrl,
          replayUrl: w.recording_url ? joinUrl : pageUrl,
          attended: reg.attended,
          certificate: w.certificate,
          whatsappUrl,
        },
      });

      // WhatsApp copy of the same notice, when the member saved a number.
      try {
        const { sendWhatsAppText, getUserWhatsAppNumber } = await import("@/lib/whatsapp.server");
        const to = await getUserWhatsAppNumber(job.user_id);
        if (to) {
          const lines =
            kind === "live-now"
              ? `We are live now: ${w.title}\n\nJoin here: ${joinUrl}`
              : kind === "followup"
                ? `Thank you for joining ${w.title}.\n\nReplay and resources: ${w.recording_url ? joinUrl : pageUrl}`
                : kind === "registration"
                  ? `You are registered for ${w.title}.\n\nWhen: ${startsAtText}\nJoin link: ${joinUrl}`
                  : `Reminder: ${w.title}\n\nWhen: ${startsAtText}\nJoin link: ${joinUrl}`;
          await sendWhatsAppText({ to, body: lines, userId: job.user_id, kind: job.template });
        }
      } catch (e) {
        console.error("[whatsapp] webinar notice failed", e);
      }

      // Mirror the email as an in-app notification so it is never missed.
      await supabaseAdmin.from("notifications").insert({
        user_id: job.user_id,
        title:
          kind === "live-now"
            ? `Live now: ${w.title}`
            : kind === "followup"
              ? `Replay & resources: ${w.title}`
              : kind === "registration"
                ? `Registered: ${w.title}`
                : `Reminder: ${w.title}`,
        body: kind === "live-now" ? "The session has started — join from the live room." : `Session on ${startsAtText}.`,
        link: `/live/${w.slug}`,
      });

      await finish(result.sent ? "sent" : "skipped", result.sent ? undefined : result.reason);
      sent += result.sent ? 1 : 0;
      skipped += result.sent ? 0 : 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const retryable = /rate|429|domain_not_verified|emails_disabled/i.test(message);
      await supabaseAdmin
        .from("webinar_email_jobs")
        .update({ status: retryable ? "pending" : "failed", attempts: job.attempts + 1, error: message })
        .eq("id", job.id);
      failed++;
      if (retryable) {
        // Release the rest of the claimed batch so the next run picks it up.
        const rest = jobs.slice(jobs.indexOf(job) + 1).map((j) => j.id);
        if (rest.length) await supabaseAdmin.from("webinar_email_jobs").update({ status: "pending" }).in("id", rest);
        break;
      }
    }
  }

  return Response.json({ processed: jobs.length, sent, skipped, failed });
}

export const Route = createFileRoute("/api/public/webinar-reminders")({
  server: {
    handlers: {
      GET: ({ request }) => drain(request),
      POST: ({ request }) => drain(request),
    },
  },
});
