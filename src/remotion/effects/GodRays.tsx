import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface GodRaysProps {
  intensity?: number;
  seed?: number;
  /** Light origin as a fraction of the frame [x, y]. Default top-center-ish. */
  origin?: [number, number];
  count?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Volumetric light shafts + soft drifting fog. Lives in the BEHIND band so the
 * rays appear to emanate from behind the subject — the single biggest depth cue.
 */
export const GodRays: React.FC<GodRaysProps> = ({
  intensity = 1.0,
  seed = 0,
  origin = [0.5, -0.1],
  count = 7,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ox = origin[0] * width;
  const oy = origin[1] * height;
  const reach = Math.sqrt(width * width + height * height) * 1.3;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id={`gr-shaft-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff6e0" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ffe9bf" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffe9bf" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`gr-fog-${seed}`} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#cdd8ef" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#cdd8ef" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft fog — two large gradients drifting in opposite phases */}
        {[0, 1].map((k) => {
          const drift = Math.sin(frame * 0.006 + k * Math.PI) * width * 0.05;
          return (
            <rect
              key={`fog-${k}`}
              x={drift}
              y={0}
              width={width}
              height={height}
              fill={`url(#gr-fog-${seed})`}
              opacity={(0.6 + 0.4 * Math.sin(frame * 0.01 + k)) * intensity}
              style={{ mixBlendMode: "screen" }}
            />
          );
        })}

        {/* Light shafts fanning from the origin — the whole fan slowly sweeps
            so the light visibly rotates rather than sitting static. */}
        <g
          transform={`rotate(${Math.sin(frame * 0.014) * 16} ${ox} ${oy})`}
          style={{ mixBlendMode: "screen" }}
        >
          {Array.from({ length: count }, (_, i) => {
            const baseAngle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.16;
            const sway = Math.sin(frame * 0.012 + detRand(i, seed, 0) * 6.28) * 0.03;
            const angle = baseAngle + sway + Math.PI / 2; // shafts point downward from origin
            const halfW = (detRand(i, seed, 1) * 30 + 28) * (width / 1080);
            // Perpendicular offset for the shaft's two edges
            const px = Math.cos(angle + Math.PI / 2);
            const py = Math.sin(angle + Math.PI / 2);
            const ex = ox + Math.cos(angle) * reach;
            const ey = oy + Math.sin(angle) * reach;
            const pulse = 0.45 + 0.55 * (Math.sin(frame * (detRand(i, seed, 2) * 0.02 + 0.01) + i) * 0.5 + 0.5);
            const pts = [
              `${ox - px * 6},${oy - py * 6}`,
              `${ox + px * 6},${oy + py * 6}`,
              `${ex + px * halfW},${ey + py * halfW}`,
              `${ex - px * halfW},${ey - py * halfW}`,
            ].join(" ");
            return (
              <polygon
                key={i}
                points={pts}
                fill={`url(#gr-shaft-${seed})`}
                opacity={pulse * 0.5 * intensity}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
