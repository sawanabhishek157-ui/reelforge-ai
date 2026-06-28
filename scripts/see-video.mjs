/**
 * see-video — let the agent "watch" a rendered reel via Gemini.
 *
 * Downscales the clip (drops audio) so it fits Gemini's inline request limit,
 * then asks Gemini to describe the motion and critique the depth/parallax effect.
 *
 * Run: node --env-file=.env scripts/see-video.mjs <video.mp4> ["custom prompt"]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const videoPath = process.argv[2];
if (!videoPath || !fs.existsSync(videoPath)) {
  console.error("Usage: node --env-file=.env scripts/see-video.mjs <video.mp4> [prompt]");
  process.exit(1);
}

const DEFAULT_PROMPT =
  "This is a short vertical video built from still photos with an attempted 2.5D depth/parallax effect. " +
  "1) Describe the camera motion you actually see. " +
  "2) Rate the DEPTH/PARALLAX POP from 0 to 10, where 0 = totally flat (looks like a plain zoom/pan on a flat photo) and 10 = strong fake-3D where the foreground clearly separates and slides against the background as the camera moves. " +
  "3) Does it look like the camera moves THROUGH a 3D scene, or just a 2D zoom? " +
  "4) Note any warping, smearing, or distortion artifacts. " +
  "Be concise and critical — I'm trying to make the 3D effect stronger.";
const prompt = process.argv[3] || DEFAULT_PROMPT;

// 1. Downscale + strip audio so the inline payload stays small (<~18MB)
const small = path.join(os.tmpdir(), `see-${Date.now()}.mp4`);
console.log("Downscaling for analysis...");
execFileSync(
  "ffmpeg",
  ["-y", "-i", videoPath, "-vf", "scale=720:-2", "-an", "-crf", "26", "-preset", "veryfast", small],
  { stdio: ["ignore", "ignore", "ignore"] },
);
const bytes = fs.statSync(small).size;
console.log(`Analysis clip: ${(bytes / 1e6).toFixed(1)} MB`);
const b64 = fs.readFileSync(small).toString("base64");
fs.unlinkSync(small);

// 2. Ask Gemini (try a few model ids for resilience)
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}
const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-pro"];
const body = {
  contents: [
    { parts: [{ inline_data: { mime_type: "video/mp4", data: b64 } }, { text: prompt }] },
  ],
};

let answered = false;
for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.log(`  (${model} -> ${res.status}; ${txt.slice(0, 120)})`);
    continue;
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (text) {
    console.log(`\n===== Gemini (${model}) =====\n${text}\n`);
    answered = true;
    break;
  }
}
if (!answered) {
  console.error("No model returned a usable response.");
  process.exit(1);
}
