import {
  Activity,
  Camera,
  FileText,
  FileVideo,
  Image as ImageIcon,
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
      "User pastes a script.",
      "System displays Word count, Estimated audio duration, Estimated reel duration.",
    ],
    panel: {
      label: "Live analyser",
      lines: ["Words: 182", "Estimated audio: 72 sec", "Estimated reel: 72 sec"],
    },
  },
  {
    num: 2,
    icon: Mic,
    title: "AI Voice Generation",
    status: "partial",
    bullets: [
      "Generate a realistic voiceover from the script.",
      "Multiple voice options (Edge TTS Hindi/Indian — free, or ElevenLabs English).",
      "Audio preview player.",
      "Unlimited regeneration — endpoint already wired (/api/projects/[id]/regenerate-voice).",
      "TODO: voice instruction tweaks — 'more emotional', 'documentary style', 'slower', 'faster', 'deep male voice'.",
      "Output: final audio file + exact audio duration.",
    ],
    panel: {
      label: "Voice instructions (planned)",
      lines: [
        "More emotional",
        "Documentary style",
        "Slower",
        "Faster",
        "Deep male voice",
        "Warm female voice",
      ],
    },
  },
  {
    num: 3,
    icon: Music,
    title: "Background Music",
    status: "planned",
    bullets: [
      "User picks a track from a built-in royalty-free music library.",
      "Preview music tracks before selecting.",
      "Volume control (0–100%) so the music ducks under the voice.",
      "Replace music anytime without re-doing voiceover.",
      "Output: final mixed audio track — Voice + Background Music.",
    ],
  },
  {
    num: 4,
    icon: ImageIcon,
    title: "Upload Images",
    status: "done",
    bullets: [
      "User uploads images in the EXACT order they want them to appear.",
      "ReelForge does NOT reorder — the uploaded order is final.",
      "Images saved on disk under public/projects/<id>/references/.",
    ],
    panel: {
      label: "Upload order is final",
      lines: ["Image 1", "Image 2", "Image 3", "Image 4", "..."],
    },
  },
  {
    num: 5,
    icon: Activity,
    title: "Audio Timeline Analysis  · core feature",
    status: "partial",
    bullets: [
      "The system reads the final voiceover, the script and the image count.",
      "Automatically splits the narration into one section per image.",
      "For every image computes Script segment, Start time, End time, Audio duration, Recommended clip length.",
      "Claude already plans scene captions + per-scene timings — surfacing the per-image readable plan is the remaining work.",
    ],
    panel: {
      label: "Per-image plan (example)",
      lines: [
        "Image 1",
        '  Text: "Kya astrologers sach mein soulmate"',
        "  Clip length: 4.8 sec",
        "",
        "Image 2",
        '  Text: "Ya phir ye sab random guessing hai?"',
        "  Clip length: 3.5 sec",
        "",
        "Image 3",
        '  Text: "Jab aapne apni pehli saans li thi..."',
        "  Clip length: 5.2 sec",
      ],
    },
  },
  {
    num: 6,
    icon: Wand2,
    title: "Motion Direction Generation",
    status: "partial",
    bullets: [
      "For every image, Claude writes a one-sentence motion prompt tied to that script segment.",
      "Same vision-based prompt used today on the Image → Video page — just generated per image in batch.",
      "Output per image: Script segment + Clip duration + Motion direction.",
    ],
    panel: {
      label: "Motion direction (example)",
      lines: [
        "Image 1",
        "  Motion: Slow cinematic push toward question mark",
        "  Duration: 4.8 sec",
        "",
        "Image 2",
        "  Motion: Slow zoom into zodiac wheel",
        "  Duration: 3.5 sec",
        "",
        "Image 3",
        "  Motion: Dolly forward toward couple",
        "  Duration: 5.2 sec",
      ],
    },
  },
  {
    num: 7,
    icon: Camera,
    title: "External Image-to-Video Generation",
    status: "done",
    bullets: [
      "User copies Image + Clip duration + Motion direction into Google Flow / Veo / Runway / Pika.",
      "Generates each clip externally using their own credits (eg. 864 free Flow credits).",
      "ReelForge does NOT call any I2V API → zero per-clip cost for the platform.",
      "Output: clip_1.mp4 … clip_n.mp4 the user downloads.",
    ],
  },
  {
    num: 8,
    icon: Upload,
    title: "Upload Generated Clips",
    status: "planned",
    bullets: [
      "User drags-drops all generated clips back into ReelForge in the same order as the images.",
      "System validates per clip: expected duration ± tolerance, codec, resolution.",
      "Per-clip status: ✓ accepted · ⚠ duration mismatch · ✗ unreadable.",
      "User can swap a single clip in place without re-doing the rest.",
    ],
  },
  {
    num: 9,
    icon: FileVideo,
    title: "Final Reel Assembly",
    status: "partial",
    bullets: [
      "ReelForge combines: uploaded clips + voice + music + auto-generated captions + basic transitions.",
      "Rendered locally via Remotion (or ffmpeg concat) → final_reel.mp4.",
      "Today the assembler still runs on Ken-Burns stills; switching to uploaded clips lands once step 8 ships.",
    ],
  },
];

