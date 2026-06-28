/**
 * Depth-map generation using transformers.js (onnxruntime-node).
 * Runs Depth Anything v2 Small to produce a grayscale PNG where
 * near (foreground) pixels are bright (high value) and far (background)
 * pixels are dark (low value).
 *
 * Node-only — do not import this file from Remotion components.
 */

import fs from "node:fs";
import path from "node:path";

// The primary model id to try first. Large gives much sharper depth edges
// (less parallax morphing) than small. Override via DEPTH_MODEL / DEPTH_DTYPE.
const PRIMARY_MODEL =
  process.env.DEPTH_MODEL ?? "onnx-community/depth-anything-v2-large";
const PRIMARY_DTYPE = process.env.DEPTH_DTYPE ?? "q8"; // q8 keeps large feasible on CPU
// Fallback in case the primary is unreachable or fails to load.
const FALLBACK_MODEL = "onnx-community/depth-anything-v2-small";

/**
 * Given an absolute image path, return the canonical depth-map path:
 * same directory, same stem, `.depth.png` extension.
 *
 * Example: /foo/bar/img-0.jpg -> /foo/bar/img-0.depth.png
 */
export function depthMapPathFor(imageAbsPath: string): string {
  const dir = path.dirname(imageAbsPath);
  const stem = path.basename(imageAbsPath, path.extname(imageAbsPath));
  return path.join(dir, `${stem}.depth.png`);
}

/**
 * Generate a depth-map PNG for the given image.
 *
 * - Uses `depth-estimation` pipeline from @huggingface/transformers.
 * - Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on load error.
 * - The returned depth image has near=bright, far=dark (standard convention).
 * - Skips generation if outAbsPath already exists and is newer than the source.
 *
 * @param imageAbsPath  Absolute path to the source image (jpeg/png/etc).
 * @param outAbsPath    Absolute path where the depth PNG should be saved.
 * @returns             The outAbsPath that was written (or already existed).
 */
export async function generateDepthMap(
  imageAbsPath: string,
  outAbsPath: string,
): Promise<string> {
  // Cache check: skip if output exists and is newer than source.
  if (fs.existsSync(outAbsPath)) {
    const srcMtime = fs.statSync(imageAbsPath).mtimeMs;
    const outMtime = fs.statSync(outAbsPath).mtimeMs;
    if (outMtime >= srcMtime) {
      return outAbsPath;
    }
  }

  // Dynamically import transformers.js so this file is importable in TS
  // without requiring the browser/WASM build at compile time.
  const { pipeline, RawImage } = await import("@huggingface/transformers");

  // Load source image via Blob (fromURL does not support file:// in node).
  const srcBuffer = fs.readFileSync(imageAbsPath);
  const ext = path.extname(imageAbsPath).toLowerCase().replace(".", "");
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const srcBlob = new Blob([srcBuffer], { type: mime });
  const srcImage = await RawImage.fromBlob(srcBlob);

  // Load the pipeline, trying the primary model then the fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let depthPipeline: any;
  try {
    depthPipeline = await pipeline("depth-estimation", PRIMARY_MODEL, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dtype: PRIMARY_DTYPE as any,
    });
  } catch {
    depthPipeline = await pipeline("depth-estimation", FALLBACK_MODEL, {
      dtype: "fp32",
    });
  }

  // Run inference. The pipeline returns { predicted_depth, depth } where
  // depth is a RawImage with uint8 grayscale values: near=bright, far=dark.
  const result = (await depthPipeline(srcImage)) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    depth: any;
  };

  const depthImage = result.depth;

  // Ensure output directory exists.
  fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });

  // Save as PNG (RawImage.save uses the file extension to choose format).
  await depthImage.save(outAbsPath);

  return outAbsPath;
}
