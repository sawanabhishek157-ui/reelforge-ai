import React from "react";
import { Composition, registerRoot } from "remotion";

import { ReelComposition } from "./ReelComposition";
import type { Motion, Plan, Scene } from "./types";

/**
 * CAPABILITY SHOWCASE — a ~3-minute sizzle reel that exercises the whole engine:
 * the living-photo subject motion (locked background), real-physics particles,
 * depth parallax, cosmic/weather/magic/tech effect families, motion graphics,
 * kinetic captions, per-scene color grades, and the 3D branded outro finale.
 *
 * Not tied to any brand palette — each segment picks a bold, free-rein palette to
 * show the range. Every scene runs through LayeredScene (all source images have a
 * subject mask + clean background), so we get depth bands + grade + vignette +
 * grain on every shot. subjectMotion "none" = camera-led parallax; anything else
 * = locked background with only the subject alive.
 */

const FPS = 30;
const OUTRO_SEC = 5.0;

// Bold, non-brand palettes — [primary, secondary, accent] tint the effects.
const PAL = {
  COSMIC: ["#7C4DFF", "#FF4DD2", "#4DD0FF"],
  GOLD: ["#FFD54F", "#FF8F00", "#FFF8E1"],
  INFERNO: ["#FF3D00", "#FF9100", "#FFEA00"],
  AURORA: ["#00FFA3", "#00B3FF", "#B388FF"],
  ICE: ["#AEEFFF", "#7FD4FF", "#FFFFFF"],
  ROYAL: ["#B388FF", "#8C9EFF", "#FF80AB"],
  NEON: ["#39FF14", "#FF206E", "#05D9E8"],
  EMERALD: ["#00E676", "#1DE9B6", "#B9F6CA"],
  SUNSET: ["#FF6F61", "#FF3CAC", "#7849FF"],
  ELECTRIC: ["#00E5FF", "#FF00E5", "#FFFFFF"],
} as const;

// Source images (each has image.png + image.subject.mask.png + image.bg.png).
const R4 = (n: number) => `runs/run-4dfe382f4be1/scene-${n}`;
const R0 = (n: number) => `runs/run-0260f040a50e/scene-${n}`;
const R7 = (n: number) => `runs/run-756edb1d543d/scene-${n}`;

type Seg = {
  dir: string;
  dur: number;
  caption: string;
  effects: string[];
  motionGraphics?: string[];
  palette: readonly string[];
  motionPreset: string;
  subjectMotion: Scene["subjectMotion"];
  windMood?: Scene["windMood"];
  captionStyle: Scene["captionStyle"];
  motion: Motion;
};

