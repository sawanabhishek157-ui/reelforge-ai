import {
  CheckCircle2,
  Circle,
  Clapperboard,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Mic,
  Rocket,
  Wand2,
} from "lucide-react";

export const dynamic = "force-dynamic";

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
      "Images saved on disk under public/projects/<id>/references/.",
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
        "{",
        '  "camera": "slow_push_in",',
        '  "focus": "question_mark",',
        '  "emotion": "mystery"',
        "}",
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

export default function RoadmapPage() {
  const total = STEPS.length;
  const doneCount = STEPS.filter((s) => s.status === "done").length;
  const partialCount = STEPS.filter((s) => s.status === "partial").length;
  const plannedCount = STEPS.filter((s) => s.status === "planned").length;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/30">
            <Rocket className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Version plans</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Where ReelForge is going. Video gen is expensive — the user must own the
              intermediate outputs. If clip 5 looks bad, regenerate only clip 5, never the whole reel.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Shipped" value={`${doneCount} / ${total}`} tone="done" />
          <StatCard label="In progress" value={`${partialCount} / ${total}`} tone="partial" />
          <StatCard label="Planned" value={`${plannedCount} / ${total}`} tone="planned" />
        </div>
      </header>

      <section className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">Version 1 — full workflow</h2>
          <div className="hidden gap-1.5 text-[0.7rem] sm:flex">
            <Legend status="done" label="Shipped" />
            <Legend status="partial" label="Partial" />
            <Legend status="planned" label="Planned" />
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Each step is a checkpoint. The user approves the output before the next
          step runs.
        </p>

        <ol className="mt-8 space-y-4">
          {STEPS.map((s) => (
            <V1Step key={s.num} step={s} />
          ))}
        </ol>

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

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">After V1</h2>
        <p className="mt-1 text-sm text-slate-500">
          What we add once V1 is rock-solid.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FUTURE_VERSIONS.map((g) => (
            <div
              key={g.label}
              className="rounded-2xl border border-[#e8e8f0] bg-slate-50/60 p-4"
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
      </section>
    </div>
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: V1Status;
}) {
  const cls =
    tone === "done"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "partial"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="text-[0.65rem] font-semibold tracking-wide uppercase opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold">{value}</div>
    </div>
  );
}
