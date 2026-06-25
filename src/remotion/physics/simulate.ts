/**
 * Deterministic particle physics for Remotion. The whole timeline is simulated
 * once (Euler integration + curl-noise wind/turbulence) and read back per frame,
 * so renders are reproducible across Remotion's out-of-order parallel workers.
 *
 * Pure: only uses Remotion's `random(seed)` + `@remotion/noise` — no Math.random,
 * Date.now, or frame-to-frame render state.
 */
import { noise3D } from "@remotion/noise";
import { random } from "remotion";

export type WindMood = "calm" | "breeze" | "gust" | "swirl";
export type PhysicsType =
  | "windLeaves"
  | "fallingPetals"
  | "risingEmbers"
  | "snow"
  | "dust"
  | "sparks";

export interface PhysicsConfig {
  type: PhysicsType;
  count: number;
  seed: number;
  width: number;
  height: number;
  windMood?: WindMood;
}

/** Per-frame render state for one particle. */
export interface ParticleState {
  x: number;
  y: number;
  vx: number; // velocity — lets the renderer streak fast particles along motion
  vy: number;
  rot: number;
  size: number;
  opacity: number;
  ci: number; // color index into the palette
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  ci: number;
  base: number; // per-particle base opacity / flicker phase seed
}

type Spawn = "top" | "bottom" | "scatter";

interface TypeParams {
  gravity: number; // +down
  windBase: number; // steady lateral push
  turb: number; // curl-noise turbulence strength
  drag: number;
  tumble: number; // rotational velocity scale
  size: [number, number];
  spawn: Spawn;
  flicker: boolean;
}

// windBase is tuned against each type's drag: terminal cross-speed ≈
// windBase * windK * (1+gust) / drag px/frame. Values target a visible drift at
// breeze and an obvious sweep at gust without flinging particles off instantly.
const PARAMS: Record<PhysicsType, TypeParams> = {
  windLeaves: { gravity: 0.11, windBase: 0.70, turb: 0.70, drag: 0.045, tumble: 3.4, size: [11, 22], spawn: "top", flicker: false },
  fallingPetals: { gravity: 0.07, windBase: 0.55, turb: 0.80, drag: 0.035, tumble: 4.4, size: [8, 16], spawn: "top", flicker: false },
  risingEmbers: { gravity: -0.11, windBase: 0.30, turb: 0.62, drag: 0.02, tumble: 0.0, size: [1.6, 4.2], spawn: "bottom", flicker: true },
  snow: { gravity: 0.06, windBase: 0.50, turb: 0.34, drag: 0.05, tumble: 0.4, size: [2, 6], spawn: "top", flicker: false },
  dust: { gravity: 0.0, windBase: 0.40, turb: 0.58, drag: 0.06, tumble: 0.0, size: [1, 3], spawn: "scatter", flicker: true },
  sparks: { gravity: 0.16, windBase: 0.32, turb: 0.42, drag: 0.03, tumble: 0.0, size: [1, 3], spawn: "scatter", flicker: true },
};

const WIND_SCALE: Record<WindMood, number> = { calm: 0.5, breeze: 1.1, gust: 1.9, swirl: 1.3 };
const TURB_SCALE: Record<WindMood, number> = { calm: 0.5, breeze: 0.9, gust: 1.3, swirl: 2.2 };

/** How much a peak gust adds over the steady wind (× windMag at gustEnv=1). */
const GUST_GAIN = 1.1;

const MARGIN = 80;

function rnd(seed: number, i: number, ch: number): number {
  return random(`${seed}:${i}:${ch}`);
}

function spawnY(p: Spawn, h: number, r: number): number {
  if (p === "top") return -MARGIN + r * (h * 0.4); // staggered above the frame
  if (p === "bottom") return h + MARGIN - r * (h * 0.4);
  return r * h;
}

function init(type: PhysicsType, i: number, seed: number, w: number, h: number): Particle {
  const pr = PARAMS[type];
  const r = (c: number) => rnd(seed, i, c);
  return {
    x: r(0) * w,
    y: spawnY(pr.spawn, h, r(1)),
    vx: (r(2) - 0.5) * 0.6,
    vy: pr.spawn === "bottom" ? -(0.4 + r(3) * 0.6) : 0.4 + r(3) * 0.6,
    rot: r(4) * 360,
    vr: (r(5) - 0.5) * 2 * pr.tumble,
    size: pr.size[0] + r(6) * (pr.size[1] - pr.size[0]),
    ci: Math.floor(r(7) * 997),
    base: 0.55 + r(8) * 0.45,
  };
}