const SEGMENTS: Seg[] = [
  { dir: R7(0), dur: 8, caption: "REELFORGE ENGINE", effects: ["nebula", "shootingStars", "starburst"], motionGraphics: ["starField", "cosmicDust"], palette: PAL.COSMIC, motionPreset: "zoomdrift", subjectMotion: "none", captionStyle: "wordPop", motion: "zoom-in" },
  { dir: R4(0), dur: 11, caption: "LIVING PHOTOS", effects: ["bokeh", "sparkles"], palette: PAL.GOLD, motionPreset: "zoomdrift", subjectMotion: "pendulum", windMood: "breeze", captionStyle: "lineUp", motion: "zoom-in" },
  { dir: R7(2), dur: 11, caption: "REAL PHYSICS", effects: ["petals", "embers"], palette: PAL.INFERNO, motionPreset: "orbit", subjectMotion: "none", windMood: "breeze", captionStyle: "karaoke", motion: "pan-right" },
  { dir: R0(3), dur: 11, caption: "DEPTH + PARALLAX", effects: ["fog", "godRays"], motionGraphics: ["lightRays"], palette: PAL.AURORA, motionPreset: "dolly", subjectMotion: "none", captionStyle: "wordPop", motion: "zoom-in" },
  { dir: R0(0), dur: 10, caption: "COSMIC FX", effects: ["nebula", "shootingStars", "aurora"], motionGraphics: ["starField"], palette: PAL.COSMIC, motionPreset: "vertical", subjectMotion: "none", windMood: "calm", captionStyle: "lineUp", motion: "zoom-out" },
  { dir: R0(1), dur: 10, caption: "WEATHER SYSTEMS", effects: ["rain", "clouds", "lightning"], palette: PAL.ICE, motionPreset: "zoomdrift", subjectMotion: "none", captionStyle: "karaoke", motion: "pan-left" },
  { dir: R4(3), dur: 11, caption: "MAGIC + PARTICLES", effects: ["sparkles", "fireflies", "magicDust"], palette: PAL.ROYAL, motionPreset: "zoomdrift", subjectMotion: "float", windMood: "breeze", captionStyle: "wordPop", motion: "zoom-in" },
  { dir: R4(1), dur: 10, caption: "MOTION GRAPHICS", effects: ["bokeh"], motionGraphics: ["zodiacWheel", "lightRays"], palette: PAL.GOLD, motionPreset: "vertical", subjectMotion: "none", captionStyle: "lineUp", motion: "zoom-in" },
  { dir: R0(2), dur: 10, caption: "NEON / TECH", effects: ["neonGlow", "gridLines", "glitch"], palette: PAL.NEON, motionPreset: "dolly", subjectMotion: "none", captionStyle: "karaoke", motion: "zoom-out" },
  { dir: R7(3), dur: 10, caption: "AURORA NIGHTS", effects: ["aurora", "shootingStars"], motionGraphics: ["starField"], palette: PAL.EMERALD, motionPreset: "vertical", subjectMotion: "none", captionStyle: "wordPop", motion: "pan-right" },
  { dir: R4(4), dur: 10, caption: "FIRE + EMBERS", effects: ["flame", "embers", "sparks"], palette: PAL.INFERNO, motionPreset: "zoomdrift", subjectMotion: "breathe", windMood: "breeze", captionStyle: "lineUp", motion: "zoom-in" },
  { dir: R7(4), dur: 9, caption: "WINTER", effects: ["snow", "fog"], palette: PAL.ICE, motionPreset: "orbit", subjectMotion: "none", captionStyle: "karaoke", motion: "zoom-in" },
  { dir: R4(2), dur: 10, caption: "FLOATING SUBJECTS", effects: ["bokeh", "sparkles"], palette: PAL.SUNSET, motionPreset: "zoomdrift", subjectMotion: "float", windMood: "breeze", captionStyle: "wordPop", motion: "zoom-out" },
  { dir: R0(3), dur: 10, caption: "PARTICLE STORMS", effects: ["petals", "leaves", "embers"], palette: PAL.ROYAL, motionPreset: "orbit", subjectMotion: "none", windMood: "swirl", captionStyle: "lineUp", motion: "pan-left" },
  { dir: R7(1), dur: 9, caption: "ENCHANTED PARTICLES", effects: ["sparkles", "magicDust", "fireflies"], palette: PAL.ELECTRIC, motionPreset: "vertical", subjectMotion: "none", windMood: "breeze", captionStyle: "karaoke", motion: "zoom-in" },
  { dir: R0(2), dur: 9, caption: "RADIANT ENERGY", effects: ["neonGlow", "sparkles", "shootingStars"], palette: PAL.NEON, motionPreset: "zoomdrift", subjectMotion: "none", captionStyle: "wordPop", motion: "zoom-out" },
  { dir: R4(0), dur: 12, caption: "ALL TOGETHER NOW", effects: ["nebula", "shootingStars", "aurora", "sparkles", "godRays"], motionGraphics: ["starField", "lightRays"], palette: PAL.COSMIC, motionPreset: "zoomdrift", subjectMotion: "pendulum", windMood: "breeze", captionStyle: "lineUp", motion: "zoom-in" },
];

function buildScenes(): Scene[] {
  let t = 0;
  return SEGMENTS.map((s) => {
    const startSec = t;
    const endSec = t + s.dur;
    t = endSec;
    return {
      startSec,
      endSec,
      imageUrl: `${s.dir}/image.png`,
      subjectMaskUrl: `${s.dir}/image.subject.mask.png`,
      backgroundUrl: `${s.dir}/image.bg.png`,
      caption: s.caption,
      motion: s.motion,
      motionPreset: s.motionPreset,
      captionStyle: s.captionStyle,
      effects: s.effects,
      motionGraphics: s.motionGraphics ?? [],
      palette: [...s.palette],
      subjectMotion: s.subjectMotion,
      ...(s.windMood ? { windMood: s.windMood } : {}),
    };
  });
}

const scenes = buildScenes();
const lastEnd = Math.max(...scenes.map((s) => s.endSec));

const plan: Plan = {
  durationSec: lastEnd + OUTRO_SEC,
  voiceoverUrl: "music/epic.mp3",
  width: 1080,
  height: 1920,
  scenes,
  outro: {
    brandName: "REELFORGE",
    palette: PAL.ELECTRIC as unknown as string[],
    tagline: "every still image, alive.",
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Showcase"
      component={ReelComposition}
      durationInFrames={Math.round(plan.durationSec * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ plan }}
    />
  );
};

registerRoot(RemotionRoot);
