/**
 * Speech Performance Plan — Claude analyses the script and produces directing
 * notes that turn flat TTS into something closer to a real narrator.
 *
 * The plan is provider-agnostic. The formatter functions below translate it
 * into whatever each TTS engine actually accepts:
 *   - ElevenLabs v3   → inline [emotion] / [pause] audio tags
 *   - Microsoft Edge  → rate / pitch / volume options + chunk-by-sentence
 *   - OpenAI gpt-4o-mini-tts → free-text `instructions` parameter
 */

import { llm } from "./llm";

export type Emotion =
  | "neutral"
  | "curious"
  | "informative"
  | "confident"
  | "excited"
  | "mysterious"
  | "intimate"
  | "dramatic"
  | "warm"
  | "calm"
  | "energetic"
  | "sad"
  | "hopeful";

export type Energy = "low" | "medium" | "high";
export type Speed = "slow" | "normal" | "fast";

export type Sentence = {
  text: string;
  emotion: Emotion;
  energy: Energy;
  speed: Speed;
  /** Pause to insert BEFORE the sentence, in ms */
  pauseBeforeMs: number;
  /** Pause to insert AFTER the sentence, in ms */
  pauseAfterMs: number;
  /** Words inside this sentence that should be emphasised */
  emphasis: string[];
};

export type SpeechPlan = {
  /** What kind of reel this is — drives global tone */
  reelType: "hook" | "explainer" | "story" | "ad" | "tutorial";
  /** Overall tone description for the producer */
  overallTone: string;
  sentences: Sentence[];
};

const SYSTEM = `You are a voice director for short-form vertical video reels (Hindi, Hinglish or English — all common).

Given a script, return a JSON Speech Performance Plan that turns it into a believable narration. Split into sentences and direct each one like a recording session.

Rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown fences.
- Detect structure: hook (curious / mysterious), explanation (informative / calm), reveal (dramatic), CTA (confident / energetic).
- "emphasis" should pick 1–3 KEY words inside that sentence that the narrator should stress.
- "pauseBeforeMs" and "pauseAfterMs": 0 most of the time; 200–400ms for natural beats; 500–800ms only at major reveals or before the CTA.
- For Hindi/Hinglish keep the original text exactly in "text" — do not transliterate.
- Keep each sentence intact (don't merge or split sentences).

Schema:
{
  "reelType": "hook" | "explainer" | "story" | "ad" | "tutorial",
  "overallTone": string,
  "sentences": [
    {
      "text": string,
      "emotion": one of [neutral, curious, informative, confident, excited, mysterious, intimate, dramatic, warm, calm, energetic, sad, hopeful],
      "energy": "low" | "medium" | "high",
      "speed": "slow" | "normal" | "fast",
      "pauseBeforeMs": number,
      "pauseAfterMs": number,
      "emphasis": string[]
    }
  ]
}`;

