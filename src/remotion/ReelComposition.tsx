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

import type { Plan, Scene } from "./types";

const FPS = 30;

function toStatic(url: string) {
  // Plan URLs look like "/projects/<id>/scenes/x.png" — strip leading slash for staticFile
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

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    scene.zoom === "in" ? [1.0, 1.18] : [1.18, 1.0],
    { extrapolateRight: "clamp" },
  );
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
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      <Caption text={scene.caption} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 10], [40, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 180,
        textAlign: "center",
        color: "white",
        fontFamily:
          "Inter, system-ui, -apple-system, 'Helvetica Neue', sans-serif",
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.15,
        letterSpacing: -1,
        textShadow: "0 6px 30px rgba(0,0,0,0.7)",
        transform: `translateY(${slide}px)`,
      }}
    >
      {text}
    </div>
  );
};
