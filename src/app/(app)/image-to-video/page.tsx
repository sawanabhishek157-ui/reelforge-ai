"use client";

import {
  ArrowRight,
  Download,
  Film,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";

type Stage = "idle" | "uploading" | "rendering" | "done" | "error";

const DURATION_OPTIONS = [5, 10] as const;

const PRESET_PROMPTS = [
  "Slow cinematic camera push-in, gentle ambient breeze.",
  "Subtle zoom out, sparkling stars twinkling, characters breathe.",
  "Soft handheld camera drift, hair and clothes catch wind.",
  "Slow orbit around the subject, cinematic depth of field.",
];

export default function ImageToVideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [durationSec, setDurationSec] = useState<number>(5);

  const [stage, setStage] = useState<Stage>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [promptSource, setPromptSource] = useState<"user" | "auto" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<number>(0);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  // poll while rendering
  useEffect(() => {
    if (stage !== "rendering" || !jobId) return;
    startRef.current = Date.now();
    const tick = setInterval(() => setElapsedSec(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/veo/status/${jobId}`);
        const data = (await ensureOk(r)) as {
          status: "pending" | "done" | "failed";
          outputUrl?: string;
          error?: string;
        };
        if (data.status === "done" && data.outputUrl) {
          setOutputUrl(data.outputUrl);
          setStage("done");
        } else if (data.status === "failed") {
          setError(data.error ?? "Generation failed");
          setStage("error");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Poll failed");
        setStage("error");
      }
    }, 5000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [stage, jobId]);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setFile(f);
  }

  async function generate() {
    setError(null);
    if (!file) return setError("Pick an image first.");

    try {
      setStage("uploading");
      setOutputUrl(null);
      setUsedPrompt(null);
      setPromptSource(null);
      setElapsedSec(0);

      const fd = new FormData();
      fd.set("image", file);
      fd.set("prompt", prompt);
      fd.set("durationSec", String(durationSec));

      const data = (await ensureOk(
        await fetch("/api/veo/generate", { method: "POST", body: fd }),
      )) as { jobId: string; prompt?: string; promptSource?: "user" | "auto" };

      setJobId(data.jobId);
      if (data.prompt) setUsedPrompt(data.prompt);
      if (data.promptSource) setPromptSource(data.promptSource);
      setStage("rendering");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setStage("error");
    }
  }

  function reset() {
    setStage("idle");
    setJobId(null);
    setOutputUrl(null);
    setError(null);
    setElapsedSec(0);
    setUsedPrompt(null);
    setPromptSource(null);
  }

  const busy = stage === "uploading" || stage === "rendering";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Film className="size-5" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Image → Video</h1>
            <p className="text-sm text-slate-500">
              Powered by Kling AI (via fal.ai). Drop a still, optionally
              describe the motion, get a short cinematic clip.
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <h2 className="text-base font-semibold">1. Upload image</h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-8 text-center transition-colors hover:border-violet-400 hover:bg-violet-50"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <ImagePlus className="size-6" strokeWidth={1.8} />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-700">
                Drag &amp; drop or click
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PNG, JPG, WEBP. 9:16 portrait works best.
              </span>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
            </label>

            {file && previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="size-32 rounded-2xl object-cover ring-1 ring-[#e8e8f0]"
                />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setFile(null)}
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                2. Motion prompt{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
                  Optional
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Leave blank → Claude looks at the image and writes a cinematic
                motion prompt automatically.
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                prompt.trim()
                  ? "bg-violet-50 text-violet-700 ring-violet-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200",
              )}
            >
              {prompt.trim() ? "Custom" : "Auto"}
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="(optional) e.g. slow cinematic push-in, ambient breeze moves their hair, stars twinkle in the sky..."
            className="mt-4 h-24 w-full resize-none rounded-2xl border border-[#e8e8f0] bg-white p-4 text-sm leading-relaxed text-slate-700 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-[0.7rem] font-semibold text-slate-500">
              Quick fill:
            </span>
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className="rounded-full border border-[#e8e8f0] bg-white px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50"
              >
                {p}
              </button>
            ))}
          </div>

          {usedPrompt && promptSource === "auto" && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold text-amber-800">
                <Sparkles className="size-3.5" />
                Claude auto-generated this motion prompt
              </div>
              <p className="mt-1 text-sm leading-relaxed text-amber-900">
                {usedPrompt}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <h2 className="text-base font-semibold">3. Clip length</h2>
          <p className="mt-1 text-xs text-slate-500">Kling supports 5 s or 10 s clips.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationSec(d)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  d === durationSec
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-[#e8e8f0] bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {d}s
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
            <h2 className="text-sm font-semibold">Generated clip</h2>
            <span className="rounded-md border border-[#e8e8f0] px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
              9:16
            </span>
          </div>

          <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-gradient-to-b from-slate-900 to-slate-700 shadow-xl">
            {stage === "done" && outputUrl ? (
              <video
                src={outputUrl}
                controls
                autoPlay
                loop
                playsInline
                className="absolute inset-0 size-full bg-black object-cover"
              />
            ) : previewUrl ? (
              <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/60">
                <Film className="size-12 opacity-50" strokeWidth={1.2} />
              </div>
            )}

            {stage === "rendering" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
                <Loader2 className="size-8 animate-spin" />
                <p className="mt-3 text-sm font-semibold">Veo is rendering…</p>
                <p className="mt-1 text-xs text-white/70">~{elapsedSec}s elapsed (usually 30s–2min)</p>
              </div>
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

        <button
          type="button"
          onClick={stage === "done" || stage === "error" ? reset : generate}
          disabled={busy}
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            stage === "done"
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-violet-600 text-white shadow-violet-500/30 hover:bg-violet-700",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {stage === "uploading" ? "Uploading…" : "Rendering with Veo…"}
            </>
          ) : stage === "done" ? (
            <>
              <Sparkles className="size-4" />
              Generate another
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate clip
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[0.7rem] text-slate-500">
          Uses Kling 1.0 via fal.ai. ~$0.20 per 5s clip (free $5 trial = ~25 clips).
        </p>
      </aside>
    </div>
  );
}
