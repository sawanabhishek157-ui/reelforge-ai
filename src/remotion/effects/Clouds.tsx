import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface CloudsProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#ffffff", "#d8d8e8"];

/**
 * Slow drifting cloud shapes (BEHIND band). Blurred white/grey ellipse
 * composites drift horizontally with parallax-scaled speed. Varied sizes
 * and heights across the frame.
 */
export const Clouds: React.FC<CloudsProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  const CLOUD_COUNT = 7;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          {/* Soft blur filter gives each ellipse a cloud-like feathered edge */}
          <filter id={`cloud-blur-${seed}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          {/* Lighter blur for smaller puff blobs within each cloud */}
          <filter id={`cloud-puff-${seed}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {Array.from({ length: CLOUD_COUNT }, (_, i) => {
            const color = colors[i % colors.length];
            return (
              <radialGradient
                key={i}
                id={`cloud-grad-${seed}-${i}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="70%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        <g style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: CLOUD_COUNT }, (_, i) => {
            // Parallax: clouds at higher Y (further back) drift more slowly
            const heightFrac = detRand(i, seed, 0) * 0.65; // top 65% of frame
            const driftSpeed = (0.12 + detRand(i, seed, 1) * 0.2) * (1 - heightFrac * 0.5);
            const startX = detRand(i, seed, 2) * (width + 400) - 200;

            // Drift left→right, seamless wrap
            const cloudWidth = (detRand(i, seed, 3) * 0.35 + 0.25) * width;
            const totalRange = width + cloudWidth + 400;
            const x = ((startX + frame * driftSpeed) % totalRange + totalRange) % totalRange - cloudWidth / 2 - 200;

            const cy = heightFrac * height * 0.7 + height * 0.04;
            const rx = cloudWidth / 2;
            const ry = rx * (detRand(i, seed, 4) * 0.3 + 0.3);

            // Gentle vertical bob via noise
            const bob = noise2D(`cloud-bob-${i}`, frame * 0.004 + i * 1.3, 0) * ry * 0.25;

            const color = colors[i % colors.length];
            const baseOpacity = (detRand(i, seed, 5) * 0.25 + 0.45) * intensity;

            // Each cloud is a main body ellipse + 2 puff bumps for a natural silhouette
            const puff1X = x - rx * (detRand(i, seed, 6) * 0.3 + 0.1);
            const puff1Y = cy + bob - ry * (detRand(i, seed, 7) * 0.3 + 0.4);
            const puff1R = rx * (detRand(i, seed, 8) * 0.25 + 0.3);

            const puff2X = x + rx * (detRand(i, seed, 9) * 0.3 + 0.1);
            const puff2Y = cy + bob - ry * (detRand(i, seed, 10) * 0.25 + 0.3);
            const puff2R = rx * (detRand(i, seed, 11) * 0.2 + 0.25);

            return (
              <g key={i}>
                {/* Main body */}
                <ellipse
                  cx={x}
                  cy={cy + bob}
                  rx={rx}
                  ry={ry}
                  fill={`url(#cloud-grad-${seed}-${i})`}
                  opacity={baseOpacity}
                  filter={`url(#cloud-blur-${seed})`}
                />
                {/* Upper puff bumps */}
                <ellipse
                  cx={puff1X}
                  cy={puff1Y}
                  rx={puff1R}
                  ry={puff1R * 0.75}
                  fill={color}
                  opacity={baseOpacity * 0.7}
                  filter={`url(#cloud-puff-${seed})`}
                />
                <ellipse
                  cx={puff2X}
                  cy={puff2Y}
                  rx={puff2R}
                  ry={puff2R * 0.7}
                  fill={color}
                  opacity={baseOpacity * 0.65}
                  filter={`url(#cloud-puff-${seed})`}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
