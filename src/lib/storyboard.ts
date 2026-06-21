/**
 * Storyboard generation — two-step agentic pipeline:
 *  1. writeScript   — full voiceover script (~20-45s spoken)
 *  2. buildStoryboard — scene-by-scene storyboard with FLUX prompts, motion, music mood
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Product, Idea, Storyboard, StoryboardScene, MotionStyle } from "./types";
import { MOODS } from "./music";
import { VOICES } from "./tts";

// ── Lazy singleton Anthropic client ──────────────────────────────────────────

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const MODEL = "claude-sonnet-4-6";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOOD_IDS = MOODS.filter((m) => m.id !== "none").map((m) => m.id);
const MOTION_STYLES: MotionStyle[] = ["zoomdrift", "orbit", "dolly", "vertical"];

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ── 1. writeScript ────────────────────────────────────────────────────────────

const SCRIPT_SYSTEM = `You are a professional short-form video scriptwriter specialising in social media reels (Instagram, YouTube Shorts, TikTok).

Your job: write a compelling voiceover script for a product reel.

Constraints:
- Length: 20-45 seconds of natural spoken audio (~50-110 words).
- Output ONLY the voiceover text. No scene directions, no markdown, no timestamps, no labels.
- Match the product's voice tone and language exactly.
- For Hinglish products write romanized Hinglish (the TTS layer handles Devanagari conversion).
- Open with a scroll-stopping hook based on the provided idea hook.
- Close with a clear call-to-action or emotional pay-off.
- Follow the product's content pillars, dos, and don'ts strictly.`;

/**
 * Write a full short-reel voiceover script (~20-45s spoken) in the product's
 * voice and language. Pass opts.feedback to regenerate with user notes.
 */
export async function writeScript(
  product: Product,
  idea: Idea,
  opts?: { feedback?: string },
): Promise<string> {
  const lines: string[] = [
    `Product: ${product.name}`,
    product.description ? `Description: ${product.description}` : "",
    product.audience ? `Target audience: ${product.audience}` : "",
    product.voiceTone ? `Voice tone: ${product.voiceTone}` : "",
    `Language: ${product.language}`,
    `Content pillars: ${product.contentPillars.join(", ")}`,
    product.dos.length ? `Dos: ${product.dos.join("; ")}` : "",
    product.donts.length ? `Don'ts: ${product.donts.join("; ")}` : "",
    product.examplePosts.length
      ? `Example post style:\n${product.examplePosts.slice(0, 2).join("\n---\n")}`
      : "",
    "",
    `Idea title: ${idea.title}`,
    `Hook: ${idea.hook}`,
    `Angle: ${idea.angle}`,
    `Rationale: ${idea.rationale}`,
  ].filter(Boolean);

  if (opts?.feedback) {
    lines.push("", `User feedback for this revision: ${opts.feedback}`);
  }

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SCRIPT_SYSTEM,
    messages: [{ role: "user", content: lines.join("\n") }],
  });

  return extractText(resp.content);
}

// ── 2. buildStoryboard ────────────────────────────────────────────────────────

const STORYBOARD_SYSTEM = `You are a cinematic storyboard director for short-form vertical video reels.

Given a voiceover script and product brand profile, split the script into 4-7 contiguous scenes and return a JSON storyboard.

Rules:
- scenes: array of 4-7 objects. Together they cover the ENTIRE script — every word belongs to exactly one scene.
- caption: the exact (or lightly paraphrased) script segment for this scene. Concise on-screen text.
- imagePrompt: a FLUX text-to-image prompt COMPOSED FOR STRONG DEPTH so 2.5D parallax pops. It MUST have THREE distinct depth planes: (a) a clear foreground element/subject, (b) a midground, and (c) a DISTANT receding background (a far horizon, deep landscape, corridor, or scene receding into the distance). Use WIDE or MEDIUM shots — the subject must NOT fill the frame; explicitly AVOID tight close-up portraits/faces (they are flat and do not parallax). Phrase it cinematically, e.g. "...in the foreground, ... in the midground, with ... stretching into the far distance behind." Incorporate product.imageStyle if provided. Specify lighting and mood. Avoid flat silhouettes, frame-filling close-ups, and cluttered compositions.
- motionStyle: one of "zoomdrift" | "orbit" | "dolly" | "vertical". Vary across scenes — do not repeat the same style consecutively if avoidable.
- cinemagraph: {"region": "sky"} or {"region": "water"} ONLY when the imagePrompt would naturally feature a prominent sky or prominent body of water. Otherwise null.
- motionGraphics: array of 1-2 astrology overlay names that add real animated motion, chosen to fit the scene. Allowed: "starField" (twinkling drifting stars — for night/cosmic scenes), "cosmicDust" (flowing energy/air particles), "zodiacWheel" (rotating zodiac ring — for astrology/destiny beats), "orbitingBodies" (orbiting planets — for cosmic/fate themes), "constellationLines" (drawing constellations — for star/connection themes), "lightRays" (rotating divine light — for spiritual/reveal moments). Pick tastefully (usually 1-2) and vary across scenes. Use [] only if truly none fit.
- durationSec: integer 3-7. Proportional to caption word count. The sum of all scene durations should approximate the total spoken duration.
- musicMood: a single mood id from the allowed list that best fits the overall idea and emotional arc.
- voiceId: the voice id to use for narration.

Output ONLY valid JSON. No prose, no markdown, no code fences. Exact schema:

{
  "scenes": [
    {
      "caption": string,
      "imagePrompt": string,
      "motionStyle": "zoomdrift" | "orbit" | "dolly" | "vertical",
      "cinemagraph": {"region": "sky" | "water"} | null,
      "motionGraphics": string[],
      "durationSec": number
    }
  ],
  "musicMood": string,
  "voiceId": string
}`;

