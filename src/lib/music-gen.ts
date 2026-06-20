/**
 * AI music generation via Segmind Meta MusicGen Medium.
 *
 * Endpoint: POST https://api.segmind.com/v1/meta-musicgen-medium
 * Auth:     x-api-key header from SEGMIND_API_KEY env var
 * Response: raw WAV audio bytes (Content-Type: audio/wav)
 *
 * The WAV is transcoded to MP3 (libmp3lame, 128k) via ffmpeg before saving,
 * because the rest of the pipeline expects mp3 files in public/music/.
 */

import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SEGMIND_ENDPOINT = "https://api.segmind.com/v1/meta-musicgen-medium";
const DEFAULT_DURATION_SEC = 30;

export interface MusicGenOptions {
  durationSec?: number;
  seed?: number;
}

/**
 * Generate a music track with Segmind MusicGen and save it as an MP3.
 *
 * @param prompt   Text description of the desired music.
 * @param outAbs   Absolute path to write the resulting mp3 file.
 * @param opts     Optional: durationSec (1-30, default 30), seed.
 * @returns        The absolute path that was written (same as outAbs).
 */
export async function generateMusicTrack(
  prompt: string,
  outAbs: string,
  opts: MusicGenOptions = {},
): Promise<string> {
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SEGMIND_API_KEY is not set. Run with node --env-file=.env or set it in your environment.",
    );
  }

  const durationSec = opts.durationSec ?? DEFAULT_DURATION_SEC;
  const seed = opts.seed ?? 42;

  const response = await fetch(SEGMIND_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, duration: durationSec, seed }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Segmind API error ${response.status}: ${errorText.slice(0, 300)}`,
    );
  }

  const wavBytes = new Uint8Array(await response.arrayBuffer());

  // Segmind returns WAV — transcode to mp3 via ffmpeg
  const tmpWav = join(tmpdir(), `reelforge-music-${Date.now()}.wav`);
  await writeFile(tmpWav, wavBytes);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      tmpWav,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outAbs,
    ]);
  } finally {
    await unlink(tmpWav).catch(() => undefined);
  }

  return outAbs;
}
