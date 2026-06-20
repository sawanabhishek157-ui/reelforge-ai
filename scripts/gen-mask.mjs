/**
 * Region segmentation mask for cinemagraph (transformers.js, local/free).
 * Mirrors the logic intended for src/lib/segment.ts; used for CLI/demo.
 *
 * Usage: node scripts/gen-mask.mjs <image> <out-mask.png> <sky|water|auto>
 * Prints coverage (fraction of frame the region occupies).
 */
import fs from "node:fs";
import path from "node:path";

const [img, out, regionArg = "auto"] = process.argv.slice(2);
if (!img || !out) {
  console.error("usage: node scripts/gen-mask.mjs <image> <out.png> <sky|water|auto>");
  process.exit(1);
}

const MODEL = process.env.SEG_MODEL ?? "Xenova/segformer-b0-finetuned-ade-512-512";

// ADE20k class label sets per region.
const CLASS_SETS = {
  sky: new Set(["sky"]),
  water: new Set(["water", "sea", "river", "lake"]),
};
const AUTO_ORDER = ["sky", "water"];

const { pipeline, RawImage } = await import("@huggingface/transformers");

const buf = fs.readFileSync(img);
const ext = path.extname(img).toLowerCase().replace(".", "");
const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
const srcImage = await RawImage.fromBlob(new Blob([buf], { type: mime }));

console.log(`loading ${MODEL}...`);
const segmenter = await pipeline("image-segmentation", MODEL);
const segments = await segmenter(srcImage); // [{ label, score, mask: RawImage }, ...]

const labelsPresent = segments.map((s) => s.label);
console.log("labels:", labelsPresent.join(", "));

function coverageOf(set) {
  const matched = segments.filter((s) => set.has(s.label));
  if (matched.length === 0) return { matched: [], frac: 0 };
  // union of masks
  const { width, height } = matched[0].mask;
  const acc = new Uint8Array(width * height);
  let white = 0;
  for (const seg of matched) {
    const d = seg.mask.data; // grayscale 0..255, region = high
    for (let i = 0; i < acc.length; i++) {
      if (acc[i] === 0 && d[i] > 127) {
        acc[i] = 255;
        white++;
      }
    }
  }
  return { matched, frac: white / acc.length, acc, width, height };
}

let region = regionArg;
let res;
if (region === "auto") {
  // pick the region (sky/water) with the largest coverage
  let best = { frac: 0 };
  for (const r of AUTO_ORDER) {
    const c = coverageOf(CLASS_SETS[r]);
    if (c.frac > best.frac) {
      best = c;
      region = r;
    }
  }
  res = best;
} else {
  res = coverageOf(CLASS_SETS[region] ?? new Set([region]));
}

if (!res.acc || res.frac === 0) {
  console.log(`region=${region} coverage=0.000 — no ${region} detected`);
  process.exit(2);
}

const mask = new RawImage(res.acc, res.width, res.height, 1);
fs.mkdirSync(path.dirname(out), { recursive: true });
await mask.save(out);
console.log(`region=${region} coverage=${res.frac.toFixed(3)} -> ${out}`);
