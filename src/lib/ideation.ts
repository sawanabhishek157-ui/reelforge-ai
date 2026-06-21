import Anthropic from "@anthropic-ai/sdk";
import type { Product, Idea } from "@/lib/types";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

function buildSystemPrompt(product: Product): string {
  const pillars =
    product.contentPillars.length > 0
      ? product.contentPillars.join(", ")
      : "general content";
  const dos = product.dos.length > 0 ? product.dos.join("; ") : "none specified";
  const donts =
    product.donts.length > 0 ? product.donts.join("; ") : "none specified";
  const examples =
    product.examplePosts.length > 0
      ? product.examplePosts.slice(0, 3).join("\n- ")
      : "none provided";

  return `You are an expert short-form video content strategist for social media reels.

Your task is to generate reel content ideas that are strictly grounded in the provided product profile. Every idea must:
- Reflect the product's voice, tone, and language (${product.language})
- Serve the target audience (${product.audience ?? "general audience"})
- Align with at least one content pillar
- Respect the dos and don'ts

Product profile:
- Name: ${product.name}
- Description: ${product.description ?? "not provided"}
- Audience: ${product.audience ?? "not specified"}
- Voice/Tone: ${product.voiceTone ?? "not specified"}
- Language: ${product.language}
- Content pillars: ${pillars}
- Dos: ${dos}
- Don'ts: ${donts}
- Example posts/content:
- ${examples}

Output ONLY valid JSON — no prose, no markdown, no code fences.
The JSON must be an array of idea objects with exactly these keys:
  "title"     — concise title for the reel idea
  "hook"      — a scroll-stopping opening line written in the product's voice and language
  "angle"     — the framing or take for the reel
  "rationale" — why this idea fits the product's pillars and audience

Example schema (do NOT copy content, only the shape):
[
  {
    "title": "...",
    "hook": "...",
    "angle": "...",
    "rationale": "..."
  }
]`;
}

function buildUserMessage(
  product: Product,
  count: number,
  feedback?: string,
  avoid?: string[],
): string {
  const parts: string[] = [`Generate exactly ${count} reel content idea${count === 1 ? "" : "s"} for ${product.name}.`];

  if (feedback) {
    parts.push(`\nSteering feedback (apply to all ideas): ${feedback}`);
  }

  if (avoid && avoid.length > 0) {
    parts.push(
      `\nDo NOT produce ideas with any of these titles or angles (avoid repeats):\n${avoid.map((a) => `- ${a}`).join("\n")}`,
    );
  }

  parts.push(`\nReturn a JSON array of exactly ${count} idea object${count === 1 ? "" : "s"}.`);

  return parts.join("\n");
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function isIdea(value: unknown): value is Idea {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.hook === "string" &&
    typeof obj.angle === "string" &&
    typeof obj.rationale === "string"
  );
}

function parseIdeas(raw: string, count: number): Idea[] {
  const cleaned = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `ideation: Claude returned non-JSON output:\n${raw.slice(0, 400)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `ideation: Expected a JSON array, got ${typeof parsed}`,
    );
  }

  const ideas = parsed.filter(isIdea);

  if (ideas.length !== count) {
    throw new Error(
      `ideation: Expected ${count} valid idea objects, got ${ideas.length}`,
    );
  }

  return ideas;
}

export interface GenerateIdeasOptions {
  count?: number;
  feedback?: string;
  avoid?: string[];
}

export async function generateIdeas(
  product: Product,
  opts: GenerateIdeasOptions = {},
): Promise<Idea[]> {
  const count = opts.count ?? 4;

  if (count < 1) {
    throw new Error("ideation: count must be at least 1");
  }

  const resp = await client().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: buildSystemPrompt(product),
    messages: [
      {
        role: "user",
        content: buildUserMessage(product, count, opts.feedback, opts.avoid),
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return parseIdeas(text, count);
}
