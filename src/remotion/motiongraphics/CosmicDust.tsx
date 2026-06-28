import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface CosmicDustProps {
  intensity?: number;
  seed?: number;
  /** Direction of flow in degrees. 0 = right, 90 = down, 180 = left, 270 = up. */
  direction?: number;
}

/**
 * Deterministic pseudo-random in [0, 1) — fully frame-independent.
 */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const PARTICLE_COUNT = 80;

export const CosmicDust: React.FC<CosmicDustProps> = ({
  intensity = 1.0,
  seed = 0,
  direction = 45,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Convert direction degrees to radians; flow vector (dx, dy per frame)
  const radians = (direction * Math.PI) / 180;
  const cosD = Math.cos(radians);
  const sinD = Math.sin(radians);

  // Flow speed range: 0.4..1.2 px/frame base, varied per particle
  const BASE_SPEED = 0.7;

  // Diagonal of the canvas — determines wrap boundary in flow-axis coords
  const diagonal = Math.sqrt(width * width + height * height);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Soft radial glow for each mote */}
          <filter id={`cd-glow-${seed}`} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#cd-glow-${seed})`}>
          {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
            // Scatter start position across canvas, each with its own flow offset
            const startX = detRand(i, seed, 0) * width;
            const startY = detRand(i, seed, 1) * height;

            // Phase offset: stagger particles so they don't all start at x=0 of flow
            const phaseOffset = detRand(i, seed, 2) * diagonal;

            // Per-particle speed variation
            const speed = (detRand(i, seed, 3) * 0.8 + 0.6) * BASE_SPEED;

            // Size: 1..4 px, smaller particles feel more distant/fine
            const radius = detRand(i, seed, 4) * 3.0 + 0.8;

            // Base opacity — some motes brighter than others
            const baseOpacity = (detRand(i, seed, 5) * 0.55 + 0.25) * intensity;

            // Gentle opacity pulse: slower than star twinkle, feels like breathing
            const pulsePhase = detRand(i, seed, 6) * Math.PI * 2;
            const pulseSpeed = detRand(i, seed, 7) * 0.03 + 0.015;
            const pulse = Math.sin(frame * pulseSpeed + pulsePhase) * 0.25 + 0.75; // 0.5..1.0

            // Slight lateral wobble perpendicular to flow direction
            const wobbleAmp = (detRand(i, seed, 8) * 12 + 4); // px
            const wobbleFreq = (detRand(i, seed, 9) * 0.025 + 0.01);
            const wobblePhase2 = detRand(i, seed, 10) * Math.PI * 2;
            const wobble = Math.sin(frame * wobbleFreq + wobblePhase2) * wobbleAmp;

            // Flow distance: (frame * speed + phaseOffset) mod diagonal — seamless wrap
            const flowDist = ((frame * speed + phaseOffset) % diagonal + diagonal) % diagonal;

            // Position along flow axis
            const flowX = cosD * flowDist;
            const flowY = sinD * flowDist;

            // Perpendicular axis (right-hand perp: rotate 90°)
            const perpX = -sinD * wobble;
            const perpY = cosD * wobble;

            // Final position: start + flow + wobble, then wrap per-axis
            const rawX = startX + flowX + perpX;
            const rawY = startY + flowY + perpY;
            const x = ((rawX % width) + width) % width;
            const y = ((rawY % height) + height) % height;

            const opacity = baseOpacity * pulse;

            // Color: blue-purple cosmic palette with occasional brighter mote
            const colorRoll = detRand(i, seed, 11);
            const color =
              colorRoll > 0.85
                ? "#f0e0ff" // bright lavender
                : colorRoll > 0.6
                  ? "#c0d8ff" // blue-white
                  : colorRoll > 0.3
                    ? "#a0c0f8" // mid blue
                    : "#e8d4ff"; // soft purple

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
      </svg>
    </AbsoluteFill>
  );
};
