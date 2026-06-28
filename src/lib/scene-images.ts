/**
 * Per-scene visual asset generation for storyboard rendering.
 *
 * Orchestrates Segmind image generation, depth-map inference, and region
 * segmentation into a set of public-relative URLs per scene.
 *
 * Node-only — do not import from Remotion components.
 */

import fs from "node:fs";
import path from "node:path";

import { generateImage, inpaintBackground } from "./segmind";
import { generateDepthMap, depthMapPathFor } from "./depth";
import { segmentRegion, maskPathFor } from "./segment";
import { generateSubjectMask, subjectMaskPathFor } from "./matte";
import { generateCleanBackground, backgroundPathFor } from "./inpaint";
import { PUBLIC_DIR, toPublicUrl } from "./paths";

import type { Storyboard } from "./types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CinemagraphAsset {
  maskUrl: string;
  region: "sky" | "water";
}

export interface SceneAsset {
  imageUrl: string;
  depthMapUrl: string;
  cinemagraph?: CinemagraphAsset;
  /** White-on-black subject mask — enables the depth-layered compositor. */
  subjectMaskUrl?: string;
  /** Subject-free background plane (inpaint) — lets the subject parallax hard
   *  without a ghost hole. Only set when a subject mask was produced. */
  backgroundUrl?: string;
}

