/**
 * Voice options — Segmind Veena (Hindi+English native) vs Edge Devanagari.
 * Generates samples of a SoulStarr excerpt so you can pick by ear.
 *
 * Run: node --env-file=.env scripts/voice-options.mjs
 * Then open public/voice-options/index.html
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = path.resolve("public/voice-options");
fs.mkdirSync(OUT, { recursive: true });
const KEY = process.env.SEGMIND_API_KEY;
if (!KEY) { console.error("SEGMIND_API_KEY missing"); process.exit(1); }

// Veena handles romanized Hinglish natively — no Devanagari needed.
const SCRIPT =
  "Kya tumne kabhi socha hai... tumhara soulmate abhi kahan hai, kya kar raha hai, aur kaunsi rashi ka hai? " +
  "Shayad woh bhi usi chand ko dekh raha hai jo tum dekh rahe ho. Agar jaanna chahte ho, toh Follow SoulStarr.";

async function veena(speaker, outAbs) {
  const res = await fetch("https://api.segmind.com/v1/veena-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY },
    body: JSON.stringify({ text: SCRIPT, speaker, temperature: 0.4, top_p: 0.9 }),
  });
  if (!res.ok) throw new Error(`veena ${speaker} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const ct = res.headers.get("content-type") ?? "";
  let buf;
  if (ct.includes("application/json")) {
    const j = await res.json();
    const b64OrUrl = j.audio ?? j.output ?? j.url;
    if (typeof b64OrUrl === "string" && b64OrUrl.startsWith("http")) {
      buf = Buffer.from(await (await fetch(b64OrUrl)).arrayBuffer());
    } else {
      buf = Buffer.from(b64OrUrl, "base64");
    }
  } else {
    buf = Buffer.from(await res.arrayBuffer());
  }
  // Normalize to mp3 (Veena may return wav)
  const tmp = path.join(os.tmpdir(), `veena-${speaker}-${Date.now()}`);
  fs.writeFileSync(tmp, buf);
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-c:a", "libmp3lame", "-b:a", "128k", outAbs], { stdio: ["ignore", "ignore", "ignore"] });
  fs.unlinkSync(tmp);
}

const clips = [];
for (const sp of ["kavya", "maitri", "agastya", "vinaya"]) {
  process.stdout.write(`veena ${sp} ... `);
  try { await veena(sp, path.join(OUT, `veena-${sp}.mp3`)); clips.push({ label: `Veena — ${sp} (Segmind)`, file: `veena-${sp}.mp3` }); console.log("ok"); }
  catch (e) { console.log("FAIL", e.message); }
}

// Reference the existing Edge Devanagari clip for comparison, if present
const edge = path.resolve("public/voice-ab/hinglish-2-edge-deva.mp3");
if (fs.existsSync(edge)) {
  fs.copyFileSync(edge, path.join(OUT, "edge-devanagari.mp3"));
  clips.push({ label: "Edge TTS + Devanagari (current)", file: "edge-devanagari.mp3" });
}

const html = `<!doctype html><meta charset=utf-8><title>Voice options</title>
<style>body{font:16px/1.5 system-ui;max-width:680px;margin:40px auto;background:#0b0b10;color:#e8e8ef}
.c{background:#15151d;border:1px solid #26263a;border-radius:12px;padding:14px 16px;margin:12px 0}
.l{font-weight:600;margin-bottom:8px}audio{width:100%}</style>
<h1>Voice options — pick by ear</h1><p>Same SoulStarr line through each voice.</p>
${clips.map((c) => `<div class=c><div class=l>${c.label}</div><audio controls preload=none src="${c.file}"></audio></div>`).join("")}`;
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`\n${clips.length} clips. Open: ${path.join(OUT, "index.html")}`);
