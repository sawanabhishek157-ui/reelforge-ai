import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";

import type { EdgeChunk, SpeechPlan } from "./speech-plan";
import {
  planToEdgeChunks,
  planToElevenLabsScript,
} from "./speech-plan";
import { transliterateToDevanagari } from "./translit";

/**
 * Dual-provider TTS:
 *  - ElevenLabs  → premium English voices  (~10 k chars/month free)
 *  - Edge TTS    → Microsoft Azure neural voices, FULLY FREE, no API key.
 *                  Used for Hindi (hi-IN) + bonus extra languages.
 */

type Provider = "elevenlabs" | "edge" | "local";

type VoiceDef = {
  id: string;
  name: string;
  label: string;
  style: string;
  lang: "en" | "hi";
  provider: Provider;
  /** local-provider only: which engine + speaker on the local TTS service. */
  engine?: "kokoro" | "parler";
  speaker?: string;
  /** parler only: free-text voice description (tone). */
  description?: string;
};

const LOCAL_TTS_URL = process.env.TTS_SERVICE_URL ?? "http://localhost:8100";

export const VOICES: VoiceDef[] = [
  // ── Hindi (FREE — Microsoft Edge TTS) ────────────────────────
  {
    id: "hi-IN-SwaraNeural",
    name: "Swara",
    label: "Swara — Hindi female (FREE)",
    style: "Warm, native Hindi",
    lang: "hi",
    provider: "edge",
  },
  {
    id: "hi-IN-MadhurNeural",
    name: "Madhur",
    label: "Madhur — Hindi male (FREE)",
    style: "Friendly, native Hindi",
    lang: "hi",
    provider: "edge",
  },
  // ── Indian English (FREE — Microsoft Edge TTS) ───────────────
  {
    id: "en-IN-NeerjaNeural",
    name: "Neerja",
    label: "Neerja — Indian English female (FREE)",
    style: "Clear, professional",
    lang: "en",
    provider: "edge",
  },
  {
    id: "en-IN-PrabhatNeural",
    name: "Prabhat",
    label: "Prabhat — Indian English male (FREE)",
    style: "Confident, narrator",
    lang: "en",
    provider: "edge",
  },
  // ── ElevenLabs (best quality English, uses your free monthly quota) ─
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    label: "Sarah — soft English female (ElevenLabs)",
    style: "Soft",
    lang: "en",
    provider: "elevenlabs",
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    label: "Rachel — calm English female (ElevenLabs)",
    style: "Calm",
    lang: "en",
    provider: "elevenlabs",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    label: "Antoni — warm English male (ElevenLabs)",
    style: "Warm",
    lang: "en",
    provider: "elevenlabs",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    label: "Arnold — deep English male (ElevenLabs)",
    style: "Deep",
    lang: "en",
    provider: "elevenlabs",
  },
  // ── Local free engines (Kokoro / Parler) via the local TTS service ──
  {
    id: "parler-mystic-f",
    name: "Veda",
    label: "Veda — deep mysterious Hindi female (FREE, local Parler)",
    style: "Deep, mysterious, mystical",
    lang: "hi",
    provider: "local",
    engine: "parler",
    speaker: "Divya",
    description:
      "Divya speaks in a deep, slow and mysterious voice with a calm, mystical tone. " +
      "Very clear, intimate and close, with a quiet, slightly reverberant atmosphere.",
  },
  {
    id: "parler-mystic-m",
    name: "Rohit",
    label: "Rohit — deep mysterious Hindi male (FREE, local Parler)",
    style: "Deep, mysterious",
    lang: "hi",
    provider: "local",
    engine: "parler",
    speaker: "Rohit",
    description:
      "Rohit speaks in a deep, slow and mysterious voice with a calm, mystical tone. " +
      "Very clear, intimate and close, with a quiet, slightly reverberant atmosphere.",
  },
  {
    id: "kokoro-f",
    name: "Priya",
    label: "Priya — natural Hindi female (FREE, local Kokoro)",
    style: "Clean, human, natural",
    lang: "hi",
    provider: "local",
    engine: "kokoro",
    speaker: "hf_beta",
  },
  {
    id: "kokoro-m",
    name: "Arjun",
    label: "Arjun — natural Hindi male (FREE, local Kokoro)",
    style: "Clean, human, natural",
    lang: "hi",
    provider: "local",
    engine: "kokoro",
    speaker: "hm_psi",
  },
];

