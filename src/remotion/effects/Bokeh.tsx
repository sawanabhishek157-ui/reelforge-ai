import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface BokehProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFFFFF", "#E0D4FF"];

/**
 * Large soft out-of-focus circles drifting slowly with heavy gaussian blur,
 * simulating cinematic depth-of-field bokeh (BEHIND band). Dreamy and atmospheric.
 */
export const Bokeh: React.FC<BokehProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const count = 18;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          {/* Multiple blur levels to give varied depth feel */}
          <filter id={`bk-blur-soft-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id={`bk-blur-heavy-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <filter id={`bk-blur-extreme-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="45" />
          </filter>
        </defs>
        <g style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            // Starting position with slow drift
            const startX = detRand(i, seed, 0) * width;
            const startY = detRand(i, seed, 1) * height;
            const driftSpeedX = (detRand(i, seed, 2) - 0.5) * 0.3; // slow horizontal drift
            const driftSpeedY = (detRand(i, seed, 3) - 0.5) * 0.2; // very slow vertical drift
            const phase = detRand(i, seed, 4) * 600; // stagger starting positions in time
            const cx = ((startX + (frame + phase) * driftSpeedX) % (width + 200) + width + 200) % (width + 200) - 100;
            const cy = ((startY + (frame + phase) * driftSpeedY) % (height + 200) + height + 200) % (height + 200) - 100;

            // Varied circle sizes — large for bokeh effect
            const radius = detRand(i, seed, 5) * (width * 0.08) + (width * 0.04); // 4%..12% of width

            // Slow opacity breathing
            const breathFreq = detRand(i, seed, 6) * 0.008 + 0.003;
            const breathPhase = detRand(i, seed, 7) * Math.PI * 2;
            const breath = Math.sin(frame * breathFreq + breathPhase) * 0.3 + 0.7; // 0.4..1

            const baseOpacity = detRand(i, seed, 8) * 0.25 + 0.1; // keep subtle: 0.1..0.35
            const opacity = baseOpacity * breath * intensity;
            const color = colors[i % colors.length];

            // Choose blur level based on perceived depth tier
            const blurTier = Math.floor(detRand(i, seed, 9) * 3);
            const filterId =
              blurTier === 0
                ? `bk-blur-soft-${seed}`
                : blurTier === 1
                ? `bk-blur-heavy-${seed}`
                : `bk-blur-extreme-${seed}`;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                opacity={opacity}
                filter={`url(#${filterId})`}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
