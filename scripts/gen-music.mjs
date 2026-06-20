/**
 * Generate all 7 AI mood tracks for ReelForge via Segmind Meta MusicGen Medium.
 *
 * Usage:
 *   node --env-file=.env scripts/gen-music.mjs
 *
 * Requires:
 *   - SEGMIND_API_KEY in .env (or environment)
 *   - ffmpeg on PATH (for WAV → MP3 transcoding and duration probing)
 *
 * Each track is ~30 s, instrumental only. Output: public/music/<id>.mp3
 */

import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { statSync } from "node:fs";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = resolve(__dirname, "../public/music");
const ENDPOINT = "https://api.segmind.com/v1/meta-musicgen-medium";
const DURATION_SEC = 30;

/** Mood definitions — prompts are tuned for instrumental, loopable tracks */
const MOODS = [
  {
    id: "mysterious",
    prompt:
      "dark cosmic ambient, esoteric, suspenseful, ethereal pads, deep bass drones, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "romantic",
    prompt:
      "warm soft intimate piano, gentle romantic strings, tender, emotional, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "exciting",
    prompt:
      "upbeat energetic electronic, driving beat, motivational, euphoric synths, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "calm",
    prompt:
      "peaceful meditative ambient, soft nature sounds, gentle piano, mindful, tranquil, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "dramatic",
    prompt:
      "cinematic dramatic orchestral, tension build, sweeping strings, powerful, storytelling, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "uplifting",
    prompt:
      "bright positive acoustic guitar and piano, hopeful, inspiring, affirmations, growth, instrumental, no vocals, loopable, 30 seconds",
  },
  {
    id: "epic",
    prompt:
      "epic orchestral swell, destiny, transformation, grand brass and strings, triumphant, instrumental, no vocals, loopable, 30 seconds",
  },
];

async function generateTrack(mood, apiKey) {
  console.log(`\n[${mood.id}] Requesting from Segmind...`);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: mood.prompt,
      duration: DURATION_SEC,
      seed: 42,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Segmind API error ${response.status} for "${mood.id}": ${errorText.slice(0, 300)}`,
    );
  }

  const wavBytes = new Uint8Array(await response.arrayBuffer());
  console.log(`[${mood.id}] Received ${wavBytes.byteLength} bytes (WAV)`);

  const tmpWav = join(tmpdir(), `reelforge-${mood.id}-${Date.now()}.wav`);
  await writeFile(tmpWav, wavBytes);

  const outMp3 = join(MUSIC_DIR, `${mood.id}.mp3`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      tmpWav,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outMp3,
    ]);
  } finally {
    await unlink(tmpWav).catch(() => undefined);
  }

  return outMp3;
}

async function probeDuration(mp3Path) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      mp3Path,
    ]);
    return parseFloat(stdout.trim());
  } catch {
    return null;
  }
}

async function main() {
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: SEGMIND_API_KEY not set. Run: node --env-file=.env scripts/gen-music.mjs",
    );
    process.exit(1);
  }

  console.log(`Generating ${MOODS.length} mood tracks → ${MUSIC_DIR}`);
  console.log("Model: meta-musicgen-medium @ Segmind");
  console.log("Duration: 30s per track\n");

  const results = [];

  for (const mood of MOODS) {
    try {
      const mp3Path = await generateTrack(mood, apiKey);
      const duration = await probeDuration(mp3Path);
      const sizeKb = Math.round(statSync(mp3Path).size / 1024);
      const durStr = duration != null ? `${duration.toFixed(1)}s` : "unknown";
      console.log(`[${mood.id}] OK — ${durStr}, ${sizeKb} KB`);
      results.push({ id: mood.id, duration, sizeKb, ok: true });
    } catch (err) {
      console.error(`[${mood.id}] FAILED: ${err.message}`);
      results.push({ id: mood.id, ok: false, error: err.message });
    }
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    if (r.ok) {
      console.log(`  ${r.id}: ${r.duration?.toFixed(1)}s, ${r.sizeKb} KB`);
    } else {
      console.log(`  ${r.id}: FAILED — ${r.error}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} track(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll tracks generated successfully.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
