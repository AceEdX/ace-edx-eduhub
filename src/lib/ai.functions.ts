import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-2.5-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: ChatMessage[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("The AI service is not configured yet.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (res.status === 429) throw new Error("The AI studio is busy right now. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to continue.");
  if (!res.ok) {
    console.error("[ai] gateway error", res.status, await res.text());
    throw new Error("The AI service could not complete that request.");
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The AI service returned an empty response.");
  return text;
}

type LogContext = {
  supabase: { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } };
  userId: string;
};

async function logGeneration(
  context: LogContext,
  kind: string,
  prompt: string,
  output: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await context.supabase.from("ai_generations").insert({
      user_id: context.userId,
      kind,
      prompt: prompt.slice(0, 4000),
      output,
      meta,
    });
  } catch (error) {
    console.error("[ai] could not log generation", error);
  }
}

/* ------------------------------ Webinar builder ----------------------------- */

const webinarSchema = z.object({
  topic: z.string().min(3).max(300),
  audience: z.string().max(200).optional(),
  durationMin: z.number().int().min(15).max(240).default(60),
  programType: z.enum(["webinar", "masterclass", "workshop"]).default("webinar"),
});

export const buildWebinarPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => webinarSchema.parse(data))
  .handler(async ({ data, context }) => {
    const prompt = `Design a ${data.durationMin}-minute ${data.programType} for school principals and education leaders in India.
Topic: ${data.topic}
Audience: ${data.audience || "School principals, owners and senior academic leaders"}

Return clean markdown with these sections:
1. Title options (3)
2. One-paragraph promotional description
3. Learning outcomes (5 bullets)
4. Minute-by-minute run of show
5. Speaker talking points
6. Three audience poll or Q&A prompts
7. A short registration email invite`;

    const output = await callGateway([
      {
        role: "system",
        content:
          "You are an expert instructional designer for K-12 school leadership programmes in India. You reference NEP 2020, CBSE and NCF practice where relevant. Be concrete and practical.",
      },
      { role: "user", content: prompt },
    ]);

    await logGeneration(context as unknown as LogContext, "webinar_plan", prompt, output, {
      topic: data.topic,
    });
    return { output };
  });

/* ------------------------------ Course assistant ---------------------------- */

const assistantSchema = z.object({
  question: z.string().min(2).max(1000),
  courseTitle: z.string().max(300).optional(),
  lessonTitle: z.string().max(300).optional(),
  lessonContent: z.string().max(6000).optional(),
});

export const askCourseAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => assistantSchema.parse(data))
  .handler(async ({ data, context }) => {
    const output = await callGateway([
      {
        role: "system",
        content:
          "You are the AceEdX course assistant helping a school principal understand a lesson. Answer in under 220 words, in plain English, with practical school examples. If the lesson notes do not cover the question, say so and give general best practice.",
      },
      {
        role: "user",
        content: `Course: ${data.courseTitle ?? "—"}
Lesson: ${data.lessonTitle ?? "—"}
Lesson notes:
${data.lessonContent?.slice(0, 6000) || "(no notes available)"}

Question: ${data.question}`,
      },
    ]);

    await logGeneration(context as unknown as LogContext, "course_assistant", data.question, output, {
      lesson: data.lessonTitle,
    });
    return { output };
  });

/* ----------------------------- Transcript processing ------------------------ */

const transcriptSchema = z.object({
  transcript: z.string().min(50).max(30000),
  title: z.string().max(300).optional(),
});

export const processTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => transcriptSchema.parse(data))
  .handler(async ({ data, context }) => {
    const output = await callGateway([
      {
        role: "system",
        content:
          "You turn raw session transcripts into publishable learning assets for school leaders. Output clean markdown only.",
      },
      {
        role: "user",
        content: `Session: ${data.title ?? "Untitled session"}

Transcript:
"""
${data.transcript}
"""

Produce:
1. A 120-word executive summary
2. Ten key takeaways
3. Chapter markers with approximate ordering
4. Five quotable lines
5. A short action checklist a principal can use on Monday morning`,
      },
    ]);

    await logGeneration(
      context as unknown as LogContext,
      "transcript",
      data.title ?? "transcript",
      output,
      { length: data.transcript.length },
    );
    return { output };
  });

/* ------------------------------ Content repurposing ------------------------- */

const repurposeSchema = z.object({
  source: z.string().min(30).max(20000),
  channels: z.array(z.string()).min(1),
  tone: z.string().max(80).optional(),
});

export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => repurposeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const output = await callGateway([
      {
        role: "system",
        content:
          "You are a social media editor for an education leadership brand. Write ready-to-post copy, no placeholders, no explanations. Use a heading for each channel.",
      },
      {
        role: "user",
        content: `Source material:
"""
${data.source}
"""

Create posts for: ${data.channels.join(", ")}.
Tone: ${data.tone || "credible, warm, practitioner-to-practitioner"}.
For each channel respect its norms: LinkedIn 150-220 words with a hook and 3 hashtags; Instagram caption under 120 words with emojis and 8 hashtags; a 45-second Reel/Short script with on-screen text cues; YouTube title + description + tags; Facebook post under 100 words; X/Twitter thread of 5 posts.`,
      },
    ]);

    await logGeneration(
      context as unknown as LogContext,
      "repurpose",
      data.channels.join(","),
      output,
      { channels: data.channels },
    );
    return { output };
  });

/* --------------------------- AI Principal Assistant ------------------------- */

const principalSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export const askPrincipalAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => principalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const output = await callGateway([
      {
        role: "system",
        content:
          "You are the AceEdX Principal Assistant — a trusted advisor to school principals and owners in India. You help with school leadership, admissions and growth, NEP 2020 and NCF implementation, CBSE/state compliance, teacher development, parent communication, budgets, staffing and student wellbeing. Give specific, actionable answers with steps, templates or scripts where useful. Keep answers under 300 words unless asked for more. Never invent regulations — if unsure, say what to verify and where.",
      },
      ...data.messages,
    ]);

    await logGeneration(
      context as unknown as LogContext,
      "principal_assistant",
      data.messages.at(-1)?.content ?? "",
      output,
    );
    return { output };
  });
