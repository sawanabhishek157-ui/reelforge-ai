import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface ConstellationLinesProps {
  intensity?: number;
  seed?: number;
  nodes?: number;
}

interface NodeData {
  x: number;
  y: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  radius: number;
}

// Deterministic value in [0, 1] from index + seed
function det(index: number, seed: number, slot: number): number {
  return Math.sin((index * 127.1 + seed * 311.7 + slot * 74.3) * 0.01873) * 0.5 + 0.5;
}

function buildNodes(count: number, seed: number, width: number, height: number): NodeData[] {
  return Array.from({ length: count }, (_, i) => {
    // Spread across a centered region (20%–80% of frame)
    const x = (det(i, seed, 0) * 0.6 + 0.2) * width;
    const y = (det(i, seed, 1) * 0.65 + 0.15) * height;
    return {
      x,
      y,
      baseOpacity: det(i, seed, 2) * 0.5 + 0.5,
      twinkleSpeed: det(i, seed, 3) * 1.8 + 0.4,  // cycles per 90 frames
      twinklePhase: det(i, seed, 4) * Math.PI * 2,
      radius: det(i, seed, 5) * 3.5 + 1.5,
    };
  });
}

// Build a sparse spanning set of edges (not fully connected — skip same-cluster pairs)
function buildEdges(count: number, seed: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    // Each node connects to 1-2 deterministic neighbours
    const connectCount = det(i, seed, 6) > 0.55 ? 2 : 1;
    for (let c = 0; c < connectCount; c++) {
      const raw = det(i, seed, 7 + c) * (count - 1);
      const j = Math.floor(raw);
      const target = j >= i ? (j + 1) % count : j;
      if (target !== i) {
        const key1 = Math.min(i, target);
        const key2 = Math.max(i, target);
        const alreadyAdded = edges.some(([a, b]) => a === key1 && b === key2);
        if (!alreadyAdded) {
          edges.push([key1, key2]);
        }
      }
    }
  }
  return edges;
}

// Slow drift — constellation breathes and shifts slightly over time
function driftOffset(
  frame: number,
  seedX: number,
  seedY: number,
  amplitude: number
): { dx: number; dy: number } {
  const dx = Math.sin(frame * 0.007 + seedX) * amplitude;
  const dy = Math.cos(frame * 0.005 + seedY) * amplitude;
  return { dx, dy };
}

// LINE DRAW-ON: animate stroke-dashoffset from totalLength → 0 over drawFrames frames
function strokeDashProps(
  frame: number,
  drawStartFrame: number,
  drawFrames: number,
  totalLength: number
): { strokeDasharray: string; strokeDashoffset: number } {
  const dashoffset = interpolate(
    frame,
    [drawStartFrame, drawStartFrame + drawFrames],
    [totalLength, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return {
    strokeDasharray: `${totalLength}`,
    strokeDashoffset: dashoffset,
  };
}

export const ConstellationLines: React.FC<ConstellationLinesProps> = ({
  intensity = 1.0,
  seed = 0,
  nodes: nodeCount = 9,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const FPS = 30;
  const DRAW_START = 0;
  const DRAW_DURATION_FRAMES = FPS * 2; // 2 seconds to draw all lines

  const nodes = buildNodes(nodeCount, seed, width, height);
  const edges = buildEdges(nodeCount, seed);

  // Drift amplitude in pixels
  const DRIFT_AMP = 12;

  // Global fade-in over first 20 frames
  const globalFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: globalFade * intensity,
        }}
      >
        <defs>
          {/* Glow filter for nodes */}
          <filter id={`const-glow-${seed}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Soft glow for lines */}
          <filter id={`line-glow-${seed}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges — draw on progressively */}
        <g
          filter={`url(#line-glow-${seed})`}
          style={{ mixBlendMode: "screen" }}
        >
          {edges.map(([a, b], edgeIdx) => {
            const nodeA = nodes[a];
            const nodeB = nodes[b];

            const driftA = driftOffset(frame, det(a, seed, 8), det(a, seed, 9), DRIFT_AMP);
            const driftB = driftOffset(frame, det(b, seed, 8), det(b, seed, 9), DRIFT_AMP);

            const ax = nodeA.x + driftA.dx;
            const ay = nodeA.y + driftA.dy;
            const bx = nodeB.x + driftB.dx;
            const by = nodeB.y + driftB.dy;

            const edgeLength = Math.hypot(bx - ax, by - ay);

            // Stagger each edge's draw-on start by a small deterministic offset
            const staggerFrames = Math.floor(det(edgeIdx, seed, 10) * (DRAW_DURATION_FRAMES * 0.6));
            const { strokeDasharray, strokeDashoffset } = strokeDashProps(
              frame,
              DRAW_START + staggerFrames,
              DRAW_DURATION_FRAMES - staggerFrames,
              edgeLength
            );

            const lineOpacity = 0.45 * intensity;

            return (
              <line
                key={edgeIdx}
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="#c8b4ff"
                strokeWidth={0.8}
                strokeOpacity={lineOpacity}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Star nodes — twinkling glow dots */}
        <g filter={`url(#const-glow-${seed})`} style={{ mixBlendMode: "screen" }}>
          {nodes.map((node, i) => {
            const drift = driftOffset(frame, det(i, seed, 8), det(i, seed, 9), DRIFT_AMP);
            const cx = node.x + drift.dx;
            const cy = node.y + drift.dy;

            // Twinkle: oscillate opacity around baseOpacity
            const twinkle =
              Math.sin(frame * (node.twinkleSpeed * 0.08) + node.twinklePhase) * 0.3 + 0.7;
            const nodeOpacity = node.baseOpacity * twinkle * intensity;

            // Outer soft corona
            const coronaOpacity = nodeOpacity * 0.25;

            return (
              <g key={i}>
                {/* Soft outer corona */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={node.radius * 3.5}
                  fill="#b8a4ff"
                  opacity={coronaOpacity}
                />
                {/* Core bright dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={node.radius}
                  fill="#ffffff"
                  opacity={nodeOpacity}
                />
                {/* Tiny hot center */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={node.radius * 0.4}
                  fill="#e8e0ff"
                  opacity={nodeOpacity * 0.9}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
