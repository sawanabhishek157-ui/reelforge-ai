import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface StarburstProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
  /** Frames per pulse cycle. */
  period?: number;
  /** Number of rays. */
  rays?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFE9BF", "#FFFFFF"];

const BURST_DUR = 28; // frames burst is visible once triggered

/** Pulse envelope — sharp rise, slow decay, secondary glint. */
function burstEnv(t: number): number {
  if (t < 0 || t >= BURST_DUR) return 0;
  const primary = Math.exp(-t * 0.18);
  const glint = t >= 8 && t < 16 ? 0.35 * Math.exp(-(t - 8) * 0.35) : 0;
  return Math.min(1, primary + glint);
}

/**
 * Radial lens-flare starburst — rays + central glow + expanding ring — pulsing
 * on deterministic cycle windows (like Lightning). Designed for the FRONT band
 * so it sits above the subject for a dramatic accent beat.
 */
export const Starburst: React.FC<StarburstProps> = ({
  intensity = 1.0,
  seed = 0,
  palette = DEFAULT_PALETTE,
  period = 90,
  rays = 12,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette.length > 0 ? palette : DEFAULT_PALETTE;
  const coreColor = colors[0] ?? "#FFE9BF";
  const glintColor = colors[1] ?? "#FFFFFF";

  const shifted = frame + (seed % period);
  const cycle = Math.floor(shifted / period);
  const t = shifted % period;

  // ~50% of cycles actually burst
  const fires = detRand(cycle, seed, 9) > 0.50;
  const env = fires ? burstEnv(t) : 0;

  if (env <= 0.001) return <AbsoluteFill style={{ pointerEvents: "none" }} />;

  // Per-cycle origin point (biased toward upper-center area, feels like sun/lens)
  const cx = (detRand(cycle, seed, 1) * 0.5 + 0.25) * width;
  const cy = (detRand(cycle, seed, 2) * 0.35 + 0.05) * height;

  const maxR = Math.max(width, height) * 0.55;
  const ringR = (t / BURST_DUR) * maxR * 0.6;
  const centralR = (detRand(cycle, seed, 3) * 0.04 + 0.025) * width;

  // Build rays as thin triangles fanning out from the center
  const rayPolygons = Array.from({ length: rays }, (_, ri) => {
    const baseAngle = (ri / rays) * Math.PI * 2;
    const angleVar = detRand(ri, seed + cycle, 0) * 0.18 - 0.09;
    const angle = baseAngle + angleVar;
    const rayLen = maxR * (detRand(ri, seed + cycle, 1) * 0.45 + 0.35);
    const halfW = centralR * (0.12 + detRand(ri, seed + cycle, 2) * 0.1);

    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);
    const tipX = cx + Math.cos(angle) * rayLen;
    const tipY = cy + Math.sin(angle) * rayLen;

    const pts = [
      `${cx - perpX * halfW},${cy - perpY * halfW}`,
      `${cx + perpX * halfW},${cy + perpY * halfW}`,
      `${tipX},${tipY}`,
    ].join(" ");

    // Alternating rays between the two palette colors
    const rayColor = ri % 2 === 0 ? coreColor : glintColor;
    return { pts, rayColor, rayLen };
  });

  const gradId = `sb-core-${seed}-${cycle}`;
  const ringGradId = `sb-ring-${seed}-${cycle}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`sb-glow-${seed}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation={`${Math.round(width / 180)}`} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glintColor} stopOpacity="1" />
            <stop offset="30%" stopColor={coreColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={ringGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0" />
            <stop offset="80%" stopColor={glintColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={glintColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Expanding ring */}
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke={glintColor}
          strokeWidth={Math.max(1, width / 540)}
          opacity={env * 0.5 * intensity}
          style={{ mixBlendMode: "screen" }}
        />

        {/* Rays */}
        <g filter={`url(#sb-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {rayPolygons.map(({ pts, rayColor }, ri) => (
            <polygon
              key={ri}
              points={pts}
              fill={rayColor}
              opacity={env * (0.55 + 0.3 * detRand(ri, seed, 8)) * intensity}
            />
          ))}
        </g>

        {/* Central glow disk */}
        <circle
          cx={cx}
          cy={cy}
          r={centralR * 3.5}
          fill={`url(#${gradId})`}
          opacity={env * 0.75 * intensity}
          style={{ mixBlendMode: "screen" }}
        />

        {/* Bright core point */}
        <circle
          cx={cx}
          cy={cy}
          r={centralR * 0.6}
          fill={glintColor}
          opacity={env * intensity}
          style={{ mixBlendMode: "screen" }}
        />
      </svg>
    </AbsoluteFill>
  );
};
