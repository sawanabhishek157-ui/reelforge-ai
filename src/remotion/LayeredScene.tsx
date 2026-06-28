import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";
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
  // depth layer moves at its OWN rate (parallax). Camera-led shots now travel
  // enough to actually READ as depth (the old amplitudes were near-invisible).
  const style = scene.motionPreset ?? "zoomdrift";
  const dir = sceneIndex % 2 === 0 ? 1 : -1;
  const t = frame / Math.max(1, durationInFrames);
  const e = t * t * (3 - 2 * t); // smoothstep — accelerate then settle

  // Per-scene character seed — every shot gets its own phase/wander so the reel
  // doesn't read as one shared rhythm. Drives the organic noise below.
  const seed = sceneIndex * 97 + 13;
  const tSec = frame / Math.max(1, fps);
  const TAU = Math.PI * 2;
  const osc = (periodSec: number, phase = 0) => Math.sin(tSec * (TAU / periodSec) + phase);
  // Smooth organic noise in -1..1 — adds wander + amplitude life so motion is
  // never a constant-amplitude metronome.
  const wob = (chan: string, rate: number) => noise2D(`${seed}-${chan}`, tSec * rate, 0);

  // Each scene is EITHER subject-led or camera-led — never both. Subject-led LOCKS
  // the camera (camGain 0) so the background is perfectly still and only the cutout
  // moves (cinemagraph). Landscapes ("none") get the full camera push + parallax.
  const subjectLed = (scene.subjectMotion ?? "breathe") !== "none";
  const camGain = subjectLed ? 0 : 1.0;

  // depth: 0 = far background … 1 = near foreground.
  // Camera-led motion is ZOOM-DOMINANT: zoom is the visible travel (a real "push
  // through space"), the foreground zooms faster than the background for genuine
  // parallax depth, and translation is kept modest so we never pan past the image
  // edge or the inpaint-fill boundary (the v2 building-reveal regression). A big
  // constant overscan hides plane edges; we only ever zoom IN, never out.
  const layer = (depth: number): React.CSSProperties => {
    // TRANSLATION is the visible camera travel — a clearly readable whole-frame pan
    // (~50px on the background) that registers regardless of how dark/low-detail the
    // plate is (zoom alone was imperceptible on dark skies). A big overscan (1.14)
    // gives ~75px H / 134px V of hidden margin so even the strong pan never reveals a
    // plane edge; zoom stays modest so content near a frame edge isn't flung out.
    const overscan = 1.18;
    const zoom = overscan + (0.05 + depth * 0.1) * e * camGain;
    const amp = (0.9 + depth * 0.6) * camGain; // 0.9 floor = every plane travels ~100px (the readable threshold)
    let tx = 0;
    let ty = 0;
    let rot = 0;
    if (style === "orbit") {
      // horizontal arc — safe for scenes with content near the TOP edge
      tx = 104 * amp * e * dir;
      rot = 0.6 * amp * e * dir;
    } else if (style === "vertical") {
      ty = -120 * amp * e;
      tx = 12 * amp * e * dir;
    } else if (style === "dolly") {
      // strong rising push with real vertical drift (not pure zoom)
      tx = 28 * amp * e * dir;
      ty = -124 * amp * e;
    } else {
      // zoomdrift — bold diagonal travel
      tx = 104 * amp * e * dir;
      ty = -52 * amp * e;
    }
    return {
      transform: `translate(${tx}px, ${ty}px) scale(${zoom}) rotate(${rot}deg)`,
      willChange: "transform",
    };
  };

  // The subject mask PNG is white-on-black and FULLY OPAQUE — the cut-out shape
  // lives in its luminance, not its alpha. CSS mask-image defaults to mask-mode:
  // alpha, which on an opaque PNG clips nothing, so the whole image (background
  // included) leaks through this plane and rides the subject's swing. Force
  // luminance so only the bright (subject) pixels are kept on the moving plane.
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url(${toStatic(scene.subjectMaskUrl as string)})`,
    maskImage: `url(${toStatic(scene.subjectMaskUrl as string)})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    // Remotion renders in Chrome headless, which reads the unprefixed mask-mode.
    maskMode: "luminance",
  };

  const imgStyle: React.CSSProperties = { width, height, objectFit: "cover" };

  // Subject "alive" motion — believable, physical secondary motion on the cut-out
  // so the SUBJECT moves (a hanging pendant swings, a figure breathes), not just
  // the camera. Deterministic, rigid transform only (no pixel warp → never morphs).
  // Each motion blends two incommensurate oscillations with a slow organic noise
  // wander + an amplitude "life" envelope, so it reads as physical and varied —
  // never a constant-amplitude metronome. Applied on its OWN pivot.
  const windK = WIND_AMP[scene.windMood ?? "breeze"];
  // Amplitude has a gentle decay over the shot (wide early, settling later — like a
  // disturbed pendant easing toward rest) blended with slow noise wander, so motion
  // reads as physical and never as a constant-amplitude sinusoidal loop.
  const decay = interpolate(t, [0, 1], [1.1, 0.5], { extrapolateRight: "clamp" });
  const life = decay * (0.82 + 0.18 * wob("life", 0.045));

  const motion = scene.subjectMotion ?? "breathe";
  let secTransform = "";
  let secOrigin = "50% 50%";
  if (motion === "pendulum") {
    // Hangs from above: swing about a pivot at the top-centre of the frame.
    secOrigin = "50% 0%";
    // One dominant swing (a sine naturally eases to zero velocity at the extremes →
    // gravity feel) + a small secondary + light noise wander. Wider arc for legibility.
    const swing = 0.72 * osc(2.8) + 0.16 * osc(4.3, 1.1) + 0.26 * wob("pend", 0.09);
    secTransform = `rotate(${5.2 * windK * life * swing}deg)`;
  } else if (motion === "float") {
    // Hovers: vertical bob + lateral drift + faint tumble, all organically varied.
    const bob = windK * life * (32 * osc(3.4) + 10 * wob("fb", 0.18));
    const dx = windK * life * (20 * osc(4.7, 0.7) + 9 * wob("fx", 0.15));
    const rot = windK * life * (2.6 * osc(4.1) + 1.0 * wob("fr", 0.12));
    secTransform = `translate(${dx}px, ${bob}px) rotate(${rot}deg)`;
  } else if (motion === "sway") {
    // Leans in the wind (foliage/fabric/hair): tilt about the base, gusty.
    secOrigin = "50% 100%";
    const ang = windK * life * (2.8 * osc(3.1) + 0.9 * osc(2.0, 0.6) + 1.3 * wob("sw", 0.12));
    secTransform = `rotate(${ang}deg)`;
  } else if (motion === "breathe") {
    // A figure breathing: visible slow scale pulse + faint weight-shift drift.
    secOrigin = "50% 90%";
    const s = 1 + windK * (0.04 * (0.6 + 0.4 * osc(4.0))); // ~4% pulse — clearly visible
    const dy = windK * life * (8 * osc(4.0) + 4 * wob("bz", 0.12));
    const dx = windK * life * (5 * osc(6.0) + 3 * wob("br", 0.1));
    secTransform = `translate(${dx}px, ${dy}px) scale(${s})`;
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
