"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mic,
  Music,
  Play,
  Rocket,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";
import {
  MAX_DURATION_SEC,
  MAX_SCRIPT_CHARS,
  countChars,
  countWords,
  estimateDurationSec,
} from "@/lib/duration";

const VOICE_OPTIONS = [
  { id: "hi-IN-SwaraNeural", label: "Swara — Hindi female (FREE)", style: "हिंदी · Warm" },
  { id: "hi-IN-MadhurNeural", label: "Madhur — Hindi male (FREE)", style: "हिंदी · Friendly" },
  { id: "en-IN-NeerjaNeural", label: "Neerja — Indian English f. (FREE)", style: "Clear" },
  { id: "en-IN-PrabhatNeural", label: "Prabhat — Indian English m. (FREE)", style: "Confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — English female", style: "Soft (ElevenLabs)" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — English female", style: "Calm (ElevenLabs)" },
] as const;

type Scene = {
  idx: number;
  startSec: number;
  endSec: number;
  imageUrl: string;
  caption: string;
};
type GenResponse = {
  voiceoverUrl: string;
  durationSec: number;
  scenes: Scene[];
};
type Clip = { idx: number; url: string; size: number; originalName?: string };

type PhaseState = "locked" | "active" | "done";

export default function CreateV0Page() {
  // ───────────────────────────── Step 1: Script
  const [script, setScript] = useState("");
  const wordCount = useMemo(() => countWords(script), [script]);
  const charCount = useMemo(() => countChars(script), [script]);
  const estimatedSec = useMemo(() => estimateDurationSec(script), [script]);
  const scriptOk = script.trim().length >= 20 && charCount <= MAX_SCRIPT_CHARS;

  // ───────────────────────────── Step 2: Voice
  const [voiceId, setVoiceId] = useState<string>(VOICE_OPTIONS[0].id);

  // ───────────────────────────── Step 4: Images
  const [files, setFiles] = useState<File[]>([]);
  const refUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => refUrls.forEach((u) => URL.revokeObjectURL(u)), [refUrls]);

  // ───────────────────────────── Created project + plan
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [motionPrompts, setMotionPrompts] = useState<string[]>([]);

  // ───────────────────────────── Step 8: Uploaded clips
  const [clips, setClips] = useState<Clip[]>([]);

  // ───────────────────────────── Step 9: Final output
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  // ───────────────────────────── Stage machine
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const planFileInput = useRef<HTMLInputElement>(null);
  const clipFileInput = useRef<HTMLInputElement>(null);

  const hasProject = !!projectId;
  const planReady = !!(scenes && scenes.length && voiceoverUrl);
  const clipsReady = clips.length > 0 && (!scenes || clips.length === scenes.length);
  const allDone = !!finalUrl;

  function reset() {
    setProjectId(null);
    setScenes(null);
    setVoiceoverUrl(null);
    setMotionPrompts([]);
    setClips([]);
    setFinalUrl(null);
    setError(null);
    setBusy(null);
  }

  // ───────────────────────── Step 2 — Generate Voice (no images yet)
  async function generateVoice() {
    setError(null);
    if (!scriptOk) return setError("Script must be 20–1200 characters.");

    try {
      // Create the project the first time, then just regenerate the voice afterwards
      let pid = projectId;
      if (!pid) {
        setBusy("Creating project…");
        const fd = new FormData();
        fd.set("script", script);
        fd.set("voiceId", voiceId);
        fd.set("aspect", "9:16");
        fd.set("title", script.slice(0, 60));
        // NO images — we'll add them in step 4
        const project = (await ensureOk(
          await fetch("/api/projects", { method: "POST", body: fd }),
        )) as { id: string };
        pid = project.id;
        setProjectId(pid);
      }

      setBusy("Generating voiceover…");
      const data = (await ensureOk(
        await fetch(`/api/projects/${pid}/regenerate-voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceId }),
        }),
      )) as { voiceoverUrl: string };
      setVoiceoverUrl(data.voiceoverUrl);
      setBusy(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Voice failed");
      setBusy(null);
    }
  }

  // ───────────────────────── Step 4 — Add images to existing project
  async function addImages() {
    if (!projectId) return setError("Generate voice first (step 2).");
    if (files.length < 1) return setError("Pick at least 1 image first.");
    setError(null);
    try {
      setBusy(`Uploading ${files.length} image${files.length === 1 ? "" : "s"}…`);
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      await ensureOk(
        await fetch(`/api/projects/${projectId}/images`, {
          method: "POST",
          body: fd,
        }),
      );
      setBusy(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Add images failed");
      setBusy(null);
    }
  }

  // ───────────────────────── Step 5+6 — Audio Timeline + Motion Direction
  async function generateTimeline() {
    if (!projectId) return setError("Create project + voice first.");
    if (files.length < 1) return setError("Upload images first.");
    setError(null);
    try {
      setBusy("Adding images to project…");
      await addImages();

      setBusy("Claude is splitting the script per image…");
      await ensureOk(
        await fetch(`/api/projects/${projectId}/plan`, { method: "POST" }),
      );

      setBusy("Computing per-image timing…");
      const gen = (await ensureOk(
        await fetch(`/api/projects/${projectId}/generate`, { method: "POST" }),
      )) as GenResponse;

      setScenes(gen.scenes);
      setVoiceoverUrl(gen.voiceoverUrl);
      setMotionPrompts(gen.scenes.map((s) => defaultMotion(s.caption)));
      setBusy(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Timeline failed");
      setBusy(null);
    }
  }

  async function uploadClips(picked: FileList | null) {
    if (!picked || !projectId) return;
    setError(null);
    const arr = Array.from(picked)
      .filter((f) => f.type.startsWith("video/"))
      .slice(0, scenes?.length ?? 12);
    if (arr.length === 0) return setError("Pick MP4 files generated from Flow/Veo.");

    try {
      setBusy(`Uploading ${arr.length} clip${arr.length === 1 ? "" : "s"}…`);
      const fd = new FormData();
      arr.forEach((f, i) => fd.append(`clip_${i}`, f));
      const data = (await ensureOk(
        await fetch(`/api/projects/${projectId}/upload-clips`, {
          method: "POST",
          body: fd,
        }),
      )) as { clips: Clip[] };
      setClips(data.clips);
      setBusy(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clip upload failed");
      setBusy(null);
    }
  }

  async function assemble() {
    if (!projectId) return;
    setError(null);
    try {
      setBusy("ffmpeg is stitching the final reel…");
      const data = (await ensureOk(
        await fetch(`/api/projects/${projectId}/assemble-v0`, { method: "POST" }),
      )) as { outputUrl: string };
      setFinalUrl(data.outputUrl);
      setBusy(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Assemble failed");
      setBusy(null);
    }
  }

  // ───────────────────────── Plan export (copy / download)
  const planText = useMemo(() => {
    if (!scenes) return "";
    const lines: string[] = [
      "# ReelForge — Image-to-Video plan",
      `Voice: ${VOICE_OPTIONS.find((v) => v.id === voiceId)?.label ?? voiceId}`,
      "",
    ];
    scenes.forEach((s, i) => {
      const duration = (s.endSec - s.startSec).toFixed(1);
      lines.push(`## Image ${i + 1}`);
      lines.push(`Text:    ${s.caption}`);
      lines.push(`Duration: ${duration} sec`);
      lines.push(`Motion:   ${motionPrompts[i] ?? defaultMotion(s.caption)}`);
      lines.push("");
    });
    return lines.join("\n");
  }, [scenes, motionPrompts, voiceId]);

  function copyPlan() {
    navigator.clipboard.writeText(planText).catch(() => {});
  }
  function downloadPlan() {
    const blob = new Blob([planText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reelforge-plan-${projectId ?? "draft"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ───────────────────────── Render
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Rocket className="size-6" strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Create Video — V0</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              The <strong>AI Reel Director</strong> workflow. ReelForge plans
              the timing + motion direction. You generate the clips in Google
              Flow / Veo / Runway. Then bring them back and let us assemble
              the final reel.
            </p>
          </div>
          {hasProject && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-[#e8e8f0] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              New project
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <strong>Failed:</strong> {error}
        </div>
      )}
      {busy && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <Loader2 className="size-4 animate-spin" />
          {busy}
        </div>
      )}

      {/* Step 1 — Script */}
      <StepCard
        num={1}
        title="Script Input"
        icon={FileText}
        state={scriptOk ? "done" : "active"}
      >
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          maxLength={MAX_SCRIPT_CHARS + 50}
          placeholder="Paste your script (Hindi, Hinglish or English — all supported)…"
          className={cn(
            "h-36 w-full resize-none rounded-2xl border bg-white p-4 text-sm leading-relaxed text-slate-700 placeholder-slate-400 outline-none focus:ring-2",
            charCount > MAX_SCRIPT_CHARS
              ? "border-rose-300 focus:ring-rose-200/60"
              : "border-[#e8e8f0] focus:ring-emerald-200/60",
          )}
        />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Words" value={String(wordCount)} />
          <Stat
            label="Characters"
            value={`${charCount} / ${MAX_SCRIPT_CHARS}`}
            warn={charCount > MAX_SCRIPT_CHARS}
          />
          <Stat label="Est. audio" value={`~${estimatedSec}s`} />
          <Stat label="Est. reel" value={`~${estimatedSec}s`} accent />
        </div>
      </StepCard>

      {/* Step 2 — Voice */}
      <StepCard
        num={2}
        title="AI Voice Generation"
        icon={Mic}
        state={voiceoverUrl ? "done" : scriptOk ? "active" : "locked"}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVoiceId(v.id)}
              className={cn(
                "rounded-2xl border p-3 text-left transition-colors",
                voiceId === v.id
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#e8e8f0] bg-white hover:bg-slate-50",
              )}
            >
              <p className="text-sm font-semibold">{v.label}</p>
              <p className="mt-0.5 text-[0.7rem] text-slate-500">{v.style}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={generateVoice}
          disabled={!!busy || !scriptOk}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Mic className="size-4" />
          {voiceoverUrl ? "Regenerate voiceover" : "Generate voiceover"}
          <ArrowRight className="size-4" />
        </button>

        {voiceoverUrl && (
          <div className="mt-4 rounded-2xl border border-[#e8e8f0] bg-slate-50 p-4">
            <div className="text-[0.7rem] font-semibold tracking-wide text-slate-500 uppercase">
              Audio preview · Approve or regenerate
            </div>
            <audio src={voiceoverUrl} controls className="mt-2 w-full" />
            <p className="mt-2 text-xs text-slate-500">
              Pick a different voice above and click <strong>Regenerate
              voiceover</strong> if you want to try another.
            </p>
          </div>
        )}
      </StepCard>

      {/* Step 3 — Music (placeholder for V0.1) */}
      <StepCard
        num={3}
        title="Background Music"
        icon={Music}
        state="locked"
        badge="Coming in V0.1"
      >
        <p className="text-sm text-slate-500">
          Built-in royalty-free music library with preview and ducking under
          the voiceover. Ships in V0.1.
        </p>
      </StepCard>

      {/* Step 4 — Images */}
      <StepCard
        num={4}
        title="Upload Images (order is final)"
        icon={ImageIcon}
        state={
          files.length >= 1
            ? "done"
            : voiceoverUrl
              ? "active"
              : "locked"
        }
      >
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const arr = Array.from(e.dataTransfer.files).filter((f) =>
              f.type.startsWith("image/"),
            );
            setFiles((p) => [...p, ...arr].slice(0, 12));
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-6 text-center transition-colors hover:border-emerald-400"
        >
          <Upload className="size-6 text-emerald-600" strokeWidth={1.8} />
          <span className="mt-2 text-sm font-semibold text-slate-700">
            Drop 6–12 images or click to browse
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Order is final — first image = scene 1, etc.
          </span>
          <input
            ref={planFileInput}
            type="file"
            multiple
            className="sr-only"
            accept="image/*"
            onChange={(e) => {
              const arr = Array.from(e.target.files ?? []).filter((f) =>
                f.type.startsWith("image/"),
              );
              setFiles((p) => [...p, ...arr].slice(0, 12));
            }}
          />
        </label>

        {files.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {files.map((f, i) => (
              <div key={i} className="group relative">
                <img
                  src={refUrls[i]}
                  alt={f.name}
                  className="aspect-square w-full rounded-lg object-cover ring-1 ring-[#e8e8f0]"
                />
                <span className="absolute top-1 left-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          The reel will have <strong>exactly {files.length || "N"} scenes</strong> —
          one per image, no repeats, in this order.
        </p>
      </StepCard>

      {/* Step 5 + 6 — Plan + Motion */}
      <StepCard
        num={5}
        title="Audio Timeline + Motion Direction"
        icon={Wand2}
        state={
          planReady
            ? "done"
            : voiceoverUrl && files.length >= 1
              ? "active"
              : "locked"
        }
        badge="Steps 5 & 6 — combined"
      >
        {!planReady && (
          <>
            <p className="text-sm text-slate-500">
              Click below and Claude will split the script into{" "}
              <strong>{files.length || "N"} segments</strong> (1 per image)
              and write a motion prompt for each.
            </p>
            <button
              type="button"
              onClick={generateTimeline}
              disabled={!!busy || !voiceoverUrl || files.length < 1}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wand2 className="size-4" />
              Generate timeline + motion
              <ArrowRight className="size-4" />
            </button>
          </>
        )}
        {planReady && (
          <ScenePlan
            scenes={scenes!}
            motionPrompts={motionPrompts}
            setMotionPrompts={setMotionPrompts}
          />
        )}
      </StepCard>

      {/* Step 7 — Export plan + go to Flow */}
      <StepCard
        num={7}
        title="Generate Clips Externally (Google Flow / Veo)"
        icon={ExternalLink}
        state={planReady ? "active" : "locked"}
      >
        <p className="text-sm text-slate-600">
          Copy the plan, head to Flow / Veo / Runway, and generate one clip per image.
          Each clip should match the duration shown.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyPlan}
            disabled={!planReady}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
          >
            <Copy className="size-3.5" /> Copy plan to clipboard
          </button>
          <button
            type="button"
            onClick={downloadPlan}
            disabled={!planReady}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
          >
            <Download className="size-3.5" /> Download as .md
          </button>
          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition-colors hover:bg-violet-700"
          >
            <ExternalLink className="size-3.5" /> Open Google Flow
          </a>
        </div>
        {planReady && (
          <pre className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-[#e8e8f0] bg-slate-50 p-4 text-[0.78rem] leading-relaxed text-slate-700">
{planText}
          </pre>
        )}
      </StepCard>

      {/* Step 8 — Upload Clips */}
      <StepCard
        num={8}
        title="Upload Generated Clips"
        icon={Upload}
        state={clipsReady ? "done" : planReady ? "active" : "locked"}
      >
        <p className="text-sm text-slate-500">
          Upload all the MP4 files Flow gave you, in the same order as your
          images (clip 1 = image 1, etc).
        </p>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            uploadClips(e.dataTransfer.files);
          }}
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-6 text-center transition-colors",
            planReady
              ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-400"
              : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60",
          )}
        >
          <Clapperboard className="size-6 text-emerald-600" strokeWidth={1.8} />
          <span className="mt-2 text-sm font-semibold text-slate-700">
            Drop MP4 clips here, or click to browse
          </span>
          <span className="mt-1 text-xs text-slate-500">
            One MP4 per scene · {scenes?.length ?? "—"} expected
          </span>
          <input
            ref={clipFileInput}
            type="file"
            multiple
            accept="video/mp4,video/*"
            className="sr-only"
            disabled={!planReady}
            onChange={(e) => uploadClips(e.target.files)}
          />
        </label>

        {clips.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {clips.map((c) => (
              <div
                key={c.idx}
                className="rounded-xl border border-[#e8e8f0] bg-white p-2"
              >
                <video
                  src={c.url}
                  controls
                  className="aspect-[9/16] w-full rounded-md bg-black object-cover"
                />
                <p className="mt-1 text-[0.7rem] text-slate-600">
                  Clip {c.idx + 1} · {(c.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ))}
          </div>
        )}
      </StepCard>

      {/* Step 9 — Assemble */}
      <StepCard
        num={9}
        title="Final Reel Assembly"
        icon={Play}
        state={allDone ? "done" : clipsReady ? "active" : "locked"}
      >
        <p className="text-sm text-slate-500">
          ReelForge concatenates the clips with ffmpeg and replaces the audio
          with the approved voiceover. Output: 1080p MP4 ready to post.
        </p>

        <button
          type="button"
          onClick={assemble}
          disabled={!!busy || !clipsReady}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy?.startsWith("ffmpeg") ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {busy}
            </>
          ) : allDone ? (
            <>
              <CheckCircle2 className="size-4" /> Assembled
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Assemble Final Reel
            </>
          )}
        </button>

        {finalUrl && (
          <div className="mt-5">
            <video
              src={finalUrl}
              controls
              autoPlay
              loop
              className="mx-auto aspect-[9/16] w-full max-w-xs rounded-2xl bg-black"
            />
            <a
              href={finalUrl}
              download
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="size-4" /> Download final_reel.mp4
            </a>
          </div>
        )}
      </StepCard>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function defaultMotion(caption: string) {
  const tokens = caption.toLowerCase();
  if (tokens.includes("question") || tokens.includes("?")) return "Slow cinematic push toward the focal point";
  if (tokens.includes("love") || tokens.includes("soulmate")) return "Dolly forward toward the couple, soft warm light";
  if (tokens.includes("dream") || tokens.includes("future")) return "Slow drift up, ambient sparkle";
  if (tokens.includes("kundali") || tokens.includes("zodiac")) return "Slow orbit around the chart";
  return "Slow cinematic push-in with gentle ambient motion";
}

function StepCard({
  num,
  title,
  icon: Icon,
  state,
  badge,
  children,
}: {
  num: number;
  title: string;
  icon: typeof FileText;
  state: PhaseState;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border bg-white p-6 lg:p-8 transition-colors",
        state === "done" && "border-emerald-200",
        state === "active" && "border-violet-200 shadow-md shadow-violet-100",
        state === "locked" && "border-[#e8e8f0] opacity-70",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-sm font-semibold",
            state === "done"
              ? "bg-emerald-600 text-white"
              : state === "active"
                ? "bg-violet-600 text-white"
                : "bg-slate-200 text-slate-500",
          )}
        >
          {state === "done" ? <CheckCircle2 className="size-4" /> : num}
        </span>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            state === "done"
              ? "bg-emerald-50 text-emerald-600"
              : state === "active"
                ? "bg-violet-50 text-violet-600"
                : "bg-slate-100 text-slate-400",
          )}
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {badge && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800">
            {badge}
          </span>
        )}
        {state === "locked" && <Lock className="ml-auto size-4 text-slate-300" />}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, warn, accent }: { label: string; value: string; warn?: boolean; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        warn
          ? "border-rose-200 bg-rose-50"
          : accent
            ? "border-emerald-200 bg-emerald-50"
            : "border-[#e8e8f0] bg-white",
      )}
    >
      <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-sm font-semibold",
          warn ? "text-rose-700" : accent ? "text-emerald-700" : "text-slate-800",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ScenePlan({
  scenes,
  motionPrompts,
  setMotionPrompts,
}: {
  scenes: Scene[];
  motionPrompts: string[];
  setMotionPrompts: (p: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {scenes.map((s, i) => {
        const duration = (s.endSec - s.startSec).toFixed(1);
        return (
          <div
            key={i}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-[#e8e8f0] bg-slate-50/60 p-3 sm:grid-cols-[80px_1fr_240px]"
          >
            <div className="relative">
              <img
                src={s.imageUrl}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <span className="absolute top-1 left-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                {i + 1}
              </span>
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                Script segment · {duration}s
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">
                {s.caption}
              </p>
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                Motion direction
              </div>
              <textarea
                value={motionPrompts[i] ?? ""}
                onChange={(e) => {
                  const next = [...motionPrompts];
                  next[i] = e.target.value;
                  setMotionPrompts(next);
                }}
                className="mt-1 h-16 w-full resize-none rounded-lg border border-[#e8e8f0] bg-white p-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-emerald-200/60"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