const DEFAULT_VOICE_ID = "hi-IN-SwaraNeural";

export type VoiceId = string;
export type VoiceName = VoiceId; // back-compat alias

export type GenerateVoiceoverOpts = {
  /**
   * When true (default for `lang === "hi"` voices), romanized Hinglish text is
   * transliterated to Devanagari before being sent to Edge TTS.
   * Set to false to disable transliteration explicitly.
   */
  transliterate?: boolean;
};

export async function generateVoiceover(
  text: string,
  outFilePath: string,
  voice: VoiceId = DEFAULT_VOICE_ID,
  plan?: SpeechPlan | null,
  opts?: GenerateVoiceoverOpts,
) {
  const def =
    VOICES.find((v) => v.id === voice) ?? VOICES.find((v) => v.id === DEFAULT_VOICE_ID)!;

  // Transliterate romanized Hinglish → Devanagari for Hindi Edge TTS voices.
  // One API call covers the whole script; the result is used for both the plain
  // and plan-driven Edge TTS paths.
  const shouldTranslit = opts?.transliterate ?? def.lang === "hi";

  if (def.provider === "local") {
    // Local engines need native Devanagari (their own transliterator is disabled).
    const resolvedText = shouldTranslit ? await transliterateToDevanagari(text) : text;
    await localTts(resolvedText, outFilePath, def);
    return outFilePath;
  }

  if (def.provider === "edge") {
    if (plan) {
      const resolvedPlan = shouldTranslit
        ? await transliteratePlan(plan)
        : plan;
      await edgeTtsPlan(resolvedPlan, outFilePath, def.id);
    } else {
      const resolvedText = shouldTranslit
        ? await transliterateToDevanagari(text)
        : text;
      await edgeTts(resolvedText, outFilePath, def.id);
    }
  } else {
    const scripted = plan ? planToElevenLabsScript(plan) : text;
    await elevenLabsTts(scripted, outFilePath, def.id, plan ? "v3" : "multilingual");
  }
  return outFilePath;
}

/**
 * Local free TTS (Kokoro / Parler) via the on-machine service. Returns WAV;
 * we transcode to MP3 at outFilePath. The script must already be Devanagari.
 */
