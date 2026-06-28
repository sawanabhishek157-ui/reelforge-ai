import React from "react";
import { Composition } from "remotion";

import { ReelComposition } from "./ReelComposition";
import type { Plan } from "./types";

const FPS = 30;
const DEFAULT_DURATION = 30;

// Sample scenes for Remotion Studio preview.
// Uses public assets already present in /public/.
const defaultPlan: Plan = {
  durationSec: DEFAULT_DURATION,
  voiceoverUrl: "",
  width: 1080,
  height: 1920,
  scenes: [
    {
      startSec: 0,
      endSec: 10,
      imageUrl: "next.svg",
      caption: "Welcome to ReelForge",
      motion: "zoom-in",
      motionPreset: "zoomIn",
      captionStyle: "wordPop",
      overlays: ["vignette", "filmGrain"],
    },
    {
      startSec: 10,
      endSec: 20,
      imageUrl: "globe.svg",
      caption: "AI-powered social reels",
      motion: "pan-left",
      motionPreset: "diagonalKenBurns",
      captionStyle: "lineUp",
      overlays: ["vignette", "colorGrade"],
    },
    {
      startSec: 20,
      endSec: 30,
      imageUrl: "vercel.svg",
      caption: "Create. Share. Go viral.",
      motion: "zoom-out",
      motionPreset: "pullOutSlow",
      captionStyle: "karaoke",
      overlays: ["vignette", "lightLeak", "filmGrain"],
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={ReelComposition}
      durationInFrames={DEFAULT_DURATION * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ plan: defaultPlan }}
      calculateMetadata={({ props }) => {
        const d = Math.max(1, Math.round(props.plan.durationSec));
        const w = props.plan.width ?? 1080;
        const h = props.plan.height ?? 1920;
        return {
          durationInFrames: d * FPS,
          width: w,
          height: h,
          props,
        };
      }}
    />
  );
};
