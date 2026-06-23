import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface ShootingStarsProps {
  intensity?: number;
  seed?: number;
  palette?: string[];
  /** Frames each meteor "slot" covers — controls spacing between possible streaks. */
  period?: number;
  count?: number;
}

/** Deterministic pseudo-random in [0, 1) — frame-independent. */
function detRand(index: number, seed: number, channel: number): number {
  const v = Math.sin(index * 12.9898 + seed * 78.233 + channel * 43.1337) * 43758.5453;
  return v - Math.floor(v);
}

const DEFAULT_PALETTE = ["#FFFFFF", "#AAC4FF"];

const STREAK_DUR = 22; // frames each streak is visible

/** Brightness envelope — fast in, gradual fade out. */
function streakEnv(t: number): number {
  if (t < 0 || t >= STREAK_DUR) return 0;
  if (t < 3) return t / 3; // ramp up
  return Math.exp(-(t - 3) * 0.13); // exponential decay
}

/**
 * Occasional diagonal meteors with fading trails — deterministic per-slot timing
 * so 0-2 streak at any moment, never a constant shower. BEHIND band placement.
 */
export const ShootingStars: React.FC<ShootingStarsProps> = ({
  intensity = 1.0,
  seed = 0,
  palette = DEFAULT_PALETTE,
  period = 60,
  count = 4,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const colors = palette.length > 0 ? palette : DEFAULT_PALETTE;

  // Each slot fires independently with a phase offset so they don't synchronize.
  const meteors = Array.from({ length: count }, (_, i) => {
    const phaseOffset = Math.round(detRand(i, seed, 7) * period);
    const shifted = frame + phaseOffset;
    const cycle = Math.floor(shifted / period);
    const t = shifted % period;

    // ~55% of cycles actually fire — keeps it occasional.
    const fires = detRand(cycle, seed * (i + 1), 9) > 0.45;
    const env = fires ? streakEnv(t) : 0;

    // Per-cycle trajectory
    const startX = detRand(cycle, seed + i, 0) * width * 1.2 - width * 0.1;
    const startY = detRand(cycle, seed + i, 1) * height * 0.5;
    // Diagonal direction: mostly right+down with some angle variation
    const angle = Math.PI * (0.08 + detRand(cycle, seed + i, 2) * 0.12);
    const speed = (detRand(cycle, seed + i, 3) * 18 + 14) * (width / 1080);
    const progress = t * speed;
    const headX = startX + Math.cos(angle) * progress;
    const headY = startY + Math.sin(angle) * progress;
    const trailLen = (detRand(cycle, seed + i, 4) * 120 + 80) * (width / 1080);
    const tailX = headX - Math.cos(angle) * trailLen;
    const tailY = headY - Math.sin(angle) * trailLen;

    const color = colors[i % colors.length];
    const gradId = `ss-trail-${seed}-${i}-${cycle}`;

    return { headX, headY, tailX, tailY, env, color, gradId };
  });

  const visible = meteors.filter((m) => m.env > 0.005);
  if (visible.length === 0) return <AbsoluteFill style={{ pointerEvents: "none" }} />;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id={`ss-glow-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {visible.map(({ gradId, headX, headY, tailX, tailY, color }) => {
            const dx = headX - tailX;
            const dy = headY - tailY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return (
              <linearGradient
                key={gradId}
                id={gradId}
                x1={tailX / width}
                y1={tailY / height}
                x2={headX / width}
                y2={headY / height}
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0" />
                <stop offset="70%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
              </linearGradient>
            );
          })}
        </defs>

        <g filter={`url(#ss-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {visible.map(({ headX, headY, tailX, tailY, env, color, gradId }, idx) => {
            const strokeW = (1.8 + detRand(idx, seed, 6) * 1.2) * (width / 1080);
            return (
              <g key={gradId}>
                {/* Main trail */}
                <line
                  x1={tailX}
                  y1={tailY}
                  x2={headX}
                  y2={headY}
                  stroke={`url(#${gradId})`}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                  opacity={env * intensity}
                />
                {/* Bright head dot */}
                <circle
                  cx={headX}
                  cy={headY}
                  r={strokeW * 1.5}
                  fill="#FFFFFF"
                  opacity={env * 0.9 * intensity}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
