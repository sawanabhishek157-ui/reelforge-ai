import { interpolate } from "remotion";

export type MotionTransform = {
  scale: number;
  x: number;
  y: number;
  rotate?: number;
};

export type MotionPresetFn = (frame: number, total: number) => MotionTransform;

function lerp(
  frame: number,
  total: number,
  from: number,
  to: number,
): number {
  return interpolate(frame, [0, total], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const zoomIn: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.0, 1.2),
  x: 0,
  y: 0,
});

const zoomOut: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.2, 1.0),
  x: 0,
  y: 0,
});

const panLeft: MotionPresetFn = (frame, total) => ({
  scale: 1.18,
  x: lerp(frame, total, 3, -3),
  y: 0,
});

const panRight: MotionPresetFn = (frame, total) => ({
  scale: 1.18,
  x: lerp(frame, total, -3, 3),
  y: 0,
});

const panUp: MotionPresetFn = (frame, total) => ({
  scale: 1.18,
  x: 0,
  y: lerp(frame, total, 3, -3),
});

const panDown: MotionPresetFn = (frame, total) => ({
  scale: 1.18,
  x: 0,
  y: lerp(frame, total, -3, 3),
});

const diagonalKenBurns: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.0, 1.2),
  x: lerp(frame, total, -2, 2),
  y: lerp(frame, total, -2, 2),
});

const pushInSlow: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.0, 1.12),
  x: 0,
  y: 0,
});

const pullOutSlow: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.12, 1.0),
  x: 0,
  y: 0,
});

const driftZoom: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.05, 1.2),
  x: lerp(frame, total, 0, -2),
  y: lerp(frame, total, 0, -1),
});

const rotateDrift: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.1, 1.18),
  x: lerp(frame, total, -1, 1),
  y: 0,
  rotate: lerp(frame, total, -0.5, 0.5),
});

const cornerToCenter: MotionPresetFn = (frame, total) => ({
  scale: lerp(frame, total, 1.2, 1.05),
  x: lerp(frame, total, -4, 0),
  y: lerp(frame, total, -4, 0),
});

const sweepRight: MotionPresetFn = (frame, total) => ({
  scale: 1.15,
  x: lerp(frame, total, -5, 0),
  y: 0,
});

export const MOTION_PRESETS: Record<string, MotionPresetFn> = {
  zoomIn,
  zoomOut,
  panLeft,
  panRight,
  panUp,
  panDown,
  diagonalKenBurns,
  pushInSlow,
  pullOutSlow,
  driftZoom,
  rotateDrift,
  cornerToCenter,
  sweepRight,
};

// Ordered preset names for deterministic cycling
const PRESET_SEQUENCE: string[] = [
  "zoomIn",
  "panRight",
  "diagonalKenBurns",
  "panLeft",
  "zoomOut",
  "panUp",
  "driftZoom",
  "panDown",
  "pushInSlow",
  "rotateDrift",
  "pullOutSlow",
  "cornerToCenter",
  "sweepRight",
];

/**
 * Deterministically picks a motion preset by scene index.
 * Consecutive scenes will always differ (offset by ~3 slots in sequence).
 */
export function pickMotionPreset(index: number): string {
  return PRESET_SEQUENCE[index % PRESET_SEQUENCE.length];
}

/** Back-compat mapping from legacy Motion string values */
export const LEGACY_MOTION_MAP: Record<string, string> = {
  "zoom-in": "zoomIn",
  "zoom-out": "zoomOut",
  "pan-left": "panLeft",
  "pan-right": "panRight",
};

export function resolvePreset(
  presetName: string | undefined,
  legacyMotion: string | undefined,
  sceneIndex: number,
): MotionPresetFn {
  const name =
    (presetName && MOTION_PRESETS[presetName] ? presetName : undefined) ||
    (legacyMotion ? LEGACY_MOTION_MAP[legacyMotion] : undefined) ||
    pickMotionPreset(sceneIndex);
  return MOTION_PRESETS[name] ?? zoomIn;
}
