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

const SYSTEM = `You are an expert short-form vertical video editor. The user uploads a script and exactly N reference images. Split the script into EXACTLY N scenes, one per image, in upload order.

Rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown.
- Number of scenes MUST equal N (the reference image count). Never more, never fewer.
- Scene i MUST use referenceIndex = i. No repeats. No skips. Strict 1-to-1 mapping in upload order.
- EVERY scene MUST have source="reference".
- Split the script into N consecutive segments that cover the WHOLE script — every sentence belongs to exactly one scene's caption.
- Captions should be the actual script segment for that scene (paraphrased lightly if too long; keep punctuation).
- Start/end times must be contiguous: scene[i].endSec === scene[i+1].startSec, totalling durationSec.
- Allocate time roughly in proportion to the number of words in each scene's caption.
- Alternate "in" and "out" for zoom for visual variety.

Schema:
{
  "durationSec": number,
  "scenes": [
    {
      "idx": number,                // 0-based, must run 0..N-1 in order
      "startSec": number,
      "endSec": number,
      "source": "reference",        // always "reference"
      "referenceIndex": number,     // MUST equal idx
      "caption": string,            // the script segment for this scene
      "zoom": "in" | "out"
    }
  ]
}`;

/**
 * Look at an image and write a one-sentence cinematic motion prompt for Veo.
 * Vision-only — no extra context needed.
 */
export async function generateMotionPrompt(opts: {
  imageBytes: Buffer;
  imageMimeType: string;
}): Promise<string> {
  const { imageBytes, imageMimeType } = opts;

  const resp = await client().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system:
      "You are a video director writing a single short motion-prompt for Google Veo image-to-video. " +
      "Look at the image and propose subtle, cinematic motion that would bring it to life as a 3-second clip. " +
      "Mention camera move (zoom in/out, slow pan, gentle orbit) AND subject motion (breathing, hair drift, ambient breeze, twinkling stars, glow pulse). " +
      "STRICT: do NOT add or describe any text, captions, subtitles, watermarks, logos or UI elements. " +
      "Keep it under 25 words. Reply with ONLY the prompt — no quotes, no preface.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (imageMimeType.match(
                /^image\/(png|jpe?g|gif|webp)$/,
              )?.[0] ?? "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
              data: imageBytes.toString("base64"),
            },
          },
          { type: "text", text: "Write the motion prompt for this image." },
        ],
      },
    ],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join(" ")
    .trim()
    .replace(/^["']|["']$/g, "");

  return text || "Slow cinematic push-in with gentle ambient motion.";
}

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
