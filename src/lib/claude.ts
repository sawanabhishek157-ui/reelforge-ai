import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

export type ScenePlan = {
  idx: number;
  startSec: number;
  endSec: number;
  source: "reference" | "generated";
  referenceIndex?: number; // which uploaded image to use (0-indexed) if source is "reference"
  prompt?: string; // generation prompt if source is "generated"
  caption: string;
  zoom: "in" | "out";
};

export type VideoPlan = {
  durationSec: number;
  scenes: ScenePlan[];
};

const SYSTEM = `You are an expert short-form vertical video editor. The user uploads a script and a few storyboard reference images. Plan a 9:16 reel by splitting the script into short scenes. Each scene MUST map to one of the uploaded reference images.

Rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown.
- Number of scenes = ceil(durationSec / 6). Aim for 5-7s per scene.
- EVERY scene MUST use source="reference". Reference-only mode — never use "generated".
- referenceIndex is REQUIRED for every scene. It is a 0-based index into the uploaded reference images.
- You may reuse the same reference across multiple scenes; pick the image whose mood/content best fits each line of script.
- Captions: 5-9 words, punchy, hook-style, taken/paraphrased from the script.
- Total of all scene durations must equal durationSec exactly.
- Vary zoom direction (alternate "in" and "out").

Schema:
{
  "durationSec": number,
  "scenes": [
    {
      "idx": number,                // 0-based
      "startSec": number,
      "endSec": number,
      "source": "reference",        // always "reference"
      "referenceIndex": number,     // 0-based index into uploaded refs
      "caption": string,
      "zoom": "in" | "out"
    }
  ]
}`;

export async function planReel(opts: {
  script: string;
  durationSec: number;
  referenceCount: number;
}): Promise<VideoPlan> {
  const { script, durationSec, referenceCount } = opts;

  const userMessage = `Script:\n"""\n${script}\n"""\n\nDuration: ${durationSec} seconds\nUploaded reference images: ${referenceCount}\n\nReturn the JSON plan now.`;

  const resp = await client().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  // Strip code fences if Claude added them anyway
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let plan: VideoPlan;
  try {
    plan = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude returned non-JSON plan:\n${text.slice(0, 500)}`);
  }

  // Normalize / sanity-check
  if (!Array.isArray(plan.scenes) || plan.scenes.length === 0) {
    throw new Error("Plan has no scenes");
  }
  plan.scenes.forEach((s, i) => {
    s.idx = i;
    if (s.source === "reference" && s.referenceIndex !== undefined) {
      s.referenceIndex = Math.max(0, Math.min(referenceCount - 1, s.referenceIndex));
    }
    s.zoom = s.zoom === "out" ? "out" : "in";
  });
  plan.durationSec = durationSec;
  return plan;
}