/**
 * Split a script into 4-7 scenes with FLUX prompts, motion styles, music mood,
 * and voice id. Pass opts.feedback to regenerate with user notes.
 */
export async function buildStoryboard(
  product: Product,
  script: string,
  opts?: { feedback?: string },
): Promise<Storyboard> {
  const voiceIds = VOICES.map((v) => v.id);

  // Determine default voice id based on language
  const defaultVoiceId =
    product.defaultVoiceId ??
    (product.language === "hinglish"
      ? VOICES.find((v) => v.lang === "hi")?.id ?? voiceIds[0]
      : VOICES.find((v) => v.lang === "en")?.id ?? voiceIds[0]);

  const lines: string[] = [
    `Product: ${product.name}`,
    product.description ? `Description: ${product.description}` : "",
    product.audience ? `Target audience: ${product.audience}` : "",
    product.voiceTone ? `Voice tone: ${product.voiceTone}` : "",
    `Language: ${product.language}`,
    product.imageStyle ? `Image style: ${product.imageStyle}` : "",
    "",
    `Script:\n"""\n${script}\n"""`,
    "",
    `Allowed musicMood ids: ${MOOD_IDS.join(", ")}`,
    `Suggested voiceId (use unless a better match exists): ${defaultVoiceId}`,
    `All available voiceIds: ${voiceIds.join(", ")}`,
    `Allowed motionStyle values: ${MOTION_STYLES.join(", ")}`,
  ].filter(Boolean);

  if (opts?.feedback) {
    lines.push("", `User feedback for this revision: ${opts.feedback}`);
  }

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: STORYBOARD_SYSTEM,
    messages: [{ role: "user", content: lines.join("\n") }],
  });

  const raw = extractText(resp.content);
  const jsonText = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`buildStoryboard: Claude returned non-JSON:\n${raw.slice(0, 600)}`);
  }

  return validateStoryboard(parsed, defaultVoiceId);
}

// ── Validation ────────────────────────────────────────────────────────────────

function isMotionStyle(v: unknown): v is MotionStyle {
  return MOTION_STYLES.includes(v as MotionStyle);
}

function validateScene(raw: unknown, idx: number): StoryboardScene {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Scene ${idx} is not an object`);
  }

  const s = raw as Record<string, unknown>;

  const caption = typeof s.caption === "string" ? s.caption.trim() : "";
  if (!caption) throw new Error(`Scene ${idx}: missing caption`);

  const imagePrompt = typeof s.imagePrompt === "string" ? s.imagePrompt.trim() : undefined;

  const motionStyle: MotionStyle = isMotionStyle(s.motionStyle)
    ? s.motionStyle
    : MOTION_STYLES[idx % MOTION_STYLES.length];

  let cinemagraph: StoryboardScene["cinemagraph"] = null;
  if (
    s.cinemagraph !== null &&
    s.cinemagraph !== undefined &&
    typeof s.cinemagraph === "object"
  ) {
    const cg = s.cinemagraph as Record<string, unknown>;
    if (cg.region === "sky" || cg.region === "water") {
      cinemagraph = { region: cg.region };
    }
  }

  const rawDur = typeof s.durationSec === "number" ? s.durationSec : 4;
  const durationSec = Math.min(7, Math.max(3, Math.round(rawDur)));

  const MG = ["starField", "cosmicDust", "zodiacWheel", "orbitingBodies", "constellationLines", "lightRays"];
  const motionGraphics = Array.isArray(s.motionGraphics)
    ? (s.motionGraphics as unknown[]).filter((m): m is string => typeof m === "string" && MG.includes(m)).slice(0, 3)
    : [];

  return { caption, imagePrompt, motionStyle, cinemagraph, motionGraphics, durationSec };
}

function validateStoryboard(raw: unknown, fallbackVoiceId: string): Storyboard {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("buildStoryboard: parsed value is not an object");
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    throw new Error("buildStoryboard: scenes array is missing or empty");
  }

  const scenes: StoryboardScene[] = obj.scenes.map((s, i) => validateScene(s, i));

  if (scenes.length < 4) throw new Error(`buildStoryboard: too few scenes (${scenes.length}; need 4-7)`);
  if (scenes.length > 7) {
    // Truncate gracefully rather than throwing
    scenes.splice(7);
  }

  const musicMood =
    typeof obj.musicMood === "string" && MOOD_IDS.includes(obj.musicMood)
      ? obj.musicMood
      : MOOD_IDS[0];

  const voiceIdRaw = typeof obj.voiceId === "string" ? obj.voiceId : "";
  const voiceId =
    VOICES.some((v) => v.id === voiceIdRaw) ? voiceIdRaw : fallbackVoiceId;

  return { scenes, musicMood, voiceId };
}
