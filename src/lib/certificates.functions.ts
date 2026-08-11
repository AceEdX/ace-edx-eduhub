import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ certificateId: z.string().trim().min(3).max(64) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("verify_certificate", {
      _certificate_id: data.certificateId,
    });
    if (error) throw new Error("Could not verify this certificate");
    const row = Array.isArray(rows) ? rows[0] : rows;
    return (row ?? null) as Record<string, unknown> | null;
  });
