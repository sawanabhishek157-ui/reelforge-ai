"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  Download,
  FileText,
  ImagePlus,
  Image as ImageIcon,
  Loader2,
  Mic,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Stepper } from "@/components/create/Stepper";
import { Waveform } from "@/components/ui/Waveform";
import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";
import {
  MAX_DURATION_SEC,
  MAX_SCRIPT_CHARS,
  estimateDurationSec,
} from "@/lib/duration";

const VOICE_OPTIONS = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — soft female", style: "Soft" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — calm female", style: "Calm" },
  { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi — confident female", style: "Confident" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli — young female", style: "Young" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni — warm male", style: "Warm" },
  { id: "29vD33N1CtxCmqQRPOHJ", label: "Drew — clear male", style: "Clear" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold — deep male", style: "Deep" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie — natural male", style: "Natural" },
] as const;

type ApiProject = {
  id: string;
  references: string[];
};
type ScenePreview = {
  idx: number;
  startSec: number;
  endSec: number;
  source: "reference" | "generated";
  imageUrl: string;
  caption: string;
  zoom: "in" | "out";
};

export default function CreatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [script, setScript] = useState("");
  const [voiceId, setVoiceId] = useState<string>(VOICE_OPTIONS[0].id);

  const estimatedSec = useMemo(() => estimateDurationSec(script), [script]);
  const overLimit = script.length > MAX_SCRIPT_CHARS;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [stage, setStage] = useState<
    "idle" | "uploading" | "planning" | "generating" | "rendering" | "done" | "error"
  >("idle");
  const [scenes, setScenes] = useState<ScenePreview[] | null>(null);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const refUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(
    () => () => refUrls.forEach((u) => URL.revokeObjectURL(u)),
    [refUrls],
  );

  // Rotate preview while planning/generating to show life
  useEffect(() => {
    if (stage !== "done" && scenes && scenes.length) {
      const t = setInterval(
        () => setPreviewIdx((i) => (i + 1) % scenes.length),
        1500,
      );
      return () => clearInterval(t);
    }
  }, [scenes, stage]);

  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr].slice(0, 8));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function startPipeline() {
    setError(null);
    if (files.length < 1) {
      setError("Add at least one reference image.");
      return;
    }
    if (script.trim().length < 20) {
      setError("Paste a script of at least 20 characters.");
      return;
    }

    try {
      // 1. Create project + upload images
      setStage("uploading");
      const fd = new FormData();
      fd.set("script", script);
      fd.set("voiceId", voiceId);
      fd.set("title", script.slice(0, 60));
      files.forEach((f) => fd.append("images", f));

      const project = (await ensureOk(
        await fetch("/api/projects", { method: "POST", body: fd }),
      )) as ApiProject;
      setProjectId(project.id);

      // 2. Plan
      setStage("planning");
      await ensureOk(
        await fetch(`/api/projects/${project.id}/plan`, { method: "POST" }),
      );

      // 3. Generate
      setStage("generating");
      const gen = (await ensureOk(
        await fetch(`/api/projects/${project.id}/generate`, { method: "POST" }),
      )) as {
        voiceoverUrl: string;
        durationSec: number;
        scenes: ScenePreview[];
      };
      setScenes(gen.scenes);
      setVoiceoverUrl(gen.voiceoverUrl);

      // 4. Render
      setStage("rendering");
      const done = (await ensureOk(
        await fetch(`/api/projects/${project.id}/render`, { method: "POST" }),
      )) as { outputUrl: string };
      setOutputUrl(done.outputUrl);
      setStage("done");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Pipeline failed";
      setError(m);
      setStage("error");
    }
  }

  const stepActive =
    stage === "idle" || stage === "uploading"
      ? 1
      : stage === "planning"
        ? 2
        : stage === "generating"
          ? 3
          : stage === "rendering"
            ? 4
            : 5;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-xl border border-[#e8e8f0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold">Create New Video</h1>
        </div>

        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <Stepper active={stepActive} />
        </div>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader
              icon={FileText}
              title="1. Write Script"
              sub={`Reel length is set by the voiceover — max ${MAX_DURATION_SEC}s. No need to pick a duration.`}
            />
            <div
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                overLimit
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : "bg-violet-50 text-violet-700 ring-violet-200",
              )}
            >
              ~{estimatedSec}s estimated
            </div>
          </div>

          <div className="mt-5">
            <textarea
              value={script}
              maxLength={MAX_SCRIPT_CHARS + 50}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Some mornings the universe whispers. And most people never listen..."
              className={cn(
                "h-44 w-full resize-none rounded-2xl border bg-white p-4 text-sm leading-relaxed text-slate-700 placeholder-slate-400 outline-none focus:ring-2",
                overLimit
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200/60"
                  : "border-[#e8e8f0] focus:border-violet-400 focus:ring-violet-200/60",
              )}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={cn(
                  "transition-colors",
                  overLimit ? "text-rose-600" : "text-slate-400",
                )}
              >
                {overLimit
                  ? `Too long — trim to ${MAX_SCRIPT_CHARS} characters so the voice stays under ${MAX_DURATION_SEC}s`
                  : "Tip: 1 word ≈ 0.4s of narration"}
              </span>
              <span
                className={
                  overLimit ? "font-semibold text-rose-600" : "text-slate-400"
                }
              >
                {script.length} / {MAX_SCRIPT_CHARS}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <SectionHeader
            icon={ImageIcon}
            title="2. Upload Reference Images"
            sub="3–8 images. The video uses only these — no AI image generation."
          />

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-8 text-center transition-colors hover:border-violet-400 hover:bg-violet-50"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <ImagePlus className="size-6" strokeWidth={1.8} />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-700">
                Drag &amp; drop images here
              </span>
              <span className="mt-1 text-xs text-slate-500">
                or <span className="text-violet-600">click to browse</span>
              </span>
              <span className="mt-3 text-[0.7rem] text-slate-400">
                PNG, JPG, WEBP. Up to 8 images.
              </span>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                accept="image/*"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>

            <div>
              <div className="text-xs font-semibold text-slate-500">
                Selected ({files.length}/8)
              </div>
              <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {files.map((f, i) => (
                  <div key={i} className="group relative size-16">
                    <img
                      src={refUrls[i]}
                      alt={f.name}
                      className="size-full rounded-lg object-cover ring-1 ring-[#e8e8f0]"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {files.length < 8 && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex size-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-violet-200 text-violet-500 transition-colors hover:border-violet-400 hover:bg-violet-50"
                  >
                    <ImagePlus className="size-4" strokeWidth={2} />
                    <span className="text-[0.6rem] font-semibold">Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <SectionHeader
            icon={Mic}
            title="3. Choose Voice"
            sub="ElevenLabs Multilingual v2 — natural, free 10k chars/month"
          />

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VOICE_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoiceId(v.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-colors",
                  voiceId === v.id
                    ? "border-violet-300 bg-violet-50"
                    : "border-[#e8e8f0] bg-white hover:bg-slate-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {v.label[0].toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">{v.label}</span>
                </div>
                <Waveform className="mt-2 h-5" />
                <span className="text-[0.7rem] text-slate-500">{v.style}</span>
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <strong>Failed:</strong> {error}
          </div>
        )}
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Video Preview</h2>
            <span className="rounded-md border border-[#e8e8f0] px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
              9:16
            </span>
          </div>

          <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-gradient-to-b from-slate-900 to-slate-700 shadow-xl">
            {stage === "done" && outputUrl ? (
              <video
                src={outputUrl}
                controls
                className="absolute inset-0 size-full bg-black object-cover"
              />
            ) : scenes && scenes.length ? (
              <PreviewFrame scene={scenes[previewIdx % scenes.length]} />
            ) : files.length ? (
              <img
                src={refUrls[0]}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-80"
              />
            ) : (
              <EmptyPreview />
            )}
          </div>

          {stage === "done" && outputUrl && (
            <a
              href={outputUrl}
              download
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="size-4" />
              Download MP4
            </a>
          )}
        </div>

        <StageCard stage={stage} />

        <button
          type="button"
          onClick={startPipeline}
          disabled={
            overLimit ||
            (stage !== "idle" && stage !== "error" && stage !== "done")
          }
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {stage === "idle" || stage === "error" || stage === "done" ? (
            <>
              <Sparkles className="size-4" />
              {stage === "done" ? "Generate Another" : "Generate Video"}
              <ArrowRight className="size-4" />
            </>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" />
              {labelForStage(stage)}…
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-slate-500">
          {stage === "idle"
            ? "Pipeline: upload → plan (Claude) → voice (OpenAI) → render (Remotion). No image gen."
            : stage === "done"
              ? `Project ${projectId} done. View on /projects`
              : `Project ${projectId ?? "—"}`}
        </p>

        {voiceoverUrl && (
          <div className="mt-4 rounded-2xl border border-[#e8e8f0] bg-white p-3 text-xs">
            <div className="mb-2 font-semibold text-slate-700">Voiceover</div>
            <audio src={voiceoverUrl} controls className="w-full" />
          </div>
        )}
      </aside>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof FileText;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
      <Cloud className="size-10 opacity-50" strokeWidth={1.3} />
      <p className="text-xs">
        Your generated video will appear here. Add a script and reference
        images to start.
      </p>
    </div>
  );
}

function PreviewFrame({ scene }: { scene: ScenePreview }) {
  return (
    <>
      <img
        src={scene.imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-x-6 bottom-12 text-center font-bold text-white text-2xl leading-tight drop-shadow-lg">
        {scene.caption}
      </div>
    </>
  );
}

function StageCard({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    idle: "Ready when you are.",
    uploading: "Uploading images and creating the project…",
    planning: "Claude is planning the scenes…",
    generating: "OpenAI is recording the voiceover…",
    rendering: "Remotion is rendering the MP4. This can take 30–60s on your Mac.",
    done: "Done! Click Download to save the MP4.",
    error: "Something failed. Check the error above.",
  };
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
      <Sparkles className="size-5 shrink-0 text-violet-600" strokeWidth={1.8} />
      <p className="text-xs leading-relaxed text-violet-900/90">{map[stage]}</p>
    </div>
  );
}

function labelForStage(stage: string) {
  switch (stage) {
    case "uploading":
      return "Uploading";
    case "planning":
      return "Planning";
    case "generating":
      return "Generating";
    case "rendering":
      return "Rendering";
    default:
      return "Working";
  }
}
