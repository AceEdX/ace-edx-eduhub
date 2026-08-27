import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

export const display = loadSora("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const body = loadManrope("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;

export const NAVY = "#0B1F3A";
export const NAVY_2 = "#12305C";
export const ORANGE = "#F97316";
export const GREEN = "#12B981";
export const CREAM = "#F7F4EE";

export function useRise(delay: number, distance = 40) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)`,
  } as React.CSSProperties;
}

export function Drift({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 40) * 6;
  return <div style={{ transform: `translateY(${y}px)` }}>{children}</div>;
}

export function SceneBg({ tint = NAVY, children }: { tint?: string; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const shift = interpolate(frame, [0, 300], [0, 60]);
  return (
    <AbsoluteFill style={{ background: tint, fontFamily: body, color: "#fff", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 620px at ${18 + shift / 6}% 12%, ${NAVY_2} 0%, transparent 70%), radial-gradient(700px 520px at 88% ${85 - shift / 8}%, rgba(249,115,22,0.22) 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          transform: `translateX(${-shift}px)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}

export function Eyebrow({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <div
      style={{
        ...useRise(delay, 20),
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        borderRadius: 999,
        background: "rgba(249,115,22,0.14)",
        color: ORANGE,
        fontWeight: 600,
        letterSpacing: 3,
        textTransform: "uppercase",
        fontSize: 20,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: ORANGE }} />
      {text}
    </div>
  );
}

export function Title({ children, delay = 6 }: { children: React.ReactNode; delay?: number }) {
  return (
    <h1
      style={{
        ...useRise(delay),
        fontFamily: display,
        fontWeight: 700,
        fontSize: 86,
        lineHeight: 1.05,
        margin: "26px 0 0",
        maxWidth: 1080,
      }}
    >
      {children}
    </h1>
  );
}

export function Sub({ children, delay = 14 }: { children: React.ReactNode; delay?: number }) {
  return (
    <p
      style={{
        ...useRise(delay, 26),
        fontSize: 32,
        lineHeight: 1.45,
        color: "rgba(255,255,255,0.72)",
        maxWidth: 860,
        marginTop: 24,
      }}
    >
      {children}
    </p>
  );
}

export function Card({
  children,
  delay = 0,
  accent = ORANGE,
  width = 420,
}: {
  children: React.ReactNode;
  delay?: number;
  accent?: string;
  width?: number;
}) {
  return (
    <div
      style={{
        ...useRise(delay, 60),
        width,
        borderRadius: 26,
        padding: 30,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderTop: `4px solid ${accent}`,
        boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}
