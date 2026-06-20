import {
  Camera,
  FileText,
  FileVideo,
  Mic,
  Music,
  Rocket,
  Upload,
  Wand2,
} from "lucide-react";

export const dynamic = "force-dynamic";

type V0Status = "done" | "partial" | "planned";

const STEPS: {
  num: number;
  icon: typeof FileText;
  title: string;
  status: V0Status;
  bullets: string[];
  panel?: { label: string; lines: string[] };
}[] = [
  {
    num: 1,
    icon: FileText,
    title: "Script Input",
    status: "done",
    bullets: [
      "User pastes a script (30–120 seconds).",
      "System analyses and displays Word count, Estimated voice duration, Estimated reel duration, Recommended number of images.",
    ],
    panel: {
      label: "Live analyser",
      lines: [
        "Words: 182",
        "Estimated voice: 72 sec",
        "Estimated reel: 72 sec",
        "Recommended images: 8",
      ],
    },
  },
  {
    num: 2,
    icon: Mic,
    title: "AI Voice Generation",
    status: "partial",
    bullets: [
      "Generate a high-quality, human-like voiceover (Edge TTS Hindi/Indian or ElevenLabs English).",
      "Audio preview player with ▶ Play · duration · voice name.",
      "Regenerate unlimited times — endpoint already wired (/api/projects/[id]/regenerate-voice).",
      "TODO: voice customization instructions — 'more emotional', 'documentary style', 'deep male', 'warm female'.",
      "Output: final approved audio file + exact audio duration.",
    ],
    panel: {
      label: "Customization (planned)",
      lines: [
        "More emotional",
        "More energetic",
        "Slower pacing",
        "Documentary style",
        "Deep male voice",
        "Warm female voice",
      ],
    },
  },
  {
    num: 3,
    icon: Music,
    title: "Background Music Selection",
    status: "planned",
    bullets: [
      "User picks a track from a built-in royalty-free music library.",
      "Preview tracks before selecting.",
      "Adjust music volume (0–100%) so it ducks under the voice.",
      "Replace music anytime without re-doing voiceover.",
      "System mixes Voiceover + Background Music with ffmpeg ducking → single track for assembly.",
    ],
  },
  {
    num: 4,
    icon: Wand2,
    title: "Image Planning & Motion Direction",
    status: "partial",
    bullets: [
      "User uploads 6–12 images.",
      "Claude splits the script into image segments matched 1:1 with images.",
      "For every image, system computes Duration based on narration timing.",
      "For every image, Claude writes a Motion direction — Motion, Camera, Focus, Emotion.",
      "Output is a downloadable plan the user takes to their image-to-video tool.",
    ],
    panel: {
      label: "Per-image plan output",
      lines: [
        "Image 1",
        "  Duration: 4.8 sec",
        "  Motion: Slow Push In",
        "  Focus: Question Mark",
        "  Emotion: Mystery",
        "",
        "Image 2",
        "  Duration: 6.1 sec",
        "  Motion: Orbit Center",
        "  Focus: Zodiac Wheel",
        "  Emotion: Discovery",
      ],
    },
  },
  {
    num: 5,
    icon: Camera,
    title: "External Image-to-Video Generation",
    status: "done",
    bullets: [
      "User takes each image + its motion direction into Google Flow / Veo / Runway / Pika.",
      "Generates each clip externally using their own credits (e.g. 864 free Flow credits).",
      "ReelForge does NOT call any I2V API → zero per-clip cost for the platform.",
      "Output: a folder of clip_1.mp4 … clip_n.mp4 the user downloads.",
    ],
  },
  {
    num: 6,
    icon: Upload,
    title: "Upload Generated Video Clips",
    status: "planned",
    bullets: [
      "User drags-drops all clips back into ReelForge in the right order.",
      "System validates: filename / order match the plan, expected duration ± tolerance, codec OK.",
      "Per-clip status: ✓ accepted · ⚠ duration mismatch · ✗ unreadable.",
      "User can swap a clip in place without re-doing the rest.",
    ],
  },
  {
    num: 7,
    icon: FileVideo,
    title: "Final Reel Assembly",
    status: "partial",
    bullets: [
      "ReelForge combines: uploaded clips + approved voice+music track + auto-generated captions + basic transitions.",
      "Rendered locally via Remotion (or ffmpeg concat for the fast path) → final_reel.mp4.",
      "Today the assembler runs on Ken-Burns-still-images instead of uploaded video clips — needs the upload step (6) to land first.",
    ],
  },
];

