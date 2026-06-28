/**
 * Generate one image via Segmind FLUX Schnell.
 * Usage: node --env-file=.env scripts/gen-image.mjs "<prompt>" <out.png> [width] [height]
 */
import fs from "node:fs";
import path from "node:path";

const [prompt, out, w, h] = process.argv.slice(2);
if (!prompt || !out) {
  console.error('usage: node --env-file=.env scripts/gen-image.mjs "<prompt>" <out.png> [w] [h]');
  process.exit(1);
}
const API_KEY = process.env.SEGMIND_API_KEY;
if (!API_KEY) {
  console.error("SEGMIND_API_KEY not set (run with --env-file=.env)");
  process.exit(1);
}

const body = {
  prompt,
  negative_prompt: "",
  samples: 1,
  num_inference_steps: 4,
  guidance_scale: 3.5,
  seed: 42,
  // Segmind requires multiples of 64
  width: Math.round((w ? Number(w) : 832) / 64) * 64,
  height: Math.round((h ? Number(h) : 1216) / 64) * 64,
  base64: false,
};

const res = await fetch("https://api.segmind.com/v1/flux-schnell", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Segmind error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const ct = res.headers.get("content-type") ?? "";
let buf;
if (ct.includes("application/json")) {
  const j = await res.json();
  buf = Buffer.from(j.image ?? j.output, "base64");
} else {
  buf = Buffer.from(await res.arrayBuffer());
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`saved ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
