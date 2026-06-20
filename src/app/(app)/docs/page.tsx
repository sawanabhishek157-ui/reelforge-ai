import fs from "node:fs";
import path from "node:path";

import {
  Brain,
  CheckCircle2,
  Circle,
  Clapperboard,
  Cpu,
  Database,
  Edit3,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Mic,
  Network,
  Palette,
  PlayCircle,
  RefreshCcw,
  Rocket,
  Sparkles,
  Wand2,
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

      <VersionOnePlan />

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

// ────────────────────────────────────────────────────────────────────────────
// Version 1 plan section
// ────────────────────────────────────────────────────────────────────────────

type V1Status = "done" | "partial" | "planned";

const STEPS: {
  num: number;
  icon: typeof FileText;
  title: string;
  status: V1Status;
  bullets: string[];
  panel?: { label: string; lines: string[] };
}[] = [
  {
    num: 1,
    icon: FileText,
    title: "Paste Script",
    status: "done",
    bullets: [
      "User pastes the narration script.",
      "Live stats show Words, Characters, Estimated Audio Duration, Estimated Reel Length.",
      "Recommended Images count (1 per 8–10s of script) is computed automatically.",
    ],
    panel: {
      label: "Live stats panel",
      lines: ["Words: 182", "Estimated Duration: 72 sec", "Recommended Images: 8"],
    },
  },
  {
    num: 2,
    icon: ImageIcon,
    title: "Upload Images",
    status: "partial",
    bullets: [
      "Drag-drop 3–8 images. Each preview thumbnail can be removed.",
      "TODO: drag-handle reordering (currently fixed to upload order).",
      "Images are saved on disk under public/projects/<id>/references/.",
    ],
  },
  {
    num: 3,
    icon: Mic,
    title: "Generate Audio (preview + regen)",
    status: "partial",
    bullets: [
      "TTS call runs immediately after upload — Edge TTS (free Hindi/Indian) or ElevenLabs (English).",
      "Audio preview panel: ▶ Play · duration · voice name (done in /create live preview).",
      "Regenerate-voice endpoint exists (/api/projects/[id]/regenerate-voice) — needs a UI button.",
      "TODO: natural-language voice tweaks ('more energetic', 'slower', 'documentary narrator…').",
    ],
    panel: {
      label: "Regenerate prompts (planned)",
      lines: [
        "More energetic",
        "More emotional",
        "Slower / Faster",
        "Deep male voice",
        "Like a documentary narrator",
        "More dramatic pauses",
      ],
    },
  },
  {
    num: 4,
    icon: Wand2,
    title: "Generate Motion Scripts",
    status: "partial",
    bullets: [
      "Claude already plans scene captions + reference image per scene.",
      "TODO: write a richer motion JSON per image — { camera, focus, emotion } — that drives the Veo/Kling prompt for that specific clip.",
      "TODO: surface the motion JSON on screen so user can preview before generating.",
    ],
    panel: {
      label: "Motion JSON (target shape)",
      lines: [
        '{',
        '  "camera": "slow_push_in",',
        '  "focus": "question_mark",',
        '  "emotion": "mystery"',
        '}',
      ],
    },
  },
  {
    num: 5,
    icon: Clapperboard,
    title: "Generate Video Clips (individually)",
    status: "planned",
    bullets: [
      "Each image → its own clip via fal.ai Kling (or Veo via Segmind).",
      "Per-clip card with ▶ Preview · ↻ Regenerate · ✏ Edit Motion.",
      "Edit Motion dropdown: Slow Zoom In / Out, Pan L/R, Orbit, Dolly Forward/Back, Custom.",
      "Free-text tweaks per clip: 'focus more on question mark', 'add dramatic zoom', 'cinematic'.",
      "Only the chosen clip regenerates — never the whole reel.",
    ],
  },
  {
    num: 6,
    icon: CheckCircle2,
    title: "Clip Review Screen",
    status: "planned",
    bullets: [
      "All 8 clips listed with ✓/✗ approval status.",
      "Per-clip Preview, Regenerate, Edit buttons.",
      "Final Render button stays disabled until every clip is approved.",
    ],
    panel: {
      label: "Review checklist",
      lines: [
        "Clip 1  ✓",
        "Clip 2  ✓",
        "Clip 3  ✓",
        "Clip 4  ✓",
        "Clip 5  ✓",
        "Clip 6  ✓",
        "Clip 7  ✓",
        "Clip 8  ✓",
      ],
    },
  },
  {
    num: 7,
    icon: FileVideo,
    title: "Final Assemble",
    status: "done",
    bullets: [
      "Only runs after every clip is approved.",
      "Combines: audio + all approved clips + (optional) captions.",
      "Rendered locally via Remotion → final_reel.mp4.",
      "Currently the whole pipeline runs in one shot; this step needs to be gated behind the Clip Review screen.",
    ],
  },
];

const FUTURE_VERSIONS = [
  {
    label: "v1.1 — Control",
    items: [
      "Drag-to-reorder images",
      "Per-clip preview + individual regenerate",
      "Voice tweaks in plain English",
    ],
  },
  {
    label: "v2 — Multi-user cloud",
    items: [
      "Auth (Supabase / NextAuth)",
      "Postgres + Cloudflare R2 storage",
      "Background queue (Inngest) so renders don't block requests",
    ],
  },
  {
    label: "v3 — Distribution",
    items: [
      "One-click publish to Reels / Shorts / TikTok",
      "Voice cloning (own voice)",
      "Multi-language one-script-many-languages",
      "Pay-as-you-go billing (Razorpay)",
    ],
  },
] as const;

function VersionOnePlan() {
  return (
    <section className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/30">
            <Rocket className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Version 1 Plan</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              The full step-by-step workflow with per-clip control.
              <strong className="text-slate-800"> Video gen is expensive; the user must own the intermediate outputs.</strong>
              If clip 5 looks bad, regenerate only clip 5 — never the whole reel.
            </p>
          </div>
        </div>
        <div className="hidden gap-1.5 text-[0.7rem] sm:flex">
          <Legend status="done" label="Shipped" />
          <Legend status="partial" label="Partial" />
          <Legend status="planned" label="Planned" />
        </div>
      </div>

      <ol className="mt-8 space-y-4">
        {STEPS.map((s) => (
          <V1Step key={s.num} step={s} />
        ))}
      </ol>

      <div className="mt-10">
        <h3 className="text-base font-semibold text-slate-800">After V1</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FUTURE_VERSIONS.map((g) => (
            <div
              key={g.label}
              className="rounded-2xl border border-[#e8e8f0] bg-white p-4"
            >
              <p className="text-sm font-semibold text-violet-700">{g.label}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {g.items.map((it) => (
                  <li key={it} className="flex items-start gap-1.5">
                    <Circle className="mt-1 size-2 shrink-0 text-violet-300" fill="currentColor" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-violet-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">End-to-end workflow</h3>
        <pre className="mt-3 overflow-x-auto text-[0.78rem] leading-relaxed text-slate-700">
{`Paste Script
   ↓
Upload Images
   ↓
Generate Audio
   ↓
Preview Audio
   ↓
Regenerate Audio (optional, natural-language tweaks)
   ↓
Generate Motion Scripts (per image + script segment)
   ↓
Generate Video Clips (one at a time)
   ↓
Preview Each Clip
   ↓
Regenerate Individual Clips (cheap iteration)
   ↓
Approve Clips
   ↓
Combine Everything
   ↓
Final Reel`}
        </pre>
      </div>
    </section>
  );
}

function V1Step({ step }: { step: (typeof STEPS)[number] }) {
  const Icon = step.icon;
  const statusColor =
    step.status === "done"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : step.status === "partial"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  const statusLabel =
    step.status === "done" ? "Shipped" : step.status === "partial" ? "Partial" : "Planned";

  return (
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e8e8f0] bg-white p-5 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
            {step.num}
          </span>
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <h3 className="text-sm font-semibold">{step.title}</h3>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ring-inset ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[0.86rem] text-slate-600">
          {step.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      {step.panel && (
        <div className="rounded-xl border border-[#e8e8f0] bg-slate-50/60 p-3">
          <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
            {step.panel.label}
          </div>
          <pre className="mt-2 overflow-x-auto text-[0.78rem] leading-relaxed text-slate-700">
{step.panel.lines.join("\n")}
          </pre>
        </div>
      )}
    </li>
  );
}

function Legend({ status, label }: { status: V1Status; label: string }) {
  const cls =
    status === "done"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "partial"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}
