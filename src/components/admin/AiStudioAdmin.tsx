import { useState } from "react";
import { toast } from "sonner";
import { Copy, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildWebinarPlan, processTranscript, repurposeContent } from "@/lib/ai.functions";

function OutputPanel({ text, busy }: { text: string; busy: boolean }) {
  if (busy) return <Skeleton className="mt-5 h-64 rounded-2xl" />;
  if (!text) return null;
  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{text}</pre>
    </div>
  );
}

function WebinarBuilder() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [duration, setDuration] = useState("60");
  const [programType, setProgramType] = useState("webinar");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (topic.trim().length < 3) {
      toast.error("Add a topic first");
      return;
    }
    setBusy(true);
    setOutput("");
    try {
      const res = await buildWebinarPlan({
        data: {
          topic: topic.trim(),
          audience: audience.trim(),
          durationMin: Number(duration),
          programType: programType as "webinar" | "masterclass" | "workshop",
        },
      });
      setOutput(res.output);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface p-5">
      <h3 className="font-display text-lg font-semibold">AI webinar builder</h3>
      <p className="text-sm text-muted-foreground">
        Generate titles, description, outcomes, run of show and an invite email in one click.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Topic</Label>
          <Input
            value={topic}
            placeholder="Building an NEP-aligned assessment culture"
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Audience</Label>
          <Input
            value={audience}
            placeholder="Principals of CBSE schools"
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Minutes</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Format</Label>
            <Select value={programType} onValueChange={setProgramType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webinar">Webinar</SelectItem>
                <SelectItem value="masterclass">Masterclass</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Button variant="brand" className="mt-4" onClick={run} disabled={busy}>
        <Wand2 className="h-4 w-4" /> {busy ? "Designing…" : "Generate plan"}
      </Button>
      <OutputPanel text={output} busy={busy} />
    </div>
  );
}

function TranscriptStudio() {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (transcript.trim().length < 50) {
      toast.error("Paste at least a few lines of the transcript");
      return;
    }
    setBusy(true);
    setOutput("");
    try {
      const res = await processTranscript({
        data: { transcript: transcript.trim(), title: title.trim() },
      });
      setOutput(res.output);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not process the transcript");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface p-5">
      <h3 className="font-display text-lg font-semibold">Transcript processing</h3>
      <p className="text-sm text-muted-foreground">
        Turn a session transcript into a summary, takeaways, chapters and an action checklist.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-xs">Session title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Transcript</Label>
          <Textarea rows={10} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>
      </div>
      <Button variant="brand" className="mt-4" onClick={run} disabled={busy}>
        <Sparkles className="h-4 w-4" /> {busy ? "Processing…" : "Process transcript"}
      </Button>
      <OutputPanel text={output} busy={busy} />
    </div>
  );
}

const CHANNELS = ["LinkedIn", "Instagram", "Reel/Short script", "YouTube", "Facebook", "X (Twitter)"];

function RepurposeStudio() {
  const [source, setSource] = useState("");
  const [channels, setChannels] = useState<string[]>(["LinkedIn", "Instagram"]);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function run() {
    if (source.trim().length < 30) {
      toast.error("Paste the source content first");
      return;
    }
    if (!channels.length) {
      toast.error("Pick at least one channel");
      return;
    }
    setBusy(true);
    setOutput("");
    try {
      const res = await repurposeContent({ data: { source: source.trim(), channels } });
      setOutput(res.output);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not repurpose that content");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface p-5">
      <h3 className="font-display text-lg font-semibold">AI content repurposing</h3>
      <p className="text-sm text-muted-foreground">
        Convert a webinar, article or transcript into ready-to-post copy for every channel.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-xs">Source content</Label>
          <Textarea rows={8} value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                channels.includes(c)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <Button variant="brand" className="mt-4" onClick={run} disabled={busy}>
        <Sparkles className="h-4 w-4" /> {busy ? "Writing…" : "Generate posts"}
      </Button>
      <OutputPanel text={output} busy={busy} />
    </div>
  );
}

export function AiStudioAdmin() {
  return (
    <Tabs defaultValue="webinar">
      <TabsList className="mb-5 flex-wrap">
        <TabsTrigger value="webinar">Webinar builder</TabsTrigger>
        <TabsTrigger value="transcript">Transcripts</TabsTrigger>
        <TabsTrigger value="repurpose">Repurposing</TabsTrigger>
      </TabsList>
      <TabsContent value="webinar">
        <WebinarBuilder />
      </TabsContent>
      <TabsContent value="transcript">
        <TranscriptStudio />
      </TabsContent>
      <TabsContent value="repurpose">
        <RepurposeStudio />
      </TabsContent>
    </Tabs>
  );
}
