import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const STAGGER_FRAMES = 11; // ~0.37s between successive element entrances
const FADE_FRAMES = 10; // entrance fade length

/**
 * Fades a child in at a staggered delay so a scene's elements appear in
 * SEQUENCE (one, then another, building up) instead of all at once — which
 * reads as an edited video rather than a static stack of layers. The child's
 * own animation keeps running underneath; this only gates its visibility.
 */
export const StaggerIn: React.FC<{
  order: number;
  baseDelay?: number;
  children: React.ReactNode;
}> = ({ order, baseDelay = 0, children }) => {
  const frame = useCurrentFrame();
  const delay = baseDelay + order * STAGGER_FRAMES;
  const opacity = interpolate(frame, [delay, delay + FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>{children}</AbsoluteFill>;
};
