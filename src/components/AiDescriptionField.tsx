import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { writeDescription } from "@/lib/ai.functions";

type Props = {
  kind: "webinar" | "masterclass" | "workshop" | "course" | "media";
  title: string;
  topic?: string;
  durationMin?: number;
  label?: string;
  rows?: number;
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
};

/** Textarea with a "Write with AI" action that fills clean plain-text prose. */
export function AiDescriptionField({
  kind,
  title,
  topic,
  durationMin,
  label,
  rows = 4,
  value,
  onChange,
  onCommit,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (title.trim().length < 5) {
      toast.error("Add a clear title first, then let AI write the copy.");
      return;
    }
    setBusy(true);
    try {
      const res = await writeDescription({
        data: {
          kind,
          title: title.trim(),
          ...(topic ? { topic } : {}),
          ...(durationMin ? { durationMin } : {}),
        },
      });
      onChange(res.output);
      onCommit?.(res.output);
      toast.success("Draft written");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not write the copy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label ?? (kind === "course" ? "Summary" : "Description")}</Label>
        <Button variant="ghost" size="sm" onClick={generate} disabled={busy}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {busy ? "Writing…" : "Write with AI"}
        </Button>
      </div>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit?.(value)}
        placeholder="Two short paragraphs describing this programme."
      />
    </div>
  );
}
