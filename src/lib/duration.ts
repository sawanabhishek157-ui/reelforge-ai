export const MAX_DURATION_SEC = 60;
export const MAX_SCRIPT_CHARS = 900; // ≈ 150 words ≈ 60 s at TTS speed
export const WORDS_PER_SECOND = 2.5;

export function countWords(text: string) {
  return (text.trim().match(/\S+/g) ?? []).length;
}

/** Pre-TTS estimate of voiceover length from a script. */
export function estimateDurationSec(script: string) {
  const words = countWords(script);
  if (words === 0) return 0;
  // Clamp to [4s, 60s] for sensible scene planning.
  return Math.min(MAX_DURATION_SEC, Math.max(4, Math.round(words / WORDS_PER_SECOND)));
}
