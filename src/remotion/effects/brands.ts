/**
 * Per-brand effect theming — PURE DATA (no React/Node imports), shared by the
 * server storyboard director (to constrain which effects the AI may pick) and
 * the Remotion compositor (to tint effects with the brand palette).
 *
 * Keyed by product slug. Falls back to "default" for unknown products.
 */
import type { EffectName } from "./names";

export interface BrandTheme {
  /** Ordered color palette — effects cycle through these to match brand identity. */
  palette: string[];
  /** Effects the director is allowed to pick for this brand. */
  effects: EffectName[];
  /** Motion-graphics overlays allowed for this brand. */
  motionGraphics: string[];
  /** Sign-off line shown on the branded outro card. */
  tagline?: string;
}

export const BRAND_THEMES: Record<string, BrandTheme> = {
  // Astrology / soulmate — cosmic, mystical, violet + gold
  soulstarr: {
    palette: ["#6B21A8", "#4B0082", "#D4AF37", "#F59E0B", "#E0D4FF"],
    effects: ["godRays", "nebula", "shootingStars", "aurora", "sparkles", "magicDust", "starburst", "fireflies", "leaves", "petals", "embers", "dustMotes", "flame"],
    motionGraphics: ["starField", "cosmicDust", "zodiacWheel", "orbitingBodies", "constellationLines", "lightRays"],
    tagline: "Follow for your cosmic match ✨",
  },
  // Dev tool — dark technical, terminal green + electric blue
  codegraph: {
    // Glow colors only — palettes feed light-emitting effects, so no dark bg/text hues.
    palette: ["#00FF41", "#22C55E", "#3B82F6", "#67E8F9"],
    effects: ["gridLines", "dataStream", "glitch", "neonGlow", "rocket"],
    motionGraphics: ["constellationLines"],
    tagline: "See your codebase. Ship faster.",
  },
  // Travel / group expenses — clean indigo→violet + amber money accent
  tripsynk: {
    palette: ["#4F46E5", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981"],
    effects: ["bokeh", "sparkles", "fireflies", "magicDust", "clouds", "confetti", "citySkyline"],
    motionGraphics: [],
    tagline: "Split the trip. Keep the memories.",
  },
  // Calorie / gym tracker — dark fitness, orange (food) + emerald (burn) + aqua/violet
  calybe: {
    palette: ["#F97316", "#10B981", "#45B7D1", "#8B5CF6", "#FF6B35", "#00FFAB"],
    effects: ["neonGlow", "embers", "fireflies", "sparkles", "godRays", "flame"],
    motionGraphics: [],
    tagline: "Track. Train. Transform.",
  },
  // Neutral fallback
  default: {
    palette: ["#FFFFFF", "#C0D8FF", "#E8D4FF"],
    effects: ["godRays", "sparkles", "bokeh"],
    motionGraphics: ["starField"],
    tagline: "",
  },
};

export function brandTheme(slug: string | undefined | null): BrandTheme {
  if (slug && BRAND_THEMES[slug]) return BRAND_THEMES[slug];
  return BRAND_THEMES.default;
}
