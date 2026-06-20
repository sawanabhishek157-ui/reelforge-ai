import fs from "node:fs";
import path from "node:path";

import {
  Brain,
  Cpu,
  Database,
  FileVideo,
  Mic,
  Network,
  Palette,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Pkg = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function readPkg(): Pkg {
  try {
    const p = path.join(process.cwd(), "package.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as Pkg;
  } catch {
    return {};
  }
}

function v(pkg: Pkg, name: string) {
  return (
    pkg.dependencies?.[name] ??
    pkg.devDependencies?.[name] ??
    "—"
  ).replace(/^\^|^~/, "");
}

const SECTIONS = [
  {
    icon: Cpu,
    title: "Frontend",
    rows: [
      { name: "next", role: "App framework (App Router, Turbopack)" },
      { name: "react", role: "UI runtime" },
      { name: "react-dom", role: "DOM renderer" },
      { name: "typescript", role: "Static typing" },
      { name: "tailwindcss", role: "Utility-first CSS" },
      { name: "lucide-react", role: "Icon set" },
      { name: "clsx", role: "Conditional classNames" },
      { name: "tailwind-merge", role: "Tailwind class de-duplication" },
    ],
  },
  {
    icon: Database,
    title: "Storage & data",
    rows: [
      { name: "better-sqlite3", role: "Embedded DB — projects, scenes, assets" },
      { name: "zod", role: "Runtime schema validation" },
    ],
  },
  {
    icon: Brain,
    title: "AI — script planning",
    rows: [
      { name: "@anthropic-ai/sdk", role: "Claude Haiku 4.5 — splits the script into N scene captions matched to your uploaded images" },
    ],
  },
  {
    icon: Mic,
    title: "AI — voiceover (TTS)",
    rows: [
      { name: "msedge-tts", role: "Microsoft Edge TTS — FREE Hindi (Swara/Madhur) + Indian English (Neerja/Prabhat). No API key." },
      { name: "openai", role: "OpenAI gpt-4o-mini-tts (currently unused — ElevenLabs is the English path)" },
    ],
  },
  {
    icon: FileVideo,
    title: "Video rendering",
    rows: [
      { name: "remotion", role: "Programmatic video framework — React → MP4" },
      { name: "@remotion/cli", role: "CLI invoked from /api/render to render the final file" },
      { name: "@remotion/renderer", role: "Headless rendering primitives" },
      { name: "@remotion/player", role: "In-browser preview <Player>" },
      { name: "@remotion/bundler", role: "Bundles the Remotion entry for headless render" },
      { name: "ffmpeg (system)", role: "Audio/video mux + duration probe (via ffprobe). Required system binary." },
    ],
  },
  {
    icon: Network,
    title: "Image generation (optional)",
    rows: [
      { name: "@fal-ai/serverless-client", role: "fal.ai FLUX Schnell — not used in reference-only mode" },
    ],
  },
] as const;

const PIPELINE = [
  { step: "1", title: "Upload", text: "POST /api/projects — multipart with script, voiceId, aspect, 3–8 images. Files land in public/projects/<id>/references/, project row written via SQLite transaction." },
  { step: "2", title: "Plan", text: "POST /api/projects/[id]/plan — Claude Haiku 4.5 splits the script into N scenes (one per image segment), picks the best reference image per scene and a caption. Returns JSON." },
  { step: "3", title: "Generate", text: "POST /api/projects/[id]/generate — Edge TTS (or ElevenLabs) produces voice.mp3 in parallel. ffprobe measures actual duration. Scene timings auto-rescale to fit. Motion (zoom-in / pan-right / zoom-out / pan-left) cycled per scene. Saved to SQLite." },
  { step: "4", title: "Render", text: "POST /api/projects/[id]/render — spawns 'npx remotion render' as a child process. Remotion composes <Audio> + <Sequence> per scene with Ken Burns transform. Output: H.264 + AAC MP4 written to public/projects/<id>/output.mp4." },
  { step: "5", title: "Serve", text: "MP4 is served by Next.js static handler with Accept-Ranges so the browser can scrub. Dashboard, Projects list and the Create page show the same file via /projects/<id>/output.mp4." },
] as const;

export default function DocsPage() {
  const pkg = readPkg();
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Sparkles className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Docs &amp; architecture</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live inventory of the technologies powering ReelForge AI. Versions
              are pulled from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">package.json</code> on every request.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <p className="mt-1 text-sm text-slate-500">
          From the moment you click <em>Generate Video</em> to the MP4 landing in your hand.
        </p>
        <ol className="mt-6 grid gap-4 lg:grid-cols-5">
          {PIPELINE.map((p, i) => {
            const isLast = i === PIPELINE.length - 1;
            return (
              <li
                key={p.step}
                className="relative rounded-2xl border border-[#e8e8f0] bg-slate-50/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {p.step}
                  </span>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {p.text}
                </p>
                {!isLast && (
                  <span className="absolute top-1/2 -right-2 hidden size-3 rounded-full bg-violet-300 lg:block" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Architecture</h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-5 text-[0.78rem] leading-relaxed text-slate-100">
{`[ Browser ]
  Next.js 16 dashboard (TS + Tailwind v4)
        │
        ▼  multipart/form-data (script + images)
[ /api/projects ]            → public/projects/<id>/references/
        │
        ▼
[ /api/projects/[id]/plan ]
  Claude Haiku 4.5  → scene plan JSON
        │
        ▼
[ /api/projects/[id]/generate ]
  Edge TTS or ElevenLabs → voice.mp3
  ffprobe → duration → rescale scene timings
        │                      ↑
        ▼                      │
[ SQLite (better-sqlite3) ]    │
  projects · scenes · assets ──┘
        │
        ▼
[ /api/projects/[id]/render ]
  spawn npx remotion render → Remotion composition (React) → ffmpeg
        │
        ▼
[ public/projects/<id>/output.mp4 ]
  served by Next.js static handler  →  Dashboard / Projects / Download`}
        </pre>
      </section>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section
            key={section.title}
            className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <h2 className="text-lg font-semibold">{section.title}</h2>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="py-2 pr-4">Package</th>
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8f0]">
                  {section.rows.map((r) => (
                    <tr key={r.name}>
                      <td className="py-2 pr-4">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                          {r.name}
                        </code>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.7rem] font-semibold text-violet-700">
                          v{v(pkg, r.name)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{r.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Palette className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Project layout</h2>
        </div>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-50 p-5 text-[0.78rem] leading-relaxed text-slate-700">
{`src/
├── app/
│   ├── (app)/                  layout group with Sidebar + Topbar
│   │   ├── page.tsx            Dashboard (recent reels from SQLite)
│   │   ├── create/page.tsx     The 4-step generator
│   │   ├── projects/page.tsx   Real list from SQLite
│   │   ├── assets/page.tsx     Static demo
│   │   ├── voice-library/      Voice picker reference
│   │   ├── docs/page.tsx       (you are here)
│   │   └── settings/
│   └── api/projects/...        Upload, plan, generate, render, regenerate-voice
├── components/                 Sidebar, Topbar, Stepper, Thumb, StatusBadge, Waveform
├── lib/
│   ├── claude.ts               Anthropic SDK + planner prompt
│   ├── tts.ts                  Edge TTS + ElevenLabs dual-provider
│   ├── remotion-render.ts      Spawns 'npx remotion render'
│   ├── db.ts                   SQLite (better-sqlite3) lazy singleton
│   ├── paths.ts                Filesystem layout helpers
│   ├── duration.ts             Script stats + aspect ratios
│   └── api.ts                  Client-side fetch error handler
└── remotion/
    ├── Root.tsx                <Composition> with calculateMetadata
    ├── ReelComposition.tsx     <Audio> + <Sequence> + Ken Burns
    ├── types.ts                Plan / Scene / Motion types
    └── index.ts                registerRoot()`}
        </pre>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Required system binaries</h2>
        <table className="mt-4 min-w-full text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-4">Binary</th>
              <th className="py-2 pr-4">Why</th>
              <th className="py-2 pr-4">Install</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ffmpeg</code>
              </td>
              <td className="py-2 pr-4 text-slate-600">Audio/video muxing by Remotion</td>
              <td className="py-2 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">brew install ffmpeg</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ffprobe</code>
              </td>
              <td className="py-2 pr-4 text-slate-600">Measures real voiceover duration after TTS</td>
              <td className="py-2 pr-4">ships with ffmpeg</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">chromium</code>
              </td>
              <td className="py-2 pr-4 text-slate-600">Headless browser for Remotion render (locally Remotion auto-installs; on Docker we use system chromium)</td>
              <td className="py-2 pr-4">auto / Docker</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
