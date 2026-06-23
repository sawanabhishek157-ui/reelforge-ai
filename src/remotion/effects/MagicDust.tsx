import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface MagicDustProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFD27F", "#FFFFFF"];

/**
 * Fine glittering dust motes rising and swirling with fast shimmer flicker (FRONT band).
 * Dense small bright points driven by noise paths — spell-casting or golden-hour feel.
 */
export const MagicDust: React.FC<MagicDustProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const count = 80;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`md-glow-${seed}`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#md-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            // Base spawn position
            const baseX = detRand(i, seed, 0) * width;
            const phase = detRand(i, seed, 1) * (height + 80);

            // Rise upward slowly (slower than embers — dust is lighter, lazier)
            const riseSpeed = detRand(i, seed, 2) * 0.5 + 0.15;
            const y =
              height -
              ((((frame * riseSpeed + phase) % (height + 80)) + height + 80) % (height + 80));

            // Noise-driven swirl: lateral wander via noise
            const t = frame * 0.003;
            const swirlAmp = detRand(i, seed, 3) * 35 + 10;
            const swirl = noise2D(`md-swirl-${seed}-${i}`, t, detRand(i, seed, 4)) * swirlAmp;
            const x = baseX + swirl;

            // Fast shimmer flicker — the defining quality of magic dust
            const flickerFreq = detRand(i, seed, 5) * 0.6 + 0.3; // fast: 0.3..0.9 rad/frame
            const flickerPhase = detRand(i, seed, 6) * Math.PI * 2;
            const flicker = Math.abs(Math.sin(frame * flickerFreq + flickerPhase)); // 0..1 sharp

            // Fade near top of frame
            const heightFade = 0.3 + 0.7 * (y / height);

            const radius = detRand(i, seed, 7) * 1.5 + 0.5; // very small: 0.5..2 px
            const baseOpacity = detRand(i, seed, 8) * 0.5 + 0.4;
            const opacity = baseOpacity * flicker * heightFade * intensity;
            const color = colors[i % colors.length];

            return (
              <circle key={i} cx={x} cy={y} r={radius} fill={color} opacity={opacity} />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
