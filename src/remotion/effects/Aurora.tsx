import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface AuroraProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
  /** Number of aurora curtain bands. */
  bands?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#22C55E", "#8B5CF6"];

const POINTS = 14; // horizontal sample points per curtain

/**
 * Flowing aurora curtains — vertical translucent bands with wavy top edges that
 * ripple horizontally via noise2D over time. Screen blend for colour stacking.
 * Designed for the BEHIND band; pairs well with Nebula beneath it.
 */
export const Aurora: React.FC<AuroraProps> = ({
  intensity = 1.0,
  seed = 0,
  palette = DEFAULT_PALETTE,
  bands = 4,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette.length > 0 ? palette : DEFAULT_PALETTE;

  // Each band produces a vertically-tall polygon with a wavy top edge.
  const bandPolygons = Array.from({ length: bands }, (_, bi) => {
    const color = colors[bi % colors.length];
    const gradId = `aur-grad-${seed}-${bi}`;

    // Band horizontal position drifts slowly via noise.
    const bandT = frame * 0.004 + bi * 1.3;
    const centerNoise = noise2D(`aur-cx-${seed}-${bi}`, bandT * 0.3, 0);
    const baseCenter = (detRand(bi, seed, 0) * 0.9 + 0.05) * width;
    const centerX = baseCenter + centerNoise * width * 0.08;

    // Band width oscillates.
    const widthNoise = noise2D(`aur-w-${seed}-${bi}`, bandT * 0.2, bi * 0.9);
    const bandWidth = (detRand(bi, seed, 1) * 0.2 + 0.12) * width * (1 + widthNoise * 0.3);

    // Bottom edge: lower 30-60% of the frame, fixed per band.
    const bottomY = height * (0.55 + detRand(bi, seed, 2) * 0.35);

    // Top edge: wavy, driven by noise per horizontal sample point.
    const topBaseY = height * (detRand(bi, seed, 3) * 0.2 + 0.02);
    const waveAmp = height * (0.06 + detRand(bi, seed, 4) * 0.08);
    const waveSpeed = 0.007 + detRand(bi, seed, 5) * 0.005;

    // Build polygon: top-left → top-right (wavy) → bottom-right → bottom-left
    const topPoints: string[] = [];
    for (let p = 0; p <= POINTS; p++) {
      const frac = p / POINTS;
      const px = centerX - bandWidth / 2 + frac * bandWidth;
      const n = noise2D(`aur-tp-${seed}-${bi}`, frac * 2.5 + frame * waveSpeed, bi * 0.7);
      const py = topBaseY + n * waveAmp;
      topPoints.push(`${px},${py}`);
    }
    // Bottom edge (straight, reversed for closed polygon)
    const bottomPoints: string[] = [
      `${centerX + bandWidth / 2},${bottomY}`,
      `${centerX - bandWidth / 2},${bottomY}`,
    ];

    const allPts = [...topPoints, ...bottomPoints].join(" ");

    // Opacity envelope: breathes with noise
    const opNoise = noise2D(`aur-op-${seed}-${bi}`, bandT * 0.15, bi * 1.1);
    const opacity = (0.12 + 0.12 * opNoise + detRand(bi, seed, 6) * 0.06) * intensity;

    return { allPts, opacity, gradId, color, topBaseY, bottomY, centerX };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`aur-blur-${seed}`} x="-30%" y="-10%" width="160%" height="120%">
            <feGaussianBlur stdDeviation={`${Math.round(width / 120)} ${Math.round(height / 80)}`} />
          </filter>
          {bandPolygons.map(({ gradId, color, topBaseY, bottomY }) => (
            <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop
                offset={`${Math.round((topBaseY / height) * 100 + 5)}%`}
                stopColor={color}
                stopOpacity="0.9"
              />
              <stop
                offset={`${Math.round((bottomY / height) * 100 - 10)}%`}
                stopColor={color}
                stopOpacity="0.5"
              />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        <g filter={`url(#aur-blur-${seed})`} style={{ mixBlendMode: "screen" }}>
          {bandPolygons.map(({ allPts, opacity, gradId }, bi) => (
            <polygon
              key={bi}
              points={allPts}
              fill={`url(#${gradId})`}
              opacity={opacity}
            />
          ))}
        </g>

        {/* Soft shimmer overlay — a second pass at lower opacity for depth */}
        <g style={{ mixBlendMode: "screen" }} opacity={0.3 * intensity}>
          {bandPolygons.map(({ allPts, gradId }, bi) => (
            <polygon
              key={`s-${bi}`}
              points={allPts}
              fill={`url(#${gradId})`}
              opacity={0.4}
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
