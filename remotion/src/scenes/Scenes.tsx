import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Card, CREAM, Drift, Eyebrow, GREEN, NAVY, ORANGE, SceneBg, Sub, Title, display, useRise } from "../theme";

const pad = { padding: "0 130px" } as React.CSSProperties;

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 30], [0.9, 1], { extrapolateRight: "clamp" });
  return (
    <SceneBg>
      <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
        <div style={{ ...useRise(0, 30), transform: `scale(${logoScale})`, transformOrigin: "left" }}>
          <span style={{ fontFamily: display, fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
            Ace<span style={{ color: ORANGE }}>EdX</span>
          </span>
        </div>
        <Title delay={10}>
          The professional home for
          <br />
          <span style={{ color: ORANGE }}>school leaders</span>
        </Title>
        <Sub delay={22}>Courses, live webinars, community and verifiable certificates — in one place.</Sub>
        <div style={{ ...useRise(34, 24), marginTop: 40, display: "flex", gap: 16 }}>
          {["Principals", "School owners", "Academic coordinators"].map((t) => (
            <span
              key={t}
              style={{
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 24,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </SceneBg>
  );
};

export const SceneBrowse: React.FC = () => (
  <SceneBg>
    <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
      <Eyebrow text="Step one" />
      <Title>Browse freely, before you sign in</Title>
      <div style={{ display: "flex", gap: 26, marginTop: 54 }}>
        {[
          { t: "Courses", d: "Self-paced programmes", c: ORANGE },
          { t: "Webinars", d: "Live and recorded", c: GREEN },
          { t: "Experts", d: "Verified faculty", c: "#7DA6FF" },
          { t: "Community", d: "Peer answers", c: ORANGE },
        ].map((c, i) => (
          <Card key={c.t} delay={10 + i * 7} accent={c.c} width={340}>
            <p style={{ fontFamily: display, fontSize: 40, margin: 0 }}>{c.t}</p>
            <p style={{ fontSize: 26, marginTop: 12, color: "rgba(255,255,255,0.65)" }}>{c.d}</p>
          </Card>
        ))}
      </div>
    </AbsoluteFill>
  </SceneBg>
);

export const SceneCourses: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [40, 200], [8, 86], { extrapolateRight: "clamp" });
  return (
    <SceneBg tint="#08182D">
      <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
        <Eyebrow text="Learning hub" />
        <Title>Learn at your own pace</Title>
        <div style={{ display: "flex", gap: 40, marginTop: 52, alignItems: "flex-start" }}>
          <Drift>
            <Card delay={14} width={620}>
              <p style={{ fontFamily: display, fontSize: 36, margin: 0 }}>Leading your first 100 days</p>
              <div style={{ marginTop: 26, height: 14, borderRadius: 99, background: "rgba(255,255,255,0.12)" }}>
                <div style={{ width: `${progress}%`, height: 14, borderRadius: 99, background: ORANGE }} />
              </div>
              <p style={{ marginTop: 14, fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
                {Math.round(progress)}% complete
              </p>
            </Card>
          </Drift>
          <div style={{ display: "grid", gap: 18 }}>
            {["Video lessons", "Readings and templates", "Downloadable resources"].map((t, i) => (
              <div
                key={t}
                style={{
                  ...useRise(26 + i * 8, 30),
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 30,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 4, background: GREEN }} /> {t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </SceneBg>
  );
};

export const SceneWebinars: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.06;
  return (
    <SceneBg>
      <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
        <Eyebrow text="Live sessions" />
        <Title>Webinars and masterclasses</Title>
        <div style={{ display: "flex", gap: 26, marginTop: 52, alignItems: "center" }}>
          <Card delay={12} width={560} accent={GREEN}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 99,
                  background: "#EF4444",
                  transform: `scale(${pulse})`,
                }}
              />
              <span style={{ fontSize: 24, letterSpacing: 2, color: "#EF4444", fontWeight: 600 }}>LIVE NOW</span>
            </div>
            <p style={{ fontFamily: display, fontSize: 38, marginTop: 18 }}>Building an AI policy for your school</p>
            <p style={{ fontSize: 25, color: "rgba(255,255,255,0.62)" }}>Zoom · YouTube Live · replay included</p>
          </Card>
          <div style={{ display: "grid", gap: 20 }}>
            {["One-click registration", "Free and paid sessions", "Watch the replay any time"].map((t, i) => (
              <div key={t} style={{ ...useRise(24 + i * 8, 30), fontSize: 30, color: "rgba(255,255,255,0.85)" }}>
                → {t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </SceneBg>
  );
};

export const ScenePrincipals: React.FC = () => (
  <SceneBg tint="#08182D">
    <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
      <Eyebrow text="Faculty" />
      <Title>Meet the Resource Principals</Title>
      <div style={{ display: "flex", gap: 24, marginTop: 50 }}>
        {[
          { n: "Verified leaders", i: "VL" },
          { n: "Teach and mentor", i: "TM" },
          { n: "Open to every member", i: "OM" },
        ].map((p, idx) => (
          <Card key={p.n} delay={12 + idx * 9} width={400} accent={idx === 1 ? GREEN : ORANGE}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 99,
                  background: idx === 1 ? GREEN : ORANGE,
                  color: NAVY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: display,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {p.i}
              </div>
              <p style={{ fontFamily: display, fontSize: 30, margin: 0 }}>{p.n}</p>
            </div>
          </Card>
        ))}
      </div>
      <Sub delay={40}>Every signed-in member can browse the full directory and request a speaker.</Sub>
    </AbsoluteFill>
  </SceneBg>
);

export const SceneCommunity: React.FC = () => (
  <SceneBg>
    <AbsoluteFill style={{ justifyContent: "center", ...pad }}>
      <Eyebrow text="Community and proof" />
      <Title>Ask, download, get certified</Title>
      <div style={{ display: "flex", gap: 26, marginTop: 52 }}>
        <Card delay={12} width={520}>
          <p style={{ fontSize: 28, margin: 0, color: "rgba(255,255,255,0.85)" }}>
            “How are you staffing your new NEP electives?”
          </p>
          <p style={{ marginTop: 18, fontSize: 24, color: GREEN }}>4 replies from principals</p>
        </Card>
        <Card delay={22} width={460} accent={GREEN}>
          <p style={{ fontFamily: display, fontSize: 32, margin: 0 }}>Resource library</p>
          <p style={{ fontSize: 25, marginTop: 12, color: "rgba(255,255,255,0.65)" }}>
            Official NEP, NCF and SMC guides as ready PDFs
          </p>
        </Card>
        <Drift>
          <Card delay={32} width={380}>
            <p style={{ fontFamily: display, fontSize: 30, margin: 0 }}>Certificate</p>
            <p style={{ fontSize: 24, marginTop: 12, color: "rgba(255,255,255,0.65)" }}>
              Verifiable, downloadable, shareable
            </p>
            <div style={{ marginTop: 18, fontSize: 44, color: ORANGE }}>★</div>
          </Card>
        </Drift>
      </div>
    </AbsoluteFill>
  </SceneBg>
);

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: CREAM, color: NAVY, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 520px at 50% 55%, rgba(249,115,22,${0.18 * glow}) 0%, transparent 70%)`,
        }}
      />
      <div style={{ ...useRise(4, 40), textAlign: "center" }}>
        <p style={{ fontFamily: display, fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
          Ace<span style={{ color: ORANGE }}>EdX</span>
        </p>
        <p style={{ fontFamily: display, fontSize: 78, fontWeight: 700, margin: "20px 0 0", lineHeight: 1.1 }}>
          Lead a better school
        </p>
        <p style={{ fontSize: 32, marginTop: 22, color: "rgba(11,31,58,0.7)" }}>
          Create your free account at aceedx.com
        </p>
        <div
          style={{
            ...useRise(28, 24),
            marginTop: 40,
            display: "inline-block",
            padding: "20px 44px",
            borderRadius: 999,
            background: ORANGE,
            color: "#fff",
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          Get started free
        </div>
      </div>
    </AbsoluteFill>
  );
};
