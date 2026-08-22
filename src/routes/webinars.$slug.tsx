import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Clock, Users, Video } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/PageShell";
import { Pill } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { LessonMedia } from "@/components/LessonMedia";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWebinarLinks } from "@/lib/webinar-links";
import { formatPrice } from "@/lib/brand";
import { payAndUnlock } from "@/lib/razorpay";
import type { Webinar } from "@/lib/api";

export const Route = createFileRoute("/webinars/$slug")({
  head: () => ({
    meta: [
      { title: "Webinar — AceEdX" },
      {
        name: "description",
        content:
          "Register for this AceEdX webinar for school leaders and earn a verifiable participation certificate.",
      },
      { property: "og:title", content: "AceEdX webinar for school leaders" },
      { property: "og:description", content: "Register free or paid and earn a certificate." },
    ],
  }),
  component: WebinarDetail,
});

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function WebinarDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const webinar = useQuery({
    queryKey: ["webinar", slug],
    queryFn: async (): Promise<Webinar | null> => {
      const { data, error } = await supabase
        .from("webinars")
        .select(
          "id, slug, title, description, topic, starts_at, duration_min, price_inr, is_free, status, certificate, image_url, registered_count, expert_id, published, program_type, principal_id, stream_provider, has_recording, has_meeting_link, experts(*)",
        )
        .eq("published", true)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Webinar | null;
    },
  });

  const registration = useQuery({
    queryKey: ["registration", slug, user?.id],
    enabled: Boolean(user && webinar.data),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_registrations")
        .select("*")
        .eq("webinar_id", webinar.data!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const links = useWebinarLinks(webinar.data?.id, Boolean(user && registration.data));
  const meetingUrl = links.data?.meeting_url ?? null;
  const recordingUrl = links.data?.recording_url ?? null;

  const countdown = useCountdown(webinar.data?.starts_at);

  async function confirmRegistration(w: Webinar) {
    const { error } = await supabase
      .from("webinar_registrations")
      .upsert({ user_id: user!.id, webinar_id: w.id }, { onConflict: "user_id,webinar_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: user!.id,
      title: "Webinar registration confirmed",
      body: `You are registered for ${w.title}. We'll remind you 24 hours and 1 hour before.`,
      link: `/webinars/${w.slug}`,
    });
    await registration.refetch();
    toast.success("You're registered — confirmation sent to your notifications");
  }

  async function register() {
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    const w = webinar.data;
    if (!w) return;

    if (!w.is_free && w.price_inr > 0) {
      await payAndUnlock({
        itemType: "webinar",
        itemId: w.id,
        email: user.email ?? "",
        onSuccess: () => confirmRegistration(w),
      });
      return;
    }

    await confirmRegistration(w);
  }

  const [watching, setWatching] = useState(false);
  const [watchedSec, setWatchedSec] = useState(0);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    const mins = registration.data?.attendance_minutes ?? 0;
    if (mins > 0) setWatchedSec((s) => Math.max(s, mins * 60));
  }, [registration.data]);

  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => setWatchedSec((s) => s + 5), 5000);
    return () => clearInterval(id);
  }, [watching]);

  async function saveAttendance(minutes: number, _attended: boolean) {
    const w = webinar.data;
    if (!user || !w) return;
    // Attendance is validated and capped server-side; the client cannot mark itself present.
    await supabase.rpc("record_webinar_attendance", {
      _webinar_id: w.id,
      _minutes: minutes,
    });
  }

  async function issueCertificate(minutes: number) {
    const w = webinar.data;
    if (!user || !w || issuing) return;
    setIssuing(true);
    await saveAttendance(minutes, true);

    if (w.certificate) {
      const { error } = await supabase.rpc("issue_certificate", {
        _kind: "webinar",
        _webinar_id: w.id,
      });
      if (!error) {
        toast.success("Session complete — your participation certificate has been issued");
      }
    }
    await registration.refetch();
    setIssuing(false);
  }


  // Persist watch time periodically and unlock the certificate at 80% watched.
  useEffect(() => {
    const w = webinar.data;
    if (!w || !user || !watching || watchedSec === 0) return;
    const minutes = Math.floor(watchedSec / 60);
    const requiredSec = Math.round(w.duration_min * 60 * 0.8);
    if (watchedSec >= requiredSec) {
      if (!registration.data?.attended) void issueCertificate(minutes);
      setWatching(false);
      return;
    }
    if (watchedSec % 30 === 0) void saveAttendance(minutes, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSec, watching]);

  async function startLiveSession() {
    const w = webinar.data;
    if (!w) return;
    if (meetingUrl) window.open(meetingUrl, "_blank", "noopener,noreferrer");
    await saveAttendance(registration.data?.attendance_minutes ?? 0, false);
    await registration.refetch();
  }

  async function confirmLiveAttendance() {
    const w = webinar.data;
    if (!w) return;
    await issueCertificate(Math.round(w.duration_min * 0.8));
    navigate({ to: "/certificates" });
  }


  if (webinar.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!webinar.data) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Webinar unavailable"
            description="This session may have been moved to the archive."
            action={
              <Button variant="brand" asChild>
                <Link to="/webinars">All webinars</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const w = webinar.data;
  const date = new Date(w.starts_at);
  const isRegistered = Boolean(registration.data);
  const isRecorded = w.status === "recorded" || Boolean(w.has_recording);
  const requiredSec = Math.round(w.duration_min * 60 * 0.8);
  const watchPct = Math.min(100, Math.round((watchedSec / requiredSec) * 100));
  const certificateEarned = Boolean(registration.data?.attended);
  const endsAt = new Date(w.starts_at).getTime() + w.duration_min * 60000;
  const liveFinished = Date.now() > endsAt;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    w.title,
  )}&dates=${date.toISOString().replace(/[-:]|\.\d{3}/g, "")}/${new Date(
    date.getTime() + w.duration_min * 60000,
  )
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, "")}&details=${encodeURIComponent(w.description ?? "")}`;

  return (
    <PageShell>
      <section className="border-b border-border bg-primary py-14 text-primary-foreground">
        <div className="container-page grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="accent">{w.status === "recorded" ? "Recorded" : "Upcoming"}</Pill>
              <Pill tone="success">{formatPrice(w.price_inr, w.is_free)}</Pill>
            </div>
            <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{w.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
              {w.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
              <span>{date.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {w.duration_min} minutes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {w.registered_count.toLocaleString()} registered
              </span>
            </div>
            {countdown && (
              <div className="mt-6 flex gap-3">
                {[
                  ["Days", countdown.days],
                  ["Hours", countdown.hours],
                  ["Min", countdown.minutes],
                  ["Sec", countdown.seconds],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="rounded-xl bg-primary-foreground/10 px-4 py-3 text-center"
                  >
                    <p className="font-display text-xl font-semibold">{value as number}</p>
                    <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="card-surface h-fit p-6 text-foreground">
            {isRegistered ? (
              <>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> You are registered
                </p>

                {isRecorded ? (
                  <>
                    <Button
                      variant="brand"
                      className="mt-4 w-full"
                      disabled={!recordingUrl}
                      onClick={() => {
                        setWatching(true);
                        document
                          .getElementById("watch")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <Video className="h-4 w-4" />
                      {recordingUrl ? "Watch the recording" : "Recording coming soon"}
                    </Button>
                    <Progress value={watchPct} className="mt-4" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {certificateEarned
                        ? "Watched — your participation certificate has been issued."
                        : `${watchPct}% watched · certificate unlocks at 80% of the session.`}
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      variant="brand"
                      className="mt-4 w-full"
                      disabled={!meetingUrl}
                      onClick={startLiveSession}
                    >
                      <Video className="h-4 w-4" />
                      {meetingUrl ? "Join live session" : "Joining link coming soon"}
                    </Button>
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={!liveFinished || certificateEarned}
                      onClick={confirmLiveAttendance}
                    >
                      Confirm attendance & get certificate
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {certificateEarned
                        ? "Attendance confirmed — certificate issued."
                        : liveFinished
                          ? "Confirm you attended to receive your certificate."
                          : "You can claim your certificate once the session has finished."}
                    </p>
                  </>
                )}

                <Button variant="outline" className="mt-2 w-full" asChild>
                  <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus className="h-4 w-4" /> Add to Google Calendar
                  </a>
                </Button>
                {certificateEarned && (
                  <Button variant="success" className="mt-2 w-full" asChild>
                    <Link to="/certificates">View your certificate</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="font-display text-3xl font-semibold">
                  {formatPrice(w.price_inr, w.is_free)}
                </p>
                <Button variant="brand" size="lg" className="mt-5 w-full" onClick={register}>
                  Register for this webinar
                </Button>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <li>Live Q&amp;A with the speaker</li>
                  <li>Recording access afterwards</li>
                  {w.certificate && <li>Participation certificate</li>}
                </ul>
              </>
            )}
          </aside>
        </div>
      </section>

      {isRegistered && isRecorded && watching && recordingUrl && (
        <div id="watch" className="container-page pt-10">
          <h2 className="font-display text-xl font-semibold">Recording</h2>
          <LessonMedia
            lesson={{
              title: w.title,
              kind: "video",
              duration_min: w.duration_min,
              video_url: recordingUrl,
            }}
          />
          <div className="mt-4 max-w-xl">
            <Progress value={watchPct} />
            <p className="mt-2 text-xs text-muted-foreground">
              {certificateEarned
                ? "Certificate issued — find it in your credentials wallet."
                : `Keep the recording playing on this page. ${watchPct}% of the required watch time completed — your certificate is issued automatically at 80%.`}
            </p>
          </div>
        </div>
      )}



      <div className="container-page py-14">
        <div className="card-surface max-w-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Your speaker</h2>
          <p className="mt-3 text-sm font-semibold">{w.experts?.name ?? "AceEdX Faculty"}</p>
          <p className="text-xs text-muted-foreground">
            {w.experts?.title} · {w.experts?.organisation}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{w.experts?.bio}</p>
        </div>
      </div>
    </PageShell>
  );
}
