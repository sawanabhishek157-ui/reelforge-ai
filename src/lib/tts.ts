import fs from "node:fs";
import path from "node:path";

/**
 * Dual-provider TTS:
 *  - ElevenLabs  → premium English voices  (~10 k chars/month free)
 *  - Edge TTS    → Microsoft Azure neural voices, FULLY FREE, no API key.
 *                  Used for Hindi (hi-IN) + bonus extra languages.
 */

type Provider = "elevenlabs" | "edge";

type VoiceDef = {
  id: string;
  name: string;
  label: string;
  style: string;
  lang: "en" | "hi";
  provider: Provider;
};

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
];

const DEFAULT_VOICE_ID = "hi-IN-SwaraNeural";

export type VoiceId = string;
export type VoiceName = VoiceId; // back-compat alias

export async function generateVoiceover(
  text: string,
  outFilePath: string,
  voice: VoiceId = DEFAULT_VOICE_ID,
) {
  const def =
    VOICES.find((v) => v.id === voice) ?? VOICES.find((v) => v.id === DEFAULT_VOICE_ID)!;

  if (def.provider === "edge") {
    await edgeTts(text, outFilePath, def.id);
  } else {
    await elevenLabsTts(text, outFilePath, def.id);
  }
  return outFilePath;
}

// ──────────────────────────────────────────────────────────────────
// ElevenLabs implementation
// ──────────────────────────────────────────────────────────────────
async function elevenLabsTts(text: string, outFilePath: string, voiceId: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Add it to .env.local, or pick a Hindi/Edge TTS voice (no key needed).",
    );
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
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
// Microsoft Edge TTS implementation (free, no key)
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
