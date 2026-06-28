import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface FogProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

const DEFAULT_PALETTE = ["#cdd8ef"];

/**
 * Soft atmospheric fog/mist (BEHIND band). Large low-opacity radial gradient
 * blobs whose positions drift via noise2D — slow, atmospheric, depth-filling.
 */
export const Fog: React.FC<FogProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  // Slow time scale for fog drift
  const t = frame * 0.003;

  // 6 large fog blobs drifting organically via noise
  const BLOBS = 6;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          {Array.from({ length: BLOBS }, (_, i) => {
            const color = colors[i % colors.length];
            return (
              <radialGradient
                key={i}
                id={`fog-grad-${seed}-${i}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="60%" stopColor={color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        <g style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: BLOBS }, (_, i) => {
            // Noise-driven position drift — each blob has a unique seed offset
            const nxBase = i * 3.7 + seed * 0.11;
            const nyBase = i * 2.3 + seed * 0.17;

            // noise2D returns [-1, 1]; map to full frame coverage
            const nx = noise2D(`fog-x-${i}`, nxBase + t, 0);
            const ny = noise2D(`fog-y-${i}`, nyBase, t * 0.7);

            // Blobs wander across most of the frame; centre loosely distributed
            const baseFracX = (i * 0.19 + 0.1) % 1.0;
            const baseFracY = (i * 0.16 + 0.08) % 1.0;
            const cx = (baseFracX + nx * 0.35) * width;
            const cy = (baseFracY + ny * 0.25) * height;

            // Large, varied ellipse sizes
            const rx = (0.35 + (i % 3) * 0.1) * width;
            const ry = (0.22 + (i % 2) * 0.12) * height;

            // Gentle breathing opacity via noise
            const nOpacity = noise2D(`fog-op-${i}`, t * 0.4, i * 1.1);
            const opacity = ((nOpacity * 0.5 + 0.5) * 0.28 + 0.12) * intensity;

            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={`url(#fog-grad-${seed}-${i})`}
                opacity={opacity}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
