/**
 * Drive a content run end-to-end through every gate (for testing the full pipeline).
 * Usage: node scripts/drive-run.mjs <productId>
 */
const BASE = "http://localhost:3000";
const productId = process.argv[2];
if (!productId) { console.error("usage: node scripts/drive-run.mjs <productId>"); process.exit(1); }

async function post(p, b) {
  const r = await fetch(BASE + p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b || {}),
    signal: AbortSignal.timeout(560000),
  });
  if (!r.ok) throw new Error(`${p} ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).run;
}

let run = await post("/api/runs", { productId });
console.log("created", run.id, "step", run.step);
let guard = 0;
while (run.step !== "done" && run.status !== "failed" && guard++ < 12) {
  const payload = run.step === "ideate" ? { ideaIndex: 0 } : {};
  const t = Date.now();
  run = await post(`/api/runs/${run.id}/approve`, payload);
  console.log(`-> ${run.step} (${run.status}) ${Math.round((Date.now() - t) / 1000)}s ${run.error || ""}`);
}
console.log("FINAL", run.step, run.status, "output:", run.outputPath, run.error || "");
