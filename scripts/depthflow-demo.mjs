/**
 * DepthFlow parallax demo.
 * For each of the 5 voice-ab demo images, generates a parallax MP4 clip
 * via DepthFlow, then renders the full Remotion composition.
 *
 * Run: node --env-file=.env scripts/depthflow-demo.mjs
 * Out: public/voice-ab-demo/demo-depthflow.mp4
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";

// ---- paths ----------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OUT_DIR = path.join(ROOT, "public", "voice-ab-demo");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VOICEOVER = "/voice-ab/hinglish-2-edge-deva.mp3";
const voiceAbs = path.join(ROOT, "public" + VOICEOVER);
if (!fs.existsSync(voiceAbs)) {
  console.error(`Missing voiceover ${voiceAbs} — run scripts/voice-ab.mjs first.`);
  process.exit(1);
}

const captions = [
  "Kya astrologers sach mein aapke soulmate ke baare mein bata sakte hain?",
  "Ya phir ye sab sirf random guessing hai?",
  "Astrology aapke soulmate ka naam ya photo nahi batati.",
  "Lekin ye reveal kar sakti hai ki aap kis type ke person ki taraf attract honge.",
  "Follow SoulStarr.",
];

const N = captions.length;

// ---- 1. voiceover duration ------------------------------------------------

const durOut = execFileSync(
  "ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", voiceAbs],
  { encoding: "utf8" },
);
const durationSec = Math.max(1, parseFloat(durOut.trim()));
console.log(`Voiceover duration: ${durationSec.toFixed(2)}s`);

// ---- 2. verify images & depth maps ----------------------------------------

for (let i = 0; i < N; i++) {
  const imageAbs = path.join(OUT_DIR, `img-${i}.jpg`);
  const depthAbs = path.join(OUT_DIR, `img-${i}.depth.png`);

  if (!fs.existsSync(imageAbs)) {
    console.error(`Missing image: ${imageAbs}`);
    process.exit(1);
  }
  if (!fs.existsSync(depthAbs)) {
    console.error(`Missing depth map: ${depthAbs} — generate it first.`);
    process.exit(1);
  }
  console.log(`img-${i}: image + depth map OK`);
}

// ---- 3. generate parallax clips via depthflow CLI -------------------------

// Drive DepthFlow via its Python API (the CLI can't animate the camera — it
// renders a static frame; the strong parallax sweep lives in df_scene.py).
const DEPTHFLOW_PY = path.join(
  os.homedir(), ".local", "share", "uv", "tools", "depthflow", "bin", "python",
);
const SCENE_SCRIPT = path.join(__dirname, "df_scene.py");
const dfEnv = {
  ...process.env,
  PATH: `${path.join(os.homedir(), ".local", "bin")}:${process.env.PATH ?? ""}`,
};

const per = durationSec / N;
const sceneDurations = Array.from({ length: N }, (_, i) => {
  const start = +(i * per).toFixed(3);
  const end = +((i + 1) * per).toFixed(3);
  return { start, end, dur: +(end - start).toFixed(3) };
});

const clipUrls = [];

for (let i = 0; i < N; i++) {
  const imageAbs = path.join(OUT_DIR, `img-${i}.jpg`);
  const depthAbs = path.join(OUT_DIR, `img-${i}.depth.png`);
  const clipFile = `clip-${i}.mp4`;
  const outAbs = path.join(OUT_DIR, clipFile);
  const dur = sceneDurations[i].dur;

  // Cache: skip if output is newer than source.
  if (fs.existsSync(outAbs) && fs.statSync(outAbs).mtimeMs >= fs.statSync(imageAbs).mtimeMs) {
    console.log(`clip-${i}.mp4 cached, skipping.`);
    clipUrls.push(`/voice-ab-demo/${clipFile}`);
    continue;
  }

  console.log(`Generating clip-${i}.mp4 (${dur.toFixed(2)}s)...`);

  // Resolve symlinks so depthflow gets the real absolute paths.
  const realImage = fs.realpathSync(imageAbs);
  const realDepth = fs.realpathSync(depthAbs);

  // Vary the parallax motion style per scene (parallax only; Ken Burns zoom is
  // applied on top in Remotion). Inpaint off — it worsens edge morphing.
  const styles = ["zoomdrift", "orbit", "dolly", "vertical", "zoomdrift"];

  execFileSync(
    DEPTHFLOW_PY,
    [
      SCENE_SCRIPT,
      "input",
      "-i", realImage,
      "-d", realDepth,
      "main",
      "-o", outAbs,
      "-t", String(dur),
      "-f", "30",
      "-w", "1080",
      "-h", "1920",
      "--no-turbo",
    ],
    {
      env: {
        ...dfEnv,
        DF_AMP: "0.3",
        DF_HEIGHT: "0.35",
        DF_INPAINT: "0.0",
        DF_STYLE: styles[i % styles.length],
        DF_PHASE: String((i * 1.3).toFixed(2)),
      },
      stdio: "inherit",
    },
  );

  console.log(`clip-${i}.mp4 ready.`);
  clipUrls.push(`/voice-ab-demo/${clipFile}`);
}

// ---- 4. build Plan -------------------------------------------------------

const scenes = captions.map((caption, i) => ({
  startSec: sceneDurations[i].start,
  endSec: sceneDurations[i].end,
  imageUrl: `/voice-ab-demo/img-${i}.jpg`,
  clipUrl: clipUrls[i],
  caption,
  motion: "zoom-in",
}));

const plan = {
  durationSec: Math.ceil(durationSec),
  voiceoverUrl: VOICEOVER,
  width: 1080,
  height: 1920,
  scenes,
};

const dataDir = path.join(ROOT, "data");
fs.mkdirSync(dataDir, { recursive: true });
const propsPath = path.join(dataDir, "depthflow-props.json");
fs.writeFileSync(propsPath, JSON.stringify({ plan }, null, 2));
console.log(`Props written to ${propsPath}`);

// ---- 5. render via Remotion ----------------------------------------------

const outFile = path.join(OUT_DIR, "demo-depthflow.mp4");
console.log("Rendering via Remotion (this may take a few minutes)...");

await new Promise((resolve, reject) => {
  const child = spawn(
    "npx",
    [
      "--yes",
      "remotion",
      "render",
      "src/remotion/index.ts",
      "Reel",
      outFile,
      `--props=${propsPath}`,
      "--codec=h264",
      "--log=info",
    ],
    { stdio: ["ignore", "inherit", "inherit"], env: process.env, cwd: ROOT },
  );
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`remotion render exited ${code}`)),
  );
});

console.log(`\nDone. Output: ${outFile}`);
