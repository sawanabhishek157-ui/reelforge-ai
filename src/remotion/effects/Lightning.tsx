import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface LightningProps {
  intensity?: number;
  seed?: number;
  /** Frames between possible strikes. */
  period?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const STRIKE_DUR = 14; // frames a strike is visible

/** Brightness envelope of a strike: a sharp double-flicker that decays. */
function strikeEnv(t: number): number {
  if (t < 0 || t >= STRIKE_DUR) return 0;
  const a = Math.exp(-t * 0.55); // initial flash
  const b = t >= 4 ? 0.75 * Math.exp(-(t - 4) * 0.5) : 0; // re-strike
  return Math.min(1, a + b);
}

/**
 * Full-frame flash + branching bolt, fired on seeded frame windows (FRONT band).
 * Deterministic: each "cycle" either strikes or stays dark based on the seed, so
 * the same scene always renders identically.
 */
export const Lightning: React.FC<LightningProps> = ({ intensity = 1.0, seed = 0, period = 78 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const shifted = frame + (seed % period);
  const cycle = Math.floor(shifted / period);
  const t = shifted % period;

  // Only ~55% of cycles actually strike — keeps it occasional, not a metronome.
  const fires = detRand(cycle, seed, 9) > 0.45;
  const env = fires ? strikeEnv(t) : 0;
  if (env <= 0.001) return <AbsoluteFill style={{ pointerEvents: "none" }} />;

  // Build a jagged bolt path for this cycle.
  const segments = 9;
  const startX = detRand(cycle, seed, 1) * width * 0.7 + width * 0.15;
  const pts: string[] = [`${startX},0`];
  let x = startX;
  for (let k = 1; k <= segments; k++) {
    x += (detRand(cycle, seed, 10 + k) - 0.5) * width * 0.14;
    const y = (height * k) / segments;
    pts.push(`${x},${y}`);
  }
  // One branch off a mid node.
  const bIdx = 3 + Math.floor(detRand(cycle, seed, 2) * 3);
  const bx0 = startX + (detRand(cycle, seed, 3) - 0.5) * width * 0.1;
  const branch: string[] = [`${bx0},${(height * bIdx) / segments}`];
  let bx = bx0;
  for (let k = 1; k <= 4; k++) {
    bx += (detRand(cycle, seed, 20 + k) - 0.3) * width * 0.13;
    branch.push(`${bx},${(height * (bIdx + k)) / segments}`);
  }

  const boltOpacity = t < 7 ? (1 - t / 7) * intensity : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Full-frame flash */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 30%, #eaf2ff, #aac4ff 60%, transparent 100%)",
          opacity: env * 0.45 * intensity,
          mixBlendMode: "screen",
        }}
      />
      {boltOpacity > 0 ? (
        <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
          <defs>
            <filter id={`lt-glow-${seed}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter={`url(#lt-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
            <polyline points={pts.join(" ")} fill="none" stroke="#eaf2ff" strokeWidth={3} opacity={boltOpacity} />
            <polyline points={branch.join(" ")} fill="none" stroke="#cfe0ff" strokeWidth={2} opacity={boltOpacity * 0.8} />
          </g>
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
