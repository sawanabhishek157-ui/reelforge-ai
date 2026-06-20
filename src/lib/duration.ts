export const MAX_DURATION_SEC = 90;
export const MAX_SCRIPT_CHARS = 1200; // ≈ 200 words ≈ 80 s at TTS speed
export const WORDS_PER_SECOND = 2.5;

export function countWords(text: string) {
  return (text.trim().match(/\S+/g) ?? []).length;
}

export function countChars(text: string) {
  return text.length;
}

/** Pre-TTS estimate of voiceover length from a script. */
export function estimateDurationSec(script: string) {
  const words = countWords(script);
  if (words === 0) return 0;
  // Clamp to [4s, 60s] for sensible scene planning.
  return Math.min(MAX_DURATION_SEC, Math.max(4, Math.round(words / WORDS_PER_SECOND)));
}

export type Aspect = "9:16" | "16:9" | "1:1";

export const ASPECTS: { id: Aspect; label: string; width: number; height: number; hint: string }[] = [
  { id: "9:16", label: "9:16 Vertical", width: 1080, height: 1920, hint: "Reels · Shorts · TikTok" },
  { id: "1:1", label: "1:1 Square", width: 1080, height: 1080, hint: "Instagram feed" },
  { id: "16:9", label: "16:9 Landscape", width: 1920, height: 1080, hint: "YouTube · LinkedIn" },
];

export function aspectDims(aspect: Aspect) {
  const a = ASPECTS.find((x) => x.id === aspect) ?? ASPECTS[0];
  return { width: a.width, height: a.height };
}
