import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { KineticCaption, pickCaptionStyle } from "./KineticCaption";
import { MotionGraphicsLayer } from "./motiongraphics";
import { EffectsLayer } from "./effects";
import { ColorGrade } from "./overlays/ColorGrade";
import { FilmGrain } from "./overlays/FilmGrain";
import { Vignette } from "./overlays/Vignette";
import type { Scene } from "./types";

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

/**
 * Depth-ordered scene compositor. Splits the image into a background plane and a
 * masked subject plane, then interleaves effects + motion graphics at explicit
 * z-bands so cosmic overlays sit BEHIND the subject and leaves/embers/lightning
 * pass IN FRONT. Layers parallax by subtle per-band multipliers (rigid masked
 * planes — no displacement warp, so subjects never morph).
 *
 * Requires scene.subjectMaskUrl. ReelComposition falls back to the flat path
 * when there is no subject mask.
 */
export const LayeredScene: React.FC<{ scene: Scene; sceneIndex: number }> = ({
  scene,
  sceneIndex,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  const mood = MOOD_CYCLE[sceneIndex % MOOD_CYCLE.length];
  const captionStyle = scene.captionStyle ?? pickCaptionStyle(sceneIndex);

  // The storyboard director picks the camera move per scene (motionStyle).
  // Each depth layer then moves at its OWN rate — near layers move a lot, far
  // layers barely — so the planes visibly slide against each other (real
  // parallax), not a single Ken Burns zoom. Strong, eased, hole-safe (the
  // foreground always zooms MORE than the background, so it covers, never reveals).
  const style = scene.motionPreset ?? "zoomdrift";
  const dir = sceneIndex % 2 === 0 ? 1 : -1;
  const t = frame / Math.max(1, durationInFrames);
  const e = t * t * (3 - 2 * t); // smoothstep — accelerate then settle

  // depth: 0 = far background … 1 = near foreground.
  const layer = (depth: number): React.CSSProperties => {
    const zoom = 1.08 + (0.03 + depth * 0.26) * e; // bg ~+3%, foreground ~+29%
    const amp = 0.2 + depth * 1.15; // near planes translate far more than far ones
    let tx = 0;
    let ty = 0;
    let rot = 0;
    if (style === "orbit") {
      tx = 70 * amp * e * dir;
      rot = 1.5 * amp * e * dir;
    } else if (style === "vertical") {
      ty = -68 * amp * e;
      tx = 10 * amp * e * dir;
    } else if (style === "dolly") {
      // mostly a forward push — strong differential zoom, little drift
      tx = 16 * amp * e * dir;
      ty = -8 * amp * e;
    } else {
      // zoomdrift — push in while the planes slide diagonally
      tx = 52 * amp * e * dir;
      ty = -24 * amp * e;
    }
    return {
      transform: `translate(${tx}px, ${ty}px) scale(${zoom}) rotate(${rot}deg)`,
      willChange: "transform",
    };
  };

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url(${toStatic(scene.subjectMaskUrl as string)})`,
    maskImage: `url(${toStatic(scene.subjectMaskUrl as string)})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  const imgStyle: React.CSSProperties = { width, height, objectFit: "cover" };

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#000" }}>
      {/* z0 — background plane (far — barely moves) */}
      <AbsoluteFill style={layer(0.0)}>
        <Img src={toStatic(scene.imageUrl)} style={imgStyle} />
      </AbsoluteFill>

      {/* z1 — BEHIND band: god-rays/fog + cosmic motion graphics, mid-depth */}
      <AbsoluteFill style={layer(0.35)}>
        <MotionGraphicsLayer names={scene.motionGraphics} sceneIndex={sceneIndex} />
        <EffectsLayer names={scene.effects} band="behind" sceneIndex={sceneIndex} palette={scene.palette} />
      </AbsoluteFill>

      {/* z2 — SUBJECT/foreground plane (masked; pushes toward camera) */}
      <AbsoluteFill style={{ ...maskStyle, ...layer(0.85) }}>
        <Img src={toStatic(scene.imageUrl)} style={imgStyle} />
      </AbsoluteFill>

      {/* z3 — FRONT band: leaves / embers / lightning, nearest — moves most */}
      <AbsoluteFill style={layer(1.0)}>
        <EffectsLayer names={scene.effects} band="front" sceneIndex={sceneIndex} palette={scene.palette} />
      </AbsoluteFill>

      {/* z4 — grade / vignette / grain / caption (full-frame, topmost) */}
      <ColorGrade mood={mood} intensity={0.85} />
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
};
