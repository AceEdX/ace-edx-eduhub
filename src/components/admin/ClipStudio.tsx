import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Film, Linkedin, Scissors, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { planReelClips, transcribeMedia, type ClipSuggestion } from "@/lib/ai.functions";
import { publishLinkedInPost } from "@/lib/social.functions";
import { extractWavBase64 } from "@/lib/audio-extract";


const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

type Orientation = "vertical" | "square" | "landscape";

const SIZES: Record<Orientation, { w: number; h: number }> = {
  vertical: { w: 720, h: 1280 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1280, h: 720 },
};

export function ClipStudio({ allowLinkedIn = true }: { allowLinkedIn?: boolean } = {}) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(45);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [hook, setHook] = useState("");
  const [caption, setCaption] = useState("");
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [planning, setPlanning] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clipBlob, setClipBlob] = useState<Blob | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function transcribe(source: File | Blob | string, label?: string) {
    setTranscribing(true);
    try {
      const { base64 } = await extractWavBase64(source, 600);
      const res = await transcribeMedia({
        data: { audioBase64: base64, format: "wav", title: label || title || "Recording" },
      });
      setTranscript(res.output);
      toast.success("Transcript generated");
      return res.output;
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? `Automatic transcript failed: ${error.message}`
          : "Automatic transcript failed",
      );
      return "";
    } finally {
      setTranscribing(false);
    }
  }

  function loadFile(file: File) {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setSourceLabel(file.name);
    setIsRemote(false);
    const label = file.name.replace(/\.[^.]+$/, "");
    if (!title) setTitle(label);
    void transcribe(file, label);
  }

  function loadRemote(url: string) {
    setSourceUrl(url);
    setSourceLabel(url);
    setIsRemote(true);
    void transcribe(url);
  }


  async function plan() {
    if (!duration) {
      toast.error("Load the webinar recording first");
      return;
    }
    setPlanning(true);
    try {
      const res = await planReelClips({
        data: {
          title: title.trim() || "Webinar",
          durationSec: Math.floor(duration),
          transcript: transcript.trim() || undefined,
          count: 3,
        },
      });
      setSuggestions(res.clips);
      toast.success(`${res.clips.length} clip ideas ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not plan clips");
    } finally {
      setPlanning(false);
    }
  }

  async function renderClip() {
    const video = videoRef.current;
    if (!video || !sourceUrl) {
      toast.error("Load a recording first");
      return;
    }
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      toast.error("This browser cannot record clips. Try Chrome.");
      return;
    }

    setRendering(true);
    setProgress(0);
    setClipBlob(null);
    setClipUrl("");
    setSavedUrl("");

    try {
      const { w, h } = SIZES[orientation];
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable");

      video.pause();
      video.currentTime = start;
      video.muted = false;
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener("seeked", onSeek);
          resolve();
        };
        video.addEventListener("seeked", onSeek);
      });

      const canvasStream = canvas.captureStream(30);
      const tracks = [...canvasStream.getVideoTracks()];
      try {
        const media = video as HTMLVideoElement & { captureStream?: () => MediaStream };
        const audio = media.captureStream?.().getAudioTracks() ?? [];
        tracks.push(...audio);
      } catch {
        // audio capture unavailable (usually a cross-origin file) — render silent video
      }
      const stream = new MediaStream(tracks);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      let raf = 0;
      const draw = () => {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          const scale = Math.max(w / vw, h / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.fillStyle = "#0b1220";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
          if (hook.trim()) {
            const fontSize = Math.round(w * 0.055);
            ctx.font = `700 ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            const words = hook.trim().split(/\s+/);
            const lines: string[] = [];
            let line = "";
            words.forEach((word) => {
              const next = line ? `${line} ${word}` : word;
              if (ctx.measureText(next).width > w * 0.86 && line) {
                lines.push(line);
                line = word;
              } else {
                line = next;
              }
            });
            if (line) lines.push(line);
            const boxH = lines.length * fontSize * 1.35 + fontSize * 0.6;
            const top = h - boxH - h * 0.08;
            ctx.fillStyle = "rgba(11,18,32,0.72)";
            ctx.fillRect(w * 0.05, top, w * 0.9, boxH);
            ctx.fillStyle = "#ffffff";
            lines.forEach((l, i) => {
              ctx.fillText(l, w / 2, top + fontSize * (1.15 + i * 1.35));
            });
          }
        }
        setProgress(Math.min(100, ((video.currentTime - start) / (end - start)) * 100));
        if (video.currentTime >= end || video.ended) {
          cancelAnimationFrame(raf);
          video.pause();
          if (recorder.state === "recording") recorder.stop();
          return;
        }
        raf = requestAnimationFrame(draw);
      };

      recorder.start(250);
      await video.play();
      raf = requestAnimationFrame(draw);

      const blob = await done;
      stream.getTracks().forEach((t) => t.stop());
      setClipBlob(blob);
      setClipUrl(URL.createObjectURL(blob));
      setProgress(100);
      toast.success("Clip rendered");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not render the clip from this video",
      );
    } finally {
      setRendering(false);
    }
  }

  async function saveToLibrary() {
    if (!clipBlob) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      const path = `clips/${Date.now()}-${(title || "clip").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.webm`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, clipBlob, { contentType: clipBlob.type, upsert: false });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, TEN_YEARS);
      if (signErr) throw signErr;

      const { error: insErr } = await supabase.from("media_assets").insert({
        title: hook.trim() || title.trim() || "Webinar clip",
        description: caption.trim() || null,
        media_type: "reel",
        url: signed.signedUrl,
        duration_sec: Math.round(end - start),
        source_url: isRemote ? sourceUrl : null,
        clip_start_sec: Math.round(start),
        clip_end_sec: Math.round(end),
        transcript: transcript.trim() || null,
        published: true,
        created_by: userId,
      });
      if (insErr) throw insErr;

      setSavedUrl(signed.signedUrl);
      qc.invalidateQueries({ queryKey: ["admin-media"] });
      qc.invalidateQueries({ queryKey: ["media-library"] });
      qc.invalidateQueries({ queryKey: ["studio-clips"] });
      toast.success("Clip saved to the media library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the clip");
    } finally {
      setBusy(false);
    }
  }

  async function postToLinkedIn() {
    if (caption.trim().length < 5) {
      toast.error("Write or generate a caption first");
      return;
    }
    setBusy(true);
    try {
      const res = await publishLinkedInPost({
        data: {
          text: caption.trim(),
          ...(savedUrl ? { linkUrl: savedUrl } : {}),
        },
      });
      toast.success("Published to LinkedIn");
      window.open(res.publishedUrl, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LinkedIn publishing failed");
    } finally {
      setBusy(false);
    }
  }

  async function queueChannel(channel: "instagram" | "youtube") {
    if (caption.trim().length < 5) {
      toast.error("Write or generate a caption first");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("social_publications").insert({
      channel,
      caption: caption.trim(),
      link_url: savedUrl || null,
      status: "scheduled",
      created_by: auth.user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Queued for ${channel}`);
    qc.invalidateQueries({ queryKey: ["admin-publications"] });
  }


  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Reel clip studio</h3>
        <p className="text-sm text-muted-foreground">
          Load a webinar recording, let AI pick the strongest moments, then cut real vertical clips
          with burned-in hook text. Clips are saved to the media library and can be published to
          LinkedIn directly or queued for Instagram and YouTube.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Upload a recording (MP4 or WebM)</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">or paste a direct video link</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://…/recording.mp4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadRemote((e.target as HTMLInputElement).value.trim());
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) loadRemote(v);
                }}
              />
              <Button variant="outline" size="sm" type="button">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Webinar title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Transcript {transcribing ? "(generating automatically…)" : "(auto-generated)"}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                disabled={!sourceUrl || transcribing}
                onClick={() => void transcribe(isRemote ? sourceUrl : sourceUrl)}
              >
                <Sparkles className="h-3.5 w-3.5" /> Regenerate
              </Button>
            </div>
            <Textarea rows={2} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </div>

        </div>

        {sourceUrl ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <video
                ref={videoRef}
                src={sourceUrl}
                controls
                playsInline
                crossOrigin={isRemote ? "anonymous" : undefined}
                className="w-full rounded-xl bg-black"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d)) {
                    setDuration(d);
                    setEnd(Math.min(45, Math.floor(d)));
                  }
                }}
              />
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {sourceLabel} · {fmt(duration)} long
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start (s)</Label>
                  <Input
                    type="number"
                    value={start}
                    onChange={(e) => setStart(Number(e.target.value))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => setStart(Math.floor(videoRef.current?.currentTime ?? 0))}
                  >
                    Use playhead
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">End (s)</Label>
                  <Input
                    type="number"
                    value={end}
                    onChange={(e) => setEnd(Number(e.target.value))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => setEnd(Math.floor(videoRef.current?.currentTime ?? 0))}
                  >
                    Use playhead
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <div className="flex gap-2">
                  {(["vertical", "square", "landscape"] as Orientation[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOrientation(o)}
                      className={`flex-1 rounded-full border px-2 py-1.5 text-xs capitalize transition ${
                        orientation === o
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">On-screen hook</Label>
                <Input value={hook} onChange={(e) => setHook(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={plan} disabled={planning}>
                <Sparkles className="h-4 w-4" /> {planning ? "Finding moments…" : "AI clip ideas"}
              </Button>
              <Button variant="brand" size="sm" className="w-full" onClick={renderClip} disabled={rendering}>
                <Scissors className="h-4 w-4" />
                {rendering ? `Cutting… ${Math.round(progress)}%` : "Cut this clip"}
              </Button>
              {rendering && (
                <p className="text-xs text-muted-foreground">
                  Keep this tab open and visible while the clip records in real time.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Film className="mx-auto mb-2 h-5 w-5" />
            Upload a recording or paste a direct video link to start clipping.
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="card-surface space-y-3 p-5">
          <h4 className="font-medium">AI clip ideas</h4>
          {suggestions.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.hook}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(s.start)} to {fmt(s.end)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStart(s.start);
                  setEnd(s.end);
                  setHook(s.hook);
                  setCaption(s.caption);
                  videoRef.current?.setAttribute("data-seek", String(s.start));
                  if (videoRef.current) videoRef.current.currentTime = s.start;
                  toast.success("Clip range loaded");
                }}
              >
                Use this clip
              </Button>
            </div>
          ))}
        </div>
      )}

      {clipUrl && (
        <div className="card-surface grid gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <video src={clipUrl} controls className="w-full rounded-xl bg-black" />
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Caption</Label>
              <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="brand" size="sm" onClick={saveToLibrary} disabled={busy || !!savedUrl}>
                <Film className="h-4 w-4" /> {savedUrl ? "Saved" : "Save to library"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={clipUrl} download={`${(title || "clip").replace(/\s+/g, "-")}.webm`}>
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
              {allowLinkedIn && (
                <Button variant="outline" size="sm" onClick={postToLinkedIn} disabled={busy}>
                  <Linkedin className="h-4 w-4" /> Post to LinkedIn
                </Button>
              )}
              {!allowLinkedIn && (
                <Button variant="outline" size="sm" onClick={() => queueChannel("linkedin" as "instagram")}>
                  <Linkedin className="h-4 w-4" /> Queue for LinkedIn
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => queueChannel("instagram")}>
                Queue for Instagram
              </Button>
              <Button variant="outline" size="sm" onClick={() => queueChannel("youtube")}>
                Queue for YouTube
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              LinkedIn publishes straight from here through the connected account. Instagram and
              YouTube have no connected business account yet, so those posts are queued with the
              caption and clip link for upload.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
