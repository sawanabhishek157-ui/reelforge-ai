import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface ColorGradeProps {
  intensity?: number;
  mood?: string;
}

type MoodConfig = {
  topColor: string;
  bottomColor: string;
  blendMode: React.CSSProperties["mixBlendMode"];
};

const MOOD_MAP: Record<string, MoodConfig> = {
  cinematic: {
    topColor: "rgba(0,10,40,0.18)",
    bottomColor: "rgba(80,30,0,0.18)",
    blendMode: "multiply",
  },
  warm: {
    topColor: "rgba(255,180,60,0.12)",
    bottomColor: "rgba(200,80,0,0.15)",
    blendMode: "screen",
  },
  cool: {
    topColor: "rgba(30,80,180,0.15)",
    bottomColor: "rgba(0,20,60,0.2)",
    blendMode: "multiply",
  },
  dramatic: {
    topColor: "rgba(0,0,0,0.25)",
    bottomColor: "rgba(40,0,10,0.3)",
    blendMode: "multiply",
  },
  romantic: {
    topColor: "rgba(220,100,120,0.12)",
    bottomColor: "rgba(180,60,80,0.18)",
    blendMode: "screen",
  },
  mysterious: {
    topColor: "rgba(20,0,60,0.2)",
    bottomColor: "rgba(0,10,40,0.25)",
    blendMode: "multiply",
  },
  epic: {
    topColor: "rgba(40,20,0,0.2)",
    bottomColor: "rgba(100,40,0,0.2)",
    blendMode: "multiply",
  },
};

const DEFAULT_MOOD = "cinematic";

export const ColorGrade: React.FC<ColorGradeProps> = ({
  intensity = 1.0,
  mood = DEFAULT_MOOD,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const config = MOOD_MAP[mood] ?? MOOD_MAP[DEFAULT_MOOD];

  // Subtle fade-in so the grade doesn't pop at scene start
  const opacity = interpolate(frame, [0, 12], [0, intensity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const gradientId = "color-grade-grad";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity,
          mixBlendMode: config.blendMode,
        }}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={config.topColor} />
            <stop offset="100%" stopColor={config.bottomColor} />
          </linearGradient>
        </defs>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
