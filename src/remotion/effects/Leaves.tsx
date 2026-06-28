import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface LeavesProps {
  intensity?: number;
  seed?: number;
  count?: number;
  /** Palette: "petal" (soft pink/white) or "leaf" (autumn). */
  palette?: "petal" | "leaf";
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const PETAL = ["#ffd9e6", "#ffc2d6", "#ffe9f0", "#f7b8cf"];
const LEAF = ["#d98a3d", "#c46a2a", "#e0a64e", "#a85320"];

/**
 * Petals / leaves drifting and falling in FRONT of the subject — adds a near
 * foreground plane that sells the depth.
 */
export const Leaves: React.FC<LeavesProps> = ({
  intensity = 1.0,
  seed = 0,
  count = 26,
  palette = "petal",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette === "leaf" ? LEAF : PETAL;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {Array.from({ length: count }, (_, i) => {
          const startX = detRand(i, seed, 0) * width;
          const fallSpeed = detRand(i, seed, 1) * 1.1 + 0.7; // px/frame
          const phase = detRand(i, seed, 2) * height;
          // Fall downward, wrap top->bottom seamlessly.
          const y = (((frame * fallSpeed + phase) % (height + 80)) + height + 80) % (height + 80) - 40;
          // Horizontal sway.
          const swayAmp = detRand(i, seed, 3) * 60 + 20;
          const swayFreq = detRand(i, seed, 4) * 0.03 + 0.012;
          const x = startX + Math.sin(frame * swayFreq + detRand(i, seed, 5) * 6.28) * swayAmp;
          // Tumble.
          const spin = (frame * (detRand(i, seed, 6) * 4 + 1.5) + detRand(i, seed, 7) * 360) % 360;
          const rx = detRand(i, seed, 8) * 7 + 5;
          const ry = rx * (detRand(i, seed, 9) * 0.4 + 0.45);
          const color = colors[Math.floor(detRand(i, seed, 10) * colors.length)];
          const opacity = (detRand(i, seed, 11) * 0.4 + 0.55) * intensity;
          return (
            <g key={i} transform={`translate(${x},${y}) rotate(${spin})`} opacity={opacity}>
              <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={color} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
