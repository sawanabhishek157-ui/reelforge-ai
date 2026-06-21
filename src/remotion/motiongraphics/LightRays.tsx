import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface LightRaysProps {
  intensity?: number;
  origin?: "top" | "center";
  count?: number;
}

// Deterministic value in [0, 1] from ray index + slot
function det(index: number, slot: number): number {
  return Math.sin((index * 193.7 + slot * 89.1) * 0.02137) * 0.5 + 0.5;
}

export const LightRays: React.FC<LightRaysProps> = ({
  intensity = 1.0,
  origin = "top",
  count = 8,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Origin point — top means just above the frame, center means mid-frame
  const ox = width * 0.5;
  const oy = origin === "top" ? -height * 0.08 : height * 0.5;

  // Ray reach — how far each triangle tip extends (below origin for top, or radially for center)
  const rayReach = origin === "top" ? height * 1.35 : Math.hypot(width, height) * 0.9;

  // Global fade-in and fade-out
  const globalOpacity = interpolate(
    frame,
    [0, 18, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Slow collective rotation — one full cycle over ~900 frames (~30s), very gentle
  const baseRotationDeg = (frame * 0.04) % 360;

  // Subtle global pulse — breathes the overall opacity
  const globalPulse =
    Math.sin(frame * 0.025) * 0.08 + 0.92;

  const rays = Array.from({ length: count }, (_, i) => {
    // Spread rays evenly around a half-circle (for top) or full-circle (for center)
    const span = origin === "top" ? 110 : 360; // degrees
    const baseAngleDeg =
      origin === "top"
        ? -55 + (i / (count - 1)) * span // fan from -55° to +55° relative to down
        : (i / count) * span;

    // Deterministic angular spread variation
    const jitterDeg = (det(i, 0) - 0.5) * (span / count) * 0.6;
    const angleDeg = baseAngleDeg + jitterDeg + baseRotationDeg * (origin === "center" ? 1 : 0.15);
    const angleRad = (angleDeg * Math.PI) / 180;

    // Ray geometry: triangular wedge emanating from origin
    const halfWidthAngleRad = (det(i, 1) * 4 + 2.5) * (Math.PI / 180); // 2.5–6.5 deg half-width

    const tipX = ox + Math.sin(angleRad) * rayReach;
    const tipY = oy + Math.cos(angleRad) * rayReach;

    const leftAngle = angleRad - halfWidthAngleRad;
    const rightAngle = angleRad + halfWidthAngleRad;

    const lx = ox + Math.sin(leftAngle) * rayReach;
    const ly = oy + Math.cos(leftAngle) * rayReach;
    const rx = ox + Math.sin(rightAngle) * rayReach;
    const ry = oy + Math.cos(rightAngle) * rayReach;

    // Per-ray opacity: deterministic base + individual slow pulse
    const baseOpacity = det(i, 2) * 0.35 + 0.25;
    const pulseFreq = det(i, 3) * 0.018 + 0.008; // slow
    const pulsePhase = det(i, 4) * Math.PI * 2;
    const pulse = Math.sin(frame * pulseFreq * Math.PI * 2 + pulsePhase) * 0.18 + 0.82;

    const rayOpacity = baseOpacity * pulse * globalPulse * intensity * globalOpacity;

    // Color variation: mostly golden/warm, some cooler rays
    const warmth = det(i, 5);
    const color =
      warmth > 0.65
        ? "#fff4c2" // soft cream-gold
        : warmth > 0.35
        ? "#ffd97a" // warm gold
        : "#e8c4ff"; // cool lavender-cosmic for variety

    return {
      points: `${ox},${oy} ${lx},${ly} ${tipX},${tipY} ${rx},${ry}`,
      rayOpacity,
      color,
    };
  });

  // Soft central bloom at origin
  const bloomOpacity = interpolate(
    frame,
    [0, 20, durationInFrames - 15, durationInFrames],
    [0, 0.55 * intensity, 0.55 * intensity, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const bloomPulse = Math.sin(frame * 0.03) * 0.1 + 0.9;
  const bloomRadius = (width * 0.18) * bloomPulse;

  const gradId = `lr-bloom-${origin}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <defs>
          <radialGradient
            id={gradId}
            cx={ox}
            cy={oy}
            r={bloomRadius}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff8d0" stopOpacity="1" />
            <stop offset="35%" stopColor="#ffd060" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#c890ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Softening blur for rays */}
          <filter id="ray-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
          </filter>

          {/* Glow filter for crisp+soft combo */}
          <filter id="ray-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Volumetric ray layer — blurred soft base */}
        <g filter="url(#ray-blur)" style={{ mixBlendMode: "screen" }}>
          {rays.map((ray, i) => (
            <polygon
              key={i}
              points={ray.points}
              fill={ray.color}
              opacity={ray.rayOpacity * 0.7}
            />
          ))}
        </g>

        {/* Sharper ray layer for definition */}
        <g filter="url(#ray-glow)" style={{ mixBlendMode: "screen" }}>
          {rays.map((ray, i) => (
            <polygon
              key={i}
              points={ray.points}
              fill={ray.color}
              opacity={ray.rayOpacity * 0.35}
            />
          ))}
        </g>

        {/* Central bloom at the origin point */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#${gradId})`}
          opacity={bloomOpacity}
          style={{ mixBlendMode: "screen" }}
        />
      </svg>
    </AbsoluteFill>
  );
};
