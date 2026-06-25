/**
 * Provider-routing LLM adapter.
 *
 * Exposes an Anthropic Messages-compatible `llm()` shim so the content
 * pipeline (ideation, script, storyboard, speech-plan, transliteration) can
 * switch between Claude and Gemini by flipping a single env var, with no
 * change to call-site logic.
 *
 *   llm().messages.create({ model, max_tokens, system, messages })  -> { content: [{ type, text }] }
 *
 * Default provider is Claude. Set LLM_PROVIDER=gemini to route every step
 * through Gemini — used while the Anthropic key is rate-capped. Claude
 * remains the intended default once the cap lifts.
 *
 * Notes on Gemini:
 * - The Claude `model` string passed by callers is mapped to a Gemini model
 *   (see geminiModelFor). Sonnet and Haiku both map to Flash by default.
 * - gemini-2.5-flash is a thinking model where `maxOutputTokens` also covers
 *   thinking tokens. Small caller budgets (e.g. 512) could be consumed by
 *   thinking and yield an empty answer, so thinking is disabled by default for
 *   these deterministic script/JSON/transliteration tasks. Override with
 *   GEMINI_THINKING_BUDGET if a future task needs reasoning.
 */
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export type LlmTextBlock = { type: "text"; text: string };
export type LlmResponse = { content: LlmTextBlock[] };
export type LlmMessage = { role: "user" | "assistant"; content: string };

export interface LlmCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  temperature?: number;
  messages: LlmMessage[];
}

export type LlmProvider = "claude" | "gemini";

/** Active provider, from LLM_PROVIDER (default "claude"). */
export function activeProvider(): LlmProvider {
  return (process.env.LLM_PROVIDER ?? "claude").trim().toLowerCase() === "gemini"
    ? "gemini"
    : "claude";
}

/**
 * Maps a requested Claude model to the Gemini model used in its place.
 * Sonnet (creative + JSON) and Haiku (cheap) both default to Flash; override
 * per tier via env without touching code.
 */
function geminiModelFor(claudeModel: string): string {
  const sonnet = process.env.GEMINI_MODEL_SONNET ?? "gemini-2.5-flash";
  const haiku = process.env.GEMINI_MODEL_HAIKU ?? "gemini-2.5-flash";
  return claudeModel.includes("haiku") ? haiku : sonnet;
}

/** Thinking-token budget for Gemini. Default 0 (disabled) for determinism. */
function geminiThinkingBudget(): number {
  const raw = process.env.GEMINI_THINKING_BUDGET;
  if (raw === undefined || raw.trim() === "") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

let _gemini: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!_gemini) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("LLM_PROVIDER=gemini but GEMINI_API_KEY is not set");
    }
    _gemini = new GoogleGenAI({ apiKey });
  }
  return _gemini;
}

async function claudeCreate(params: LlmCreateParams): Promise<LlmResponse> {
  const resp = await anthropic().messages.create({
    model: params.model,
    max_tokens: params.max_tokens,
    ...(params.system ? { system: params.system } : {}),
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const content: LlmTextBlock[] = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => ({ type: "text", text: b.text }));

  return { content };
}

async function geminiCreate(params: LlmCreateParams): Promise<LlmResponse> {
  const resp = await gemini().models.generateContent({
    model: geminiModelFor(params.model),
    contents: params.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      ...(params.system ? { systemInstruction: params.system } : {}),
      maxOutputTokens: params.max_tokens,
      thinkingConfig: { thinkingBudget: geminiThinkingBudget() },
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    },
  });

  return { content: [{ type: "text", text: resp.text ?? "" }] };
}

/** Route a single text completion to the active provider. */
export async function createMessage(params: LlmCreateParams): Promise<LlmResponse> {
  return activeProvider() === "gemini" ? geminiCreate(params) : claudeCreate(params);
}

/**
 * Anthropic Messages-compatible shim. Drop-in replacement for a private
 * `new Anthropic()` client used only for `.messages.create(...)`.
 */
export function llm() {
  return { messages: { create: createMessage } };
}
