/**
 * Free-TTS engine bake-off — generate the SAME SoulStarr Hinglish line through
 * each local open-source engine, as a "mysterious male" and a "warm female"
 * target, so the winner can be picked by ear (like the ElevenLabs A/B).
 *
 * Requires the local TTS service running:
 *   cd scripts/tts-service && uv run uvicorn app:app --port 8100
 * Then:
 *   node scripts/voice-bakeoff.mjs
 *   open http://localhost:3000/voice-options-v2/index.html
 *
 * Contract (POST http://localhost:8100/tts, JSON):
 *   { engine, text, speaker?, description?, ref_audio?, ref_text? } -> audio/wav
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SERVICE = process.env.TTS_SERVICE_URL ?? "http://localhost:8100";
const OUT = path.resolve("public/voice-options-v2");
fs.mkdirSync(OUT, { recursive: true });

// Real SoulStarr (Hinglish astrology) line, in Devanagari with English brand
// words kept in Latin. The Hindi engines need native script — the fairseq-based
// romanizer is broken on Py3.12, so the real pipeline will emit Devanagari
// Hinglish directly from the script-writer (Claude) instead of transliterating.
const SCRIPT =
  "क्या तुमने कभी सोचा है... तुम्हारा soulmate अभी कहाँ है, क्या कर रहा है, और कौन-सी राशि का है? " +
  "शायद वो भी उसी चाँद को देख रहा है जो तुम देख रहे हो। अगर जानना चाहते हो, तो Follow SoulStarr।";

// Two brand targets per engine. Parler takes a free-text voice description;
// Kokoro/IndicF5 ignore `description` and use `speaker`/reference instead.
// Voice-description templates for Parler (tone via plain text).
const desc = {
  mysterious: (n) =>
    `${n} speaks in a deep, slow and mysterious voice with a calm, mystical tone. ` +
    `The audio is very clear, intimate and close, with a quiet, slightly reverberant atmosphere.`,
  warm: (n) =>
    `${n} speaks in a warm, friendly and gentle voice at a measured, soothing pace. ` +
    `The audio is very clear, intimate and close, in a quiet environment.`,
  energetic: (n) =>
    `${n} speaks in an energetic, confident and bright voice at a lively pace, with expressive, ` +
    `upbeat delivery. The audio is very clear.`,
};

// Phrase-level plan for Kokoro DYNAMIC clips — varies pace + inserts pauses so
// the delivery feels alive even though Kokoro has no emotion knob.
const PHRASE_PLAN = [
  { text: "क्या तुमने कभी सोचा है...", speed: 0.84, pauseMs: 420 },
  { text: "तुम्हारा soulmate अभी कहाँ है, क्या कर रहा है, और कौन-सी राशि का है?", speed: 1.0, pauseMs: 300 },
  { text: "शायद वो भी उसी चाँद को देख रहा है जो तुम देख रहे हो।", speed: 0.9, pauseMs: 360 },
  { text: "अगर जानना चाहते हो, तो Follow SoulStarr।", speed: 1.06, pauseMs: 0 },
];

const TARGETS = [
  // --- Parler: multiple MALE voices (Parler male sounded bad — try several) ---
  { engine: "parler", label: "male-Rohit-mysterious", speaker: "Rohit", description: desc.mysterious("Rohit") },
  { engine: "parler", label: "male-Aman-mysterious", speaker: "Aman", description: desc.mysterious("Aman") },
  { engine: "parler", label: "male-Karan-mysterious", speaker: "Karan", description: desc.mysterious("Karan") },
  // --- Parler: multiple FEMALE voices (you liked Parler female) ---
  { engine: "parler", label: "female-Divya-warm", speaker: "Divya", description: desc.warm("Divya") },
  { engine: "parler", label: "female-Rani-warm", speaker: "Rani", description: desc.warm("Rani") },
  { engine: "parler", label: "female-Maya-warm", speaker: "Maya", description: desc.warm("Maya") },
  // --- Parler: tone range demo (same voice, different mood) ---
  { engine: "parler", label: "male-Rohit-energetic", speaker: "Rohit", description: desc.energetic("Rohit") },
  { engine: "parler", label: "female-Divya-energetic", speaker: "Divya", description: desc.energetic("Divya") },
  // --- Kokoro: all 4 Hindi voices, flat (most human, your favourite) ---
  { engine: "kokoro", label: "male-psi", speaker: "hm_psi" },
  { engine: "kokoro", label: "male-omega", speaker: "hm_omega" },
  { engine: "kokoro", label: "female-beta", speaker: "hf_beta" },
  { engine: "kokoro", label: "female-alpha", speaker: "hf_alpha" },
  // --- Kokoro: DYNAMIC pacing + pauses (emotion-on-Kokoro demo) ---
  { engine: "kokoro", label: "male-psi-DYNAMIC-pace", speaker: "hm_psi", dynamic: true },
  { engine: "kokoro", label: "female-beta-DYNAMIC-pace", speaker: "hf_beta", dynamic: true },
]
  // Filter to engines that are actually Hindi-ready. Parler needs the gated
  // indic-parler-tts (HF token); until then run `BAKEOFF_ENGINES=kokoro`.
  .filter((t) => {
    const only = process.env.BAKEOFF_ENGINES;
    return !only || only.split(",").map((s) => s.trim()).includes(t.engine);
  });

async function synth(target) {
  const res = await fetch(`${SERVICE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: SCRIPT, ...target }),
  });
  if (!res.ok) {
    throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function toMp3(wavBuf, outAbs) {
  const tmp = path.join(os.tmpdir(), `bakeoff-${Date.now()}-${Math.round(performance.now())}.wav`);
  fs.writeFileSync(tmp, wavBuf);
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-c:a", "libmp3lame", "-b:a", "128k", outAbs], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  fs.unlinkSync(tmp);
}

async function synthRaw(body) {
  const res = await fetch(`${SERVICE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Dynamic Kokoro: synth each phrase at its own pace, splice with pauses, so the
// delivery feels alive. Concatenation normalises each part to 24k/mono/fltp.
async function synthDynamicKokoro(target, outMp3) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dynkok-"));
  const parts = [];
  for (let i = 0; i < PHRASE_PLAN.length; i++) {
    const ph = PHRASE_PLAN[i];
    const wav = await synthRaw({ engine: "kokoro", text: ph.text, speaker: target.speaker, speed: ph.speed });
    const pw = path.join(tmpDir, `p${i}.wav`);
    fs.writeFileSync(pw, wav);
    parts.push(pw);
    if (ph.pauseMs > 0) {
      const sw = path.join(tmpDir, `s${i}.wav`);
      execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-t", (ph.pauseMs / 1000).toFixed(3), "-i", "anullsrc=r=24000:cl=mono", sw], { stdio: ["ignore", "ignore", "ignore"] });
      parts.push(sw);
    }
  }
  const inputs = parts.flatMap((p) => ["-i", p]);
  const norm = parts.map((_, i) => `[${i}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono[a${i}]`).join(";");
  const concat = parts.map((_, i) => `[a${i}]`).join("") + `concat=n=${parts.length}:v=0:a=1[out]`;
  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", `${norm};${concat}`, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "128k", outMp3], { stdio: ["ignore", "ignore", "ignore"] });
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Health check first so we fail with a clear message if the service is down.
try {
  const h = await fetch(`${SERVICE}/health`).then((r) => r.json());
  console.log(`service device=${h.device} engines=${JSON.stringify(h.engines)}`);
} catch {
  console.error(`Local TTS service not reachable at ${SERVICE}. Start it:\n  cd scripts/tts-service && uv run uvicorn app:app --port 8100`);
  process.exit(1);
}

async function unload() {
  try {
    await fetch(`${SERVICE}/unload`, { method: "POST" });
  } catch {
    /* best effort */
  }
}

