import React from "react";
import { Composition } from "remotion";

import { ReelComposition } from "./ReelComposition";
import type { Plan } from "./types";

const FPS = 30;
const DEFAULT_DURATION = 30;

const defaultPlan: Plan = {
  durationSec: DEFAULT_DURATION,
  voiceoverUrl: "",
  width: 1080,
  height: 1920,
  scenes: [],
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
