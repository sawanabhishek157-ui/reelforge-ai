import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface GlitchProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
  /** Frames between possible glitch windows. Default 90. */
  period?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#06B6D4", "#FF00FF"];

const GLITCH_DUR = 10; // frames a glitch window lasts

/** Brightness envelope for the glitch: sharp on, fast decay. */
function glitchEnv(t: number): number {
  if (t < 0 || t >= GLITCH_DUR) return 0;
  // Hard on at 0, fast exponential off
  return Math.exp(-t * 0.55);
}

/**
 * Occasional RGB-split / scanline-jitter flashes fired on deterministic cycles (FRONT band).
 * Horizontal displaced color bands appear for a few frames then clear — keeps brief and rare,
 * modelled on the Lightning cycle approach.
 */
export const Glitch: React.FC<GlitchProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
  period = 90,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const colorA = colors[0 % colors.length];
  const colorB = colors[1 % colors.length];

  const shifted = frame + (seed % period);
  const cycle = Math.floor(shifted / period);
  const t = shifted % period;

  // ~45% of cycles actually fire — occasional, not a metronome
  const fires = detRand(cycle, seed, 9) > 0.55;
  const env = fires ? glitchEnv(t) : 0;

  if (env <= 0.005) {
    return <AbsoluteFill style={{ pointerEvents: "none" }} />;
  }

  const baseOpacity = env * intensity;

  // Generate 4–8 horizontal displaced bands for this cycle
  const bandCount = Math.floor(detRand(cycle, seed, 0) * 4 + 4);
  const scanlineCount = Math.floor(detRand(cycle, seed, 5) * 6 + 3);

  const bands: React.ReactNode[] = [];
  for (let i = 0; i < bandCount; i++) {
    const y = detRand(i, cycle + seed, 0) * height;
    const bandH = detRand(i, cycle + seed, 1) * height * 0.06 + height * 0.01;
    // RGB split: cyan shifted left, magenta shifted right
    const shiftAmt = (detRand(i, cycle + seed, 2) * 0.04 + 0.01) * width;
    const bandOpacity = (detRand(i, cycle + seed, 3) * 0.5 + 0.4) * baseOpacity;

    bands.push(
      <g key={`band-${i}`}>
        {/* Cyan channel shifted left */}
        <rect
          x={-shiftAmt}
          y={y}
          width={width}
          height={bandH}
          fill={colorA}
          opacity={bandOpacity * 0.55}
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        />
        {/* Magenta channel shifted right */}
        <rect
          x={shiftAmt}
          y={y}
          width={width}
          height={bandH}
          fill={colorB}
          opacity={bandOpacity * 0.45}
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        />
      </g>
    );
  }

  // Thin horizontal scanlines across the full frame
  const scanlines: React.ReactNode[] = [];
  for (let i = 0; i < scanlineCount; i++) {
    const sy = detRand(i, cycle + seed + 10, 0) * height;
    const scanOpacity = (detRand(i, cycle + seed + 10, 1) * 0.3 + 0.1) * baseOpacity;
    scanlines.push(
      <line
        key={`scan-${i}`}
        x1={0}
        y1={sy}
        x2={width}
        y2={sy}
        stroke={colors[i % colors.length]}
        strokeWidth={1}
        opacity={scanOpacity}
        style={{ mixBlendMode: "screen" } as React.CSSProperties}
      />
    );
  }

  // Subtle full-frame color flash
  const flashColor = detRand(cycle, seed, 7) > 0.5 ? colorA : colorB;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Faint full-frame flash */}
      <AbsoluteFill
        style={{
          background: flashColor,
          opacity: env * 0.08 * intensity,
          mixBlendMode: "screen",
        }}
      />
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, overflow: "hidden" }}
      >
        {bands}
        {scanlines}
      </svg>
    </AbsoluteFill>
  );
};