const DIRECTOR_DECISIONS = [
  "What text belongs to each image",
  "How long each image clip should be",
  "What camera movement should be used",
  "How everything should be assembled — clips + voice + music + captions",
] as const;

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
            <h1 className="text-2xl font-semibold">Version 0 — AI Reel Director</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Help creators convert a script and manually-created images into
              a complete reel.{" "}
              <strong className="text-slate-900">
                ReelForge does NOT generate image-to-video clips.
              </strong>{" "}
              It handles voice, timing, music, motion direction and assembly
              — leaving the actual clip generation to whichever external tool
              the creator prefers.
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
          <h2 className="text-xl font-semibold">V0 — full workflow (9 steps)</h2>
          <div className="hidden gap-1.5 text-[0.7rem] sm:flex">
            <Legend status="done" label="Shipped" />
            <Legend status="partial" label="Partial" />
            <Legend status="planned" label="Planned" />
          </div>
        </div>

        <ol className="mt-6 space-y-4">
          {STEPS.map((s) => (
            <V0Step key={s.num} step={s} />
          ))}
        </ol>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
            <h3 className="text-sm font-semibold text-emerald-900">
              ✦ ReelForge is an AI Reel Director
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
              Not an image-to-video generator. ReelForge is the director who
              decides:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-emerald-900">
              {DIRECTOR_DECISIONS.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-emerald-900/80">
              External tools like Google Flow / Veo / Runway do the actual
              camera work. ReelForge is the brain on top.
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
                <span>Locks in the planning + assembly UX before adding I2V automation in V1.</span>
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
Live stats (words, duration)
   ↓
Generate Voiceover
   ↓
Preview & regenerate audio (unlimited)
   ↓
Pick Background Music
   ↓
Upload Images (ORDER IS FINAL)
   ↓
Audio Timeline Analysis — split narration per image
   ↓
Motion Direction Generation — Claude writes per-image motion prompt
   ↓
[ Export plan: image + duration + motion direction ]
[ User generates clips in Google Flow / Veo / Runway ]
[ Downloads clip_1.mp4 … clip_n.mp4 ]
   ↓
Upload Generated Clips back into ReelForge
   ↓
ReelForge validates order, duration, codec
   ↓
Final Assembly: clips + voice + music + captions + transitions
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
            <span>Step 7 becomes "Generate Clips" — calls fal.ai Kling / Segmind Veo per image, with the V1 per-clip Preview / Regenerate / Edit Motion UX.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>Step 8 stays available as a fallback for users who still want to bring their own clips.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>Everything else stays identical — the payoff of getting the planning + assembly right in V0.</span>
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
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e8e8f0] bg-white p-5 lg:grid-cols-[1fr_320px]">
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
