import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
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

const PACKAGES = [
  { value: "webinar", label: "Webinar / masterclass sponsorship" },
  { value: "newsletter", label: "Newsletter placement" },
  { value: "community", label: "Community spotlight" },
  { value: "event", label: "Annual leadership summit" },
  { value: "custom", label: "Custom partnership" },
] as const;

export const Route = createFileRoute("/sponsorships")({
  head: () => ({
    meta: [
      { title: "Sponsor school leaders — partnership packages | AceEdX" },
      {
        name: "description",
        content:
          "Reach verified principals, school owners and academic leaders through sponsored masterclasses, newsletter placements and community spotlights.",
      },
      { property: "og:title", content: "Sponsorship and brand partnerships — AceEdX" },
      {
        property: "og:description",
        content: "Put your brand in front of decision-makers running India's schools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SponsorshipsPage,
});

function SponsorshipsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    phone: "",
    package_type: "webinar",
    budget_inr: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast.error("Company, contact name and email are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sponsorships").insert({
      user_id: user?.id ?? null,
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      phone: form.phone.trim() || null,
      package_type: form.package_type,
      budget_inr: form.budget_inr ? Number(form.budget_inr) : null,
      message: form.message.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send your enquiry. Please try again.");
      return;
    }
    toast.success("Thank you — our partnerships team will be in touch within two working days.");
    setForm({
      company_name: "",
      contact_name: "",
      contact_email: "",
      phone: "",
      package_type: "webinar",
      budget_inr: "",
      message: "",
    });
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Partnerships"
        title="Sponsor the people who run schools"
        description="Our audience is verified principals, school owners and academic leaders — the people who choose curricula, technology, training and services for entire campuses."
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          {[
            {
              title: "Sponsored masterclass",
              body: "Co-host a 60-minute session with a Resource Principal. You get branding, an intro slot, and the full registration list of opted-in leaders.",
            },
            {
              title: "Newsletter placement",
              body: "A native placement in the weekly leadership brief that lands in principals' inboxes across boards and states.",
            },
            {
              title: "Community spotlight",
              body: "A pinned discussion, an AMA with your specialists, and a resource in the library — credible presence, not banner ads.",
            },
            {
              title: "Annual summit",
              body: "Stage time, exhibition presence and curated meetings at our flagship school-leadership gathering.",
            },
          ].map((c) => (
            <div key={c.title} className="card-surface p-5">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-accent" />
                <h2 className="font-display text-base font-semibold">{c.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="card-surface h-fit space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Talk to our partnerships team</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact">Contact name</Label>
              <Input
                id="contact"
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Package</Label>
              <Select
                value={form.package_type}
                onValueChange={(v) => set("package_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="budget">Indicative budget (₹)</Label>
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
            <Label htmlFor="message">What would you like to achieve?</Label>
            <Textarea
              id="message"
              rows={5}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Audience you want to reach, timelines, and anything you have run before."
            />
          </div>
          <Button type="submit" variant="brand" disabled={saving}>
            {saving ? "Sending…" : "Send enquiry"}
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
