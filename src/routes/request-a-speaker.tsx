import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic } from "lucide-react";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/request-a-speaker")({
  head: () => ({
    meta: [
      { title: "Request a speaker for your school event — AceEdX" },
      {
        name: "description",
        content:
          "Invite a verified Resource Principal to keynote your annual day, teacher training or leadership conclave — online or in person.",
      },
      { property: "og:title", content: "Request a school leadership speaker" },
      {
        property: "og:description",
        content: "Book practising principals and education leaders for your next event.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpeakerRequestPage,
});

function SpeakerRequestPage() {
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    principal_id: "any",
    event_name: "",
    event_date: "",
    event_format: "in_person",
    city: "",
    audience_size: "",
    topic: "",
    budget_inr: "",
    message: "",
  });

  const principals = useQuery({
    queryKey: ["speaker-principals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_principals")
        .select("id, display_name, school_name")
        .eq("status", "approved")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to send a speaker request");
      return;
    }
    if (!form.event_name.trim() || !form.topic.trim()) {
      toast.error("Event name and topic are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("speaker_requests").insert({
      requester_id: user.id,
      principal_id: form.principal_id === "any" ? null : form.principal_id,
      event_name: form.event_name.trim(),
      event_date: form.event_date || null,
      event_format: form.event_format,
      city: form.city.trim() || null,
      audience_size: form.audience_size ? Number(form.audience_size) : null,
      topic: form.topic.trim(),
      budget_inr: form.budget_inr ? Number(form.budget_inr) : null,
      message: form.message.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send your request. Please try again.");
      return;
    }
    toast.success("Request sent — we will confirm speaker availability shortly.");
    setForm({
      principal_id: "any",
      event_name: "",
      event_date: "",
      event_format: "in_person",
      city: "",
      audience_size: "",
      topic: "",
      budget_inr: "",
      message: "",
    });
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Speakers"
        title="Request a speaker"
        description="Bring a practising school leader to your campus or conference. Every Resource Principal on the panel is verified, currently leading a school, and briefed to speak from real practice."
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={submit} className="card-surface space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold">Event details</h2>
          </div>

          <div>
            <Label>Preferred speaker</Label>
            <Select value={form.principal_id} onValueChange={(v) => set("principal_id", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Recommend someone for me</SelectItem>
                {(principals.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name}
                    {p.school_name ? ` — ${p.school_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="event">Event name</Label>
              <Input
                id="event"
                value={form.event_name}
                onChange={(e) => set("event_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Event date</Label>
              <Input
                id="date"
                type="date"
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={form.event_format} onValueChange={(v) => set("event_format", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="audience">Audience size</Label>
              <Input
                id="audience"
                type="number"
                min={0}
                value={form.audience_size}
                onChange={(e) => set("audience_size", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="budget">Honorarium budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                value={form.budget_inr}
                onChange={(e) => set("budget_inr", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="e.g. NEP 2020 implementation for middle school teams"
              required
            />
          </div>
          <div>
            <Label htmlFor="msg">Anything else?</Label>
            <Textarea
              id="msg"
              rows={4}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>

          {!user && !loading ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-accent">
                Sign in
              </Link>{" "}
              to send your request — it keeps the conversation in one place.
            </p>
          ) : null}

          <Button type="submit" variant="brand" disabled={saving || !user}>
            {saving ? "Sending…" : "Send request"}
          </Button>
        </form>

        <div className="space-y-5">
          {[
            {
              title: "Verified practitioners only",
              body: "Every speaker is a serving principal, school owner or academic head whose credentials we have checked.",
            },
            {
              title: "Briefed to your context",
              body: "Share your board, city and audience — we match a speaker who has solved the same problem in a similar school.",
            },
            {
              title: "Clear commercials",
              body: "Honorarium, travel and recording rights are agreed upfront. Revenue is shared transparently with the speaker.",
            },
          ].map((c) => (
            <div key={c.title} className="card-surface p-5">
              <h3 className="font-display text-base font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
          <Button variant="outline" asChild>
            <Link to="/resource-principals">Browse the speaker panel</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
