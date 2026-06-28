/**
 * Regenerate a depth map with transformers.js (Depth Anything v2).
 * Mirrors src/lib/depth.ts; used to (re)generate demo depth maps.
 *
 * Usage: DEPTH_MODEL=... DEPTH_DTYPE=... node scripts/gen-depth.mjs <image> <out.png>
 */
import fs from "node:fs";
import path from "node:path";

const [img, out] = process.argv.slice(2);
if (!img || !out) {
  console.error("usage: node scripts/gen-depth.mjs <image> <out.png>");
  process.exit(1);
}

const MODEL = process.env.DEPTH_MODEL ?? "onnx-community/depth-anything-v2-large";
const DTYPE = process.env.DEPTH_DTYPE ?? "q8";

const { pipeline, RawImage } = await import("@huggingface/transformers");

const buf = fs.readFileSync(img);
const ext = path.extname(img).toLowerCase().replace(".", "");
const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
const srcImage = await RawImage.fromBlob(new Blob([buf], { type: mime }));

let pipe;
try {
  console.log(`loading ${MODEL} (${DTYPE})...`);
  pipe = await pipeline("depth-estimation", MODEL, { dtype: DTYPE });
} catch (e) {
  console.error(`primary model failed (${e?.message}); falling back to small fp32`);
  pipe = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", { dtype: "fp32" });
}

const res = await pipe(srcImage);
fs.mkdirSync(path.dirname(out), { recursive: true });
await res.depth.save(out);
console.log("depth written:", out);
