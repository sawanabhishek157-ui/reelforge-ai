import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface SparklesProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFE9BF", "#D4AF37", "#E0D4FF"];

/**
 * Twinkling 4-point star sparkles that pop in/out with staggered scale+opacity pulses,
 * scattered across the frame (FRONT band). Great for magical / luxury / celebration beats.
 */
export const Sparkles: React.FC<SparklesProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const count = 40;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`sp-glow-${seed}`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#sp-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            const cx = detRand(i, seed, 0) * width;
            const cy = detRand(i, seed, 1) * height;

            // Each sparkle has its own phase offset and cycle speed
            const cycleSpeed = detRand(i, seed, 2) * 0.05 + 0.025; // radians/frame
            const phaseOffset = detRand(i, seed, 3) * Math.PI * 2;
            const pulse = Math.sin(frame * cycleSpeed + phaseOffset) * 0.5 + 0.5; // 0..1

            // Pop in and out: scale 0->1->0
            const scale = pulse;
            const baseSize = detRand(i, seed, 4) * 10 + 5; // 5..15 px half-width
            const r = baseSize * scale;

            const opacity = pulse * (detRand(i, seed, 5) * 0.5 + 0.5) * intensity;
            const color = colors[i % colors.length];

            // 4-point star path, centered at (cx, cy) with arm length r
            // Thin cross: long axis r, short axis r*0.15
            const shortR = r * 0.15;
            const starPath = [
              `M ${cx},${cy - r}`,
              `L ${cx + shortR},${cy - shortR}`,
              `L ${cx + r},${cy}`,
              `L ${cx + shortR},${cy + shortR}`,
              `L ${cx},${cy + r}`,
              `L ${cx - shortR},${cy + shortR}`,
              `L ${cx - r},${cy}`,
              `L ${cx - shortR},${cy - shortR}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={i}
                d={starPath}
                fill={color}
                opacity={opacity}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
