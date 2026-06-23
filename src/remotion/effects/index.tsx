import React from "react";
import { AbsoluteFill } from "remotion";

import { EFFECT_BAND, EFFECT_NAMES, type EffectBand, type EffectName } from "./names";
import { GodRays } from "./GodRays";
import { Lightning } from "./Lightning";
import { Leaves } from "./Leaves";
import { Embers } from "./Embers";
import { Rain } from "./Rain";
import { Snow } from "./Snow";
import { Fog } from "./Fog";
import { Clouds } from "./Clouds";
import { Sparkles } from "./Sparkles";
import { Fireflies } from "./Fireflies";
import { Bokeh } from "./Bokeh";
import { MagicDust } from "./MagicDust";
import { Nebula } from "./Nebula";
import { ShootingStars } from "./ShootingStars";
import { Aurora } from "./Aurora";
import { Starburst } from "./Starburst";
import { GridLines } from "./GridLines";
import { DataStream } from "./DataStream";
import { Glitch } from "./Glitch";
import { NeonGlow } from "./NeonGlow";
import { Flame } from "./Flame";
import { LottieObject, LOTTIE_OBJECTS } from "./LottieObject";
import { StaggerIn } from "./Stagger";

export { EFFECT_NAMES, EFFECT_BAND, type EffectName, type EffectBand } from "./names";

function render(name: EffectName, seed: number, palette?: string[]): React.ReactNode {
  // Lottie-backed animated objects carry their own colors (palette doesn't apply).
  const lottie = LOTTIE_OBJECTS[name];
  if (lottie) return <LottieObject def={lottie} />;

  const p = { seed, palette };
  switch (name) {
    // Original four predate the palette prop — they keep their built-in colors.
    case "godRays": return <GodRays seed={seed} />;
    case "lightning": return <Lightning seed={seed} />;
    case "leaves": return <Leaves seed={seed} />;
    case "embers": return <Embers seed={seed} />;
    case "rain": return <Rain {...p} />;
    case "snow": return <Snow {...p} />;
    case "fog": return <Fog {...p} />;
    case "clouds": return <Clouds {...p} />;
    case "sparkles": return <Sparkles {...p} />;
    case "fireflies": return <Fireflies {...p} />;
    case "bokeh": return <Bokeh {...p} />;
    case "magicDust": return <MagicDust {...p} />;
    case "nebula": return <Nebula {...p} />;
    case "shootingStars": return <ShootingStars {...p} />;
    case "aurora": return <Aurora {...p} />;
    case "starburst": return <Starburst {...p} />;
    case "gridLines": return <GridLines {...p} />;
    case "dataStream": return <DataStream {...p} />;
    case "glitch": return <Glitch {...p} />;
    case "neonGlow": return <NeonGlow {...p} />;
    case "flame": return <Flame {...p} />;
    default: return null;
  }
}

/**
 * Renders the reusable VFX assigned to a scene, but only those in the requested
 * depth `band` — so the compositor can place "behind" effects between the
 * background and subject, and "front" effects over the subject. Effects are
 * tinted with the brand `palette` when provided.
 */
export const EffectsLayer: React.FC<{
  names?: string[];
  band: EffectBand;
  sceneIndex?: number;
  palette?: string[];
}> = ({ names, band, sceneIndex = 0, palette }) => {
  if (!names || names.length === 0) return null;
  const valid = names.filter(
    (n): n is EffectName => (EFFECT_NAMES as string[]).includes(n) && EFFECT_BAND[n as EffectName] === band,
  );
  if (valid.length === 0) return null;
  // Behind-band effects enter before front-band, so the scene builds depth-first.
  const baseDelay = band === "behind" ? 14 : 26;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {valid.map((n, i) => (
        <StaggerIn key={n} order={i} baseDelay={baseDelay}>
          {render(n, sceneIndex * 17 + i * 11, palette)}
        </StaggerIn>
      ))}
    </AbsoluteFill>
  );
};
