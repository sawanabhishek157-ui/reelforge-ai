import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

interface VignetteProps {
  intensity?: number;
}

export const Vignette: React.FC<VignetteProps> = ({ intensity = 0.6 }) => {
  const { width, height } = useVideoConfig();
  const gradientId = "vignette-grad";

  // Radial gradient: transparent center, dark edges
  const innerRadius = 40;
  const outerRadius = 80;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <defs>
          <radialGradient
            id={gradientId}
            cx="50%"
            cy="50%"
            r="70%"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset={`${innerRadius}%`}
              stopColor="transparent"
              stopOpacity="0"
            />
            <stop
              offset={`${outerRadius}%`}
              stopColor="#000000"
              stopOpacity={intensity}
            />
            <stop
              offset="100%"
              stopColor="#000000"
              stopOpacity={Math.min(1, intensity * 1.3)}
            />
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
