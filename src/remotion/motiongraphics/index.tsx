import React from "react";
import { AbsoluteFill } from "remotion";

import { StarField } from "./StarField";
import { CosmicDust } from "./CosmicDust";
import { ZodiacWheel } from "./ZodiacWheel";
import { OrbitingBodies } from "./OrbitingBodies";
import { ConstellationLines } from "./ConstellationLines";
import { LightRays } from "./LightRays";

/** Names the storyboard director can assign to a scene. */
export type MotionGraphicName =
  | "starField"
  | "cosmicDust"
  | "zodiacWheel"
  | "orbitingBodies"
  | "constellationLines"
  | "lightRays";

export const MOTION_GRAPHIC_NAMES: MotionGraphicName[] = [
  "starField",
  "cosmicDust",
  "zodiacWheel",
  "orbitingBodies",
  "constellationLines",
  "lightRays",
];

function render(name: MotionGraphicName, seed: number): React.ReactNode {
  switch (name) {
    case "starField":
      return <StarField seed={seed} />;
    case "cosmicDust":
      return <CosmicDust seed={seed} />;
    case "zodiacWheel":
      return <ZodiacWheel />;
    case "orbitingBodies":
      return <OrbitingBodies seed={seed} />;
    case "constellationLines":
      return <ConstellationLines seed={seed} />;
    case "lightRays":
      return <LightRays />;
    default:
      return null;
  }
}

/**
 * Composites the selected astrology motion-graphics overlays for a scene.
 * Real animated motion (rotation/orbit/twinkle/flow) on top of the still scene.
 */
export const MotionGraphicsLayer: React.FC<{
  names?: string[];
  sceneIndex?: number;
}> = ({ names, sceneIndex = 0 }) => {
  if (!names || names.length === 0) return null;
  const valid = names.filter((n): n is MotionGraphicName =>
    (MOTION_GRAPHIC_NAMES as string[]).includes(n),
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {valid.map((n, i) => (
        <React.Fragment key={n}>{render(n, sceneIndex * 13 + i * 7)}</React.Fragment>
      ))}
    </AbsoluteFill>
  );
};
