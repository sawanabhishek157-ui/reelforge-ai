import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface StarFieldProps {
  intensity?: number;
  seed?: number;
  count?: number;
}

/**
 * Deterministic pseudo-random in [0, 1) — no Math.random(), fully frame-independent.
 * Uses a classic hash: sin(index * prime1 + seed * prime2) * large_int frac part.
 */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

// Three parallax layers: near (fast), mid, far (slow).
const LAYER_CONFIG = [
  { speedX: 0.08, speedY: 0.04, countFrac: 0.25, minSize: 1.5, maxSize: 3.0, baseOpacity: 0.9 },
  { speedX: 0.04, speedY: 0.02, countFrac: 0.35, minSize: 1.0, maxSize: 2.2, baseOpacity: 0.75 },
  { speedX: 0.015, speedY: 0.008, countFrac: 0.40, minSize: 0.6, maxSize: 1.6, baseOpacity: 0.55 },
] as const;

export const StarField: React.FC<StarFieldProps> = ({
  intensity = 1.0,
  seed = 0,
  count = 120,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Soft glow filter for glowing star dots */}
          <filter id={`sf-glow-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {LAYER_CONFIG.map((layer, layerIdx) => {
          const starCount = Math.round(count * layer.countFrac);
          const layerSeed = seed + layerIdx * 137;

          return (
            <g key={layerIdx} filter={`url(#sf-glow-${seed})`}>
              {Array.from({ length: starCount }, (_, i) => {
                // Deterministic base position
                const baseX = detRand(i, layerSeed, 0) * width;
                const baseY = detRand(i, layerSeed, 1) * height;

                // Unique twinkle phase and speed per star
                const twinklePhase = detRand(i, layerSeed, 2) * Math.PI * 2;
                const twinkleSpeed = detRand(i, layerSeed, 3) * 0.06 + 0.03; // radians/frame
                const twinkleDepth = detRand(i, layerSeed, 4) * 0.45 + 0.25; // 0.25..0.70

                // Star size
                const radius =
                  layer.minSize + detRand(i, layerSeed, 5) * (layer.maxSize - layer.minSize);

                // Parallax drift — slow continuous scroll, wraps seamlessly
                const driftX = (frame * layer.speedX) % width;
                const driftY = (frame * layer.speedY) % height;

                // Wrapped position
                const x = ((baseX - driftX) % width + width) % width;
                const y = ((baseY - driftY) % height + height) % height;

                // Oscillating opacity: base * (1 - depth) + base * depth * sin(...)
                const twinkle = Math.sin(frame * twinkleSpeed + twinklePhase);
                const opacity =
                  layer.baseOpacity *
                  (1 - twinkleDepth + twinkleDepth * (twinkle * 0.5 + 0.5)) *
                  intensity;

                // Color: mostly white-blue, occasional warm accent
                const hue = detRand(i, layerSeed, 6);
                const color =
                  hue > 0.85
                    ? "#ffe8c0" // warm accent
                    : hue > 0.7
                      ? "#d0e8ff" // cool blue
                      : "#ffffff"; // pure white

                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={color}
                    opacity={opacity}
                    style={{ mixBlendMode: "screen" }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
