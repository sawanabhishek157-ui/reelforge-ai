import fs from "node:fs";
import path from "node:path";

/**
 * ElevenLabs TTS — uses the free 10,000 chars/month tier.
 * No SDK; just a fetch call to keep deps light.
 */

export const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", label: "Rachel — calm female", style: "Calm" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", label: "Domi — confident female", style: "Confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", label: "Sarah — soft female", style: "Soft" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", label: "Elli — young female", style: "Young" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", label: "Antoni — warm male", style: "Warm" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", label: "Drew — clear male", style: "Clear" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", label: "Arnold — deep male", style: "Deep" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", label: "Charlie — natural male", style: "Natural" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"] | string;

const DEFAULT_VOICE_ID: VoiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah

const ENDPOINT = (voiceId: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

export async function generateVoiceover(
  text: string,
  outFilePath: string,
  voice: VoiceId = DEFAULT_VOICE_ID,
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Add it to .env.local (see https://elevenlabs.io/app/settings/api-keys).",
    );
  }

  const voiceId = VOICES.find((v) => v.id === voice)?.id ?? DEFAULT_VOICE_ID;

  const res = await fetch(ENDPOINT(voiceId), {
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
  return outFilePath;
}

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

/** Back-compat alias for the type the generate route imports. */
export type VoiceName = VoiceId;
