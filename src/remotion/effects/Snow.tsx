import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface SnowProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#ffffff", "#eaf2ff"];

/**
 * Soft drifting snowflakes (FRONT band). Varied size/speed/opacity flakes
 * falling with gentle horizontal sway, seamless top->bottom wrap.
 */
export const Snow: React.FC<SnowProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  const COUNT = 65;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
        overflow="hidden"
      >
        <defs>
          <filter id={`snow-blur-${seed}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>
        <clipPath id={`snow-clip-${seed}`}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
        <g
          clipPath={`url(#snow-clip-${seed})`}
          filter={`url(#snow-blur-${seed})`}
          style={{ mixBlendMode: "screen" }}
        >
          {Array.from({ length: COUNT }, (_, i) => {
            const fallSpeed = detRand(i, seed, 0) * 1.4 + 0.5; // px/frame downward
            const phase = detRand(i, seed, 1) * (height + 40);
            // Seamless wrap top->bottom
            const y =
              (((frame * fallSpeed + phase) % (height + 40)) + height + 40) % (height + 40) - 20;

            const startX = detRand(i, seed, 2) * width;
            // Gentle horizontal sway
            const swayAmp = detRand(i, seed, 3) * 30 + 10;
            const swayFreq = detRand(i, seed, 4) * 0.025 + 0.008;
            const x = startX + Math.sin(frame * swayFreq + detRand(i, seed, 5) * 6.28) * swayAmp;

            const radius = detRand(i, seed, 6) * 4 + 1.5;
            const color = colors[Math.floor(detRand(i, seed, 7) * colors.length)];
            const opacity = (detRand(i, seed, 8) * 0.45 + 0.4) * intensity;

            return (
              <circle key={i} cx={x} cy={y} r={radius} fill={color} opacity={opacity} />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
