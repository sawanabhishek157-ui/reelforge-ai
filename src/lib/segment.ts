/**
 * Region segmentation for cinemagraph (transformers.js, local/free).
 * Produces a white-on-black mask PNG for an animatable region (sky/water),
 * so the Remotion CinemagraphRegion layer can animate just that area.
 *
 * Node-only — do not import from Remotion components.
 */

import fs from "node:fs";
import path from "node:path";

const MODEL = process.env.SEG_MODEL ?? "Xenova/segformer-b0-finetuned-ade-512-512";

// ADE20k class labels per region.
const CLASS_SETS: Record<string, Set<string>> = {
  sky: new Set(["sky"]),
  water: new Set(["water", "sea", "river", "lake"]),
};
const AUTO_ORDER = ["sky", "water"] as const;

export type RegionType = "sky" | "water" | "auto";

export interface SegmentResult {
  /** Path the mask PNG was written to (null if no region met the threshold). */
  maskPath: string | null;
  /** The resolved region (after auto-detection). */
  region: "sky" | "water" | null;
  /** Fraction of the frame the region occupies (0..1). */
  coverage: number;
}

/** Canonical mask path: `<dir>/<stem>.<region>.mask.png`. */
export function maskPathFor(imageAbsPath: string, region: "sky" | "water"): string {
  const dir = path.dirname(imageAbsPath);
  const stem = path.basename(imageAbsPath, path.extname(imageAbsPath));
  return path.join(dir, `${stem}.${region}.mask.png`);
}

interface Segment {
  label: string;
  mask: { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
}

function unionCoverage(segments: Segment[], set: Set<string>) {
  const matched = segments.filter((s) => set.has(s.label));
  if (matched.length === 0) return { frac: 0, acc: null as Uint8Array | null, width: 0, height: 0 };
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
  return { frac: white / acc.length, acc, width, height };
}

/**
 * Segment an animatable region and write its mask. Returns coverage so callers
 * can skip cinemagraph when the region is too small (e.g. < 0.12).
 */
export async function segmentRegion(
  imageAbsPath: string,
  outMaskAbsPath: string,
  region: RegionType = "auto",
): Promise<SegmentResult> {
  // Cache: skip if mask is newer than source.
  if (fs.existsSync(outMaskAbsPath) && fs.existsSync(imageAbsPath)) {
    if (fs.statSync(outMaskAbsPath).mtimeMs >= fs.statSync(imageAbsPath).mtimeMs) {
      // Coverage unknown from cache; caller should persist it if needed.
      const r = region === "auto" ? null : region;
      return { maskPath: outMaskAbsPath, region: r, coverage: 1 };
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

  let resolved: "sky" | "water" | null = null;
  let best = { frac: 0, acc: null as Uint8Array | null, width: 0, height: 0 };

  if (region === "auto") {
    for (const r of AUTO_ORDER) {
      const c = unionCoverage(segments, CLASS_SETS[r]);
      if (c.frac > best.frac) {
        best = c;
        resolved = r;
      }
    }
  } else {
    best = unionCoverage(segments, CLASS_SETS[region]);
    resolved = region;
  }

  if (!best.acc || best.frac === 0) {
    return { maskPath: null, region: null, coverage: 0 };
  }

  const mask = new RawImage(best.acc, best.width, best.height, 1);
  fs.mkdirSync(path.dirname(outMaskAbsPath), { recursive: true });
  await mask.save(outMaskAbsPath);

  return { maskPath: outMaskAbsPath, region: resolved, coverage: best.frac };
}