let lastEngine = null;
for (const t of TARGETS) {
  // Free the previous engine's model before loading a new one — the Mac's MPS
  // budget can't hold parler + svara + chatterbox at once.
  if (t.engine !== lastEngine) {
    await unload();
    lastEngine = t.engine;
  }
  const name = `${t.engine}-${t.label}`;
  process.stdout.write(`${name} ... `);
  try {
    if (t.dynamic) {
      await synthDynamicKokoro(t, path.join(OUT, `${name}.mp3`));
    } else {
      const wav = await synth(t);
      toMp3(wav, path.join(OUT, `${name}.mp3`));
    }
    console.log("ok");
  } catch (e) {
    console.log("FAIL", e.message);
  }
}

// Pull in the chosen ElevenLabs / Edge reference clips for an apples-to-apples compare.
for (const [src, file] of [
  ["public/voice-options/eleven-Antoni-male.mp3", "ref-eleven-antoni.mp3"],
  ["public/voice-options/eleven-Sarah.mp3", "ref-eleven-sarah.mp3"],
  ["public/voice-options/edge-devanagari.mp3", "ref-edge.mp3"],
]) {
  const abs = path.resolve(src);
  if (fs.existsSync(abs)) fs.copyFileSync(abs, path.join(OUT, file));
}

// Build the page from EVERY clip on disk, so partial reruns still show the full
// lineup. Engines grouped together; references last.
const REF_LABELS = {
  "ref-eleven-antoni.mp3": "ElevenLabs Antoni — paid reference (male)",
  "ref-eleven-sarah.mp3": "ElevenLabs Sarah — paid reference (female)",
  "ref-edge.mp3": "Edge TTS — free, current fallback",
};
const ENGINE_ORDER = ["parler", "svara", "chatterbox", "kokoro"];
const onDisk = fs.readdirSync(OUT).filter((f) => f.endsWith(".mp3"));
const engineClips = onDisk
  .filter((f) => !f.startsWith("ref-"))
  .sort((a, b) => {
    const ea = ENGINE_ORDER.findIndex((e) => a.startsWith(e));
    const eb = ENGINE_ORDER.findIndex((e) => b.startsWith(e));
    return ea - eb || a.localeCompare(b);
  })
  .map((f) => ({ label: f.replace(/\.mp3$/, "").replace("-", " — "), file: f }));
const refClips = Object.entries(REF_LABELS)
  .filter(([f]) => onDisk.includes(f))
  .map(([file, label]) => ({ label, file }));
const clips = [...engineClips, ...refClips];

const html = `<!doctype html><meta charset=utf-8><title>Free TTS bake-off</title>
<style>body{font:16px/1.5 system-ui;max-width:720px;margin:40px auto;background:#0b0b10;color:#e8e8ef}
.c{background:#15151d;border:1px solid #26263a;border-radius:12px;padding:14px 16px;margin:12px 0}
.l{font-weight:600;margin-bottom:8px}audio{width:100%}h1{margin-bottom:4px}
.sub{color:#9a9ab0;margin-top:0}</style>
<h1>Free TTS bake-off — pick by ear</h1>
<p class=sub>Same SoulStarr line through each free local engine vs the paid references.</p>
${clips.map((c) => `<div class=c><div class=l>${c.label}</div><audio controls preload=none src="${c.file}"></audio></div>`).join("\n")}`;
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`\n${clips.length} clips on page. Open: http://localhost:3000/voice-options-v2/index.html`);
