import { llm } from "@/lib/llm";
import type { Language, ProductInput } from "@/lib/types";

export interface DraftProfileInput {
  name: string;
  description?: string;
  rawNotes?: string;
  examplePosts?: string[];
  repoReadme?: string;
  storeListing?: string;
  siteText?: string;
}

const MUSIC_MOODS = [
  "mysterious",
  "romantic",
  "exciting",
  "calm",
  "dramatic",
  "uplifting",
  "epic",
] as const;

type MusicMood = (typeof MUSIC_MOODS)[number];

function isMusicMood(value: unknown): value is MusicMood {
  return typeof value === "string" && MUSIC_MOODS.includes(value as MusicMood);
}

function isLanguage(value: unknown): value is Language {
  return value === "english" || value === "hinglish";
}

function ensureStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

function clamp<T>(arr: T[], min: number, max: number, fill: T[]): T[] {
  if (arr.length >= min && arr.length <= max) return arr;
  if (arr.length < min) return [...arr, ...fill].slice(0, min);
  return arr.slice(0, max);
}

function buildSystemPrompt(): string {
  return `You are a brand strategist and content expert. Analyze the provided product material and return a structured brand/content profile as STRICT JSON — no markdown, no prose, no code fences. Output only the JSON object.`;
}

function buildUserPrompt(input: DraftProfileInput): string {
  const sections: string[] = [];

  sections.push(`Product name: ${input.name}`);

  if (input.description) {
    sections.push(`\nDescription:\n${input.description}`);
  }

  if (input.rawNotes) {
    sections.push(`\nRaw notes:\n${input.rawNotes}`);
  }

  if (input.examplePosts && input.examplePosts.length > 0) {
    sections.push(
      `\nExample posts:\n${input.examplePosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
    );
  }

  if (input.repoReadme) {
    sections.push(`\nRepo README:\n${input.repoReadme}`);
  }

  if (input.storeListing) {
    sections.push(`\nStore listing:\n${input.storeListing}`);
  }

  if (input.siteText) {
    sections.push(`\nSite text:\n${input.siteText}`);
  }

  sections.push(`
Return ONLY a JSON object with these exact keys:
{
  "description": string,              // 1–2 sentence product description
  "audience": string,                 // target audience description
  "voiceTone": string,                // brand voice and tone descriptor
  "language": "english" | "hinglish",// infer from example posts/notes; default "english"
  "contentPillars": string[],         // 3–6 content themes/pillars
  "dos": string[],                    // 3–6 content do's
  "donts": string[],                  // 3–6 content don'ts
  "examplePosts": string[],           // echo/clean the provided example posts (or [] if none)
  "imageStyle": string,               // concise FLUX image style descriptor; favor clear foreground subject + soft background (depth-friendly)
  "defaultMusicMood": "mysterious" | "romantic" | "exciting" | "calm" | "dramatic" | "uplifting" | "epic",
  "defaultVoiceId": string | null     // leave null if unsure
}

Rules:
- Arrays must have 3–6 items where a range is given; examplePosts can be any length.
- Infer language from the writing style of example posts or notes; default to "english".
- imageStyle must be a comma-separated FLUX-style descriptor (e.g. "cinematic depth of field, warm golden hour, sharp subject, soft bokeh background, vibrant colors").
- defaultMusicMood must be exactly one of the listed values.
- Output ONLY the JSON object — no markdown, no prose, no code fences.`);

  return sections.join("");
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseAndFill(
  raw: string,
  input: DraftProfileInput,
): ProductInput {
  const stripped = stripCodeFences(raw);
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const fallbackPillars = [
    "Product features",
    "User benefits",
    "Behind the scenes",
  ];
  const fallbackDos = ["Be authentic", "Use clear visuals", "Tell a story"];
  const fallbackDonts = ["Avoid jargon", "No low-quality images", "No spam"];

  const contentPillars = clamp(
    ensureStringArray(parsed.contentPillars),
    3,
    6,
    fallbackPillars,
  );
  const dos = clamp(ensureStringArray(parsed.dos), 3, 6, fallbackDos);
  const donts = clamp(ensureStringArray(parsed.donts), 3, 6, fallbackDonts);
  const examplePosts =
    ensureStringArray(parsed.examplePosts).length > 0
      ? ensureStringArray(parsed.examplePosts)
      : (input.examplePosts ?? []);

  const rawVoiceId = parsed.defaultVoiceId;
  const defaultVoiceId =
    typeof rawVoiceId === "string" && rawVoiceId.length > 0
      ? rawVoiceId
      : undefined;

  const rawMusicMood = parsed.defaultMusicMood;
  const defaultMusicMood = isMusicMood(rawMusicMood) ? rawMusicMood : "uplifting";

  const language = isLanguage(parsed.language) ? parsed.language : "english";

  const description =
    typeof parsed.description === "string" && parsed.description.length > 0
      ? parsed.description
      : (input.description ?? `${input.name} — a product worth sharing.`);

  const audience =
    typeof parsed.audience === "string" && parsed.audience.length > 0
      ? parsed.audience
      : "General audience";

  const voiceTone =
    typeof parsed.voiceTone === "string" && parsed.voiceTone.length > 0
      ? parsed.voiceTone
      : "Friendly and informative";

  const imageStyle =
    typeof parsed.imageStyle === "string" && parsed.imageStyle.length > 0
      ? parsed.imageStyle
      : "cinematic depth of field, sharp foreground subject, soft background bokeh, natural lighting";

  const result: ProductInput = {
    name: input.name,
    description,
    audience,
    voiceTone,
    language,
    contentPillars,
    dos,
    donts,
    examplePosts,
    imageStyle,
    defaultMusicMood,
    brandAssets: [],
    ...(defaultVoiceId !== undefined ? { defaultVoiceId } : {}),
  };

  return result;
}

export async function draftProfile(input: DraftProfileInput): Promise<ProductInput> {
  const resp = await llm().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const rawText = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  return parseAndFill(rawText, input);
}
