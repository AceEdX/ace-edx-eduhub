import { Series } from "remotion";
import {
  SceneBrowse,
  SceneCommunity,
  SceneCourses,
  SceneIntro,
  SceneOutro,
  ScenePrincipals,
  SceneWebinars,
} from "./scenes/Scenes";

const SCENES = [
  { c: SceneIntro, d: 213 },
  { c: SceneBrowse, d: 322 },
  { c: SceneCourses, d: 307 },
  { c: SceneWebinars, d: 320 },
  { c: ScenePrincipals, d: 311 },
  { c: SceneCommunity, d: 256 },
  { c: SceneOutro, d: 168 },
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.d, 0);

export const MainVideo = () => (
  <Series>
    {SCENES.map(({ c: C, d }, i) => (
      <Series.Sequence key={i} durationInFrames={d}>
        <C />
      </Series.Sequence>
    ))}
  </Series>
);
