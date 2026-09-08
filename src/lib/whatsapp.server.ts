// Server-only: WhatsApp Cloud API sender.
// Reads WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID at call time.

const GRAPH = "https://graph.facebook.com/v21.0";

/** Normalises an Indian-first phone number to WhatsApp's digits-only format. */
export function normaliseWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith("0")) digits = `91${digits.replace(/^0+/, "")}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export interface WhatsAppSendResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

export function isWhatsAppConfigured() {
  return Boolean(process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]);
}

/**
 * Sends a plain text WhatsApp message and logs the attempt.
 * Never throws — messaging failures must not break payments or webinars.
 */
export async function sendWhatsAppText(opts: {
  to: string | null | undefined;
  body: string;
  userId?: string | null;
  kind?: string;
}): Promise<WhatsAppSendResult> {
  const token = process.env["WHATSAPP_ACCESS_TOKEN"];
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const to = normaliseWhatsAppNumber(opts.to);

  const log = async (status: string, extra: { error?: string; providerId?: string } = {}) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("whatsapp_messages").insert({
        user_id: opts.userId ?? null,
        to_number: to ?? String(opts.to ?? ""),
        kind: opts.kind ?? "text",
        body: opts.body,
        status,
        error: extra.error ?? null,
        provider_message_id: extra.providerId ?? null,
      });
    } catch {
      // logging is best effort
    }
  };

  if (!token || !phoneNumberId) {
    await log("skipped", { error: "WhatsApp not configured" });
    return { sent: false, reason: "not_configured" };
  }
  if (!to) {
    await log("skipped", { error: "No valid WhatsApp number" });
    return { sent: false, reason: "no_number" };
  }

  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: opts.body },
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      const message = payload.error?.message ?? `HTTP ${res.status}`;
      await log("failed", { error: message });
      return { sent: false, reason: message };
    }
    const messageId = payload.messages?.[0]?.id;
    await log("sent", { providerId: messageId });
    return { sent: true, messageId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log("failed", { error: message });
    return { sent: false, reason: message };
  }
}

/** Looks up a member's saved WhatsApp number. */
export async function getUserWhatsAppNumber(userId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("whatsapp_number")
      .eq("id", userId)
      .maybeSingle();
    return (data as { whatsapp_number?: string | null } | null)?.whatsapp_number ?? null;
  } catch {
    return null;
  }
}
