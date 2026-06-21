import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface OrbitingBodiesProps {
  intensity?: number;
  seed?: number;
  count?: number;
}

// Deterministic pseudo-random — no Math.random()
function det(index: number, seed: number, offset: number): number {
  return Math.abs(Math.sin((index * 7.3 + seed * 3.7 + offset) * 2.399)) % 1;
}

// Build a trailing arc path on an ellipse
// Returns an SVG path string for an arc from (startAngle - sweep) to startAngle
function ellipseArcPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleDeg: number,
  sweepDeg: number,
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const steps = 32;
  const startAngle = angleDeg - sweepDeg;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = toRad(startAngle + (sweepDeg * i) / steps);
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  const [first, ...rest] = points;
  const d = [`M ${first[0]} ${first[1]}`]
    .concat(rest.map(([x, y]) => `L ${x} ${y}`))
    .join(" ");
  return d;
}

export const OrbitingBodies: React.FC<OrbitingBodiesProps> = ({
  intensity = 1.0,
  seed = 0,
  count = 5,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width * 0.5;
  const cy = height * 0.5;

  // Define each body's orbital parameters — all deterministic from seed + index
  const bodies = Array.from({ length: count }, (_, i) => {
    // Orbital radii: spread across 12–42% of the smaller screen dimension
    const minR = Math.min(width, height) * 0.12;
    const maxR = Math.min(width, height) * 0.42;
    const rx = minR + det(i, seed, 0) * (maxR - minR);
    // Slightly elliptical (ratio 0.55–0.85)
    const ry = rx * (0.55 + det(i, seed, 1) * 0.30);

    // Period: 600–2400 frames (20–80 s at 30 fps)
    const periodFrames = 600 + det(i, seed, 2) * 1800;

    // Starting angle offset so bodies aren't all clumped at 0°
    const startAngleDeg = det(i, seed, 3) * 360;

    // Current angle (degrees)
    const angleDeg = startAngleDeg + (frame / periodFrames) * 360;

    // Body radius: 4–14 px
    const bodyR = 4 + det(i, seed, 4) * 10;

    // Color: mix of warm golds, cool blues, soft whites — cosmic palette
    const palette = [
      { color: "#ffe080", glow: "#ffb830" }, // warm gold
      { color: "#a0c8ff", glow: "#60a0ff" }, // cool blue
      { color: "#e0e0ff", glow: "#b0b0ff" }, // pale lavender
      { color: "#ffd0a0", glow: "#ff9030" }, // amber
      { color: "#c0ffe0", glow: "#40e0a0" }, // aqua
      { color: "#ffb0c8", glow: "#ff4080" }, // rose
    ];
    const { color, glow } = palette[i % palette.length];

    // Trail sweep: 60–140°
    const trailSweepDeg = 60 + det(i, seed, 5) * 80;

    // Opacity scaled by intensity
    const bodyOpacity = (0.6 + det(i, seed, 6) * 0.35) * intensity;
    const trailOpacity = (0.15 + det(i, seed, 7) * 0.20) * intensity;

    // Tilt of the orbital plane (rotate the ellipse)
    const tiltDeg = det(i, seed, 8) * 30 - 15;

    return {
      rx, ry, angleDeg, bodyR, color, glow,
      trailSweepDeg, bodyOpacity, trailOpacity, tiltDeg,
      gradId: `ob-glow-${seed}-${i}`,
      trailGradId: `ob-trail-${seed}-${i}`,
    };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
      >
        <defs>
          {bodies.map((b) => {
            const toRad = (d: number) => (d * Math.PI) / 180;
            const bx = cx + Math.cos(toRad(b.angleDeg)) * b.rx;
            const by = cy + Math.sin(toRad(b.angleDeg)) * b.ry;
            return (
              <React.Fragment key={b.gradId}>
                {/* Radial glow gradient centred on the body */}
                <radialGradient
                  id={b.gradId}
                  cx={bx}
                  cy={by}
                  r={b.bodyR * 3.5}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={b.glow} stopOpacity={b.bodyOpacity} />
                  <stop offset="40%" stopColor={b.glow} stopOpacity={b.bodyOpacity * 0.5} />
                  <stop offset="100%" stopColor={b.glow} stopOpacity="0" />
                </radialGradient>

                {/* Linear gradient for the trailing arc — fades from 0 at tail to full at head */}
                <linearGradient id={b.trailGradId} gradientUnits="userSpaceOnUse"
                  x1={cx} y1={cy} x2={bx} y2={by}>
                  <stop offset="0%" stopColor={b.color} stopOpacity="0" />
                  <stop offset="100%" stopColor={b.color} stopOpacity={b.trailOpacity} />
                </linearGradient>
              </React.Fragment>
            );
          })}
        </defs>

        {/* Render trail arcs first (behind bodies) */}
        {bodies.map((b) => {
          const trailPath = ellipseArcPath(
            cx, cy, b.rx, b.ry,
            b.angleDeg, b.trailSweepDeg,
          );
          return (
            <g
              key={`trail-${b.gradId}`}
              transform={`rotate(${b.tiltDeg}, ${cx}, ${cy})`}
              style={{ mixBlendMode: "screen" } as React.CSSProperties}
            >
              <path
                d={trailPath}
                fill="none"
                stroke={`url(#${b.trailGradId})`}
                strokeWidth={b.bodyR * 0.7}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Render bodies with glow */}
        {bodies.map((b) => {
          const toRad = (d: number) => (d * Math.PI) / 180;
          // Apply tilt to the body position using trigonometry in the tilted frame
          const ax = Math.cos(toRad(b.angleDeg)) * b.rx;
          const ay = Math.sin(toRad(b.angleDeg)) * b.ry;
          // Rotate tilt around cx,cy
          const tiltRad = toRad(b.tiltDeg);
          const bx = cx + ax * Math.cos(tiltRad) - ay * Math.sin(tiltRad);
          const by = cy + ax * Math.sin(tiltRad) + ay * Math.cos(tiltRad);

          return (
            <g
              key={`body-${b.gradId}`}
              style={{ mixBlendMode: "screen" } as React.CSSProperties}
            >
              {/* Outer soft glow disc */}
              <circle
                cx={bx}
                cy={by}
                r={b.bodyR * 3.5}
                fill={`url(#${b.gradId})`}
              />
              {/* Core bright dot */}
              <circle
                cx={bx}
                cy={by}
                r={b.bodyR}
                fill={b.color}
                fillOpacity={b.bodyOpacity}
              />
              {/* Inner highlight */}
              <circle
                cx={bx - b.bodyR * 0.25}
                cy={by - b.bodyR * 0.25}
                r={b.bodyR * 0.4}
                fill="#ffffff"
                fillOpacity={b.bodyOpacity * 0.6}
              />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
