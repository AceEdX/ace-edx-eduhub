import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/cards";
import { supabase } from "@/integrations/supabase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------- School verification queue ------------------------ */

export function VerificationQueueAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications", filter],
    queryFn: async () => {
      let query = supabase
        .from("school_verifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function decide(row: { id: string; user_id: string }, status: string, notes: string) {
    const { error } = await supabase
      .from("school_verifications")
      .update({ status, admin_notes: notes || null, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ verification_status: status })
      .eq("id", row.user_id);
    if (pErr) toast.error(pErr.message);

    await supabase.from("notifications").insert({
      user_id: row.user_id,
      title:
        status === "verified"
          ? "Your principal verification is approved"
          : `Your verification status is now ${status}`,
      body: notes || null,
      link: "/verification",
    });

    toast.success(`Marked ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-verifications"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["pending", "verified", "rejected", "suspended", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === s ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !data?.length ? (
        <EmptyState
          title="Nothing in this queue"
          description="Verification requests appear here as principals register."
        />
      ) : (
        data.map((row) => <VerificationRow key={row.id} row={row} onDecide={decide} />)
      )}
    </div>
  );
}

type VerificationRowData = {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string | null;
  school_name: string;
  affiliation_number: string;
  board: string | null;
  designation: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  school_website: string | null;
  linkedin_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

function VerificationRow({
  row,
  onDecide,
}: {
  row: VerificationRowData;
  onDecide: (row: { id: string; user_id: string }, status: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [busy, setBusy] = useState(false);

  async function act(status: string) {
    setBusy(true);
    await onDecide(row, status, notes);
    setBusy(false);
  }

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{row.full_name}</h3>
          <p className="text-xs text-muted-foreground">
            {row.designation ?? "Principal"} · {row.school_name}
          </p>
        </div>
        <Pill tone={row.status === "verified" ? "success" : "primary"}>{row.status}</Pill>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Affiliation number" value={row.affiliation_number} />
        <Field label="Board" value={row.board} />
        <Field label="Mobile" value={row.mobile} />
        <Field label="Location" value={[row.city, row.state, row.country].filter(Boolean).join(", ")} />
        <Field label="School website" value={row.school_website} link />
        <Field label="LinkedIn" value={row.linkedin_url} link />
        <Field label="Submitted" value={new Date(row.created_at).toLocaleDateString()} />
      </dl>

      <div className="mt-4">
        <Label className="text-xs">Reviewer notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="brand" disabled={busy} onClick={() => act("verified")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("rejected")}>
          Reject
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("suspended")}>
          Suspend
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("pending")}>
          Reset to pending
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">
        {!value ? (
          <span className="text-muted-foreground">—</span>
        ) : link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/* --------------------- Resource Principal applications ---------------------- */

export function ResourcePrincipalsAdmin() {
  const qc = useQueryClient();

  const apps = useQuery({
    queryKey: ["admin-rp-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_principal_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const directory = useQuery({
    queryKey: ["admin-rp-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_principals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from("resource_principal_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Application marked ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-rp-applications"] });
  }

  async function approve(app: {
    id: string;
    user_id: string;
    headline: string | null;
    bio: string;
    expertise: string[];
    speaking_topics: string[];
    credentials: string | null;
    linkedin_url: string | null;
  }) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, school_name, city, country, avatar_url")
      .eq("id", app.user_id)
      .maybeSingle();

    const displayName = profile?.full_name || "Resource Principal";
    const { error } = await supabase.from("resource_principals").upsert(
      {
        user_id: app.user_id,
        slug: `${slugify(displayName)}-${app.user_id.slice(0, 6)}`,
        display_name: displayName,
        headline: app.headline,
        school_name: profile?.school_name ?? null,
        city: profile?.city ?? null,
        country: profile?.country ?? null,
        bio: app.bio,
        expertise: app.expertise,
        speaking_topics: app.speaking_topics,
        credentials: app.credentials,
        photo_url: profile?.avatar_url ?? null,
        linkedin_url: app.linkedin_url,
        status: "active",
      },
      { onConflict: "user_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("user_roles").insert({ user_id: app.user_id, role: "expert" });
    await setStatus(app.id, "approved");
    await supabase.from("notifications").insert({
      user_id: app.user_id,
      title: "You are now an AceEdX Resource Principal",
      body: "Your profile is live in the Resource Principal directory.",
      link: "/resource-principals",
    });
    void qc.invalidateQueries({ queryKey: ["admin-rp-directory"] });
  }

  if (apps.isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Applications</h2>
        {!apps.data?.length ? (
          <EmptyState
            title="No applications yet"
            description="Principals who apply to speak or teach will show up here."
          />
        ) : (
          apps.data.map((a) => (
            <div key={a.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold">
                    {a.headline || "Resource Principal application"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Pill tone={a.status === "approved" ? "success" : "primary"}>{a.status}</Pill>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{a.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(a.expertise ?? []).map((e: string) => (
                  <Pill key={e}>{e}</Pill>
                ))}
                {(a.speaking_topics ?? []).map((e: string) => (
                  <Pill key={e} tone="accent">
                    {e}
                  </Pill>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="brand" onClick={() => approve(a)}>
                  Approve &amp; publish profile
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "under_review")}>
                  Under review
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "rejected")}>
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Directory</h2>
        {!directory.data?.length ? (
          <EmptyState
            title="No Resource Principals yet"
            description="Approve an application to publish the first profile."
          />
        ) : (
          directory.data.map((rp) => (
            <DirectoryRow
              key={rp.id}
              rp={rp}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin-rp-directory"] })}
            />
          ))
        )}
      </section>
    </div>
  );
}

function DirectoryRow({
  rp,
  onSaved,
}: {
  rp: {
    id: string;
    display_name: string;
    headline: string | null;
    status: string;
    featured: boolean;
    revenue_share_pct: number;
  };
  onSaved: () => void;
}) {
  const [share, setShare] = useState(rp.revenue_share_pct);
  const [busy, setBusy] = useState(false);

  async function patch(values: Record<string, unknown>) {
    setBusy(true);
    const { error } = await supabase.from("resource_principals").update(values).eq("id", rp.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${rp.display_name} updated`);
    onSaved();
  }

  return (
    <div className="card-surface flex flex-wrap items-end justify-between gap-4 p-5">
      <div>
        <h3 className="font-display text-base font-semibold">{rp.display_name}</h3>
        <p className="text-xs text-muted-foreground">{rp.headline ?? "Resource Principal"}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={rp.status === "active"}
          onCheckedChange={(v) => patch({ status: v ? "active" : "suspended" })}
          aria-label={`Toggle listing for ${rp.display_name}`}
        />
        <span>{rp.status === "active" ? "Listed" : "Hidden"}</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={rp.featured}
          onCheckedChange={(v) => patch({ featured: v })}
          aria-label={`Feature ${rp.display_name}`}
        />
        <span>Featured</span>
      </label>
      <div className="w-40">
        <Label className="text-xs">Revenue share %</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={share}
            onChange={(e) => setShare(Number(e.target.value))}
          />
          <Button size="sm" disabled={busy} onClick={() => patch({ revenue_share_pct: share })}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