export interface GenerateSceneAssetsOptions {
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum coverage fraction below which we omit the cinemagraph asset. */
const MIN_CINEMAGRAPH_COVERAGE = 0.12;

/** Minimum subject coverage below which we skip the depth-layered subject plane.
 *  Low enough to keep tight object cutouts (a pendant is ~2-3% of the frame). */
const MIN_SUBJECT_COVERAGE = 0.006;

/**
 * Round a dimension up to the nearest multiple of 64 (Segmind / FLUX
 * requirement).
 */
function snapTo64(n: number): number {
  return Math.ceil(n / 64) * 64;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate per-scene visual assets (image, depth map, optional cinemagraph
 * mask) for every scene in the storyboard.
 *
 * Files are written under `public/runs/<runId>/scene-<i>/`.
 * Public-relative URLs are returned (e.g. `/runs/<runId>/scene-0/image.png`).
 *
 * Scenes are processed sequentially because Segmind is rate-limited.
 *
 * @throws {Error} with a descriptive message if a required step fails.
 */
export async function generateSceneAssets(
  runId: string,
  storyboard: Storyboard,
  opts: GenerateSceneAssetsOptions = {},
): Promise<SceneAsset[]> {
  const width = snapTo64(opts.width ?? 1088);
  const height = snapTo64(opts.height ?? 1920);

  const assets: SceneAsset[] = [];

  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const sceneDir = path.join(PUBLIC_DIR, "runs", runId, `scene-${i}`);
    fs.mkdirSync(sceneDir, { recursive: true });

    // ------------------------------------------------------------------
    // Step 1: Obtain the scene image (generate or reuse brand asset)
    // ------------------------------------------------------------------
    const imageAbs = path.join(sceneDir, "image.png");

    if (scene.useBrandAsset) {
      // Resolve the brand asset path: it is public-relative (e.g. "/brand/logo.png")
      // or an absolute path on disk.
      const brandSrc = scene.useBrandAsset.startsWith("/")
        ? path.join(PUBLIC_DIR, scene.useBrandAsset)
        : scene.useBrandAsset;

      if (!fs.existsSync(brandSrc)) {
        throw new Error(
          `Scene ${i}: brand asset not found at "${brandSrc}" (useBrandAsset = "${scene.useBrandAsset}")`,
        );
      }

      // Copy only when the destination doesn't already exist or is stale.
      const srcMtime = fs.statSync(brandSrc).mtimeMs;
      const dstExists = fs.existsSync(imageAbs);
      const dstMtime = dstExists ? fs.statSync(imageAbs).mtimeMs : 0;

      if (!dstExists || dstMtime < srcMtime) {
        fs.copyFileSync(brandSrc, imageAbs);
      }
    } else {
      const prompt = scene.imagePrompt;
      if (!prompt) {
        throw new Error(
          `Scene ${i}: imagePrompt is required when useBrandAsset is not set`,
        );
      }

      try {
        await generateImage(prompt, imageAbs, { width, height });
      } catch (err) {
        throw new Error(
          `Scene ${i}: image generation failed — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 2: Depth map
    // ------------------------------------------------------------------
    const depthAbs = depthMapPathFor(imageAbs);

    try {
      await generateDepthMap(imageAbs, depthAbs);
    } catch (err) {
      throw new Error(
        `Scene ${i}: depth-map generation failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Cinemagraph mask (optional)
    // ------------------------------------------------------------------
    let cinemagraph: CinemagraphAsset | undefined;

    if (scene.cinemagraph) {
      const region = scene.cinemagraph.region;
      const maskAbs = maskPathFor(imageAbs, region);

      try {
        const result = await segmentRegion(imageAbs, maskAbs, region);

        if (result.coverage >= MIN_CINEMAGRAPH_COVERAGE && result.maskPath) {
          cinemagraph = {
            maskUrl: toPublicUrl(result.maskPath),
            region,
          };
        }
        // If coverage is below threshold, cinemagraph is intentionally omitted.
      } catch (err) {
        throw new Error(
          `Scene ${i}: cinemagraph segmentation failed — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 4: Subject mask (optional) — enables the depth-layered compositor.
    // Non-fatal: if it fails or finds no subject, the scene renders flat.
    // ------------------------------------------------------------------
    let subjectMaskUrl: string | undefined;
    let subjectMaskAbs: string | undefined;

    try {
      const subjectAbs = subjectMaskPathFor(imageAbs);
      // Moving subjects get a TIGHT BiRefNet cutout (only the subject moves over a
      // still background); landscapes ("none"/unset) use the depth-split fallback.
      const moving = scene.subjectMotion !== undefined && scene.subjectMotion !== "none";
      const result = await generateSubjectMask(imageAbs, subjectAbs, depthAbs, { tight: moving });
      if (result.maskPath && result.coverage >= MIN_SUBJECT_COVERAGE) {
        subjectMaskUrl = toPublicUrl(result.maskPath);
        subjectMaskAbs = result.maskPath;
      }
    } catch (err) {
      console.warn(
        `Scene ${i}: subject matting skipped — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ------------------------------------------------------------------
    // Step 5: Subject-free background (optional) — kills the ghost hole so the
    // subject plane can parallax hard. Only when a subject mask exists.
    // Non-fatal: on failure the compositor falls back to the full image.
    // ------------------------------------------------------------------
    let backgroundUrl: string | undefined;

    if (subjectMaskAbs) {
      const bgAbs = backgroundPathFor(imageAbs);
      // Default: free local inpaint. Opt-in to paid Segmind FLUX Fill via
      // BG_INPAINT=flux, with a local fallback if the paid call fails.
      const useFlux = process.env.BG_INPAINT === "flux";
      try {
        if (useFlux) {
          await inpaintBackground(imageAbs, subjectMaskAbs, bgAbs);
        } else {
          await generateCleanBackground(imageAbs, subjectMaskAbs, bgAbs);
        }
        backgroundUrl = toPublicUrl(bgAbs);
      } catch (err) {
        console.warn(
          `Scene ${i}: ${useFlux ? "FLUX" : "local"} background inpaint failed${
            useFlux ? " — falling back to local" : ""
          } — ${err instanceof Error ? err.message : String(err)}`,
        );
        if (useFlux) {
          try {
            await generateCleanBackground(imageAbs, subjectMaskAbs, bgAbs);
            backgroundUrl = toPublicUrl(bgAbs);
          } catch (err2) {
            console.warn(
              `Scene ${i}: local background inpaint also failed — ${err2 instanceof Error ? err2.message : String(err2)}`,
            );
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Collect asset URLs
    // ------------------------------------------------------------------
    const asset: SceneAsset = {
      imageUrl: toPublicUrl(imageAbs),
      depthMapUrl: toPublicUrl(depthAbs),
      ...(cinemagraph !== undefined ? { cinemagraph } : {}),
      ...(subjectMaskUrl !== undefined ? { subjectMaskUrl } : {}),
      ...(backgroundUrl !== undefined ? { backgroundUrl } : {}),
    };

    assets.push(asset);
  }

  return assets;
}
