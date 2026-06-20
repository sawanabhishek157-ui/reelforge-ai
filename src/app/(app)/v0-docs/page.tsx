import fs from "node:fs";
import path from "node:path";

import {
  Activity,
  Brain,
  Camera,
  Clapperboard,
  Cpu,
  Database,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Layers,
  Mic,
  Music,
  Network,
  Rocket,
  Server,
  Sparkles,
  Upload,
  Wand2,
  Workflow,
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
  return (pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? "—").replace(
    /^\^|^~/,
    "",
  );
}

const STEPS = [
  {
    num: 1,
    icon: FileText,
    title: "Script Input",
    what: "Accept the script and show live stats so the user knows what they're working with.",
    tech: ["Next.js client component", "React state", "src/lib/duration.ts helpers (countWords, countChars, estimateDurationSec)"],
    code: "src/app/(app)/create-v0/page.tsx · Step 1 card · STATs computed via useMemo",
    api: "None — pure client state until the user hits Generate Voice",
  },
  {
    num: 2,
    icon: Mic,
    title: "AI Voice Generation",
    what: "Create a script-only project, run Claude as a voice director, then render TTS using the resulting Speech Performance Plan.",
    tech: [
      "POST /api/projects (no images yet, just script + voiceId + aspect)",
      "POST /api/projects/[id]/regenerate-voice",
      "Claude Haiku 4.5 via @anthropic-ai/sdk — generates / revises SpeechPlan",
      "msedge-tts for free native Hindi & Indian-English voices",
      "ElevenLabs v3 multilingual for premium English voices",
      "ffmpeg concat-demuxer for joining per-sentence Edge TTS chunks with silent pauses",
    ],
    code: "src/lib/speech-plan.ts · src/lib/tts.ts · src/app/api/projects/[id]/regenerate-voice/route.ts",
    api: "GET /api/voice-sample?id=<voiceId> — cached one-line MP3 samples for the 'Hear sample' buttons",
  },
  {
    num: 3,
    icon: Music,
    title: "Background Music",
    what: "Pick a mood, preview it, then mix under the voice with ffmpeg ducking.",
    tech: [
      "Curated mood library in src/lib/music.ts (7 moods + 'no music')",
      "GET /api/music returns live availability (checks which MP3s exist on disk)",
      "POST /api/projects/[id]/mix-audio runs ffmpeg amix with volume control + stream_loop",
      "Placeholder ambient tracks generated via scripts/generate-placeholder-music.sh (ffmpeg lavfi sine-wave chords)",
    ],
    code: "src/lib/music.ts · src/app/api/music/route.ts · src/app/api/projects/[id]/mix-audio/route.ts · public/music/*.mp3",
    api: "Replace any public/music/<mood>.mp3 with real royalty-free tracks (Pixabay / Uppbeat / Incompetech)",
  },
  {
    num: 4,
    icon: ImageIcon,
    title: "Upload Images (order is final)",
    what: "Add 1–12 images to the existing project. Upload order = scene order.",
    tech: [
      "POST /api/projects/[id]/images — new endpoint, multipart form, replaces previous references",
      "Files saved under public/projects/<id>/references/ref-NN.<ext>",
      "Numbered overlay (1..N) shown on each thumbnail in the UI",
    ],
    code: "src/app/api/projects/[id]/images/route.ts · src/app/(app)/create-v0/page.tsx Step 4 card",
    api: "POST /api/projects/[id]/images  multipart: images[]=<File>",
  },
  {
    num: 5,
    icon: Activity,
    title: "Audio Timeline Analysis · core feature",
    what: "Claude splits the script into N segments (one per image) with start/end times.",
    tech: [
      "POST /api/projects/[id]/plan — Claude Haiku 4.5 splits script with strict 1:1 mapping rules",
      "POST /api/projects/[id]/generate — enforces 1:1 mapping server-side even if Claude misbehaves",
      "ffprobe measures real voiceover duration and timings are rescaled to fit",
    ],
    code: "src/lib/claude.ts (planReel) · src/app/api/projects/[id]/plan/route.ts · src/app/api/projects/[id]/generate/route.ts",
    api: "POST /api/projects/[id]/plan → returns scene plan JSON",
  },
  {
    num: 6,
    icon: Wand2,
    title: "Motion Direction Generation",
    what: "Default motion prompts are written per-image (Slow Push In · Dolly Forward · etc.) — user can edit each one.",
    tech: [
      "defaultMotion() in the create-v0 page detects keywords (question, love, dream, kundali) and assigns a fitting motion",
      "Each scene gets an editable textarea so the user owns the final motion direction",
    ],
    code: "src/app/(app)/create-v0/page.tsx · defaultMotion + ScenePlan component",
    api: "Pure client-side — motion prompts live in component state and ship out via the plan-export step",
  },
  {
    num: 7,
    icon: Camera,
    title: "External Image-to-Video (Flow / Veo / Runway)",
    what: "User exports the per-image plan, generates each clip externally with their own credits, downloads MP4s.",
    tech: [
      "Plain client-side: navigator.clipboard.writeText(planText) and Blob download for .md",
      "Plan text is a Markdown table per image (Text · Duration · Motion)",
    ],
    code: "src/app/(app)/create-v0/page.tsx · planText useMemo + copyPlan / downloadPlan",
    api: "External (Google Flow, Runway, Pika, Kling, etc.)",
  },
  {
    num: 8,
    icon: Upload,
    title: "Upload Generated Clips",
    what: "Bring the externally-generated MP4 clips back into the project, in scene order.",
    tech: [
      "POST /api/projects/[id]/upload-clips — multipart with clip_0, clip_1, … MP4 files",
      "Saved under public/projects/<id>/clips/clip-NN.mp4 with idx in meta",
      "Replaces any previously-uploaded clips — fully idempotent",
      "GET /api/projects/[id]/upload-clips lists the current clips",
    ],
    code: "src/app/api/projects/[id]/upload-clips/route.ts",
    api: "POST /api/projects/[id]/upload-clips  multipart: clip_0=<File>, clip_1=<File>, …",
  },
  {
    num: 9,
    icon: FileVideo,
    title: "Final Reel Assembly",
    what: "ffmpeg concat-demuxer joins clips + replaces audio with the mixed voice+music track.",
    tech: [
      "POST /api/projects/[id]/assemble-v0",
      "Spawns ffmpeg concat with libx264 + AAC, -shortest so audio + video stay in sync",
      "Writes public/projects/<id>/output.mp4 served with Accept-Ranges for browser scrubbing",
    ],
    code: "src/app/api/projects/[id]/assemble-v0/route.ts",
    api: "POST /api/projects/[id]/assemble-v0 → returns outputUrl",
  },
] as const;

