import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface EmbersProps {
  intensity?: number;
  seed?: number;
  count?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const EMBER_COLORS = ["#ffb347", "#ff8c42", "#ffd27f", "#ff6b35"];

/**
 * Rising embers + floating dust motes (FRONT band). Warm glowing particles that
 * drift up and flicker — atmosphere for fire / spiritual / dramatic beats.
 */
export const Embers: React.FC<EmbersProps> = ({ intensity = 1.0, seed = 0, count = 55 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`em-glow-${seed}`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#em-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            const startX = detRand(i, seed, 0) * width;
            const riseSpeed = detRand(i, seed, 1) * 0.9 + 0.4; // px/frame upward
            const phase = detRand(i, seed, 2) * (height + 60);
            // Rise upward, wrap bottom->top.
            const y = height - ((((frame * riseSpeed + phase) % (height + 60)) + height + 60) % (height + 60));
            const swayAmp = detRand(i, seed, 3) * 28 + 8;
            const swayFreq = detRand(i, seed, 4) * 0.04 + 0.015;
            const x = startX + Math.sin(frame * swayFreq + detRand(i, seed, 5) * 6.28) * swayAmp;
            const radius = detRand(i, seed, 6) * 2.2 + 0.7;
            // Fast flicker — embers shimmer.
            const flicker = Math.sin(frame * (detRand(i, seed, 7) * 0.3 + 0.15) + detRand(i, seed, 8) * 6.28) * 0.35 + 0.65;
            // Fade as they rise (brighter low, dimmer high).
            const heightFade = 0.4 + 0.6 * (y / height);
            const opacity = (detRand(i, seed, 9) * 0.4 + 0.45) * flicker * heightFade * intensity;
            const color = EMBER_COLORS[Math.floor(detRand(i, seed, 10) * EMBER_COLORS.length)];
            return <circle key={i} cx={x} cy={y} r={radius} fill={color} opacity={opacity} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
