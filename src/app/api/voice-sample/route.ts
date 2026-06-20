import fs from "node:fs";
import path from "node:path";

import { generateVoiceover, VOICES } from "@/lib/tts";
import { ensureDir, PUBLIC_DIR, toPublicUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 30;

const SAMPLE_DIR = path.join(PUBLIC_DIR, "voice-samples");

// Short language-appropriate sample so we don't burn ElevenLabs quota
function sampleText(voiceId: string, name: string) {
  if (voiceId.startsWith("hi-IN")) return `नमस्ते, मेरा नाम ${name} है। आपकी कहानी सुनने को मिले।`;
  if (voiceId.startsWith("en-IN")) return `Hello, my name is ${name}. Listen to your story.`;
  return `Hi, I am ${name}. Listen to your story come alive.`;
}

/**
 * GET /api/voice-sample?id=<voiceId>
 *
 * Returns a short cached MP3 sample of the requested voice.
 * Generates once per voice and serves from disk thereafter.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get("id");
    if (!voiceId) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const voice = VOICES.find((v) => v.id === voiceId);
    if (!voice) {
      return Response.json({ error: "Unknown voice" }, { status: 404 });
    }

    ensureDir(SAMPLE_DIR);
    const fileName = `${voiceId.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp3`;
    const outPath = path.join(SAMPLE_DIR, fileName);

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
      await generateVoiceover(sampleText(voiceId, voice.name), outPath, voiceId);
    }

    return Response.json({ url: toPublicUrl(outPath) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "sample failed";
    console.error("[voice-sample]", e);
    return Response.json({ error: message }, { status: 500 });
  }
}