const TECH = [
  {
    icon: Cpu,
    title: "Frontend (V0 wizard)",
    rows: [
      { name: "next", role: "App Router page + API routes" },
      { name: "react", role: "Multi-step wizard with client state — no DB for wizard progress, just project id" },
      { name: "typescript", role: "Strict mode across the V0 wizard, planner, and TTS layer" },
      { name: "tailwindcss", role: "All styling — emerald = V0 theme, violet = Speech Plan" },
      { name: "lucide-react", role: "Step icons + action icons" },
      { name: "clsx", role: "Conditional classnames for the locked/active/done step states" },
    ],
  },
  {
    icon: Brain,
    title: "AI — Speech Performance Plan",
    rows: [
      { name: "@anthropic-ai/sdk", role: "Claude Haiku 4.5 — generates and revises the SpeechPlan from the script" },
    ],
  },
  {
    icon: Mic,
    title: "AI — Voiceover (TTS)",
    rows: [
      { name: "msedge-tts", role: "Microsoft Edge TTS — FREE Hindi (Swara, Madhur) + Indian English (Neerja, Prabhat). Per-sentence rate/pitch driven by the SpeechPlan." },
      { name: "openai", role: "(reserved) gpt-4o-mini-tts via steerable `instructions` parameter when we wire it in" },
    ],
  },
  {
    icon: Music,
    title: "Audio mixing & assembly",
    rows: [
      { name: "ffmpeg (system)", role: "Per-sentence Edge concat · voice+music ducking via amix · final video concat + AAC mux" },
      { name: "ffprobe (system)", role: "Real audio duration measurement for timing rescale" },
    ],
  },
  {
    icon: Database,
    title: "Storage & data",
    rows: [
      { name: "better-sqlite3", role: "Single-file DB at data/reelforge.db — lazy singleton so build steps don't deadlock" },
    ],
  },
] as const;

