/**
 * Generate 2 test images via Segmind FLUX Schnell.
 *
 * Run: node --env-file=.env scripts/segmind-gen.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "seg-test");

const SEGMIND_BASE = "https://api.segmind.com/v1";

const API_KEY = process.env.SEGMIND_API_KEY;
if (!API_KEY) {
  console.error("SEGMIND_API_KEY is not set. Run with --env-file=.env");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * @param {string} prompt
 * @param {string} outPath
 * @param {{ width?: number, height?: number, seed?: number, steps?: number }} [opts]
 */
async function generateImage(prompt, outPath, opts = {}) {
  const width = opts.width ?? 832;
  const height = opts.height ?? 1216;
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 32);
  const steps = opts.steps ?? 4;

  console.log(`Generating: ${path.basename(outPath)}`);
  console.log(`  prompt: ${prompt.slice(0, 80)}...`);
  console.log(`  ${width}x${height}, ${steps} steps, seed ${seed}`);

  const body = {
    prompt,
    negative_prompt: "",
    samples: 1,
    num_inference_steps: steps,
    guidance_scale: 3.5,
    seed,
    width,
    height,
    base64: false,
  };

  const res = await fetch(`${SEGMIND_BASE}/flux-schnell`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Segmind API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  let imageBuffer;

  if (contentType.includes("application/json")) {
    const json = await res.json();
    const b64 = json["image"] ?? json["output"] ?? null;
    if (!b64) {
      throw new Error(
        `Segmind returned JSON but no image field: ${JSON.stringify(json).slice(0, 200)}`,
      );
    }
    imageBuffer = Buffer.from(b64, "base64");
  } else {
    const arrayBuf = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuf);
  }

  fs.writeFileSync(outPath, imageBuffer);
  const kb = (imageBuffer.length / 1024).toFixed(1);
  console.log(`  saved ${outPath} (${kb} KB)`);
  return outPath;
}

const images = [
  {
    prompt:
      "a woman gazing at a glowing cosmic night sky, stars and nebula, cinematic depth, foreground silhouette",
    out: path.join(OUT_DIR, "cosmic-portrait.png"),
  },
  {
    prompt:
      "ancient stone temple ruins in a misty forest, moss-covered pillars, god rays through canopy, dramatic depth",
    out: path.join(OUT_DIR, "temple-ruins.png"),
  },
];

let failed = false;
for (const { prompt, out } of images) {
  try {
    await generateImage(prompt, out);
  } catch (err) {
    console.error(`Failed to generate ${path.basename(out)}:`, err.message);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("\nAll images generated successfully.");
