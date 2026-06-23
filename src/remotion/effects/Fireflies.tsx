import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface FirefliesProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFF6A0", "#BBF7D0"];

/**
 * Slowly wandering glowing dots driven by organic noise paths, with soft pulsing
 * glow and occasional fade-outs (FRONT band). Ethereal, nature, or enchanted-forest feel.
 */
export const Fireflies: React.FC<FirefliesProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const count = 30;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          {/* Per-firefly glow filter */}
          <filter id={`ff-glow-${seed}`} x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#ff-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            // Base anchor position (stable per firefly)
            const baseX = detRand(i, seed, 0) * width;
            const baseY = detRand(i, seed, 1) * height;

            // Noise-driven wander — slow time scale so motion is organic
            const t = frame * 0.004;
            const noiseScale = 0.5;
            const wanderAmp = detRand(i, seed, 2) * 60 + 30; // 30..90 px range
            const nx = noise2D(`ff-x-${seed}-${i}`, t * noiseScale, 0) * wanderAmp;
            const ny = noise2D(`ff-y-${seed}-${i}`, 0, t * noiseScale) * wanderAmp;
            const cx = ((baseX + nx + width) % width);
            const cy = ((baseY + ny + height) % height);

            // Pulsing glow brightness
            const pulseFreq = detRand(i, seed, 3) * 0.05 + 0.02;
            const pulsePhase = detRand(i, seed, 4) * Math.PI * 2;
            const pulse = Math.sin(frame * pulseFreq + pulsePhase) * 0.45 + 0.55; // 0.1..1

            // Occasional slow fade-out (separate low-freq cycle)
            const fadeFreq = detRand(i, seed, 5) * 0.008 + 0.002;
            const fadePhase = detRand(i, seed, 6) * Math.PI * 2;
            const fade = Math.sin(frame * fadeFreq + fadePhase) * 0.5 + 0.5; // 0..1
            const fadeClamped = Math.max(0.05, fade);

            const radius = detRand(i, seed, 7) * 3 + 2; // 2..5 px
            const baseOpacity = detRand(i, seed, 8) * 0.4 + 0.5;
            const opacity = baseOpacity * pulse * fadeClamped * intensity;
            const color = colors[i % colors.length];

            return (
              <circle key={i} cx={cx} cy={cy} r={radius} fill={color} opacity={opacity} />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
