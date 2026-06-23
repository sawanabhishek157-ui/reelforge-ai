import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface NebulaProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#6B21A8", "#3B0764", "#4338CA"];

/**
 * Deep-space nebula clouds — layered low-opacity radial blobs that slowly morph
 * and drift via noise2D, producing a gas-cloud look. Designed for the BEHIND band.
 * Screen blend with heavy blur keeps it non-destructive over any subject.
 */
export const Nebula: React.FC<NebulaProps> = ({
  intensity = 1.0,
  seed = 0,
  palette = DEFAULT_PALETTE,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette.length > 0 ? palette : DEFAULT_PALETTE;

  // 8 blob layers; each drifts on its own noise path
  const blobs = Array.from({ length: 8 }, (_, i) => {
    const t = frame * 0.003 + i * 1.7;
    const noiseX = noise2D(`neb-x-${seed}-${i}`, t * 0.4, 0);
    const noiseY = noise2D(`neb-y-${seed}-${i}`, 0, t * 0.4);
    const noiseScale = noise2D(`neb-s-${seed}-${i}`, t * 0.2, t * 0.15);
    const noiseOpacity = noise2D(`neb-o-${seed}-${i}`, t * 0.25, i * 0.3);

    const baseX = detRand(i, seed, 0) * width;
    const baseY = detRand(i, seed, 1) * height;
    const driftX = noiseX * width * 0.18;
    const driftY = noiseY * height * 0.18;
    const cx = baseX + driftX;
    const cy = baseY + driftY;

    const baseR = (detRand(i, seed, 2) * 0.35 + 0.25) * Math.max(width, height);
    const r = baseR * (1 + noiseScale * 0.3);

    const opBase = (detRand(i, seed, 3) * 0.25 + 0.1) * intensity;
    const op = Math.max(0, opBase * (0.7 + noiseOpacity * 0.5));

    const color = colors[i % colors.length];
    const gradId = `neb-grad-${seed}-${i}`;

    return { cx, cy, r, op, color, gradId };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`neb-blur-${seed}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={`${Math.round(width / 55)}`} />
          </filter>
          {blobs.map(({ gradId, color, cx, cy, r }) => (
            <radialGradient
              key={gradId}
              id={gradId}
              cx={cx / width}
              cy={cy / height}
              r={r / Math.max(width, height)}
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="55%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Blobs rendered behind a shared blur filter */}
        <g filter={`url(#neb-blur-${seed})`} style={{ mixBlendMode: "screen" }}>
          {blobs.map(({ cx, cy, r, op, gradId }, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={r}
              ry={r * (0.7 + detRand(i, seed, 4) * 0.5)}
              fill={`url(#${gradId})`}
              opacity={op}
            />
          ))}
        </g>

        {/* Secondary fine-grain nebula texture via small offset blobs */}
        <g
          filter={`url(#neb-blur-${seed})`}
          style={{ mixBlendMode: "screen" }}
          opacity={0.4 * intensity}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const t = frame * 0.005 + i * 2.3;
            const nx = noise2D(`neb-fx-${seed}-${i}`, t, i * 0.7) * width * 0.25;
            const ny = noise2D(`neb-fy-${seed}-${i}`, i * 0.7, t) * height * 0.25;
            const bx = detRand(i + 20, seed, 0) * width + nx;
            const by = detRand(i + 20, seed, 1) * height + ny;
            const br = (detRand(i + 20, seed, 2) * 0.15 + 0.08) * Math.min(width, height);
            const color = colors[(i + 3) % colors.length];
            return (
              <circle
                key={i}
                cx={bx}
                cy={by}
                r={br}
                fill={color}
                opacity={0.15 + detRand(i, seed, 5) * 0.15}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
