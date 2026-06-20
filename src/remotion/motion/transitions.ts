import { interpolate } from "remotion";

export type TransitionStyles = {
  entering: React.CSSProperties;
  exiting: React.CSSProperties;
};

export type TransitionFn = (progress: number) => TransitionStyles;

// Import React for CSSProperties type
import type React from "react";

// progress: 0 = start of transition, 1 = end (entering scene fully visible)

const crossfade: TransitionFn = (progress) => ({
  entering: { opacity: progress },
  exiting: { opacity: 1 - progress },
});

const whipPan: TransitionFn = (progress) => {
  const blur = interpolate(progress, [0, 0.5, 1], [0, 6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitX = interpolate(progress, [0, 1], [0, -60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterX = interpolate(progress, [0, 1], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    entering: {
      opacity: progress > 0.3 ? 1 : 0,
      transform: `translateX(${enterX}%)`,
      filter: `blur(${blur}px)`,
    },
    exiting: {
      opacity: progress < 0.7 ? 1 : 0,
      transform: `translateX(${exitX}%)`,
      filter: `blur(${blur}px)`,
    },
  };
};

const zoomPunch: TransitionFn = (progress) => {
  const exitScale = interpolate(progress, [0, 1], [1, 1.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterScale = interpolate(progress, [0, 1], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    entering: {
      opacity: progress,
      transform: `scale(${enterScale})`,
    },
    exiting: {
      opacity: 1 - progress,
      transform: `scale(${exitScale})`,
    },
  };
};

const slide: TransitionFn = (progress) => {
  const exitX = interpolate(progress, [0, 1], [0, -100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterX = interpolate(progress, [0, 1], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    entering: {
      transform: `translateX(${enterX}%)`,
    },
    exiting: {
      transform: `translateX(${exitX}%)`,
    },
  };
};

const dissolve: TransitionFn = (progress) => {
  const blur = interpolate(progress, [0, 0.5, 1], [0, 4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    entering: {
      opacity: progress,
      filter: `blur(${blur}px)`,
    },
    exiting: {
      opacity: 1 - progress,
      filter: `blur(${blur}px)`,
    },
  };
};

const lightSweep: TransitionFn = (progress) => {
  const brightness = interpolate(progress, [0, 0.5, 1], [1, 2.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    entering: {
      opacity: progress,
      filter: `brightness(${brightness})`,
    },
    exiting: {
      opacity: 1 - progress,
      filter: `brightness(${brightness})`,
    },
  };
};

export const TRANSITIONS: Record<string, TransitionFn> = {
  crossfade,
  whipPan,
  zoomPunch,
  slide,
  dissolve,
  lightSweep,
};

// Ordered for deterministic picking — avoids repeated same transition
const TRANSITION_SEQUENCE: string[] = [
  "crossfade",
  "slide",
  "zoomPunch",
  "dissolve",
  "whipPan",
  "lightSweep",
];

/** Transition duration in frames (8–12 frames) */
export const TRANSITION_FRAMES = 10;

/**
 * Deterministically picks a transition by scene index.
 */
export function pickTransition(index: number): string {
  return TRANSITION_SEQUENCE[index % TRANSITION_SEQUENCE.length];
}

export function resolveTransition(
  transitionName: string | undefined,
  sceneIndex: number,
): TransitionFn {
  const name =
    (transitionName && TRANSITIONS[transitionName] ? transitionName : undefined) ||
    pickTransition(sceneIndex);
  return TRANSITIONS[name] ?? crossfade;
}
