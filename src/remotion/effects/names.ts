/**
 * Effect registry — PURE DATA, no React imports, so both the Remotion layer
 * and the server-side storyboard validator (src/lib/storyboard.ts) can import
 * it without dragging browser deps into Node.
 */

/** Reusable VFX the storyboard director can drop into any scene/brand. */
export type EffectName =
  // elements (wave 1, hand-built — original four)
  | "godRays"
  | "lightning"
  | "leaves"
  | "embers"
  // weather
  | "rain"
  | "snow"
  | "fog"
  | "clouds"
  // magic / particles
  | "sparkles"
  | "fireflies"
  | "bokeh"
  | "magicDust"
  // cosmic
  | "nebula"
  | "shootingStars"
  | "aurora"
  | "starburst"
  // tech / graphic
  | "gridLines"
  | "dataStream"
  | "glitch"
  | "neonGlow"
  // elements
  | "flame"
  // physics particles (real simulation — see physics/)
  | "petals"
  | "dustMotes"
  | "sparks"
  // animated objects (Lottie — see LottieObject.tsx; only content-verified assets kept)
  | "citySkyline"
  | "confetti"
  | "rocket";

export const EFFECT_NAMES: EffectName[] = [
  "godRays", "lightning", "leaves", "embers",
  "rain", "snow", "fog", "clouds",
  "sparkles", "fireflies", "bokeh", "magicDust",
  "nebula", "shootingStars", "aurora", "starburst",
  "gridLines", "dataStream", "glitch", "neonGlow",
  "flame", "petals", "dustMotes", "sparks",
  "citySkyline", "confetti", "rocket",
];

/** Which depth band each effect lives in relative to the subject plane. */
export type EffectBand = "behind" | "front";

export const EFFECT_BAND: Record<EffectName, EffectBand> = {
  // behind the subject — atmosphere, light, depth
  godRays: "behind",
  fog: "behind",
  clouds: "behind",
  bokeh: "behind",
  nebula: "behind",
  shootingStars: "behind",
  aurora: "behind",
  gridLines: "behind",
  dataStream: "behind",
  neonGlow: "behind",
  // in front of the subject — foreground particles, overlays
  lightning: "front",
  leaves: "front",
  embers: "front",
  rain: "front",
  snow: "front",
  sparkles: "front",
  fireflies: "front",
  magicDust: "front",
  starburst: "front",
  glitch: "front",
  flame: "front",
  // physics particles
  petals: "front",
  dustMotes: "front",
  sparks: "front",
  // Lottie objects (content-verified)
  citySkyline: "behind",
  confetti: "front",
  rocket: "front",
};