async function localTts(text: string, outFilePath: string, def: VoiceDef): Promise<void> {
  const body = {
    engine: def.engine ?? "kokoro",
    text,
    speaker: def.speaker,
    description: def.description,
  };
  const res = await fetch(`${LOCAL_TTS_URL}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) {
    throw new Error(`local TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const wav = Buffer.from(await res.arrayBuffer());
  const tmp = path.join(os.tmpdir(), `local-tts-${Date.now()}.wav`);
  fs.writeFileSync(tmp, wav);
  try {
    execFileSync("ffmpeg", ["-y", "-i", tmp, "-c:a", "libmp3lame", "-b:a", "128k", outFilePath], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } finally {
    fs.unlinkSync(tmp);
  }
}

/**
 * Transliterate all sentence texts in a SpeechPlan to Devanagari in one
 * batch call (joining them, converting, then splitting back by newline).
 * This keeps the API calls at O(1) regardless of sentence count.
 */
async function transliteratePlan(plan: SpeechPlan): Promise<SpeechPlan> {
  // Join sentences with a unique delimiter unlikely to appear in scripts.
  const DELIM = "\n||||\n";
  const joined = plan.sentences.map((s) => s.text).join(DELIM);
  const converted = await transliterateToDevanagari(joined);
  const parts = converted.split(DELIM);

  return {
    ...plan,
    sentences: plan.sentences.map((s, i) => ({
      ...s,
      text: parts[i]?.trim() ?? s.text,
    })),
  };
}

// ──────────────────────────────────────────────────────────────────
// ElevenLabs implementation
// ──────────────────────────────────────────────────────────────────
async function elevenLabsTts(
  text: string,
  outFilePath: string,
  voiceId: string,
  mode: "v3" | "multilingual" = "multilingual",
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Add it to .env.local, or pick a Hindi/Edge TTS voice (no key needed).",
    );
  }

  // v3 supports audio tags [excited], [whispers], [pause 300ms] etc.
  // Use Creative stability so the model reacts strongly to tags.
  const isV3 = mode === "v3";
  const body = isV3
    ? {
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: 0.3, // Creative — required for expressive tags
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }
    : {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed: ${res.status} ${res.statusText} — ${bodyText.slice(0, 300)}`,
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
  fs.writeFileSync(outFilePath, buf);
}

// ──────────────────────────────────────────────────────────────────
// Microsoft Edge TTS — per-sentence render driven by Speech Plan
// Each sentence gets its own rate/pitch from the plan. Renders are
// then concatenated with ffmpeg, with silent pads between for pauses.
// ──────────────────────────────────────────────────────────────────
async function edgeTtsPlan(
  plan: SpeechPlan,
  outFilePath: string,
  voiceId: string,
) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const chunks = planToEdgeChunks(plan);

  const tmpDir = path.dirname(outFilePath);
  fs.mkdirSync(tmpDir, { recursive: true });

  const partFiles: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const c: EdgeChunk = chunks[i];
    const partPath = path.join(tmpDir, `.edge-part-${Date.now()}-${i}.mp3`);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    await new Promise<void>((resolve, reject) => {
      const result = tts.toStream(c.text, { rate: c.rate, pitch: c.pitch });
      const stream = (result as unknown as { audioStream: NodeJS.ReadableStream })
        .audioStream;
      const out = fs.createWriteStream(partPath);
      stream.on("data", (chunk: Buffer) => out.write(chunk));
      stream.on("end", () => {
        out.end();
        resolve();
      });
      stream.on("error", reject);
      out.on("error", reject);
    });
    partFiles.push(partPath);

    // Silent pad for pauses between sentences
    if (c.pauseAfterMs > 80) {
      const padPath = path.join(tmpDir, `.edge-pad-${Date.now()}-${i}.mp3`);
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        `anullsrc=channel_layout=mono:sample_rate=24000`,
        "-t",
        (c.pauseAfterMs / 1000).toFixed(3),
        "-c:a",
        "libmp3lame",
        "-b:a",
        "48k",
        padPath,
      ]);
      partFiles.push(padPath);
    }
  }

  // Concat all parts via ffmpeg
  const manifest = path.join(tmpDir, `.edge-list-${Date.now()}.txt`);
  fs.writeFileSync(manifest, partFiles.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    manifest,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outFilePath,
  ]);

  // Clean up part files + manifest
  for (const p of partFiles) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
  try {
    fs.unlinkSync(manifest);
  } catch {}
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-800)}`));
    });
  });
}

// ──────────────────────────────────────────────────────────────────
// Microsoft Edge TTS — plain (no plan)
// ──────────────────────────────────────────────────────────────────
async function edgeTts(text: string, outFilePath: string, voiceId: string) {
  // dynamic import keeps the dep tree clean
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  fs.mkdirSync(path.dirname(outFilePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const result = tts.toStream(text);
    const stream = (result as unknown as { audioStream: NodeJS.ReadableStream })
      .audioStream;
    const out = fs.createWriteStream(outFilePath);
    stream.on("data", (chunk: Buffer) => out.write(chunk));
    stream.on("end", () => {
      out.end();
      resolve();
    });
    stream.on("error", reject);
    out.on("error", reject);
  });
}

// ──────────────────────────────────────────────────────────────────
export async function audioDurationSec(filePath: string): Promise<number> {
  const { execFileSync } = await import("node:child_process");
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { encoding: "utf8" },
    );
    return parseFloat(out.trim());
  } catch {
    return 0;
  }
}
