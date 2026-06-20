import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { Motion, Plan, Scene } from "./types";

const FPS = 30;

function toStatic(url: string) {
  return staticFile(url.replace(/^\//, ""));
}

export const ReelComposition: React.FC<{ plan: Plan }> = ({ plan }) => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={toStatic(plan.voiceoverUrl)} />
      {plan.scenes.map((scene, i) => {
        const startFrame = Math.round(scene.startSec * FPS);
        const durationFrames = Math.max(
          1,
          Math.round((scene.endSec - scene.startSec) * FPS),
        );
        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            <SceneView scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const { scale, x, y } = kenBurnsTransform(frame, durationInFrames, scene.motion);
  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={toStatic(scene.imageUrl)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}%, ${y}%) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

function kenBurnsTransform(frame: number, total: number, motion: Motion) {
  const t = (n: number, range: [number, number]) =>
    interpolate(n, [0, total], range, { extrapolateRight: "clamp" });

  switch (motion) {
    case "zoom-in":
      return { scale: t(frame, [1.0, 1.18]), x: 0, y: 0 };
    case "zoom-out":
      return { scale: t(frame, [1.18, 1.0]), x: 0, y: 0 };
    case "pan-left":
      // Slight zoom + horizontal drift
      return { scale: 1.18, x: t(frame, [3, -3]), y: 0 };
    case "pan-right":
      return { scale: 1.18, x: t(frame, [-3, 3]), y: 0 };
  }
}