function respawn(p: Particle, type: PhysicsType, i: number, seed: number, f: number, w: number, h: number): void {
  const pr = PARAMS[type];
  const r = (c: number) => rnd(seed, i, c + f * 7); // vary on respawn
  p.x = r(0) * w;
  if (pr.spawn === "top") {
    p.y = -MARGIN;
    p.vy = 0.4 + r(3) * 0.6;
  } else if (pr.spawn === "bottom") {
    p.y = h + MARGIN;
    p.vy = -(0.4 + r(3) * 0.6);
  } else {
    p.y = r(1) * h;
  }
  p.vx = (r(2) - 0.5) * 0.6;
}

function opacityFor(p: Particle, type: PhysicsType, f: number, h: number): number {
  const pr = PARAMS[type];
  let o = p.base;
  if (pr.flicker) {
    o *= 0.55 + 0.45 * Math.sin(f * 0.3 + p.base * 12);
  }
  if (type === "risingEmbers") o *= Math.max(0.15, p.y / h); // fade as they rise
  return Math.max(0, Math.min(1, o));
}

/**
 * Simulate the full timeline. Returns frames[frame] = ParticleState[].
 * Memoize the call (stable deps) so it bakes once per worker.
 */
export function simulateParticles(cfg: PhysicsConfig, totalFrames: number): ParticleState[][] {
  const { type, count, seed, width: w, height: h } = cfg;
  const pr = PARAMS[type];
  const windK = WIND_SCALE[cfg.windMood ?? "breeze"];
  const turbK = TURB_SCALE[cfg.windMood ?? "breeze"];

  const ps: Particle[] = [];
  for (let i = 0; i < count; i++) ps.push(init(type, i, seed, w, h));

  // Consistent wind direction for this scene so particles visibly BLOW across the
  // frame (not just wobble). Mostly horizontal, with a slight downward tilt.
  const dirX = random(`${seed}-windDir`) < 0.5 ? -1 : 1;
  // Wind is mostly horizontal; a small downward tilt only. Kept low so light
  // particles (snow/dust) don't get dragged to the bottom faster than they respawn.
  const dirY = 0.05;

  const frames: ParticleState[][] = [];
  for (let f = 0; f < totalFrames; f++) {
    // Low-frequency gust envelope (0..1): the wind visibly ramps up and eases,
    // so there are obvious gusts rather than a constant breeze.
    const gustEnv = Math.max(0, noise3D(`${seed}-gustenv`, 0, 0, f * 0.006));
    // Steady directional wind, strengthened during gusts.
    const windMag = pr.windBase * windK * (1 + GUST_GAIN * gustEnv);
    const windX = dirX * windMag;
    const windY = dirY * windMag;
    for (let i = 0; i < count; i++) {
      const p = ps[i];
      // curl-noise turbulence — spatially coherent, time-evolving
      const tx = noise3D(`${seed}-tx`, p.x * 0.04, p.y * 0.04, f * 0.03) * pr.turb * turbK;
      const ty = noise3D(`${seed}-ty`, p.x * 0.04, p.y * 0.04, f * 0.03) * pr.turb * turbK * 0.6;
      p.vx += windX + tx - p.vx * pr.drag;
      p.vy += pr.gravity + windY + ty - p.vy * pr.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      // wrap / respawn
      if (pr.spawn === "top" && p.y > h + MARGIN) respawn(p, type, i, seed, f, w, h);
      else if (pr.spawn === "bottom" && p.y < -MARGIN) respawn(p, type, i, seed, f, w, h);
      else if (pr.spawn === "scatter") {
        if (p.x < -MARGIN) p.x = w + MARGIN;
        if (p.x > w + MARGIN) p.x = -MARGIN;
        if (p.y < -MARGIN) p.y = h + MARGIN;
        if (p.y > h + MARGIN) p.y = -MARGIN;
      }
      if (p.x < -MARGIN) p.x = w + MARGIN;
      if (p.x > w + MARGIN) p.x = -MARGIN;
    }
    frames.push(ps.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, rot: p.rot, size: p.size, opacity: opacityFor(p, type, f, h), ci: p.ci })));
  }
  return frames;
}
