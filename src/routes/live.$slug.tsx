import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquare,
  Pin,
  Radio,
  Send,
  Square,
  ThumbsUp,
  Users,
} from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/PageShell";
import { Pill } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonMedia } from "@/components/LessonMedia";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWebinarLinks } from "@/lib/webinar-links";

export const Route = createFileRoute("/live/$slug")({
  head: () => ({
    meta: [
      { title: "Live room — AceEdX webinar" },
      { name: "description", content: "Join the live AceEdX session: stream, chat, Q&A, polls and handouts in one room." },
      { property: "og:title", content: "AceEdX live room" },
      { property: "og:description", content: "Live stream, chat, Q&A and polls for school leaders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveRoom,
});

type Room = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number;
  status: string;
  session_type: string;
  stream_provider: string;
  certificate: boolean;
  attendance_threshold_pct: number;
  waiting_room_min: number;
  cta_label: string | null;
  cta_url: string | null;
  cta_active: boolean;
  pinned_message: string | null;
  live_started_at: string | null;
  live_ended_at: string | null;
  has_recording: boolean | null;
  principal_id: string | null;
};

function LiveRoom() {
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const room = useQuery({
    queryKey: ["live-room", slug],
    refetchInterval: 15_000,
    queryFn: async (): Promise<Room | null> => {
      const { data, error } = await supabase
        .from("webinars")
        .select(
          "id, slug, title, description, starts_at, duration_min, status, session_type, stream_provider, certificate, attendance_threshold_pct, waiting_room_min, cta_label, cta_url, cta_active, pinned_message, live_started_at, live_ended_at, has_recording, principal_id",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Room | null;
    },
  });

  const w = room.data;

  const canManage = useQuery({
    queryKey: ["can-manage", w?.id, user?.id],
    enabled: Boolean(w && user),
    queryFn: async () => {
      const { data } = await supabase.rpc("can_manage_webinar", { _user_id: user!.id, _webinar_id: w!.id });
      return Boolean(data);
    },
  });

  const registration = useQuery({
    queryKey: ["registration", slug, user?.id],
    enabled: Boolean(user && w),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_registrations")
        .select("*")
        .eq("webinar_id", w!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const links = useWebinarLinks(w?.id, Boolean(user && (registration.data || canManage.data)));
  const profile = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data?.full_name || "Member";
    },
  });

  // Presence heartbeat → server-side attendance
  const [seconds, setSeconds] = useState(0);
  const [attended, setAttended] = useState(false);
  const isHost = Boolean(canManage.data);
  const isRegistered = Boolean(registration.data);
  const issuedRef = useRef(false);

  useEffect(() => {
    if (!w || !user || !isRegistered) return;
    let cancelled = false;
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.rpc("webinar_heartbeat", { _webinar_id: w.id });
      const row = (data as { seconds_watched: number; is_attended: boolean }[] | null)?.[0];
      if (cancelled || !row) return;
      setSeconds(row.seconds_watched);
      setAttended(row.is_attended);
      if (row.is_attended && w.certificate && !issuedRef.current) {
        issuedRef.current = true;
        const { error } = await supabase.rpc("issue_certificate", { _kind: "webinar", _webinar_id: w.id });
        if (!error) toast.success("Attendance confirmed — your certificate has been issued");
      }
    };
    void beat();
    const id = setInterval(beat, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [w?.id, user?.id, isRegistered, w?.certificate]);

  useEffect(() => {
    if (registration.data) {
      setSeconds(registration.data.attendance_seconds ?? 0);
      setAttended(registration.data.attended);
      if (registration.data.attended) issuedRef.current = true;
    }
  }, [registration.data]);

  if (loading || room.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!w) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState title="Session not found" description="This live room does not exist or has been removed." action={<Button variant="brand" asChild><Link to="/webinars">All webinars</Link></Button>} />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Sign in to enter the live room"
            description={`"${w.title}" is open to registered participants. Sign in and register from the session page.`}
            action={<Button variant="brand" onClick={() => navigate({ to: "/auth", search: { mode: "signin", redirect: `/live/${slug}` } })}>Sign in</Button>}
          />
        </div>
      </PageShell>
    );
  }

  if (!isRegistered && !isHost && !canManage.isLoading && !registration.isLoading) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Register to join this session"
            description="Only registered participants can enter the live room, chat and Q&A."
            action={<Button variant="brand" asChild><Link to="/webinars/$slug" params={{ slug }}>Go to registration</Link></Button>}
          />
        </div>
      </PageShell>
    );
  }

  const startsAt = new Date(w.starts_at).getTime();
  const opensAt = startsAt - (w.waiting_room_min ?? 15) * 60_000;
  const endsAt = startsAt + w.duration_min * 60_000;
  const now = Date.now();
  const isLiveNow = w.status === "live" || (w.live_started_at && !w.live_ended_at);
  const ended = Boolean(w.live_ended_at) || w.status === "recorded" || now > endsAt + 60 * 60_000;
  const waiting = !isHost && !isLiveNow && !ended && now < opensAt;
  const streamUrl = ended || w.status === "recorded" ? links.data?.recording_url || links.data?.meeting_url : links.data?.meeting_url || links.data?.recording_url;
  const requiredSec = Math.round(w.duration_min * 60 * ((w.attendance_threshold_pct ?? 80) / 100));
  const pct = Math.min(100, Math.round((seconds / Math.max(1, requiredSec)) * 100));
  const displayName = profile.data ?? "Member";

  async function setLive(live: boolean) {
    const { error } = await supabase
      .from("webinars")
      .update(live ? { status: "live", published: true, live_started_at: new Date().toISOString(), live_ended_at: null } : { status: w!.has_recording || links.data?.recording_url ? "recorded" : "upcoming", live_ended_at: new Date().toISOString() })
      .eq("id", w!.id);
    if (error) { toast.error(error.message); return; }
    toast.success(live ? "You are live — registrants are being notified" : "Session ended");
    qc.invalidateQueries({ queryKey: ["live-room", slug] });
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-primary py-8 text-primary-foreground">
        <div className="container-page flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isLiveNow ? <Pill tone="accent"><Radio className="mr-1 inline h-3 w-3" />Live</Pill> : ended ? <Pill tone="success">Replay</Pill> : <Pill tone="accent">Starts {new Date(w.starts_at).toLocaleString()}</Pill>}
              {isHost && <Pill tone="success">Host console</Pill>}
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">{w.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {isHost && !isLiveNow && <Button variant="brand" onClick={() => setLive(true)}><Radio className="h-4 w-4" /> Go live</Button>}
            {isHost && isLiveNow && <Button variant="outline" className="text-foreground" onClick={() => setLive(false)}><Square className="h-4 w-4" /> End session</Button>}
            {streamUrl && <Button variant="outline" className="text-foreground" asChild><a href={streamUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open in {w.stream_provider === "zoom" ? "Zoom" : "new tab"}</a></Button>}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {waiting ? (
            <div className="card-surface flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <p className="font-display text-xl font-semibold">Waiting room</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">The room opens {w.waiting_room_min} minutes before the start. Session begins {new Date(w.starts_at).toLocaleString()}. You will be able to chat and post questions once it opens.</p>
            </div>
          ) : streamUrl ? (
            <LessonMedia lesson={{ title: w.title, kind: "video", duration_min: w.duration_min, video_url: streamUrl }} />
          ) : (
            <div className="card-surface flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <p className="font-display text-xl font-semibold">{isHost ? "Add your stream link" : "Stream starting soon"}</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{isHost ? "Paste your YouTube Live, Zoom or Meet link in Principal Studio and it will appear here for everyone." : "The host has not opened the stream yet. Keep this page open — it refreshes automatically."}</p>
            </div>
          )}

          {w.pinned_message && (
            <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm"><Pin className="mr-2 inline h-4 w-4 text-accent" />{w.pinned_message}</div>
          )}

          {w.cta_active && w.cta_url && (
            <div className="card-surface flex flex-wrap items-center justify-between gap-3 border-accent p-4">
              <p className="text-sm font-semibold">{w.cta_label || "Special offer from the host"}</p>
              <Button variant="brand" size="sm" asChild>
                <a href={w.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => void supabase.rpc("record_webinar_cta_click", { _webinar_id: w.id })}>Claim offer</a>
              </Button>
            </div>
          )}

          {!isHost && (
            <div className="card-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-semibold">{attended ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Users className="h-4 w-4" />} {attended ? "Attendance confirmed" : "Attendance tracking"}</span>
                <span className="text-xs text-muted-foreground">{Math.floor(seconds / 60)} min in room</span>
              </div>
              <Progress value={pct} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">{attended ? (w.certificate ? "Your participation certificate has been issued." : "Thank you for attending.") : `Stay in the room for ${w.attendance_threshold_pct}% of the session${w.certificate ? " to earn your certificate" : ""}. Tracked automatically.`}</p>
            </div>
          )}

          {isHost && <HostAnalytics webinarId={w.id} />}
        </div>

        <aside className="card-surface flex h-[640px] flex-col p-0">
          <Tabs defaultValue="chat" className="flex h-full flex-col">
            <TabsList className="m-3 grid grid-cols-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
              <TabsTrigger value="polls">Polls</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="min-h-0 flex-1"><ChatPanel webinarId={w.id} userId={user.id} name={displayName} isHost={isHost} disabled={waiting} /></TabsContent>
            <TabsContent value="qa" className="min-h-0 flex-1"><QaPanel webinarId={w.id} userId={user.id} name={displayName} isHost={isHost} disabled={waiting} /></TabsContent>
            <TabsContent value="polls" className="min-h-0 flex-1"><PollsPanel webinarId={w.id} userId={user.id} isHost={isHost} /></TabsContent>
            <TabsContent value="files" className="min-h-0 flex-1"><HandoutsPanel webinarId={w.id} isHost={isHost} /></TabsContent>
          </Tabs>
        </aside>
      </div>

      {isHost && <HostControls room={w} onChanged={() => qc.invalidateQueries({ queryKey: ["live-room", slug] })} />}
    </PageShell>
  );
}

/* ------------------------------ realtime helper ----------------------------- */

function useRealtime(table: string, webinarId: string, onChange: () => void, filterColumn = "webinar_id") {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-${webinarId}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${webinarId}` }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, webinarId]);
}

/* ----------------------------------- Chat ---------------------------------- */

function ChatPanel({ webinarId, userId, name, isHost, disabled }: { webinarId: string; userId: string; name: string; isHost: boolean; disabled: boolean }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const q = useQuery({
    queryKey: ["chat", webinarId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data } = await supabase.from("webinar_chat").select("*").eq("webinar_id", webinarId).order("created_at").limit(300);
      return data ?? [];
    },
  });
  useRealtime("webinar_chat", webinarId, () => qc.invalidateQueries({ queryKey: ["chat", webinarId] }));
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [q.data?.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase.from("webinar_chat").insert({ webinar_id: webinarId, user_id: userId, author_name: name, body, is_host: isHost });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {!q.data?.length && <p className="pt-6 text-center text-xs text-muted-foreground">Say hello — the chat is open to everyone in the room.</p>}
        {q.data?.map((m) => (
          <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.is_host ? "bg-accent-soft" : "bg-muted/60"}`}>
            <p className="text-[11px] font-semibold text-muted-foreground">{m.author_name}{m.is_host ? " · Host" : ""}</p>
            <p>{m.body}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? "Chat opens with the room" : "Type a message"} disabled={disabled} />
        <Button type="submit" size="icon" variant="brand" disabled={disabled}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/* ----------------------------------- Q&A ----------------------------------- */

function QaPanel({ webinarId, userId, name, isHost, disabled }: { webinarId: string; userId: string; name: string; isHost: boolean; disabled: boolean }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [answering, setAnswering] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["qa", webinarId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const [{ data: questions }, { data: votes }] = await Promise.all([
        supabase.from("webinar_questions").select("*").eq("webinar_id", webinarId).eq("dismissed", false).order("upvotes", { ascending: false }).order("created_at"),
        supabase.from("webinar_question_votes").select("question_id").eq("user_id", userId),
      ]);
      return { questions: questions ?? [], voted: new Set((votes ?? []).map((v) => v.question_id)) };
    },
  });
  useRealtime("webinar_questions", webinarId, () => qc.invalidateQueries({ queryKey: ["qa", webinarId] }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["qa", webinarId] });

  async function ask() {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase.from("webinar_questions").insert({ webinar_id: webinarId, user_id: userId, author_name: name, body });
    if (error) toast.error(error.message);
  }
  async function vote(id: string, voted: boolean) {
    if (voted) await supabase.from("webinar_question_votes").delete().eq("question_id", id).eq("user_id", userId);
    else await supabase.from("webinar_question_votes").insert({ question_id: id, user_id: userId });
    refresh();
  }
  async function answer(id: string) {
    const a = answering[id]?.trim();
    await supabase.from("webinar_questions").update({ answered: true, answer: a || null }).eq("id", id);
    setAnswering((s) => ({ ...s, [id]: "" }));
    refresh();
  }
  async function dismiss(id: string) {
    await supabase.from("webinar_questions").update({ dismissed: true }).eq("id", id);
    refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
        {!q.data?.questions.length && <p className="pt-6 text-center text-xs text-muted-foreground">No questions yet. Ask the speaker anything — upvote the ones you want answered.</p>}
        {q.data?.questions.map((qq) => {
          const voted = q.data.voted.has(qq.id);
          return (
            <div key={qq.id} className={`rounded-xl border p-3 text-sm ${qq.answered ? "border-success/40 bg-success/5" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">{qq.author_name}</p>
                  <p>{qq.body}</p>
                  {qq.answer && <p className="mt-2 rounded-lg bg-muted/60 px-2 py-1 text-xs"><span className="font-semibold">Answer:</span> {qq.answer}</p>}
                  {qq.answered && !qq.answer && <p className="mt-1 text-[11px] text-success">Answered live</p>}
                </div>
                <button onClick={() => void vote(qq.id, voted)} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${voted ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
                  <ThumbsUp className="h-3 w-3" /> {qq.upvotes}
                </button>
              </div>
              {isHost && !qq.answered && (
                <div className="mt-2 flex gap-2">
                  <Input className="h-8 text-xs" placeholder="Type an answer (optional)" value={answering[qq.id] ?? ""} onChange={(e) => setAnswering((s) => ({ ...s, [qq.id]: e.target.value }))} />
                  <Button size="sm" variant="success" onClick={() => void answer(qq.id)}>Answer</Button>
                  <Button size="sm" variant="ghost" onClick={() => void dismiss(qq.id)}>Dismiss</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? "Q&A opens with the room" : "Ask a question"} disabled={disabled} />
        <Button type="submit" size="icon" variant="brand" disabled={disabled}><MessageSquare className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/* ---------------------------------- Polls ---------------------------------- */

function PollsPanel({ webinarId, userId, isHost }: { webinarId: string; userId: string; isHost: boolean }) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("Yes\nNo");
  const q = useQuery({
    queryKey: ["polls", webinarId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data: polls } = await supabase.from("webinar_polls").select("*").eq("webinar_id", webinarId).order("created_at", { ascending: false });
      const ids = (polls ?? []).map((p) => p.id);
      const { data: votes } = ids.length ? await supabase.from("webinar_poll_votes").select("poll_id, option_index, user_id").in("poll_id", ids) : { data: [] };
      return { polls: polls ?? [], votes: votes ?? [] };
    },
  });
  useRealtime("webinar_polls", webinarId, () => qc.invalidateQueries({ queryKey: ["polls", webinarId] }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["polls", webinarId] });

  async function launch() {
    const opts = options.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) { toast.error("Add a question and at least two options"); return; }
    const { error } = await supabase.from("webinar_polls").insert({ webinar_id: webinarId, question: question.trim(), options: opts });
    if (error) { toast.error(error.message); return; }
    setQuestion("");
    refresh();
  }
  async function vote(pollId: string, idx: number) {
    const { error } = await supabase.from("webinar_poll_votes").upsert({ poll_id: pollId, user_id: userId, option_index: idx }, { onConflict: "poll_id,user_id" });
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto px-4 pb-4">
      {isHost && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">Launch a poll</p>
          <Input className="mt-2" placeholder="Poll question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Textarea className="mt-2" rows={3} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="One option per line" />
          <Button size="sm" variant="brand" className="mt-2" onClick={() => void launch()}><BarChart3 className="h-4 w-4" /> Launch</Button>
        </div>
      )}
      {!q.data?.polls.length && <p className="pt-6 text-center text-xs text-muted-foreground">No polls yet.</p>}
      {q.data?.polls.map((p) => {
        const votes = q.data.votes.filter((v) => v.poll_id === p.id);
        const mine = votes.find((v) => v.user_id === userId)?.option_index;
        const total = votes.length || 1;
        return (
          <div key={p.id} className="rounded-xl border border-border p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.question}</p>
              {isHost && <button className="text-xs text-muted-foreground" onClick={async () => { await supabase.from("webinar_polls").update({ active: !p.active }).eq("id", p.id); refresh(); }}>{p.active ? "Close" : "Reopen"}</button>}
            </div>
            <div className="mt-2 space-y-1.5">
              {p.options.map((o, i) => {
                const n = votes.filter((v) => v.option_index === i).length;
                const pct = Math.round((n / total) * 100);
                return (
                  <button key={i} disabled={!p.active} onClick={() => void vote(p.id, i)} className={`relative w-full overflow-hidden rounded-lg border px-3 py-1.5 text-left text-xs ${mine === i ? "border-accent" : "border-border"}`}>
                    <span className="absolute inset-y-0 left-0 bg-accent-soft" style={{ width: `${pct}%` }} />
                    <span className="relative flex justify-between"><span>{o}</span><span>{pct}% · {n}</span></span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{votes.length} votes · {p.active ? "open" : "closed"}</p>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Handouts -------------------------------- */

function HandoutsPanel({ webinarId, isHost }: { webinarId: string; isHost: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const q = useQuery({
    queryKey: ["handouts", webinarId],
    queryFn: async () => (await supabase.from("webinar_handouts").select("*").eq("webinar_id", webinarId).order("created_at")).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["handouts", webinarId] });
  return (
    <div className="h-full space-y-3 overflow-y-auto px-4 pb-4">
      {isHost && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">Share a handout</p>
          <Input className="mt-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input className="mt-2" placeholder="https://… (PDF, slides, resource link)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button size="sm" variant="brand" className="mt-2" onClick={async () => {
            if (!title.trim() || !/^https?:\/\//.test(url)) { toast.error("Add a title and a valid link"); return; }
            const { error } = await supabase.from("webinar_handouts").insert({ webinar_id: webinarId, title: title.trim(), url });
            if (error) { toast.error(error.message); return; }
            setTitle(""); setUrl(""); refresh();
          }}>Add</Button>
        </div>
      )}
      {!q.data?.length && <p className="pt-6 text-center text-xs text-muted-foreground">No handouts shared yet.</p>}
      {q.data?.map((h) => (
        <div key={h.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
          <span className="font-medium">{h.title}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" asChild><a href={h.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>
            {isHost && <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("webinar_handouts").delete().eq("id", h.id); refresh(); }}>Remove</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Host controls ------------------------------ */

function HostControls({ room, onChanged }: { room: Room; onChanged: () => void }) {
  const [pinned, setPinned] = useState(room.pinned_message ?? "");
  const [ctaLabel, setCtaLabel] = useState(room.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(room.cta_url ?? "");
  async function save(values: Partial<Room>) {
    const { error } = await supabase.from("webinars").update(values).eq("id", room.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated for everyone in the room");
    onChanged();
  }
  return (
    <div className="container-page pb-12">
      <div className="card-surface grid gap-4 p-5 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold"><Pin className="mr-1 inline h-4 w-4" /> Pinned message</p>
          <Textarea className="mt-2" rows={2} value={pinned} onChange={(e) => setPinned(e.target.value)} placeholder="e.g. Slides link will be shared at the end. Post your questions in Q&A." />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="brand" onClick={() => void save({ pinned_message: pinned.trim() || null })}>Pin</Button>
            <Button size="sm" variant="ghost" onClick={() => { setPinned(""); void save({ pinned_message: null }); }}>Clear</Button>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Mid-session offer (CTA)</p>
          <Input className="mt-2" placeholder="Offer label, e.g. Enrol in the full masterclass at 30% off" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          <Input className="mt-2" placeholder="https://eduhub.aceedx.com/courses/…" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="brand" onClick={() => void save({ cta_label: ctaLabel.trim() || null, cta_url: ctaUrl.trim() || null, cta_active: true })}>Push offer</Button>
            <Button size="sm" variant="ghost" onClick={() => void save({ cta_active: false })}>Hide offer</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HostAnalytics({ webinarId }: { webinarId: string }) {
  const q = useQuery({
    queryKey: ["webinar-analytics", webinarId],
    refetchInterval: 20_000,
    queryFn: async () => (await supabase.rpc("webinar_analytics", { _webinar_id: webinarId })).data?.[0] ?? null,
  });
  const a = q.data;
  const cells = useMemo(
    () => [
      ["Registered", a?.registered ?? 0],
      ["Live now", a?.live_now ?? 0],
      ["Attended", a?.attended ?? 0],
      ["Show-up %", a?.show_up_pct ?? 0],
      ["Avg watch (min)", a?.avg_watch_min ?? 0],
      ["Questions", a?.questions ?? 0],
      ["Chat", a?.chat_messages ?? 0],
      ["Offer clicks", a?.cta_clicks ?? 0],
    ],
    [a],
  );
  return (
    <div className="card-surface grid grid-cols-4 gap-3 p-4 text-center">
      {cells.map(([label, value]) => (
        <div key={label as string}>
          <p className="font-display text-xl font-semibold">{value as number}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
