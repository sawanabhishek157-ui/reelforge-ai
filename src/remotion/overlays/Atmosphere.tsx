import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface AtmosphereProps {
  intensity?: number;
  seed?: number;
  durationInFrames: number;
}

// Deterministic pseudo-random from index + seed — no Math.random()
function deterministicValue(index: number, seed: number, offset = 0): number {
  return Math.sin((index + seed * 0.37 + offset) * 2.399) * 0.5 + 0.5;
}

const PARTICLE_COUNT = 18;
const HAZE_COUNT = 3;

export const Atmosphere: React.FC<AtmosphereProps> = ({
  intensity = 1.0,
  seed = 0,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Particles drift slowly across the scene driven by frame
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const baseX = deterministicValue(i, seed, 0) * width;
    const baseY = deterministicValue(i, seed, 1) * height;
    const speed = deterministicValue(i, seed, 2) * 0.3 + 0.05; // 0.05..0.35 px/frame
    const driftAngle = deterministicValue(i, seed, 3) * Math.PI * 2;
    const radius = deterministicValue(i, seed, 4) * 3 + 1; // 1..4px
    const particleOpacity = (deterministicValue(i, seed, 5) * 0.6 + 0.2) * intensity * 0.12;

    // Wrap-around drift
    const dx = Math.cos(driftAngle) * speed * frame;
    const dy = Math.sin(driftAngle) * speed * frame;
    const x = ((baseX + dx) % width + width) % width;
    const y = ((baseY + dy) % height + height) % height;

    return { x, y, radius, opacity: particleOpacity };
  });

  // Haze gradients drift gently
  const hazes = Array.from({ length: HAZE_COUNT }, (_, i) => {
    const baseX = deterministicValue(i, seed, 6) * width;
    const baseY = deterministicValue(i, seed, 7) * height * 0.5;
    const driftSpeed = deterministicValue(i, seed, 8) * 0.08 + 0.02;
    const hazeOpacity = (deterministicValue(i, seed, 9) * 0.4 + 0.1) * intensity * 0.13;
    const hazeRadius = deterministicValue(i, seed, 10) * width * 0.5 + width * 0.25;

    const cx = baseX + Math.sin((frame * driftSpeed * Math.PI) / 180) * width * 0.08;
    const cy = baseY + Math.cos((frame * driftSpeed * Math.PI * 0.7) / 180) * height * 0.04;

    return { cx, cy, radius: hazeRadius, opacity: hazeOpacity };
  });

  // Optional diagonal light ray — very faint
  const rayOpacity = interpolate(
    frame,
    [0, durationInFrames * 0.1, durationInFrames * 0.5, durationInFrames * 0.9, durationInFrames],
    [0, 0.06 * intensity, 0.04 * intensity, 0.06 * intensity, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const rayShift = interpolate(
    frame,
    [0, durationInFrames],
    [0, width * 0.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const gradientId = `atm-ray-${seed}`;
  const hazeGradIds = hazes.map((_, i) => `atm-haze-${seed}-${i}`);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Diagonal light ray gradient */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="40%" stopColor="#e8f4ff" stopOpacity="1" />
            <stop offset="60%" stopColor="#e8f4ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Per-haze radial gradients */}
          {hazes.map((h, i) => (
            <radialGradient
              key={i}
              id={hazeGradIds[i]}
              cx={h.cx}
              cy={h.cy}
              r={h.radius}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#c8d8f0" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#c8d8f0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c8d8f0" stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Haze layers — screen blend, very low opacity */}
        {hazes.map((h, i) => (
          <rect
            key={i}
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${hazeGradIds[i]})`}
            opacity={h.opacity}
            style={{ mixBlendMode: "screen" }}
          />
        ))}

        {/* Diagonal light ray */}
        <rect
          x={rayShift - width * 0.06}
          y={-height * 0.1}
          width={width * 0.12}
          height={height * 1.2}
          fill={`url(#${gradientId})`}
          opacity={rayOpacity}
          style={{ mixBlendMode: "screen" }}
          transform={`rotate(-25, ${width / 2}, ${height / 2})`}
        />

        {/* Dust motes — screen blend */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.radius}
            fill="#d0e8ff"
            opacity={p.opacity}
            style={{ mixBlendMode: "screen" }}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
