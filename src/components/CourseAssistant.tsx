import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askCourseAssistant } from "@/lib/ai.functions";

export function CourseAssistant({
  courseTitle,
  lessonTitle,
  lessonContent,
}: {
  courseTitle?: string;
  lessonTitle?: string;
  lessonContent?: string | null;
}) {
  const ask = useServerFn(askCourseAssistant);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await ask({
        data: {
          question: question.trim().slice(0, 1000),
          courseTitle,
          lessonTitle,
          lessonContent: lessonContent?.slice(0, 6000) || undefined,
        },
      });
      setAnswer(res.output);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assistant could not reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface mt-10 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="font-display text-base font-semibold">Ask the AI course assistant</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Stuck on this lesson? Ask a question and get a practical answer grounded in the lesson
        notes.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. How would this look in a 600-student CBSE school?"
        />
        <Button type="submit" variant="brand" size="sm" disabled={busy || !question.trim()}>
          {busy ? "Thinking…" : "Ask assistant"}
        </Button>
      </form>
      {answer && (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-secondary p-4 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </section>
  );
}
