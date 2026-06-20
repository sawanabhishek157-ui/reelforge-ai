/**
 * Centralised music library used by both the UI picker and the mix endpoint.
 *
 * Music files live in /public/music/<id>.mp3
 * If a file is missing the slot is greyed out in the UI.
 *
 * Tracks are AI-generated (royalty-free) via Segmind Meta MusicGen Medium.
 * To regenerate all 7 mood tracks run:
 *   node --env-file=.env scripts/gen-music.mjs
 *
 * Generation code: src/lib/music-gen.ts
 */

export type Mood = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** public-relative URL (also the file path under /public/) */
  url: string;
};

export const MOODS: Mood[] = [
  {
    id: "mysterious",
    name: "Mysterious",
    emoji: "🔮",
    description: "Cosmic, esoteric, suspenseful — astrology / spiritual reels",
    url: "/music/mysterious.mp3",
  },
  {
    id: "romantic",
    name: "Romantic",
    emoji: "💕",
    description: "Warm, soft, intimate — love / soulmate content",
    url: "/music/romantic.mp3",
  },
  {
    id: "exciting",
    name: "Exciting",
    emoji: "⚡",
    description: "Upbeat, energetic — motivation, success stories",
    url: "/music/exciting.mp3",
  },
  {
    id: "calm",
    name: "Calm",
    emoji: "🌿",
    description: "Peaceful, meditative — mindfulness, dreams",
    url: "/music/calm.mp3",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    emoji: "🎭",
    description: "Cinematic build, tension — storytelling, reveals",
    url: "/music/dramatic.mp3",
  },
  {
    id: "uplifting",
    name: "Uplifting",
    emoji: "✨",
    description: "Bright, positive — affirmations, growth",
    url: "/music/uplifting.mp3",
  },
  {
    id: "epic",
    name: "Epic",
    emoji: "🏔️",
    description: "Big, sweeping — destiny, transformation",
    url: "/music/epic.mp3",
  },
  {
    id: "none",
    name: "No music",
    emoji: "🔇",
    description: "Voice only — clean, podcast-style",
    url: "",
  },
];

export function findMood(id: string | null | undefined) {
  return MOODS.find((m) => m.id === id) ?? MOODS[MOODS.length - 1];
}
