import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface FlameProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
  count?: number;
  /** flame height as a fraction of the frame */
  heightFrac?: number;
}

/** Deterministic pseudo-random in [0, 1). */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const FIRE = ["#fff3b0", "#ffb347", "#ff6b35", "#c4302b"];

/**
 * Rising, flickering flame tongues along the bottom — deterministic (no
 * Math.random/Date.now). Palette-aware so it can burn in brand colors. Used in
 * the brand outro and available as a scene effect.
 */
export const Flame: React.FC<FlameProps> = ({
  intensity = 1,
  seed = 0,
  palette,
  count = 16,
  heightFrac = 0.32,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cols = palette && palette.length >= 3 ? palette : FIRE;
  const id = `flame-${seed}`;
  const base = height;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={cols[0]} stopOpacity="0.95" />
            <stop offset="45%" stopColor={cols[1 % cols.length]} stopOpacity="0.8" />
            <stop offset="78%" stopColor={cols[2 % cols.length]} stopOpacity="0.45" />
            <stop offset="100%" stopColor={cols[Math.min(3, cols.length - 1)]} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-b`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
        </defs>
        <g filter={`url(#${id}-b)`} style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: count }, (_, i) => {
            const x = ((i + 0.5) / count) * width;
            const w = (width / count) * 1.7; // overlap so it reads as fire, not bars
            const flick = Math.sin(frame * (0.16 + detRand(i, seed, 0) * 0.12) + detRand(i, seed, 1) * 6.28) * 0.25 + 0.85;
            const h = (height * heightFrac * (0.6 + detRand(i, seed, 2) * 0.6)) * flick * intensity;
            const sway = Math.sin(frame * 0.09 + detRand(i, seed, 3) * 6.28) * w * 0.45;
            const tipX = x + sway;
            const tipY = base - h;
            const midY = base - h * 0.5;
            const d = `M ${x - w / 2} ${base} Q ${x - w / 2} ${midY} ${tipX} ${tipY} Q ${x + w / 2} ${midY} ${x + w / 2} ${base} Z`;
            return <path key={i} d={d} fill={`url(#${id})`} opacity={(0.55 + detRand(i, seed, 4) * 0.45) * intensity} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