export default function V0DocsPage() {
  const pkg = readPkg();
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Rocket className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">V0 — Tech &amp; build docs</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Everything used to build <strong>Create Video — V0</strong>:
              every tech, every endpoint, every file, every step. Source of
              truth for new contributors and future-you.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Workflow className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">End-to-end V0 pipeline</h2>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-5 text-[0.78rem] leading-relaxed text-slate-100">
{`[ Browser — /create-v0 wizard ]
        │
        ▼  Step 1   user pastes script (no DB yet)
        ▼  Step 2   POST /api/projects                  → project row (script-only)
                    POST /api/projects/[id]/regenerate-voice
                       └─ Claude generates SpeechPlan
                       └─ Edge TTS renders per-sentence with rate/pitch
                       └─ ffmpeg concat parts + silence pads
                       └─ voice.mp3 saved + SpeechPlan stored in DB
        ▼  Step 3   POST /api/projects/[id]/mix-audio   → ffmpeg amix
        ▼  Step 4   POST /api/projects/[id]/images      → ref-NN.png saved
        ▼  Step 5   POST /api/projects/[id]/plan        → Claude 1:1 scene plan
                    POST /api/projects/[id]/generate    → server forces 1:1, rescales timings
        ▼  Step 6   defaultMotion() per scene           → editable motion prompts
        ▼  Step 7   client export — copy / download .md → USER LEAVES TO FLOW/VEO
        ▼  Step 8   POST /api/projects/[id]/upload-clips → clip-NN.mp4 saved
        ▼  Step 9   POST /api/projects/[id]/assemble-v0
                       └─ ffmpeg concat clips + voice.mp3 + AAC mux
                       └─ output.mp4 saved + status='done'
        │
        ▼
[ public/projects/<id>/output.mp4 ]    served via Next.js static handler
                                       Accept-Ranges enabled for scrubbing`}
        </pre>
      </section>

      <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Sparkles className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Speech Performance Plan — deep dive</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          The core idea of V0: voice quality depends more on directing than on
          the voice model itself. Before any TTS call, Claude writes a per-sentence
          plan with emotion, energy, speed, pauses, and emphasis words.
        </p>

        <h3 className="mt-5 text-sm font-semibold text-slate-800">Plan shape</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-4 text-[0.78rem] leading-relaxed text-slate-700">
{`{
  "reelType": "hook" | "explainer" | "story" | "ad" | "tutorial",
  "overallTone": "mysterious, curious, revelatory",
  "sentences": [
    {
      "text": "Kya astrologers sach mein aapke soulmate ke baare mein bata sakte hain?",
      "emotion": "curious",
      "energy": "medium",
      "speed": "normal",
      "pauseBeforeMs": 0,
      "pauseAfterMs": 0,
      "emphasis": ["sach mein", "soulmate"]
    },
    ...
  ]
}`}
        </pre>

        <h3 className="mt-5 text-sm font-semibold text-slate-800">Per-provider formatters</h3>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Strategy</th>
              <th className="py-2 pr-4">Helper</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            <tr>
              <td className="py-2 pr-4 font-semibold">ElevenLabs v3</td>
              <td className="py-2 pr-4 text-slate-600">Inject inline audio tags <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">[emotion]</code>, <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">[pause Xms]</code>, CAPS for emphasis. Sets stability=0.3 (Creative).</td>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">planToElevenLabsScript()</code></td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold">Edge TTS (Hindi)</td>
              <td className="py-2 pr-4 text-slate-600">Render each sentence with its own rate/pitch via msedge-tts options, write silent pads for pauses, concat with ffmpeg.</td>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">planToEdgeChunks()</code></td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold">OpenAI gpt-4o-mini-tts</td>
              <td className="py-2 pr-4 text-slate-600">Build a free-text <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">instructions</code> string from overall tone + top-3 emotions.</td>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">planToOpenAIInstructions()</code></td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-5 text-sm font-semibold text-slate-800">Feedback loop</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-4 text-[0.78rem] leading-relaxed text-slate-700">
{`POST /api/projects/[id]/regenerate-voice
{
  "voiceId":  "hi-IN-SwaraNeural",
  "feedback": "more dramatic, longer pauses",   // optional
  "resetPlan": false                            // optional — start over
}

When feedback is provided, revisePlanWithFeedback() asks Claude to
KEEP THE TEXT and only adjust emotion/energy/speed/pauses/emphasis.
The script never changes — only the direction. Then render.`}
        </pre>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Layers className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Per-step build details</h2>
        </div>

        <ol className="mt-5 space-y-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.num}
                className="rounded-2xl border border-[#e8e8f0] bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                    {s.num}
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-700">{s.what}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                      Tech &amp; libs
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                      {s.tech.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                      Code location
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.7rem] text-slate-700">
                        {s.code}
                      </code>
                    </p>
                    <div className="mt-3 text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                      API
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {s.api}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {TECH.map((sec) => {
        const Icon = sec.icon;
        return (
          <section
            key={sec.title}
            className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <h2 className="text-lg font-semibold">{sec.title}</h2>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="py-2 pr-4">Package</th>
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Role in V0</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8f0]">
                  {sec.rows.map((r) => (
                    <tr key={r.name}>
                      <td className="py-2 pr-4">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                          {r.name}
                        </code>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-700">
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
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Server className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">API surface used by V0</h2>
        </div>
        <table className="mt-4 min-w-full text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-4">Method</th>
              <th className="py-2 pr-4">Path</th>
              <th className="py-2 pr-4">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects</code></td><td className="py-2 pr-4 text-slate-600">Create project (images optional in V0)</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/images</code></td><td className="py-2 pr-4 text-slate-600">Add/replace reference images on existing project</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/regenerate-voice</code></td><td className="py-2 pr-4 text-slate-600">Generate/regenerate voice using SpeechPlan; accepts optional NL feedback</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/mix-audio</code></td><td className="py-2 pr-4 text-slate-600">Mix voice + chosen mood music (ffmpeg amix)</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/plan</code></td><td className="py-2 pr-4 text-slate-600">Claude builds 1:1 image→scene timing plan</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/generate</code></td><td className="py-2 pr-4 text-slate-600">Enforces 1:1 mapping + rescales timings to actual voice duration</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST / GET</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/upload-clips</code></td><td className="py-2 pr-4 text-slate-600">Upload externally-generated MP4 clips · list current clips</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">POST</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/projects/[id]/assemble-v0</code></td><td className="py-2 pr-4 text-slate-600">ffmpeg concat clips + replace audio with mixed voice → output.mp4</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">GET</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{`/api/voice-sample?id=<voiceId>`}</code></td><td className="py-2 pr-4 text-slate-600">Cached short MP3 sample per voice for the &ldquo;Hear sample&rdquo; button</td></tr>
            <tr><td className="py-2 pr-4 font-semibold">GET</td><td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/music</code></td><td className="py-2 pr-4 text-slate-600">Returns mood library + per-mood "available" (MP3 exists on disk?)</td></tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Database className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Database schema used by V0</h2>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-5 text-[0.78rem] leading-relaxed text-slate-700">
{`projects
  id                TEXT PK
  title             TEXT
  duration_sec      INTEGER          -- real voiceover duration after generation
  script            TEXT             -- the raw input script
  voice_id          TEXT             -- last-used voice
  aspect            TEXT             -- '9:16' / '1:1' / '16:9'
  plan_json         TEXT             -- SCENE plan (Step 5)
  speech_plan_json  TEXT             -- SPEECH PERFORMANCE plan (Step 2)
  voiceover_path    TEXT             -- /projects/<id>/voice.mp3 (or mixed)
  output_path       TEXT             -- /projects/<id>/output.mp4
  status            TEXT             -- draft → generated → done | failed
  error             TEXT
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP

project_assets
  id            TEXT PK
  project_id    TEXT FK → projects(id)
  kind          TEXT  -- 'reference' (uploaded images) | 'clip' (V0 step 8 MP4s)
  file_path     TEXT  -- path under /public/
  meta          TEXT  -- JSON: idx, originalName, size
  created_at    TEXT

scenes
  id          TEXT PK
  project_id  TEXT FK
  idx         INTEGER       -- 0..N-1, runs through 1:1 with reference images
  start_sec   REAL
  end_sec     REAL
  source      TEXT          -- always 'reference' in V0
  image_path  TEXT          -- path under /public/
  caption     TEXT          -- the script segment for this scene
  prompt      TEXT          -- (reserved)
  zoom        TEXT          -- motion: zoom-in / zoom-out / pan-left / pan-right`}
        </pre>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Clapperboard className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Code map (V0 files)</h2>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-5 text-[0.78rem] leading-relaxed text-slate-700">
{`src/
├── app/
│   ├── (app)/
│   │   ├── create-v0/page.tsx               9-step wizard (this is the V0 UI)
│   │   ├── v0-plan/page.tsx                 V0 plan / status / roadmap
│   │   └── v0-docs/page.tsx                 ← YOU ARE HERE
│   └── api/
│       ├── projects/
│       │   ├── route.ts                     create project (images optional)
│       │   └── [id]/
│       │       ├── images/route.ts          add images later
│       │       ├── regenerate-voice/        SpeechPlan + TTS
│       │       ├── mix-audio/               voice + music ducking
│       │       ├── plan/                    Claude scene plan
│       │       ├── generate/                enforces 1:1 mapping
│       │       ├── upload-clips/            user uploads external MP4s
│       │       └── assemble-v0/             ffmpeg concat + mux
│       ├── music/route.ts                   list mood library
│       └── voice-sample/route.ts            short cached voice samples
├── lib/
│   ├── speech-plan.ts                       Claude voice-director + formatters
│   ├── tts.ts                               Edge TTS (per-sentence) + ElevenLabs v3
│   ├── claude.ts                            Scene planner (1:1 mapping)
│   ├── music.ts                             7-mood catalog
│   ├── db.ts                                lazy SQLite singleton + migrations
│   ├── paths.ts                             public/projects/<id>/ layout
│   └── duration.ts                          word/char counters + estimates
└── components/layout/Sidebar.tsx            V0 sidebar items live here

public/
├── projects/<id>/                           per-project assets (gitignored)
│   ├── references/ref-NN.png                Step 4 uploads
│   ├── clips/clip-NN.mp4                    Step 8 uploads
│   ├── voice.mp3                            Step 2/3 final audio
│   └── output.mp4                           Step 9 final reel
├── music/<mood>.mp3                         Step 3 mood library
└── voice-samples/<voiceId>.mp3              cached samples`}
        </pre>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Network className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-lg font-semibold">Required env vars &amp; system binaries</h2>
        </div>
        <table className="mt-4 min-w-full text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Required for</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            <tr>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code></td>
              <td className="py-2 pr-4 text-slate-600">Required — Claude does the SpeechPlan + scene plan</td>
              <td className="py-2 pr-4 text-slate-500">Get at console.anthropic.com</td>
            </tr>
            <tr>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ELEVENLABS_API_KEY</code></td>
              <td className="py-2 pr-4 text-slate-600">Only if you pick an English ElevenLabs voice</td>
              <td className="py-2 pr-4 text-slate-500">10k free chars/month, no card needed</td>
            </tr>
            <tr>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ffmpeg</code></td>
              <td className="py-2 pr-4 text-slate-600">Required — voice concat, music mix, final reel assembly</td>
              <td className="py-2 pr-4 text-slate-500"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">brew install ffmpeg</code></td>
            </tr>
            <tr>
              <td className="py-2 pr-4"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ffprobe</code></td>
              <td className="py-2 pr-4 text-slate-600">Required — measures real voice duration to rescale scene timings</td>
              <td className="py-2 pr-4 text-slate-500">ships with ffmpeg</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
