import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askPrincipalAssistant } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Principal Assistant — instant leadership advice | AceEdX" },
      {
        name: "description",
        content:
          "Ask the AI Principal Assistant about NEP 2020, admissions, staffing, compliance and parent communication — practical answers built for Indian school leaders.",
      },
      { property: "og:title", content: "AI Principal Assistant — AceEdX" },
      {
        property: "og:description",
        content: "Practical, India-specific answers for school leadership decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Draft a parent communication plan for a fee revision this term",
  "How do I structure NEP 2020 competency-based assessment in grades 6-8?",
  "Build a 90-day plan to improve teacher retention in my school",
  "What should my admissions funnel look like for the next intake?",
];

function AssistantPage() {
  const { user, loading } = useAuth();
  const ask = useServerFn(askPrincipalAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    if (!user) {
      toast.error("Sign in to use the assistant");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next.slice(-20) } });
      setMessages([...next, { role: "assistant", content: res.output }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assistant could not reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="AI"
        title="AI Principal Assistant"
        description="A private advisor trained on the realities of Indian school leadership — policy, people, parents and profitability. Ask anything; get an answer you can act on this week."
      />
      <div className="container-page py-10">
        <div className="card-surface flex h-[70vh] flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-xl text-center">
                <Sparkles className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Start with one of these, or ask your own question.
                </p>
                <div className="mt-5 grid gap-2 text-left">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:border-accent hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-accent-soft text-accent"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <p className="text-sm text-muted-foreground">The assistant is thinking…</p>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-4">
            {!user && !loading ? (
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-accent">
                  Sign in
                </Link>{" "}
                to chat with the assistant.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-3"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={2}
                  placeholder="Ask about NEP, staffing, admissions, compliance, budgets…"
                  className="flex-1 resize-none"
                />
                <Button type="submit" variant="brand" disabled={busy || !input.trim()}>
                  <Send className="h-4 w-4" /> Ask
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
