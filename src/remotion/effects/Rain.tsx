import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface RainProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#cfe0ff", "#aac4ff"];

/**
 * Diagonal falling rain streaks (FRONT band). Near-vertical thin lines with
 * slight wind angle, seamless wrap, varied length/opacity/speed per drop.
 */
export const Rain: React.FC<RainProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  // Wind angle: slight diagonal (about 10 degrees from vertical)
  const windAngle = 0.18; // radians
  const sinA = Math.sin(windAngle);
  const cosA = Math.cos(windAngle);

  // Diagonal travel distance so drops fully cross the frame
  const diagHeight = height + width * Math.abs(sinA) + 80;

  const COUNT = 80;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
        overflow="hidden"
      >
        <clipPath id={`rain-clip-${seed}`}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
        <g clipPath={`url(#rain-clip-${seed})`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: COUNT }, (_, i) => {
            // Each drop has its own speed, phase, x position, length, opacity
            const fallSpeed = detRand(i, seed, 0) * 8 + 10; // px/frame along diagonal
            const phase = detRand(i, seed, 1) * diagHeight;
            // Travel distance along the diagonal (t wraps 0..diagHeight)
            const t = ((frame * fallSpeed + phase) % diagHeight + diagHeight) % diagHeight;

            // Start drops spread across top + left edge offset to cover full frame
            const startX = detRand(i, seed, 2) * (width + 60) - 30;

            // Position along the diagonal direction
            const cx = startX + t * sinA;
            const cy = -20 + t * cosA;

            // Streak length (short thin lines)
            const streakLen = detRand(i, seed, 3) * 22 + 14;
            const x1 = cx;
            const y1 = cy;
            const x2 = cx - streakLen * sinA;
            const y2 = cy - streakLen * cosA;

            const strokeW = detRand(i, seed, 4) * 0.8 + 0.4;
            const color = colors[Math.floor(detRand(i, seed, 5) * colors.length)];
            const opacity = (detRand(i, seed, 6) * 0.4 + 0.35) * intensity;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={strokeW}
                opacity={opacity}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
