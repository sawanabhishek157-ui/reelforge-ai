/**
 * Subject matting (transformers.js, local/free) — produces a white-on-black
 * mask of the foreground subject (person/figure) so the Remotion compositor can
 * place that subject on its own plane with effects BEHIND it (true depth).
 *
 * Mirrors src/lib/segment.ts. Uses the same SegFormer-ADE model the project
 * already ships for cinemagraph, with a "subject" class set + edge feathering to
 * soften the coarse semantic-segmentation boundary. A cleaner matting model
 * (e.g. BiRefNet, MIT) can be swapped in via MATTE_MODEL later without changing
 * callers. Node-only — do not import from Remotion components.
 */

import fs from "node:fs";
import path from "node:path";

const MODEL = process.env.MATTE_MODEL ?? "Xenova/segformer-b0-finetuned-ade-512-512";

// ADE20k labels that count as the foreground subject.
const SUBJECT_CLASSES = new Set(["person"]);
const FEATHER_RADIUS = 3; // px box-blur passes to soften the mask edge
const MIN_PERSON_COVERAGE = 0.04; // below this, fall back to depth-foreground split
const DEPTH_NEAR_PERCENTILE = 0.55; // keep the nearest ~45% of pixels as foreground

export interface MatteResult {
  /** Path the mask PNG was written to (null if no subject met the threshold). */
  maskPath: string | null;
  /** Fraction of the frame the subject occupies (0..1). */
  coverage: number;
}

/** Canonical subject-mask path: `<dir>/<stem>.subject.mask.png`. */
export function subjectMaskPathFor(imageAbsPath: string): string {
  const dir = path.dirname(imageAbsPath);
  const stem = path.basename(imageAbsPath, path.extname(imageAbsPath));
  return path.join(dir, `${stem}.subject.mask.png`);
}

interface Segment {
  label: string;
  mask: { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
}

function union(segments: Segment[]): { acc: Uint8Array | null; frac: number; width: number; height: number } {
  const matched = segments.filter((s) => SUBJECT_CLASSES.has(s.label));
  if (matched.length === 0) return { acc: null, frac: 0, width: 0, height: 0 };
  const { width, height } = matched[0].mask;
  const acc = new Uint8Array(width * height);
  let white = 0;
  for (const seg of matched) {
    const d = seg.mask.data;
    for (let i = 0; i < acc.length; i++) {
      if (acc[i] === 0 && d[i] > 127) {
        acc[i] = 255;
        white++;
      }
    }
  }
  return { acc, frac: white / acc.length, width, height };
}

/** Separable box blur on a single-channel mask — feathers hard semantic edges. */
function feather(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  let buf = src;
  for (let pass = 0; pass < radius; pass++) {
    const next = new Uint8Array(buf.length);
    // Horizontal
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const l = x > 0 ? buf[i - 1] : buf[i];
        const r = x < width - 1 ? buf[i + 1] : buf[i];
        next[i] = (l + buf[i] + r) / 3;
      }
    }
    // Vertical
    const out = new Uint8Array(buf.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const u = y > 0 ? next[i - width] : next[i];
        const d = y < height - 1 ? next[i + width] : next[i];
        out[i] = (u + next[i] + d) / 3;
      }
    }
    buf = out;
  }
  return buf;
}

/**
 * Segment the foreground subject and write a feathered mask. Returns coverage so
 * callers can skip the subject plane when there's no clear subject (e.g. < 0.04).
 */
export async function generateSubjectMask(
  imageAbsPath: string,
  outMaskAbsPath: string,
  /** When no clear person is found, fall back to a depth-based foreground split
   *  from this depth map so landscape/no-subject scenes still get a layered plane. */
  depthMapPath?: string,
): Promise<MatteResult> {
  // Cache: skip if mask is newer than source.
  if (fs.existsSync(outMaskAbsPath) && fs.existsSync(imageAbsPath)) {
    if (fs.statSync(outMaskAbsPath).mtimeMs >= fs.statSync(imageAbsPath).mtimeMs) {
      return { maskPath: outMaskAbsPath, coverage: 1 };
    }
  }

  const { pipeline, RawImage } = await import("@huggingface/transformers");

  const buf = fs.readFileSync(imageAbsPath);
  const ext = path.extname(imageAbsPath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const srcImage = await RawImage.fromBlob(new Blob([buf], { type: mime }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmenter: any = await pipeline("image-segmentation", MODEL);
  const segments = (await segmenter(srcImage)) as Segment[];

  const { acc, frac, width, height } = union(segments);

  // Clear person → precise person mask.
  if (acc && frac >= MIN_PERSON_COVERAGE) {
    const feathered = feather(acc, width, height, FEATHER_RADIUS);
    const mask = new RawImage(feathered, width, height, 1);
    fs.mkdirSync(path.dirname(outMaskAbsPath), { recursive: true });
    await mask.save(outMaskAbsPath);
    return { maskPath: outMaskAbsPath, coverage: frac };
  }

  // No person → depth-based foreground split (near pixels) so the scene still layers.
  if (depthMapPath && fs.existsSync(depthMapPath)) {
    return depthForegroundMask(depthMapPath, outMaskAbsPath, RawImage);
  }

  return { maskPath: null, coverage: 0 };
}

/**
 * Build a foreground mask from a depth map: the nearest pixels become the
 * foreground plane (depth maps are near=bright). Heavily feathered so the
 * near/far boundary is soft. Lets landscape scenes parallax in 2.5D without a
 * subject — rigid planes, no per-pixel warp, so nothing morphs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function depthForegroundMask(depthPath: string, outPath: string, RawImage: any): Promise<MatteResult> {
  const buf = fs.readFileSync(depthPath);
  const img = await RawImage.fromBlob(new Blob([buf], { type: "image/png" }));
  const { width, height, channels, data } = img as {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array | Uint8ClampedArray;
  };
  const n = width * height;
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) gray[i] = data[i * channels];

  // Threshold at a percentile so the nearest ~45% of the scene is foreground.
  const sorted = Uint8Array.from(gray).sort();
  const thr = sorted[Math.floor(n * DEPTH_NEAR_PERCENTILE)];
  const mask = new Uint8Array(n);
  let white = 0;
  for (let i = 0; i < n; i++) {
    if (gray[i] >= thr) {
      mask[i] = 255;
      white++;
    }
  }

  const feathered = feather(mask, width, height, FEATHER_RADIUS * 3);
  const out = new RawImage(feathered, width, height, 1);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await out.save(outPath);
  return { maskPath: outPath, coverage: white / n };
}
