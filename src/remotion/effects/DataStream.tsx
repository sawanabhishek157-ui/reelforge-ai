import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface DataStreamProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#00FF41", "#22C55E"];

// Characters used for the matrix-style rain
const CHARS = "01ABCDEF><{}[]/\\|#@%$".split("");

function pickChar(index: number, seed: number, channel: number): string {
  return CHARS[Math.floor(detRand(index, seed, channel) * CHARS.length)];
}

/**
 * Falling "matrix"-style columns of small characters descending at varied speeds
 * per column, brighter at the leading edge — terminal-green data rain (BEHIND band).
 */
export const DataStream: React.FC<DataStreamProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  const charSize = Math.round(height / 36); // ~20px at 720p
  const colCount = Math.floor(width / (charSize * 1.4));
  const rowCount = Math.floor(height / charSize) + 2;

  const glowId = `ds-glow-${seed}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, mixBlendMode: "screen" }}
      >
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${glowId})`} fontFamily="monospace" fontSize={charSize}>
          {Array.from({ length: colCount }, (_, col) => {
            // Each column has a unique fall speed and phase offset
            const speed = detRand(col, seed, 0) * 0.6 + 0.25; // rows per frame
            const phase = detRand(col, seed, 1) * rowCount;
            const trailLength = Math.floor(detRand(col, seed, 2) * 10 + 6);
            const cx = col * charSize * 1.4 + charSize * 0.2;

            // Current leading-edge row (fractional), loops
            const leadRow = (frame * speed + phase) % (rowCount + trailLength);

            const color = colors[col % colors.length];
            const cells: React.ReactNode[] = [];

            for (let t = 0; t < trailLength; t++) {
              const row = Math.floor(leadRow) - t;
              if (row < 0 || row >= rowCount) continue;
              const cy = row * charSize;
              // Lead is brightest; trail fades
              const trailFrac = 1 - t / trailLength;
              const isLead = t === 0;
              const opacity = isLead
                ? 0.95 * intensity
                : trailFrac * 0.55 * intensity;
              // Character changes each time the row is "fresh" (use row + cycle as index)
              const cycle = Math.floor((frame * speed + phase) / (rowCount + trailLength));
              const charIdx = col * 100 + row + cycle * 7;
              const char = pickChar(charIdx, seed, t + 3);

              cells.push(
                <text
                  key={`${col}-${row}-${t}`}
                  x={cx}
                  y={cy}
                  fill={isLead ? "#ffffff" : color}
                  opacity={opacity}
                  dominantBaseline="hanging"
                >
                  {char}
                </text>
              );
            }

            return <g key={col}>{cells}</g>;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
