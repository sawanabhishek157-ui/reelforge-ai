import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface GridLinesProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#00FF41", "#3B82F6"];

/**
 * Perspective tech grid — horizontal lines receding to a vanishing horizon + vertical
 * lines, slowly scrolling toward the viewer for a Tron/synthwave floor feel (BEHIND band).
 * Low opacity, compositor-friendly screen blend.
 */
export const GridLines: React.FC<GridLinesProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const colorH = colors[0 % colors.length];
  const colorV = colors[1 % colors.length];

  // Horizon sits at 40% down from the top
  const horizonY = height * 0.40;
  // Vanishing point: horizontal center
  const vpX = width * 0.5;

  // Scroll speed: ~0.5 virtual units per frame, wrapping 0–1
  const scrollSpeed = 0.008;
  // t drives how far lines have "moved toward the viewer" — wraps 0–1
  const t = (frame * scrollSpeed) % 1;

  // Horizontal grid lines: lines between horizon and bottom, perspective-spaced.
  // We define N "slots" in perspective space and project them.
  const hLineCount = 12;
  const hLines: React.ReactNode[] = [];
  for (let i = 0; i < hLineCount; i++) {
    // Perspective parameter p in (0, 1]: p=0 → horizon, p=1 → camera.
    // Offset each slot by scroll amount so they animate toward the viewer.
    const rawP = ((i + t) / hLineCount);
    // Nonlinear: spread lines with quadratic to mimic perspective
    const p = rawP * rawP;
    if (p <= 0.0001) continue;
    const y = horizonY + (height - horizonY) * p;
    if (y > height) continue;
    // Opacity fades near horizon
    const opacity = Math.min(1, p * 3) * 0.35 * intensity;
    const lineColor = colorH;
    hLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={lineColor}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  }

  // Vertical (converging) lines: fan from vanishing point to bottom edge
  const vLineCount = 14;
  const vLines: React.ReactNode[] = [];
  // Spread across the full bottom edge width, plus a bit of bleed
  const spreadHalf = width * 0.7;
  for (let i = 0; i < vLineCount; i++) {
    // Each line's bottom x position
    const frac = i / (vLineCount - 1); // 0–1
    const bx = vpX - spreadHalf + frac * spreadHalf * 2;
    // Subtle drift per line using detRand for a static offset (no motion — horizon converge is visual motion)
    const opacityBase = 0.25 + detRand(i, seed, 0) * 0.15;
    const opacity = opacityBase * intensity;
    const lineColor = colors[i % colors.length];
    vLines.push(
      <line
        key={`v-${i}`}
        x1={vpX}
        y1={horizonY}
        x2={bx}
        y2={height}
        stroke={lineColor}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  }

  // Glow filter id is seed-scoped to avoid collisions when multiple instances render
  const filterId = `gl-glow-${seed}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, mixBlendMode: "screen" }}
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          {hLines}
          {vLines}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
