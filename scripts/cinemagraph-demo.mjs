/**
 * Cinemagraph demo — renders two classic cinemagraph scenes (water ripple, sky
 * drift) on the generated lake image. Throwaway.
 *
 * Prereqs (already generated): public/cine-demo/lake.png + lake.{sky,water}.mask.png
 *   node --env-file=.env scripts/gen-image.mjs "<lake prompt>" public/cine-demo/lake.png 1088 1920
 *   node scripts/gen-mask.mjs <lake.png> public/cine-demo/lake.sky.mask.png sky
 *   node scripts/gen-mask.mjs <lake.png> public/cine-demo/lake.water.mask.png water
 *
 * Run: node scripts/cinemagraph-demo.mjs
 * Out: public/cine-demo/cinemagraph.mp4
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "cine-demo");

const plan = {
  durationSec: 10,
  voiceoverUrl: "",
  width: 1080,
  height: 1920,
  scenes: [
    {
      startSec: 0,
      endSec: 5,
      imageUrl: "/cine-demo/lake.png",
      caption: "Some things never stay still.",
      motion: "zoom-in",
      cinemagraph: { maskUrl: "/cine-demo/lake.water.mask.png", region: "water", mode: "classic" },
    },
    {
      startSec: 5,
      endSec: 10,
      imageUrl: "/cine-demo/lake.png",
      caption: "The sky keeps moving.",
      motion: "zoom-in",
      cinemagraph: { maskUrl: "/cine-demo/lake.sky.mask.png", region: "sky", mode: "classic" },
    },
  ],
};

const dataDir = path.join(ROOT, "data");
fs.mkdirSync(dataDir, { recursive: true });
const propsPath = path.join(dataDir, "cine-props.json");
fs.writeFileSync(propsPath, JSON.stringify({ plan }, null, 2));

const outFile = path.join(OUT, "cinemagraph.mp4");
console.log("Rendering cinemagraph demo...");
await new Promise((resolve, reject) => {
  const child = spawn(
    "npx",
    ["--yes", "remotion", "render", "src/remotion/index.ts", "Reel", outFile, `--props=${propsPath}`, "--codec=h264", "--log=info"],
    { stdio: ["ignore", "inherit", "inherit"], env: process.env, cwd: ROOT },
  );
  child.on("error", reject);
  child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`remotion exited ${code}`))));
});
console.log(`\nDone: ${outFile}`);
