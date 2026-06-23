/**
 * Shared types for the Phase 2 agentic content pipeline.
 * Keep DB row mapping (snake_case) inside each lib; these are the app-level shapes.
 */
import type { Plan } from "@/remotion/types";

export type Language = "hinglish" | "english";

export type RunStep =
  | "ideate"
  | "script"
  | "storyboard"
  | "images"
  | "voice"
  | "music"
  | "assemble"
  | "done";

export type RunStatus =
  | "generating"
  | "awaiting_approval"
  | "approved"
  | "failed"
  | "done";

export type MotionStyle = "zoomdrift" | "orbit" | "dolly" | "vertical";

/** Per-product brand/content profile — the grounding for all AI steps. */
export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  audience?: string;
  voiceTone?: string;
  language: Language;
  contentPillars: string[];
  dos: string[];
  donts: string[];
  examplePosts: string[];
  defaultVoiceId?: string;
  defaultMusicMood?: string;
  /** Style descriptor folded into FLUX image prompts (depth-friendly compositions). */
  imageStyle?: string;
  brandAssets: string[]; // public-relative paths
  // Reserved for future auto-grounding
  repoUrl?: string;
  storeUrl?: string;
  siteUrl?: string;
  createdAt?: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt">;

/** A proposed content idea from the ideation step. */
export interface Idea {
  title: string;
  hook: string; // the opening line / scroll-stopper
  angle: string; // the take/framing
  rationale: string; // why it fits the product + audience
}

/** One planned scene from the storyboard step (pre-image-generation). */
export interface StoryboardScene {
  caption: string;
  /** FLUX prompt for a depth-friendly image (clear subject + soft background). */
  imagePrompt?: string;
  /** Use an existing product brand asset (path) instead of generating. */
  useBrandAsset?: string;
  motionStyle: MotionStyle;
  /** When the scene has a strong sky/water region, animate it as a cinemagraph. */
  cinemagraph?: { region: "sky" | "water" } | null;
  /** Astrology motion-graphics overlays for this scene (starField, zodiacWheel, etc.). */
  motionGraphics?: string[];
  /** Reusable VFX effects for this scene (lightning, leaves, embers, godRays). */
  effects?: string[];
  durationSec: number;
}

export interface Storyboard {
  scenes: StoryboardScene[];
  musicMood: string;
  voiceId: string;
}

/** An agentic content run walking the gated step pipeline. */
export interface ContentRun {
  id: string;
  productId: string;
  title?: string;
  step: RunStep;
  status: RunStatus;
  idea?: { chosen: Idea; options: Idea[] };
  script?: string;
  storyboard?: Storyboard;
  /** The Remotion Plan being assembled (scenes with images/motion/cinemagraph). */
  plan?: Plan;
  voiceoverPath?: string;
  musicMood?: string;
  outputPath?: string;
  stepState?: Partial<Record<RunStep, "pending" | "approved">>;
  feedback?: Partial<Record<RunStep, string[]>>;
  error?: string;
  createdAt?: string;
}
