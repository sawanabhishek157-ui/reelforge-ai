import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
const WIND_AMP: Record<string, number> = { calm: 0.4, breeze: 1, gust: 1.9, swirl: 1.3 };

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
  const { durationInFrames, width, height, fps } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  const mood = MOOD_CYCLE[sceneIndex % MOOD_CYCLE.length];
  const captionStyle = scene.captionStyle ?? pickCaptionStyle(sceneIndex);

  // The storyboard director picks the camera move per scene (motionStyle). Each
  // depth layer moves at its OWN rate (parallax), but the camera is kept SLOW and
  // deliberate — a gentle push — so the subject's own physical motion (below)
  // leads the shot instead of an aggressive zoom that reads as a wobble.
  const style = scene.motionPreset ?? "zoomdrift";
  const dir = sceneIndex % 2 === 0 ? 1 : -1;
  const t = frame / Math.max(1, durationInFrames);
  const e = t * t * (3 - 2 * t); // smoothstep — accelerate then settle

  // Each scene is EITHER subject-led or camera-led — never both at once, which is
  // what made the background drift along with the swing. When the subject has its
  // own physical motion (pendulum/float/breathe/sway), the camera is nearly locked
  // so the BACKGROUND stays still and only the object moves (cinemagraph feel).
  // Pure landscapes ("none") keep the full camera push + parallax.
  const subjectLed = (scene.subjectMotion ?? "breathe") !== "none";
  const camGain = subjectLed ? 0.16 : 1.0;

  // depth: 0 = far background … 1 = near foreground.
  const layer = (depth: number): React.CSSProperties => {
    // 1.025 base is a constant overscan (no motion); only the *extra* zoom and the
    // translation are gated by camGain, so a locked camera leaves the plane still.
    const zoom = 1.025 + (0.015 + depth * 0.12) * e * camGain;
    const amp = (0.15 + depth * 0.7) * camGain; // gentle parallax differential
    let tx = 0;
    let ty = 0;
    let rot = 0;
    if (style === "orbit") {
      tx = 38 * amp * e * dir;
      rot = 0.9 * amp * e * dir;
    } else if (style === "vertical") {
      ty = -38 * amp * e;
      tx = 6 * amp * e * dir;
    } else if (style === "dolly") {
      // mostly a slow forward push — gentle differential zoom, little drift
      tx = 9 * amp * e * dir;
      ty = -5 * amp * e;
    } else {
      // zoomdrift — gentle diagonal push
      tx = 28 * amp * e * dir;
      ty = -13 * amp * e;
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

  // Subject "alive" motion — believable, physical secondary motion on the cut-out
  // so the SUBJECT moves (a hanging pendant swings, a figure breathes), not just
  // the camera. Pure function of frame (deterministic), rigid transform only (no
  // pixel warp → never morphs). Applied on its OWN pivot, nested inside the camera
  // plane below.
  const windK = WIND_AMP[scene.windMood ?? "breeze"];
  const tSec = frame / Math.max(1, fps);
  const TAU = Math.PI * 2;
  const osc = (periodSec: number, phase = 0) => Math.sin(tSec * (TAU / periodSec) + phase);

  const motion = scene.subjectMotion ?? "breathe";
  let secTransform = "";
  let secOrigin = "50% 50%";
  if (motion === "pendulum") {
    // Hangs from above: swing about a pivot at the top-centre of the frame.
    secOrigin = "50% 0%";
    const ang = 3.0 * windK * osc(2.6) + 0.7 * windK * osc(1.7, 1.0);
    secTransform = `rotate(${ang}deg)`;
  } else if (motion === "float") {
    // Hovers: slow vertical bob + lateral drift + faint tumble.
    const bob = 12 * windK * osc(3.2);
    const drift = 7 * windK * osc(4.6, 0.7);
    const rot = 1.4 * windK * osc(3.8);
    secTransform = `translate(${drift}px, ${bob}px) rotate(${rot}deg)`;
  } else if (motion === "sway") {
    // Leans in the wind (foliage/fabric/hair): gentle tilt about the base.
    secOrigin = "50% 100%";
    const ang = 1.8 * windK * osc(3.0) + 0.5 * windK * osc(2.0, 0.6);
    secTransform = `rotate(${ang}deg)`;
  } else if (motion === "breathe") {
    // A figure breathing: tiny slow scale pulse from the lower body + faint drift.
    secOrigin = "50% 80%";
    const s = 1 + 0.014 * windK * (0.5 + 0.5 * osc(4.2));
    const drift = 3 * windK * osc(6.0);
    secTransform = `translateX(${drift}px) scale(${s})`;
  }
  // "none" → no secondary motion (pure landscape/architecture).

  // Clean (subject-free) background plane when available — lets the subject
  // parallax hard with no ghost hole; falls back to the full image.
  const bgUrl = scene.backgroundUrl ?? scene.imageUrl;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#000" }}>
      {/* z0 — background plane (far — barely moves) */}
      <AbsoluteFill style={layer(0.0)}>
        <Img src={toStatic(bgUrl)} style={imgStyle} />
      </AbsoluteFill>

      {/* z1 — BEHIND band: god-rays/fog + cosmic motion graphics, mid-depth */}
      <AbsoluteFill style={layer(0.35)}>
        <MotionGraphicsLayer names={scene.motionGraphics} sceneIndex={sceneIndex} />
        <EffectsLayer names={scene.effects} band="behind" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />
      </AbsoluteFill>

      {/* z2 — SUBJECT/foreground plane: camera push (outer) + physical secondary
          motion on its own pivot (inner) so the subject reads as alive. */}
      <AbsoluteFill style={layer(0.85)}>
        <AbsoluteFill
          style={{
            ...maskStyle,
            transform: secTransform,
            transformOrigin: secOrigin,
            willChange: "transform",
          }}
        >
          <Img src={toStatic(scene.imageUrl)} style={imgStyle} />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* z3 — FRONT band: leaves / embers / lightning, nearest — moves most */}
      <AbsoluteFill style={layer(1.0)}>
        <EffectsLayer names={scene.effects} band="front" sceneIndex={sceneIndex} palette={scene.palette} windMood={scene.windMood} />
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
