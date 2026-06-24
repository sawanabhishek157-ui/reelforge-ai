import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { simulateParticles, type PhysicsType, type WindMood } from "./simulate";

interface PhysicsParticlesProps {
  type: PhysicsType;
  seed?: number;
  count?: number;
  palette?: string[];
  windMood?: WindMood;
  intensity?: number;
}

const DEFAULT_COUNT: Record<PhysicsType, number> = {
  windLeaves: 42,
  fallingPetals: 52,
  risingEmbers: 90,
  snow: 160,
  dust: 120,
  sparks: 60,
};

const DEFAULT_PALETTE: Record<PhysicsType, string[]> = {
  windLeaves: ["#d98a3d", "#c46a2a", "#e0a64e", "#7fae53"],
  fallingPetals: ["#ffd9e6", "#ffc2d6", "#ffe9f0", "#f7b8cf"],
  risingEmbers: ["#ffb347", "#ff8c42", "#ffd27f", "#ff6b35"],
  snow: ["#ffffff", "#eaf2ff", "#dbe7ff"],
  dust: ["#fff0d0", "#ffe6b0", "#ffffff"],
  sparks: ["#fff3b0", "#ffd27f", "#ffffff"],
};

/** light particles composite additively; leaves/petals/snow are solid */
const ADDITIVE: Record<PhysicsType, boolean> = {
  windLeaves: false,
  fallingPetals: false,
  risingEmbers: true,
  snow: false,
  dust: true,
  sparks: true,
};

/**
 * Renders a physics-simulated particle field. The full timeline is baked once
 * (memoized) then indexed by the current frame — deterministic and flicker-free.
 */
export const PhysicsParticles: React.FC<PhysicsParticlesProps> = ({
  type,
  seed = 0,
  count,
  palette,
  windMood,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const n = count ?? DEFAULT_COUNT[type];

  const baked = useMemo(
    () => simulateParticles({ type, count: n, seed, width, height, windMood }, durationInFrames),
    [type, n, seed, width, height, windMood, durationInFrames],
  );

  const states = baked[Math.min(frame, baked.length - 1)] ?? [];
  const cols = palette && palette.length > 0 ? palette : DEFAULT_PALETTE[type];
  const additive = ADDITIVE[type];
  const glow = additive ? `pf-glow-${type}-${seed}` : undefined;
  const isLeaf = type === "windLeaves" || type === "fallingPetals";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        {glow ? (
          <defs>
            <filter id={glow} x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        ) : null}
        <g filter={glow ? `url(#${glow})` : undefined} style={{ mixBlendMode: additive ? "screen" : "normal" }}>
          {states.map((p, i) => {
            const color = cols[p.ci % cols.length];
            const opacity = p.opacity * intensity;
            if (isLeaf) {
              return (
                <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.rot})`} opacity={opacity}>
                  <ellipse cx={0} cy={0} rx={p.size} ry={p.size * 0.5} fill={color} />
                </g>
              );
            }
            return <circle key={i} cx={p.x} cy={p.y} r={p.size} fill={color} opacity={opacity} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
