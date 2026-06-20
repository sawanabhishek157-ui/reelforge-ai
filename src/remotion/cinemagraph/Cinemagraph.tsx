import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CinemagraphRegionType = "sky" | "water";

interface CinemagraphRegionProps {
  imageSrc: string;
  /** Public-relative URL to the white-on-black region mask PNG. */
  maskUrl: string;
  region: CinemagraphRegionType;
}

function toStatic(url: string) {
  return staticFile(url.replace(/^\//, ""));
}

/**
 * Renders ONLY the animated, masked region (transparent elsewhere). The caller
 * renders the frozen base image beneath this, so only the masked region appears
 * to move — the classic cinemagraph "living photo" effect.
 *
 * - sky: slow seamless horizontal cloud drift.
 * - water: scrolling fractal-noise displacement → flowing ripple/shimmer.
 *
 * Deterministic, frame-driven (no Date.now/Math.random); confined to the mask
 * so there is no whole-frame motion and no occlusion morphing.
 */
export const CinemagraphRegion: React.FC<CinemagraphRegionProps> = ({
  imageSrc,
  maskUrl,
  region,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateRight: "clamp",
  });

  const img = toStatic(imageSrc);
  const mask = toStatic(maskUrl);

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url(${mask})`,
    maskImage: `url(${mask})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  if (region === "sky") {
    // Gentle one-directional cloud drift; slight oversize avoids edge reveal.
    const drift = interpolate(t, [0, 1], [-18, 18]); // px across the scene
    return (
      <AbsoluteFill style={maskStyle}>
        <Img
          src={img}
          style={{
            width,
            height,
            objectFit: "cover",
            transform: `scale(1.08) translateX(${drift}px)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  // water: scroll a fractal-noise field used as a displacement map → flowing ripple.
  const filterId = "cine-water-disp";
  const scrollY = interpolate(t, [0, 1], [0, 90]); // scroll the noise downward
  const amp = 7; // displacement strength in px (subtle ripple)

  return (
    <AbsoluteFill style={maskStyle}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", width, height }}
        aria-hidden
      >
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.03"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feOffset in="noise" dx="0" dy={scrollY} result="noiseScroll" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noiseScroll"
              scale={amp}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <image
          href={img}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          filter={`url(#${filterId})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
