import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { Nebula } from "./effects/Nebula";
import { GodRays } from "./effects/GodRays";
import { Sparkles } from "./effects/Sparkles";
import { Embers } from "./effects/Embers";
import { Flame } from "./effects/Flame";
import { StarField } from "./motiongraphics/StarField";

interface OutroProps {
  brandName: string;
  palette?: string[];
  tagline?: string;
}

/**
 * Reusable branded sign-off — a cinematic moving cosmic backdrop with 3D kinetic
 * typography: the wordmark flips in letter-by-letter on a 3D plane, metallic
 * (palette-tinted) with a travelling shine, glowing and slowly tilting. Flames +
 * embers + sparkles for atmosphere. Deterministic; tinted by the brand palette.
 */
export const Outro: React.FC<OutroProps> = ({ brandName, palette, tagline }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pal = palette && palette.length >= 3 ? palette : ["#6B21A8", "#4B0082", "#D4AF37", "#F59E0B", "#E0D4FF"];
  const accent = pal[2] ?? "#D4AF37"; // metallic key color for the wordmark
  const deep = pal[0];

  const outOpacity = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background lives: slow push-in.
  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.14], { extrapolateRight: "clamp" });

  // Wordmark: rises on a spring, slowly tilts in 3D, shine sweeps across.
  const lift = spring({ frame, fps, config: { damping: 200 } });
  const wordScale = interpolate(lift, [0, 1], [0.82, 1]);
  const tiltY = Math.sin(frame * 0.035) * 9;
  const tiltX = Math.cos(frame * 0.028) * 3;
  const glowPulse = 20 + 14 * Math.sin(frame * 0.12); // breathing glow

  // Metallic gold ramp (reliable — no background-clip, which breaks under 3D).
  const goldLight = "#FCE6A6";
  const gold = "#EBC65E";
  const goldDark = "#8A5E18";

  const tagOpacity = interpolate(frame, [24, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const letters = brandName.split("");

  return (
    <AbsoluteFill style={{ background: "#06040e", opacity: outOpacity }}>
      {/* moving cosmic backdrop (not a flat gradient) */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Nebula seed={2} palette={pal} intensity={1.25} />
        <StarField seed={7} />
        <GodRays seed={4} intensity={1.1} />
      </AbsoluteFill>
      <Sparkles seed={9} palette={pal} />
      <Embers seed={11} intensity={1.0} />
      <Flame seed={3} palette={[accent, pal[3] ?? accent, deep, "#06040e"]} heightFrac={0.5} intensity={1.0} />

      {/* 3D kinetic wordmark */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", perspective: 1300 }}>
        <div
          style={{
            transform: `rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale(${wordScale})`,
            transformStyle: "preserve-3d",
            display: "flex",
          }}
        >
          {letters.map((ch, i) => {
            const ls = spring({ frame: frame - i * 3, fps, config: { damping: 14, stiffness: 120, mass: 0.6 } });
            const rx = interpolate(ls, [0, 1], [-38, 0]); // subtle tip-up, never edge-on
            const ty = interpolate(ls, [0, 1], [80, 0]);
            const sc = interpolate(ls, [0, 1], [0.4, 1]);
            const op = interpolate(ls, [0, 1], [0, 1]);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `translateY(${ty}px) rotateX(${rx}deg) scale(${sc})`,
                  opacity: op,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontWeight: 900,
                  fontSize: 146,
                  letterSpacing: -2,
                  color: gold,
                  textShadow: `0 2px 0 ${goldDark}, 0 -1px 0 ${goldLight}, 0 0 ${glowPulse}px ${accent}, 0 0 ${glowPulse * 2.6}px ${deep}`,
                  whiteSpace: "pre",
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* tagline */}
      {tagline ? (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              marginTop: 230,
              opacity: tagOpacity,
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 42,
              letterSpacing: 1,
              textShadow: `0 0 18px ${deep}, 0 0 6px ${accent}`,
            }}
          >
            {tagline}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
