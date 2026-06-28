import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { KineticCaption, pickCaptionStyle } from "./KineticCaption";
import { CinemagraphRegion } from "./cinemagraph/Cinemagraph";
import { LayeredScene } from "./LayeredScene";
import { Outro } from "./Outro";
import { MotionGraphicsLayer } from "./motiongraphics";
import { EffectsLayer } from "./effects";
import { Atmosphere } from "./overlays/Atmosphere";
import { ColorGrade } from "./overlays/ColorGrade";
import { FilmGrain } from "./overlays/FilmGrain";
import { LightLeak } from "./overlays/LightLeak";
import { Vignette } from "./overlays/Vignette";
import type { Motion, Plan, Scene } from "./types";

const FPS = 30;
const OUTRO_SEC = 5.0;

// Moods cycled per scene index for visual variety
const MOOD_CYCLE = [
  "cinematic",
  "warm",
  "cool",
  "dramatic",
  "romantic",
  "mysterious",
  "epic",
] as const;

function toStatic(url: string) {
  return staticFile(url.replace(/^\//, ""));
}

export const ReelComposition: React.FC<{ plan: Plan }> = ({ plan }) => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {plan.voiceoverUrl ? (
        <Audio src={toStatic(plan.voiceoverUrl)} />
      ) : null}
      {plan.scenes.map((scene, i) => {
        const startFrame = Math.round(scene.startSec * FPS);
        const durationFrames = Math.max(
          1,
          Math.round((scene.endSec - scene.startSec) * FPS),
        );
        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            <SceneView scene={scene} sceneIndex={i} />
          </Sequence>
        );
      })}
      {plan.outro ? (
        <Sequence
          from={Math.round(Math.max(0, ...plan.scenes.map((s) => s.endSec)) * FPS)}
          durationInFrames={Math.round(OUTRO_SEC * FPS)}
        >
          <Outro
            brandName={plan.outro.brandName}
            palette={plan.outro.palette}
            tagline={plan.outro.tagline}
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

interface SceneViewProps {
  scene: Scene;
  sceneIndex: number;
}

const SceneView: React.FC<SceneViewProps> = ({ scene, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  // Depth-layered path: when a subject mask exists, composite the subject on its
  // own plane with effects/motion-graphics behind it and effects in front.
  if (scene.subjectMaskUrl) {
    return <LayeredScene scene={scene} sceneIndex={sceneIndex} />;
  }

  // Classic cinemagraph: frozen base image + one animated region (sky/water).
  // Static overlays only (no drifting atmosphere/light-leak) so ONLY the region
  // moves — the living-photo look.
  if (scene.cinemagraph && (scene.cinemagraph.mode ?? "classic") === "classic") {
    const mood = MOOD_CYCLE[sceneIndex % MOOD_CYCLE.length];
    const captionStyle = scene.captionStyle ?? pickCaptionStyle(sceneIndex);
    // Slow Ken Burns push on the whole frame so the scene reads as moving, while
    // the masked region (sky/water) animates on top.
    const cineScale = interpolate(frame, [0, durationInFrames], [1.04, 1.16], {
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `scale(${cineScale})` }}>
          <Img
            src={toStatic(scene.imageUrl)}
            style={{ width, height, objectFit: "cover" }}
          />
          <CinemagraphRegion
            imageSrc={scene.imageUrl}
            maskUrl={scene.cinemagraph.maskUrl}
            region={scene.cinemagraph.region}
          />
        </AbsoluteFill>
        <ColorGrade mood={mood} intensity={0.85} />
        <MotionGraphicsLayer names={scene.motionGraphics} sceneIndex={sceneIndex} />
        <EffectsLayer names={scene.effects} band="behind" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />
        <EffectsLayer names={scene.effects} band="front" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />
        <Vignette intensity={0.5} />
        <FilmGrain intensity={0.03} />
        {scene.caption ? (
          <KineticCaption
            caption={scene.caption}
            durationInFrames={durationInFrames}
            style={captionStyle}
          />
        ) : null}
      </AbsoluteFill>
    );
  }

  if (scene.clipUrl) {
    // Alternate Ken Burns: even scenes zoom-in, odd scenes zoom-out
    const isEven = sceneIndex % 2 === 0;
    const kbScale = interpolate(
      frame,
      [0, durationInFrames],
      isEven ? [1.04, 1.24] : [1.24, 1.04],
      { extrapolateRight: "clamp" },
    );

    // Horizontal pan, direction varies by scene (pronounced for visible motion)
    const panX = interpolate(
      frame,
      [0, durationInFrames],
      [0, isEven ? 28 : -28],
      { extrapolateRight: "clamp" },
    );

    const mood = MOOD_CYCLE[sceneIndex % MOOD_CYCLE.length];
    const captionStyle = scene.captionStyle ?? pickCaptionStyle(sceneIndex);

    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
        {/* Layer 1: DepthFlow clip with varied Ken Burns */}
        <OffthreadVideo
          src={toStatic(scene.clipUrl)}
          style={{
            width,
            height,
            objectFit: "cover",
            transform: `scale(${kbScale}) translateX(${panX}px)`,
          }}
          muted
          startFrom={0}
        />

        {/* Layer 2: Color grade — mood cycles per scene */}
        <ColorGrade mood={mood} intensity={0.9} />

        {/* Layer 3: Atmosphere — subtle haze + dust, seed varies per scene */}
        <Atmosphere
          intensity={0.8}
          seed={sceneIndex * 7}
          durationInFrames={durationInFrames}
        />

        {/* Layer 4: Vignette — always present, subtle */}
        <Vignette intensity={0.5} />

        {/* Layer 5: Light leak — only every 3rd scene (0, 3, 6, ...) */}
        {sceneIndex % 3 === 0 ? <LightLeak intensity={0.3} /> : null}

        {/* Astrology motion graphics — real animated motion (rotate/orbit/twinkle/flow) */}
        <MotionGraphicsLayer names={scene.motionGraphics} sceneIndex={sceneIndex} />
        <EffectsLayer names={scene.effects} band="behind" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />
        <EffectsLayer names={scene.effects} band="front" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />

        {/* Layer 6: Film grain — always, very subtle */}
        <FilmGrain intensity={0.035} />

        {/* Layer 7: Kinetic caption */}
        {scene.caption ? (
          <KineticCaption
            caption={scene.caption}
            durationInFrames={durationInFrames}
            style={captionStyle}
          />
        ) : null}
      </AbsoluteFill>
    );
  }

  // Fallback: Ken Burns motion on the still image.
  const { scale, x, y } = kenBurnsTransform(frame, durationInFrames, scene.motion);
  const captionStyle = scene.captionStyle ?? pickCaptionStyle(sceneIndex);

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
      <MotionGraphicsLayer names={scene.motionGraphics} sceneIndex={sceneIndex} />
      <EffectsLayer names={scene.effects} band="behind" sceneIndex={sceneIndex} palette={scene.palette} />
      <EffectsLayer names={scene.effects} band="front" sceneIndex={sceneIndex} palette={scene.palette} />
      {scene.caption ? (
        <KineticCaption
          caption={scene.caption}
          durationInFrames={durationInFrames}
          style={captionStyle}
        />
      ) : null}
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
      return { scale: 1.18, x: t(frame, [3, -3]), y: 0 };
    case "pan-right":
      return { scale: 1.18, x: t(frame, [-3, 3]), y: 0 };
  }
}
