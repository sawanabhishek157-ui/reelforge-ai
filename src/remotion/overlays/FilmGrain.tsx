import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface FilmGrainProps {
  intensity?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({ intensity = 0.04 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Deterministic frame-driven seed — no Math.random()
  // Cycle through 60 pre-seeded values using frame modulo
  const seed = (frame * 7 + 13) % 997;
  const seed2 = (frame * 11 + 37) % 997;

  const filterId = `grain-${frame}`;
  const opacity = intensity;

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
          mixBlendMode: "overlay",
        }}
      >
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              seed={seed}
              result="noise"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise"
              result="gray"
            />
            <feBlend in="SourceGraphic" in2="gray" mode="overlay" />
          </filter>
          <filter id={`${filterId}-b`} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.9"
              numOctaves="2"
              seed={seed2}
              result="noise2"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise2"
              result="gray2"
            />
            <feBlend in="SourceGraphic" in2="gray2" mode="overlay" />
          </filter>
        </defs>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="white"
          filter={`url(#${filterId})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
