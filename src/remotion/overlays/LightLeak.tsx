import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface LightLeakProps {
  intensity?: number;
}

export const LightLeak: React.FC<LightLeakProps> = ({ intensity = 0.35 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // Leak starts dim, peaks around 20% through scene, fades out
  const opacity = interpolate(
    frame,
    [0, durationInFrames * 0.15, durationInFrames * 0.4, durationInFrames],
    [0, intensity, intensity * 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Drift the leak position slowly across the frame
  const cx = interpolate(
    frame,
    [0, durationInFrames],
    [width * 0.1, width * 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cy = interpolate(
    frame,
    [0, durationInFrames],
    [height * 0.05, height * 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const radius = interpolate(
    frame,
    [0, durationInFrames * 0.3, durationInFrames],
    [width * 0.3, width * 0.6, width * 0.45],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const gradientId = "light-leak-grad";

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
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <radialGradient
            id={gradientId}
            cx={cx}
            cy={cy}
            r={radius}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff8e1" stopOpacity="1" />
            <stop offset="30%" stopColor="#ffe082" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#ffab40" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff6f00" stopOpacity="0" />
          </radialGradient>
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
