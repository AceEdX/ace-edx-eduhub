import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

function CouponsAdmin() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [value, setValue] = useState("20");
  const [appliesTo, setAppliesTo] = useState("all");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (code.trim().length < 3) {
      toast.error("Coupon code is too short");
      return;
    }
    const { error } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(value) || 0,
      applies_to: appliesTo,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Coupon created");
    setCode("");
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Create a coupon</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Code</Label>
            <Input value={code} placeholder="LEAD20" onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Discount type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off</SelectItem>
                <SelectItem value="flat">Flat ₹ off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Applies to</Label>
            <Select value={appliesTo} onValueChange={setAppliesTo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                <SelectItem value="course">Courses</SelectItem>
                <SelectItem value="webinar">Webinars &amp; masterclasses</SelectItem>
                <SelectItem value="subscription">Subscriptions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Max redemptions</Label>
            <Input
              type="number"
              value={maxRedemptions}
              placeholder="Unlimited"
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Expires</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={create}>
          <Plus className="h-4 w-4" /> Create coupon
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !data?.length ? (
        <EmptyState title="No coupons yet" description="Discount codes you create appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-mono font-semibold">{c.code}</p>
                <p className="text-xs text-muted-foreground">
                  {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`} ·{" "}
                  {c.applies_to} · used {c.redemptions}
                  {c.max_redemptions ? `/${c.max_redemptions}` : ""}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
                {c.active ? "Active" : "Paused"}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlansAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subs = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end, plan_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function update(id: string, values: { price_inr?: number; active?: boolean }) {
    const { error } = await supabase.from("subscription_plans").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plan updated");
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;

  return (
    <div className="space-y-5">
      {(data ?? []).map((p) => (
        <div key={p.id} className="card-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.tagline}</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={p.active} onCheckedChange={(v) => update(p.id, { active: v })} />
              {p.active ? "Live" : "Hidden"}
            </label>
          </div>
          <div className="mt-4 max-w-xs">
            <Label className="text-xs">Price (₹ per {p.interval_months} months)</Label>
            <Input
              type="number"
              defaultValue={p.price_inr}
              onBlur={(e) => update(p.id, { price_inr: Number(e.target.value) })}
            />
          </div>
        </div>
      ))}

      <div className="card-surface p-5">
        <h3 className="font-display text-lg font-semibold">Active subscriptions</h3>
        {!subs.data?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {subs.data.map((s) => (
              <li key={s.id} className="flex justify-between border-t border-border pt-2">
                <span className="capitalize">{s.status}</span>
                <span className="text-muted-foreground">
                  renews {new Date(s.current_period_end).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RevenueSharesAdmin() {
  const qc = useQueryClient();
  const [principalId, setPrincipalId] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [gross, setGross] = useState("");
  const [pct, setPct] = useState("30");

  const principals = useQuery({
    queryKey: ["admin-principals-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_principals")
        .select("id, display_name, revenue_share_pct")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const shares = useQuery({
    queryKey: ["admin-revenue-shares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_shares")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    const grossInr = Number(gross) || 0;
    const sharePct = Number(pct) || 0;
    if (!principalId || !itemTitle.trim() || grossInr <= 0) {
      toast.error("Pick a principal, an item and an amount");
      return;
    }
    const { error } = await supabase.from("revenue_shares").insert({
      principal_id: principalId,
      item_title: itemTitle.trim(),
      gross_inr: grossInr,
      share_pct: sharePct,
      payout_inr: Math.round((grossInr * sharePct) / 100),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Revenue share recorded");
    setItemTitle("");
    setGross("");
    qc.invalidateQueries({ queryKey: ["admin-revenue-shares"] });
  }

  async function markPaid(id: string) {
    const { error } = await supabase.from("revenue_shares").update({ status: "paid" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-revenue-shares"] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Record a revenue share</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Resource Principal</Label>
            <Select
              value={principalId}
              onValueChange={(v) => {
                setPrincipalId(v);
                const match = (principals.data ?? []).find((p) => p.id === v);
                if (match) setPct(String(match.revenue_share_pct));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {(principals.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Gross (₹)</Label>
            <Input type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Share %</Label>
            <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Label className="text-xs">Item</Label>
            <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={create}>
          <Plus className="h-4 w-4" /> Record share
        </Button>
      </div>

      {!shares.data?.length ? (
        <EmptyState
          title="No payouts recorded"
          description="Revenue shares for Resource Principals will appear here."
        />
      ) : (
        <div className="space-y-3">
          {shares.data.map((s) => (
            <div key={s.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">{s.item_title}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{s.gross_inr.toLocaleString("en-IN")} gross · {s.share_pct}% · payout ₹
                  {s.payout_inr.toLocaleString("en-IN")}
                </p>
              </div>
              {s.status === "paid" ? (
                <span className="text-xs font-medium text-success">Paid</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => markPaid(s.id)}>
                  Mark paid
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MonetizationAdmin() {
  return (
    <Tabs defaultValue="coupons">
      <TabsList className="mb-5 flex-wrap">
        <TabsTrigger value="coupons">Coupons</TabsTrigger>
        <TabsTrigger value="plans">Plans &amp; subscriptions</TabsTrigger>
        <TabsTrigger value="shares">Revenue sharing</TabsTrigger>
      </TabsList>
      <TabsContent value="coupons">
        <CouponsAdmin />
      </TabsContent>
      <TabsContent value="plans">
        <PlansAdmin />
      </TabsContent>
      <TabsContent value="shares">
        <RevenueSharesAdmin />
      </TabsContent>
    </Tabs>
  );
}