export default function V0PlanPage() {
  const total = STEPS.length;
  const doneCount = STEPS.filter((s) => s.status === "done").length;
  const partialCount = STEPS.filter((s) => s.status === "partial").length;
  const plannedCount = STEPS.filter((s) => s.status === "planned").length;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Rocket className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Version 0 Plan</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              The MVP that ships first. ReelForge handles planning, audio,
              motion direction, and final assembly — but the user generates
              the actual image-to-video clips externally (Flow / Veo /
              Runway). Keeps the platform <strong>simple, fast, and
              affordable</strong> while creators tap the best I2V models with
              their own credits.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Shipped" value={`${doneCount} / ${total}`} tone="done" />
          <StatCard label="In progress" value={`${partialCount} / ${total}`} tone="partial" />
          <StatCard label="Planned" value={`${plannedCount} / ${total}`} tone="planned" />
        </div>
      </header>

      <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">V0 — full workflow</h2>
          <div className="hidden gap-1.5 text-[0.7rem] sm:flex">
            <Legend status="done" label="Shipped" />
            <Legend status="partial" label="Partial" />
            <Legend status="planned" label="Planned" />
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          ReelForge owns steps 1–4, 6, 7. The user owns step 5 (their I2V
          tool of choice). Best for testing immediately without API costs.
        </p>

        <ol className="mt-8 space-y-4">
          {STEPS.map((s) => (
            <V0Step key={s.num} step={s} />
          ))}
        </ol>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">
              V0 philosophy
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              ReelForge does <strong>not</strong> generate image-to-video
              clips itself. It is the planning, audio, timing, motion-direction
              and final-assembly engine. Creators use whichever I2V model is
              best on the day — Veo today, Sora tomorrow — and ReelForge stays
              the constant glue.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">
              Why this is the right MVP
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span><strong>₹0 per reel</strong> in I2V cost — user spends their own Flow / Veo credits.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Ships in days, not months.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Locks in the planning + assembly UX (the hard parts) before adding I2V automation in V1.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Model-agnostic — works the same whether the user picks Flow, Runway, Pika or Kling.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-800">End-to-end workflow</h3>
          <pre className="mt-3 overflow-x-auto text-[0.78rem] leading-relaxed text-slate-700">
{`Paste Script
   ↓
Live stats (words, duration, recommended images)
   ↓
Generate Voiceover
   ↓
Preview & regenerate audio (unlimited)
   ↓
Pick Background Music
   ↓
Upload Images (6–12)
   ↓
ReelForge writes per-image Motion Direction plan
   ↓
[ User exits to Google Flow / Veo / Runway ]
[ Generates each clip externally with their own credits ]
[ Downloads clip_1.mp4 … clip_n.mp4 ]
   ↓
Upload all generated clips back into ReelForge
   ↓
ReelForge validates order, duration, codec
   ↓
Final assembly: clips + voice + music + captions
   ↓
final_reel.mp4`}
          </pre>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">V0 → V1 transition</h2>
        <p className="mt-1 text-sm text-slate-500">
          When V0 is solid and the UX feels right, V1 plugs the I2V step into
          ReelForge itself so the user never has to leave.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>Step 5 becomes "Generate Clips" — calls fal.ai Kling / Segmind Veo per image, same per-clip Preview / Regenerate / Edit Motion UX from the V1 spec.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>Step 6 disappears (no manual upload) but stays available as a fallback for users who still want to bring their own clips.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>Everything else stays identical — that&apos;s the payoff of getting the planning + assembly right in V0.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function V0Step({ step }: { step: (typeof STEPS)[number] }) {
  const Icon = step.icon;
  const statusColor =
    step.status === "done"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : step.status === "partial"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  const statusLabel =
    step.status === "done"
      ? "Shipped"
      : step.status === "partial"
        ? "Partial"
        : "Planned";

  return (
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e8e8f0] bg-white p-5 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
            {step.num}
          </span>
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
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

function Legend({ status, label }: { status: V0Status; label: string }) {
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
  tone: V0Status;
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