export async function generateSpeechPlan(script: string): Promise<SpeechPlan> {
  const resp = await llm().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Script:\n"""\n${script}\n"""\n\nReturn the JSON Speech Performance Plan.` }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let plan: SpeechPlan;
  try {
    plan = JSON.parse(text);
  } catch {
    throw new Error(`Claude returned non-JSON speech plan:\n${text.slice(0, 400)}`);
  }
  if (!Array.isArray(plan.sentences) || plan.sentences.length === 0) {
    throw new Error("Speech plan has no sentences");
  }
  // Sanity defaults
  plan.sentences = plan.sentences.map((s) => ({
    text: s.text,
    emotion: (s.emotion ?? "neutral") as Emotion,
    energy: (s.energy ?? "medium") as Energy,
    speed: (s.speed ?? "normal") as Speed,
    pauseBeforeMs: Math.max(0, Math.min(1500, Number(s.pauseBeforeMs) || 0)),
    pauseAfterMs: Math.max(0, Math.min(1500, Number(s.pauseAfterMs) || 0)),
    emphasis: Array.isArray(s.emphasis) ? s.emphasis.slice(0, 5) : [],
  }));
  return plan;
}

/** Apply free-text user feedback ("more emotional", "slower", "documentary style"). */
export async function revisePlanWithFeedback(
  current: SpeechPlan,
  feedback: string,
): Promise<SpeechPlan> {
  const resp = await llm().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system:
      SYSTEM +
      `\n\nYou are now revising an existing Speech Performance Plan based on user feedback. Keep the same "text" for each sentence — only modify emotion/energy/speed/pauses/emphasis to match the feedback.`,
    messages: [
      {
        role: "user",
        content: `Current plan:\n${JSON.stringify(current, null, 2)}\n\nUser feedback:\n"""${feedback}"""\n\nReturn the revised JSON plan.`,
      },
    ],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(text) as SpeechPlan;
}

// ─────────────────────────────────────────────────────────────────────
// Provider-specific formatters
// ─────────────────────────────────────────────────────────────────────

/**
 * Build a script with ElevenLabs v3 audio tags inline.
 *   "[curious] Kya astrologers... [pause 300ms] [confident] Follow SoulStarr."
 */
export function planToElevenLabsScript(plan: SpeechPlan): string {
  const parts: string[] = [];
  let lastEmotion: Emotion | null = null;
  for (const s of plan.sentences) {
    if (s.pauseBeforeMs >= 200) {
      parts.push(`[pause ${s.pauseBeforeMs}ms]`);
    }
    if (s.emotion !== lastEmotion) {
      parts.push(`[${s.emotion}]`);
      lastEmotion = s.emotion;
    }
    // Mark emphasis with CAPS — ElevenLabs honours emphasis cues
    let text = s.text;
    for (const w of s.emphasis) {
      const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
      text = text.replace(re, w.toUpperCase());
    }
    parts.push(text);
    if (s.pauseAfterMs >= 200) {
      parts.push(`[pause ${s.pauseAfterMs}ms]`);
    }
  }
  return parts.join(" ");
}

/**
 * For Edge TTS the SSML is restricted — only one prosody tag is allowed per
 * voice tag. We instead split the plan into per-sentence chunks, each rendered
 * with its own rate/pitch, then concatenated downstream via ffmpeg.
 */
export type EdgeChunk = {
  text: string;
  rate: string; // "-15%" | "+10%" | etc
  pitch: string; // "+2Hz" | "-3Hz" | etc
  pauseAfterMs: number;
};

export function planToEdgeChunks(plan: SpeechPlan): EdgeChunk[] {
  return plan.sentences.map((s) => ({
    text: applyEmphasisAsPunctuation(s.text, s.emphasis),
    rate: speedToRate(s.speed),
    pitch: emotionToPitch(s.emotion),
    pauseAfterMs: s.pauseBeforeMs + s.pauseAfterMs,
  }));
}

function speedToRate(speed: Speed): string {
  switch (speed) {
    case "slow":
      return "-15%";
    case "fast":
      return "+15%";
    default:
      return "+0%";
  }
}

function emotionToPitch(emotion: Emotion): string {
  switch (emotion) {
    case "mysterious":
    case "intimate":
    case "calm":
    case "sad":
      return "-3Hz";
    case "informative":
    case "neutral":
    case "warm":
      return "+0Hz";
    case "excited":
    case "energetic":
    case "hopeful":
      return "+3Hz";
    case "confident":
    case "dramatic":
      return "+1Hz";
    case "curious":
      return "+2Hz";
    default:
      return "+0Hz";
  }
}

/** Tiny trick — wrap emphasised words in commas to trigger micro-pause + slight stress. */
function applyEmphasisAsPunctuation(text: string, emphasis: string[]): string {
  let t = text;
  for (const w of emphasis) {
    const re = new RegExp(`\\b(${escapeRegExp(w)})\\b`, "gi");
    t = t.replace(re, ", $1, ");
  }
  return t.replace(/\s*,\s*,\s*/g, ", ");
}

/**
 * OpenAI gpt-4o-mini-tts accepts a free-text `instructions` parameter that
 * steers tone. Build it from the plan's overall tone + emotion mix.
 */
export function planToOpenAIInstructions(plan: SpeechPlan): string {
  const counts: Partial<Record<Emotion, number>> = {};
  for (const s of plan.sentences) {
    counts[s.emotion] = (counts[s.emotion] ?? 0) + 1;
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, 3)
    .map(([e]) => e)
    .join(", ");
  return `Speak as a ${plan.reelType} narrator. Overall tone: ${plan.overallTone}. The performance should weave between these emotions: ${top}. Use natural pauses and emphasise key words. Sound like a real human reading on camera — not robotic.`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
