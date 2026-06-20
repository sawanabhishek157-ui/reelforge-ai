/**
 * Romanized Hinglish → Devanagari transliteration via Claude.
 *
 * Feeds Devanagari text to Edge TTS Hindi voices instead of romanized Latin,
 * which dramatically improves pronunciation quality.
 *
 * Design notes:
 * - One API call per text block (not per sentence) to keep cost low.
 * - If the text is already mostly Devanagari (>40 % of its non-space chars
 *   fall in U+0900–U+097F), the call is skipped entirely.
 * - Widely-used English brand/loan words (e.g. "SoulStarr", "Follow",
 *   product names) are kept in Latin script per the prompt instruction.
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/** Fraction of non-space characters that must be Devanagari to skip transliteration. */
const DEVANAGARI_THRESHOLD = 0.4;

/**
 * Returns true when the text is already mostly Devanagari.
 * Unicode block U+0900–U+097F covers all standard Hindi characters.
 */
function isAlreadyDevanagari(text: string): boolean {
  const chars = [...text].filter((c) => c !== " " && c !== "\n");
  if (chars.length === 0) return true;
  const devCount = chars.filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return cp >= 0x0900 && cp <= 0x097f;
  }).length;
  return devCount / chars.length >= DEVANAGARI_THRESHOLD;
}

/**
 * Converts romanized Hinglish text to natural Devanagari script suitable for
 * a Hindi TTS engine.
 *
 * - Widely-used English brand/loan words (e.g. "SoulStarr", "Follow",
 *   product names) are kept in Latin script as Edge TTS handles them well.
 * - If the input is already mostly Devanagari the function returns it unchanged
 *   without making an API call.
 *
 * @param text - Raw script text (may be romanized Hinglish or already Devanagari)
 * @returns Devanagari text ready for Hindi Edge TTS
 */
export async function transliterateToDevanagari(text: string): Promise<string> {
  if (!text.trim()) return text;

  // Skip the API call if already predominantly Devanagari
  if (isAlreadyDevanagari(text)) return text;

  const resp = await client().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: Math.max(1024, Math.ceil(text.length * 2)),
    system: `You are a Hindi transliteration engine for a TTS (text-to-speech) system.

Task: Convert the romanized Hinglish input into natural Devanagari script that a native Hindi TTS voice can pronounce fluently.

Rules:
1. Convert all romanized Hindi words to correct Devanagari spelling.
2. KEEP widely-used English/brand/loan words in Latin script — things like brand names, social-media terms, product names (e.g. "SoulStarr", "Follow", "Subscribe", "Instagram", "YouTube", "AI", "App", "Online").
3. Preserve punctuation marks exactly (commas, ellipses, question marks, exclamation marks, full stops).
4. Output ONLY the converted text — no explanations, no quotes, no markdown, no prefix/suffix.
5. Do not add or remove sentences. Keep the same structure and flow.`,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const converted = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return converted || text;
}
