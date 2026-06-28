/**
 * Probe Segmind Chatterbox: does it handle Hindi/Hinglish acceptably?
 * Run: node --env-file=.env scripts/chatterbox-test.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = path.resolve("public/voice-options");
fs.mkdirSync(OUT, { recursive: true });
const KEY = process.env.SEGMIND_API_KEY;

const cases = [
  { name: "chatterbox-deva", text: "क्या तुमने कभी सोचा है तुम्हारा soulmate कौनसी राशि का है? Follow SoulStarr." },
  { name: "chatterbox-roman", text: "Kya tumne kabhi socha hai tumhara soulmate kaunsi rashi ka hai? Follow SoulStarr." },
];

async function save(buf, name) {
  const tmp = path.join(os.tmpdir(), name + ".raw");
  fs.writeFileSync(tmp, buf);
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-c:a", "libmp3lame", "-b:a", "128k", path.join(OUT, name + ".mp3")], { stdio: ["ignore", "ignore", "ignore"] });
  fs.unlinkSync(tmp);
}

for (const c of cases) {
  process.stdout.write(`${c.name} ... `);
  try {
    const res = await fetch("https://api.segmind.com/v1/chatterbox-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY },
      body: JSON.stringify({ text: c.text, exaggeration: 0.7, temperature: 0.7 }),
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok) { console.log(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`); continue; }
    if (ct.includes("application/json")) {
      const j = await res.json();
      console.log("JSON resp keys:", Object.keys(j).join(","));
      const url = j.audio?.url ?? j.audio ?? j.output ?? j.url;
      if (typeof url === "string" && url.startsWith("http")) { await save(Buffer.from(await (await fetch(url)).arrayBuffer()), c.name); console.log("  saved (from url)"); }
      else if (typeof url === "string") { await save(Buffer.from(url, "base64"), c.name); console.log("  saved (b64)"); }
      else console.log("  (async? no audio url — full:", JSON.stringify(j).slice(0, 200), ")");
    } else {
      await save(Buffer.from(await res.arrayBuffer()), c.name);
      console.log("saved (binary)");
    }
  } catch (e) { console.log("FAIL", e.message); }
}
