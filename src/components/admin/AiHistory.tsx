import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export type SavedGeneration = {
  id: string;
  kind: string;
  prompt: string;
  output: string;
  created_at: string;
};

export function useAiHistory(kind: string) {
  return useQuery({
    queryKey: ["ai-history", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generations")
        .select("id, kind, prompt, output, created_at")
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as SavedGeneration[];
    },
  });
}

export function useInvalidateAiHistory() {
  const qc = useQueryClient();
  return (kind: string) => void qc.invalidateQueries({ queryKey: ["ai-history", kind] });
}

export function AiHistoryPanel({
  kind,
  title = "Saved generations",
  onOpen,
}: {
  kind: string;
  title?: string;
  onOpen?: (row: SavedGeneration) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useAiHistory(kind);

  async function remove(id: string) {
    const { error } = await supabase.from("ai_generations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    void qc.invalidateQueries({ queryKey: ["ai-history", kind] });
  }

  if (isLoading) return <Skeleton className="mt-5 h-24 rounded-2xl" />;
  if (!data?.length) return null;

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground">
        Everything you generate is saved automatically. Open any item to reuse it, or delete it.
      </p>
      <div className="mt-3 space-y-2">
        {data.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.prompt.split("\n")[0] || row.kind}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>
            {onOpen && (
              <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
                Open
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(row.output);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => remove(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
