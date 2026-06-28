import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface ZodiacWheelProps {
  intensity?: number;
  size?: number;
  position?: "center" | "top" | "bottom";
}

// 12 Unicode zodiac glyphs in ecliptic order
const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

// One full rotation over 1800 frames (60 s at 30 fps) for the outer ring.
// Inner ring rotates counter-clockwise at half speed.
const OUTER_PERIOD_FRAMES = 1800;
const INNER_PERIOD_FRAMES = 3600;

export const ZodiacWheel: React.FC<ZodiacWheelProps> = ({
  intensity = 1.0,
  size = 900,
  position = "center",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Rotation angles driven purely by frame — deterministic, no Math.random
  const outerAngleDeg = (frame / OUTER_PERIOD_FRAMES) * 360;
  const innerAngleDeg = -(frame / INNER_PERIOD_FRAMES) * 360;

  // Vertical centre depends on position prop
  const cy =
    position === "top"
      ? height * 0.15
      : position === "bottom"
        ? height * 0.85
        : height * 0.5;
  const cx = width * 0.5;

  // Ring geometry
  const outerR = size * 0.5;
  const innerR = size * 0.38;
  const tickOuterR = outerR;
  const tickInnerR = outerR - size * 0.04;
  const majorTickInnerR = outerR - size * 0.08;
  const glyphR = outerR + size * 0.065; // just outside outer ring

  // Base opacity scaled by intensity
  const baseOpacity = 0.22 * intensity;
  const ringOpacity = 0.18 * intensity;
  const glowOpacity = 0.08 * intensity;
  const glyphOpacity = 0.55 * intensity;

  const gradOuter = "zodiac-outer-glow";
  const gradInner = "zodiac-inner-glow";
  const glowFilter = "zodiac-glow-filter";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
      >
        <defs>
          {/* Soft glow filter */}
          <filter id={glowFilter} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Outer ring stroke gradient — gold/amber cosmic */}
          <radialGradient id={gradOuter} cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(${cx},${cy})`}>
            <stop offset="0%" stopColor="#ffe08a" stopOpacity="0" />
            <stop offset="80%" stopColor="#ffd060" stopOpacity={ringOpacity} />
            <stop offset="100%" stopColor="#ffc040" stopOpacity={glowOpacity} />
          </radialGradient>

          {/* Inner ring stroke gradient — cooler gold */}
          <radialGradient id={gradInner} cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(${cx},${cy})`}>
            <stop offset="0%" stopColor="#e8d070" stopOpacity="0" />
            <stop offset="70%" stopColor="#d4b840" stopOpacity={ringOpacity * 0.7} />
            <stop offset="100%" stopColor="#c8a830" stopOpacity={glowOpacity * 0.5} />
          </radialGradient>
        </defs>

        {/* ── OUTER RING (slow clockwise rotation) ── */}
        <g
          transform={`translate(${cx},${cy}) rotate(${outerAngleDeg})`}
          filter={`url(#${glowFilter})`}
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        >
          {/* Main outer ring */}
          <circle
            cx={0}
            cy={0}
            r={outerR}
            fill="none"
            stroke="#ffd060"
            strokeWidth={size * 0.006}
            strokeOpacity={baseOpacity}
          />

          {/* Thin accent ring just inside outer */}
          <circle
            cx={0}
            cy={0}
            r={outerR - size * 0.025}
            fill="none"
            stroke="#ffc840"
            strokeWidth={size * 0.002}
            strokeOpacity={baseOpacity * 0.6}
          />

          {/* 12 major segment dividers + 36 minor ticks (48 total) */}
          {Array.from({ length: 48 }, (_, i) => {
            const angleDeg = (i / 48) * 360;
            const angleRad = (angleDeg * Math.PI) / 180;
            const isMajor = i % 4 === 0; // every 4th = major (12 zodiac boundaries)
            const tR = isMajor ? majorTickInnerR : tickInnerR;
            const x1 = Math.cos(angleRad) * tR;
            const y1 = Math.sin(angleRad) * tR;
            const x2 = Math.cos(angleRad) * tickOuterR;
            const y2 = Math.sin(angleRad) * tickOuterR;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#ffe080" : "#ffd060"}
                strokeWidth={isMajor ? size * 0.004 : size * 0.002}
                strokeOpacity={isMajor ? baseOpacity * 1.4 : baseOpacity * 0.7}
              />
            );
          })}

          {/* Small glyph dots at each major division midpoint (glyph positions) */}
          {Array.from({ length: 12 }, (_, i) => {
            const angleDeg = ((i + 0.5) / 12) * 360 - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const r = glyphR;
            const x = Math.cos(angleRad) * r;
            const y = Math.sin(angleRad) * r;
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.042}
                fill="#ffe080"
                fillOpacity={glyphOpacity}
                transform={`rotate(${-outerAngleDeg}, ${x}, ${y})`}
              >
                {ZODIAC_GLYPHS[i]}
              </text>
            );
          })}
        </g>

        {/* ── INNER RING (slow counter-clockwise) ── */}
        <g
          transform={`translate(${cx},${cy}) rotate(${innerAngleDeg})`}
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        >
          {/* Main inner ring */}
          <circle
            cx={0}
            cy={0}
            r={innerR}
            fill="none"
            stroke="#d4b840"
            strokeWidth={size * 0.004}
            strokeOpacity={baseOpacity * 0.75}
          />

          {/* Dashed decorative inner accent */}
          <circle
            cx={0}
            cy={0}
            r={innerR - size * 0.02}
            fill="none"
            stroke="#c8a030"
            strokeWidth={size * 0.0015}
            strokeOpacity={baseOpacity * 0.4}
            strokeDasharray={`${size * 0.02} ${size * 0.015}`}
          />

          {/* 12 small dot markers on inner ring */}
          {Array.from({ length: 12 }, (_, i) => {
            const angleRad = ((i / 12) * 360 * Math.PI) / 180;
            const x = Math.cos(angleRad) * innerR;
            const y = Math.sin(angleRad) * innerR;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={size * 0.008}
                fill="#ffd060"
                fillOpacity={baseOpacity * 1.5}
              />
            );
          })}
        </g>

        {/* ── STATIC soft glow halo behind both rings (non-rotating) ── */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR * 1.05}
          fill="none"
          stroke="#ffd060"
          strokeWidth={size * 0.04}
          strokeOpacity={glowOpacity * 0.5}
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        />
      </svg>
    </AbsoluteFill>
  );
};
