export type Motion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export type CaptionStyle = "wordPop" | "lineUp" | "karaoke";

export type OverlayName = "filmGrain" | "lightLeak" | "vignette" | "colorGrade";

export type Scene = {
  startSec: number;
  endSec: number;
  imageUrl: string; // public-relative URL like "/projects/<id>/scenes/scene-0.png"
  /** Subject-free background plane (FLUX-Fill) so the subject parallaxes without a ghost hole. */
  backgroundUrl?: string;
  caption: string;
  motion: Motion;
  // Extended fields (all optional for back-compat with existing plans)
  motionPreset?: string;
  captionStyle?: CaptionStyle;
  transition?: string;
  overlays?: OverlayName[];
  depthMapUrl?: string;
  /** Pre-rendered parallax video clip. When set, used as the base layer instead of DepthParallax. */
  clipUrl?: string;
  /** Astrology motion-graphics overlays to composite (starField, zodiacWheel, ...). */
  motionGraphics?: string[];
  /** Reusable VFX effects to composite (lightning, leaves, embers, godRays). */
  effects?: string[];
  /** Brand color palette — tints the effects to match product identity. */
  palette?: string[];
  /** Wind strength driving physics particles + subject sway + parallax. */
  windMood?: "calm" | "breeze" | "gust" | "swirl";
  /** Physical secondary motion on the subject plane (pendulum/float/breathe/sway). */
  subjectMotion?: "pendulum" | "float" | "breathe" | "sway" | "none";
  /** White-on-black mask of the foreground subject. When set, the scene renders
   *  through LayeredScene with the subject on its own plane (effects behind it). */
  subjectMaskUrl?: string;
  /**
   * Cinemagraph: animate a single segmented region (sky/water) over a frozen
   * base ("classic") or over the moving clip ("additive"). Mask is a
   * white-on-black PNG of the region.
   */
  cinemagraph?: {
    maskUrl: string;
    region: "sky" | "water";
    mode?: "classic" | "additive";
  };
};

export type Plan = {
  durationSec: number;
  voiceoverUrl: string;
  width?: number;
  height?: number;
  scenes: Scene[];
  /** Reusable branded sign-off appended after the scenes. */
  outro?: {
    brandName: string;
    palette?: string[];
    tagline?: string;
  };
};
