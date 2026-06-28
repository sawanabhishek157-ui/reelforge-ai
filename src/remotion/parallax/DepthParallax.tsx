import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import { resolvePreset } from "../motion/presets";

interface DepthParallaxProps {
  imageSrc: string;
  /** Public-relative URL path or base64 data URI for the depth-map PNG. */
  depthMapUrl?: string;
  frame: number;
  totalFrames: number;
  motionPreset?: string;
  sceneIndex?: number;
}

function toStatic(url: string) {
  return staticFile(url.replace(/^\//, ""));
}

/**
 * Convert a depth-map URL to a value usable inside the SVG filter.
 *
 * If the caller passes a data URI (base64) we use it directly — this avoids
 * SSR issues where remotion's staticFile resolver may not resolve in time.
 * Otherwise we convert the public-relative path to a staticFile URL so
 * Remotion can find the asset on disk during render.
 */
function resolveDepthMapHref(depthMapUrl: string): string {
  if (depthMapUrl.startsWith("data:")) {
    return depthMapUrl;
  }
  return toStatic(depthMapUrl);
}

/**
 * Unique SVG filter id per scene index to avoid collisions when
 * multiple scenes are rendered together.
 */
function makeFilterId(sceneIndex: number): string {
  return `depth-displace-${sceneIndex}`;
}

// Peak displacement in pixels. Near (bright) pixels shift more than far.
const DISPLACEMENT_PEAK = 20;

/**
 * 2.5D depth-map parallax using SVG feDisplacementMap.
 *
 * When depthMapUrl is provided:
 *   - An SVG filter samples the grayscale depth map.
 *   - Near (bright) pixels shift more; far (dark) pixels shift less.
 *   - Displacement scale is animated over the scene to add organic motion.
 *   - The camera move from the motion preset (scale/translate) is applied
 *     on top of the displacement effect.
 *
 * When depthMapUrl is absent:
 *   - Falls back to the original pseudo-parallax (three image layers).
 */
export const DepthParallax: React.FC<DepthParallaxProps> = ({
  imageSrc,
  depthMapUrl,
  frame,
  totalFrames,
  motionPreset,
  sceneIndex = 0,
}) => {
  const { width, height } = useVideoConfig();
  const presetFn = resolvePreset(motionPreset, undefined, sceneIndex);
  const { scale, x, y, rotate = 0 } = presetFn(frame, totalFrames);

  const rotateStr = rotate !== 0 ? ` rotate(${rotate}deg)` : "";

  if (depthMapUrl) {
    // Animate the displacement scale from 0 to peak and back slightly,
    // creating a subtle breathing parallax tied to the scene timeline.
    const dispScale = interpolate(
      frame,
      [0, Math.round(totalFrames * 0.4), totalFrames],
      [0, DISPLACEMENT_PEAK, DISPLACEMENT_PEAK * 0.75],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    const filterId = makeFilterId(sceneIndex);
    const depthHref = resolveDepthMapHref(depthMapUrl);

    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {/*
          SVG filter definition.
          feImage loads the depth map; feDisplacementMap shifts source pixels
          proportional to the depth value at each position.
          R channel drives X, R channel drives Y — grayscale map so R=G=B.
        */}
        <svg
          style={{ position: "absolute", width: 0, height: 0 }}
          aria-hidden="true"
        >
          <defs>
            <filter
              id={filterId}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={depthHref}
                x="0"
                y="0"
                width={width}
                height={height}
                preserveAspectRatio="xMidYMid slice"
                result="depth"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="depth"
                scale={dispScale}
                xChannelSelector="R"
                yChannelSelector="R"
              />
            </filter>
          </defs>
        </svg>

        {/*
          Main image with filter applied + camera motion on top.
          Slightly oversized (scale*1.06) so displacement never reveals
          the canvas edge.
        */}
        <Img
          src={toStatic(imageSrc)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translate(${x}%, ${y}%) scale(${scale * 1.06})${rotateStr}`,
            filter: `url(#${filterId})`,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Fallback: pseudo-parallax with three stacked image layers.

  // Background layer — moves least (far plane)
  const bgX = x * 0.5;
  const bgY = y * 0.5;
  const bgScale = scale * 1.0;

  // Mid layer — moderate movement
  const midX = x * 0.8;
  const midY = y * 0.8;
  const midScale = scale * 1.04;

  // Near layer — moves most (near plane), slightly more zoomed
  const nearX = x * 1.1;
  const nearY = y * 1.1;
  const nearScale = scale * 1.08;

  // Cross-fade layers using frame progress for layered depth feel
  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Near layer fades in slightly over the scene for a depth reveal
  const nearOpacity = interpolate(progress, [0, 0.3, 1], [0.5, 0.7, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Background plane */}
      <Img
        src={toStatic(imageSrc)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${bgX}%, ${bgY}%) scale(${bgScale})${rotateStr}`,
          opacity: 1,
        }}
      />

      {/* Mid plane — subtle overlay at reduced opacity for depth blending */}
      <Img
        src={toStatic(imageSrc)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${midX}%, ${midY}%) scale(${midScale})${rotateStr}`,
          opacity: 0.25,
          mixBlendMode: "luminosity",
        }}
      />

      {/* Near plane — lightest overlay, reveals as scene progresses */}
      <Img
        src={toStatic(imageSrc)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${nearX}%, ${nearY}%) scale(${nearScale})${rotateStr}`,
          opacity: nearOpacity * 0.15,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
