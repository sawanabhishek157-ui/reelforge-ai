export type ProjectStatus = "completed" | "processing" | "failed";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  durationSec: number;
  aspect: string;
  quality: string;
  status: ProjectStatus;
  thumbHue: number;
};

export const RECENT_VIDEOS: Project[] = [
  {
    id: "p1",
    name: "The Power of Mindset",
    createdAt: "May 20, 2024 · 10:30 AM",
    durationSec: 45,
    aspect: "9:16",
    quality: "1080p",
    status: "completed",
    thumbHue: 280,
  },
  {
    id: "p2",
    name: "Understanding Astrology",
    createdAt: "May 19, 2024 · 09:15 PM",
    durationSec: 62,
    aspect: "9:16",
    quality: "1080p",
    status: "completed",
    thumbHue: 260,
  },
  {
    id: "p3",
    name: "Daily Meditation Benefits",
    createdAt: "May 19, 2024 · 04:45 PM",
    durationSec: 30,
    aspect: "9:16",
    quality: "1080p",
    status: "processing",
    thumbHue: 30,
  },
];

export const ALL_PROJECTS: Project[] = [
  ...RECENT_VIDEOS,
  {
    id: "p4",
    name: "Law of Attraction Explained",
    createdAt: "May 18, 2024 · 11:20 AM",
    durationSec: 50,
    aspect: "9:16",
    quality: "1080p",
    status: "failed",
    thumbHue: 230,
  },
  {
    id: "p5",
    name: "Morning Motivation",
    createdAt: "May 17, 2024 · 08:30 AM",
    durationSec: 40,
    aspect: "9:16",
    quality: "1080p",
    status: "completed",
    thumbHue: 20,
  },
];

export type AssetKind = "image" | "video" | "audio" | "script";

export type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  sizeLabel: string;
  meta?: string;
  thumbHue: number;
};

export const ASSETS: Asset[] = [
  { id: "a1", name: "meditation_bg.png", kind: "image", sizeLabel: "2.4 MB", thumbHue: 220 },
  { id: "a2", name: "zodiac_bg.png", kind: "image", sizeLabel: "1.8 MB", thumbHue: 270 },
  { id: "a3", name: "mountain_view.png", kind: "image", sizeLabel: "2.1 MB", thumbHue: 200 },
  { id: "a4", name: "mindset_video.mp4", kind: "video", sizeLabel: "12.4 MB", meta: "00:45", thumbHue: 290 },
  { id: "a5", name: "voiceover_01.mp3", kind: "audio", sizeLabel: "3.2 MB", thumbHue: 260 },
  { id: "a6", name: "script_mindset.txt", kind: "script", sizeLabel: "2 KB", thumbHue: 250 },
  { id: "a7", name: "yoga_pose.png", kind: "image", sizeLabel: "1.2 MB", thumbHue: 310 },
  { id: "a8", name: "space_bg.jpg", kind: "image", sizeLabel: "3.6 MB", thumbHue: 230 },
  { id: "a9", name: "background_music.mp3", kind: "audio", sizeLabel: "4.5 MB", thumbHue: 280 },
  { id: "a10", name: "sunset_bg.png", kind: "image", sizeLabel: "2.3 MB", thumbHue: 18 },
];

export type VoiceTag = "Popular" | "New" | "Pro";

export type Voice = {
  id: string;
  name: string;
  gender: "Female" | "Male" | "Neutral";
  language: string;
  accent: string;
  style: string;
  durationSec: number;
  tag?: VoiceTag;
  initialHue: number;
};

export const VOICES: Voice[] = [
  { id: "v1", name: "Sarah", gender: "Female", language: "English (US)", accent: "American", style: "Warm, Natural", durationSec: 20, tag: "Popular", initialHue: 340 },
  { id: "v2", name: "James", gender: "Male", language: "English (US)", accent: "American", style: "Deep, Professional", durationSec: 20, initialHue: 220 },
  { id: "v3", name: "Priya", gender: "Female", language: "English (IN)", accent: "Indian", style: "Clear, Friendly", durationSec: 20, initialHue: 300 },
  { id: "v4", name: "Alex", gender: "Male", language: "English (UK)", accent: "British", style: "Calm, Smooth", durationSec: 20, initialHue: 210 },
  { id: "v5", name: "Emma", gender: "Female", language: "English (AU)", accent: "Australian", style: "Bright, Energetic", durationSec: 20, initialHue: 30 },
];

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
