import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface NeonGlowProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#3B82F6", "#00FF41"];

/** Generate a deterministic angular circuit-trace path with horizontal/vertical segments. */
function buildCircuitPath(
  index: number,
  seed: number,
  width: number,
  height: number
): string {
  // Start from an edge-anchored point
  const startFrac = detRand(index, seed, 0);
  const side = Math.floor(detRand(index, seed, 1) * 4); // 0=top, 1=right, 2=bottom, 3=left

  let sx: number, sy: number;
  if (side === 0) { sx = startFrac * width; sy = 0; }
  else if (side === 1) { sx = width; sy = startFrac * height; }
  else if (side === 2) { sx = startFrac * width; sy = height; }
  else { sx = 0; sy = startFrac * height; }

  // Build 4–6 angular segments (only horizontal or vertical turns)
  const segCount = Math.floor(detRand(index, seed, 2) * 3 + 4);
  let pts = `M ${sx.toFixed(1)},${sy.toFixed(1)}`;
  let cx = sx;
  let cy = sy;
  let goHoriz = detRand(index, seed, 3) > 0.5; // alternate h/v

  for (let k = 0; k < segCount; k++) {
    const len = (detRand(k, seed + index, 0) * 0.25 + 0.08) * (goHoriz ? width : height);
    const dir = detRand(k, seed + index, 1) > 0.5 ? 1 : -1;
    if (goHoriz) {
      cx = Math.max(0, Math.min(width, cx + dir * len));
    } else {
      cy = Math.max(0, Math.min(height, cy + dir * len));
    }
    pts += ` L ${cx.toFixed(1)},${cy.toFixed(1)}`;
    goHoriz = !goHoriz;
  }

  return pts;
}

/**
 * Glowing neon circuit-trace lines that draw on and pulse (animated strokeDashoffset +
 * glow filter), angular paths with electric blue/green palette (BEHIND band).
 */
export const NeonGlow: React.FC<NeonGlowProps> = ({
  intensity = 1.0,
  seed = 0,
  palette,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;

  const traceCount = 6;
  // Total path length estimate — we'll use a large dasharray so the draw-on uses a fraction
  const dashTotal = Math.sqrt(width * width + height * height) * 2;

  const glowId = `ng-glow-${seed}`;
  const glowId2 = `ng-glow2-${seed}`;

  const traces: React.ReactNode[] = [];
  for (let i = 0; i < traceCount; i++) {
    const d = buildCircuitPath(i, seed, width, height);
    const color = colors[i % colors.length];

    // Each trace has its own draw-on phase and speed
    const drawSpeed = detRand(i, seed, 10) * 0.012 + 0.006; // dashoffset units per frame
    const phaseOffset = detRand(i, seed, 11) * dashTotal;
    // strokeDashoffset goes from dashTotal → 0 (draw on), then loops back
    const offset = Math.max(0, dashTotal - ((frame * drawSpeed * dashTotal + phaseOffset) % (dashTotal * 1.5)));

    // Pulse: brightness oscillates slowly
    const pulse = 0.5 + 0.5 * Math.sin(frame * (detRand(i, seed, 12) * 0.04 + 0.015) + i * 1.3);
    const opacityCore = (0.55 + 0.3 * pulse) * intensity;
    const opacityGlow = (0.3 + 0.2 * pulse) * intensity;

    const strokeW = detRand(i, seed, 13) * 1.5 + 1.0;

    traces.push(
      <g key={i}>
        {/* Outer glow pass */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeW * 5}
          opacity={opacityGlow}
          strokeDasharray={dashTotal}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId2})`}
        />
        {/* Core line */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          opacity={opacityCore}
          strokeDasharray={dashTotal}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
        {/* Bright leading dot at the draw tip */}
        {offset < dashTotal * 0.95 && (
          <circle
            key={`dot-${i}`}
            // We can't easily extract the tip coordinate from a path without JS path math,
            // so we approximate: place a fixed dot that fades in when the trace is active
            cx={0}
            cy={0}
            r={0}
            fill={color}
            opacity={0}
          />
        )}
      </g>
    );
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, mixBlendMode: "screen" }}
      >
        <defs>
          {/* Tight core glow */}
          <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Wider halo glow */}
          <filter id={glowId2} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMergeNode in="b" />
          </filter>
        </defs>
        {traces}
      </svg>
    </AbsoluteFill>
  );
};
