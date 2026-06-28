/**
 * ElevenLabs Hinglish voice samples (realistic option) — adds to voice-options page.
 * Run: node --env-file=.env scripts/eleven-sample.mjs
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/voice-options");
fs.mkdirSync(OUT, { recursive: true });
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

// Devanagari for natural Hindi pronunciation (English brand words kept in Latin).
const TEXT =
  "क्या तुमने कभी सोचा है... तुम्हारा soulmate अभी कहाँ है, क्या कर रहा है, और कौनसी राशि का है? " +
  "शायद वो भी उसी चाँद को देख रहा है जो तुम देख रहे हो। जानना चाहते हो? तो Follow SoulStarr.";

// A few multilingual-capable ElevenLabs voices.
const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni-male" },
];

for (const v of VOICES) {
  process.stdout.write(`elevenlabs ${v.name} ... `);
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: TEXT,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 150)}`);
    fs.writeFileSync(path.join(OUT, `eleven-${v.name}.mp3`), Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  } catch (e) { console.log("FAIL", e.message); }
}
console.log("done -> public/voice-options/ (rebuild index or open files directly)");
