import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

export type WebinarNoticeKind = "registration" | "reminder-24h" | "reminder-1h" | "live-now" | "followup";

export interface WebinarNoticeProps {
  kind?: WebinarNoticeKind;
  name?: string;
  title?: string;
  startsAtText?: string;
  durationMin?: number;
  hostName?: string;
  joinUrl?: string;
  pageUrl?: string;
  replayUrl?: string;
  attended?: boolean;
  certificate?: boolean;
  whatsappUrl?: string;
}

const COPY: Record<WebinarNoticeKind, { heading: string; preview: string; intro: string; cta: string }> = {
  registration: {
    heading: "You're registered",
    preview: "Your seat is confirmed — here is your join link",
    intro: "Your seat is confirmed. Keep this email: the join link below opens the live room on AceEdX where the session, chat, Q&A and your certificate live.",
    cta: "Open your session page",
  },
  "reminder-24h": {
    heading: "Tomorrow: your session",
    preview: "Reminder — your webinar is tomorrow",
    intro: "A quick reminder that your session is tomorrow. Block the time in your calendar and join a few minutes early from the link below.",
    cta: "View session details",
  },
  "reminder-1h": {
    heading: "Starting in one hour",
    preview: "Your webinar starts in one hour",
    intro: "Your session starts in about an hour. The live room opens 15 minutes before the start so you can settle in.",
    cta: "Go to the live room",
  },
  "live-now": {
    heading: "We are live now",
    preview: "Your session has started — join now",
    intro: "The session has started. Join now to take part in the live chat, Q&A and polls. Attendance is tracked automatically for your certificate.",
    cta: "Join live now",
  },
  followup: {
    heading: "Thank you for joining",
    preview: "Your replay, resources and certificate",
    intro: "Thank you for being part of the session. Your replay and handouts are on the session page.",
    cta: "Watch the replay",
  },
};

export function WebinarNotice({
  kind = "registration",
  name = "there",
  title = "AceEdX webinar",
  startsAtText = "",
  durationMin = 60,
  hostName = "AceEdX Faculty",
  joinUrl = "https://eduhub.aceedx.com/webinars",
  pageUrl = "https://eduhub.aceedx.com/webinars",
  replayUrl,
  attended = false,
  certificate = false,
  whatsappUrl,
}: WebinarNoticeProps) {
  const c = COPY[kind] ?? COPY.registration;
  const primaryUrl = kind === "followup" ? replayUrl || pageUrl : kind === "registration" ? pageUrl : joinUrl;
  const followupIntro =
    kind === "followup"
      ? attended
        ? `Thank you for attending ${title}. ${certificate ? "Your participation certificate has been issued and is waiting in your credentials wallet. " : ""}The replay and handouts are on the session page.`
        : `We missed you at ${title}. The replay is now available on the session page so you can catch up at your own pace.`
      : c.intro;

  return (
    <Html>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e6e8ee", borderRadius: "12px", maxWidth: "560px", padding: "32px" }}>
          <Text style={{ color: "#F97316", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", margin: 0 }}>
            ACEEDX PRINCIPALX
          </Text>
          <Heading style={{ color: "#0F2B5B", fontSize: "24px", margin: "12px 0 8px" }}>{c.heading}</Heading>
          <Text style={{ color: "#334155", fontSize: "15px", lineHeight: "24px" }}>Hi {name},</Text>
          <Text style={{ color: "#334155", fontSize: "15px", lineHeight: "24px" }}>{followupIntro}</Text>

          <Section style={{ backgroundColor: "#f5f6f8", borderRadius: "10px", padding: "16px 18px", margin: "16px 0" }}>
            <Text style={{ color: "#0F2B5B", fontSize: "17px", fontWeight: 700, margin: "0 0 6px" }}>{title}</Text>
            {startsAtText ? <Text style={{ color: "#475569", fontSize: "14px", margin: "0 0 4px" }}>When: {startsAtText}</Text> : null}
            <Text style={{ color: "#475569", fontSize: "14px", margin: "0 0 4px" }}>Duration: {durationMin} minutes</Text>
            <Text style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Host: {hostName}</Text>
          </Section>

          <Button
            href={primaryUrl}
            style={{ backgroundColor: "#F97316", borderRadius: "8px", color: "#ffffff", fontSize: "15px", fontWeight: 700, padding: "12px 22px", textDecoration: "none" }}
          >
            {c.cta}
          </Button>

          {kind !== "followup" ? (
            <Text style={{ color: "#64748b", fontSize: "13px", lineHeight: "20px", marginTop: "18px" }}>
              Join link: <Link href={joinUrl} style={{ color: "#0F2B5B" }}>{joinUrl}</Link>
            </Text>
          ) : null}
          {whatsappUrl ? (
            <Text style={{ color: "#64748b", fontSize: "13px", lineHeight: "20px" }}>
              Prefer WhatsApp? <Link href={whatsappUrl} style={{ color: "#16a34a" }}>Get this link on WhatsApp</Link>
            </Text>
          ) : null}
          <Text style={{ color: "#94a3b8", fontSize: "12px", marginTop: "24px" }}>
            AceEdX EduHub · www.aceedx.com · The professional ecosystem for school principals
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const base = {
  component: WebinarNotice,
  previewData: {
    name: "Priya",
    title: "Leading teacher retention in 2026",
    startsAtText: "Sat 12 Sep 2026, 11:00 IST",
    durationMin: 60,
    hostName: "Dr. Meera Nair",
    joinUrl: "https://eduhub.aceedx.com/live/leading-teacher-retention",
    pageUrl: "https://eduhub.aceedx.com/webinars/leading-teacher-retention",
  },
};

export const registrationTemplate = {
  ...base,
  subject: (d: Record<string, any>) => `You're registered: ${d.title ?? "your AceEdX session"}`,
  displayName: "Webinar — registration confirmed",
  previewData: { ...base.previewData, kind: "registration" },
} satisfies TemplateEntry;

export const reminder24hTemplate = {
  ...base,
  subject: (d: Record<string, any>) => `Tomorrow: ${d.title ?? "your AceEdX session"}`,
  displayName: "Webinar — 24 hour reminder",
  previewData: { ...base.previewData, kind: "reminder-24h" },
} satisfies TemplateEntry;

export const reminder1hTemplate = {
  ...base,
  subject: (d: Record<string, any>) => `Starting in 1 hour: ${d.title ?? "your AceEdX session"}`,
  displayName: "Webinar — 1 hour reminder",
  previewData: { ...base.previewData, kind: "reminder-1h" },
} satisfies TemplateEntry;

export const liveNowTemplate = {
  ...base,
  subject: (d: Record<string, any>) => `We are live: ${d.title ?? "your AceEdX session"}`,
  displayName: "Webinar — live now",
  previewData: { ...base.previewData, kind: "live-now" },
} satisfies TemplateEntry;

export const followupTemplate = {
  ...base,
  subject: (d: Record<string, any>) =>
    d.attended ? `Thank you for joining ${d.title ?? "the session"}` : `Replay ready: ${d.title ?? "your AceEdX session"}`,
  displayName: "Webinar — follow-up (attended / missed)",
  previewData: { ...base.previewData, kind: "followup", attended: true, certificate: true },
} satisfies TemplateEntry;
