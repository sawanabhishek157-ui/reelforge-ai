"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Music,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { ensureOk } from "@/lib/api";
import type { ContentRun, Idea, RunStep, StoryboardScene } from "@/lib/types";
import { RunStepper } from "@/components/studio/RunStepper";
import { StepGateActions } from "@/components/studio/StepGateActions";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSIC_MOODS = [
  "upbeat",
  "cinematic",
  "chill",
  "dramatic",
  "romantic",
  "dark",
  "inspirational",
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RunPage() {
  const { runId } = useParams<{ runId: string }>();

  const [run, setRun] = useState<ContentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Ideate step: which idea index is selected
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState<number | null>(null);
  // Music step: override mood
  const [musicMood, setMusicMood] = useState<string>("");
  // Script/storyboard edit mode
  const [editingScript, setEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState("");
  const [editingCaptions, setEditingCaptions] = useState(false);
  const [captionDrafts, setCaptionDrafts] = useState<string[]>([]);

  const [savingEdit, setSavingEdit] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const data = (await ensureOk(await fetch(`/api/runs/${runId}`))) as ContentRun;
      setRun(data);
      setError(null);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load run");
      return null;
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Poll while generating
  useEffect(() => {
    fetchRun().then((data) => {
      if (data?.status === "generating") {
        schedulePolling();
      }
    });

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  function schedulePolling() {
    pollRef.current = setTimeout(async () => {
      const data = await fetchRun();
      if (data?.status === "generating") {
        schedulePolling();
      }
    }, 3000);
  }

  async function handleApprove() {
    if (!run) return;
    setApproving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {};
      if (run.step === "ideate" && selectedIdeaIdx !== null) {
        body.ideaIndex = selectedIdeaIdx;
      }
      if (run.step === "music") {
        body.musicMood = musicMood || run.musicMood;
      }

      const data = (await ensureOk(
        await fetch(`/api/runs/${runId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      )) as ContentRun;

      setRun(data);
      if (data.status === "generating") {
        schedulePolling();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  }

  async function handleRegenerate(feedback: string) {
    setRegenerating(true);
    setError(null);

    try {
      const data = (await ensureOk(
        await fetch(`/api/runs/${runId}/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedback || undefined }),
        }),
      )) as ContentRun;

      setRun(data);
      schedulePolling();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleEditScript() {
    setSavingEdit(true);
    setError(null);

    try {
      const data = (await ensureOk(
        await fetch(`/api/runs/${runId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: scriptDraft }),
        }),
      )) as ContentRun;

      setRun(data);
      setEditingScript(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleEditCaptions() {
    setSavingEdit(true);
    setError(null);

    try {
      const data = (await ensureOk(
        await fetch(`/api/runs/${runId}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: captionDrafts.join("\n---\n") }),
        }),
      )) as ContentRun;

      setRun(data);
      setEditingCaptions(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {error ?? "Run not found"}
      </div>
    );
  }

  const isGenerating = run.status === "generating";
  const isFailed = run.status === "failed";
  const isDone = run.status === "done" || run.step === "done";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{run.title ?? "New reel"}</h1>
        <p className="text-sm text-slate-500">Run · {run.id}</p>
      </div>

      {/* Stepper */}
      <div className="rounded-3xl border border-[#e8e8f0] bg-white p-5 lg:p-6">
        <RunStepper current={run.step} />
      </div>

      {/* Error banner */}
      {(error || isFailed) && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
          <p className="text-sm text-rose-700">{error ?? run.error ?? "This step failed."}</p>
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <Loader2 className="size-4 animate-spin text-violet-600" />
          <p className="text-sm font-medium text-violet-700">
            AI is working on the <span className="capitalize">{run.step}</span> step…
          </p>
        </div>
      )}

      {/* Done state */}
      {isDone && run.outputPath && (
        <DonePanel outputPath={run.outputPath} />
      )}

      {/* Step artifact */}
      {!isGenerating && !isFailed && (
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <StepArtifact
            run={run}
            selectedIdeaIdx={selectedIdeaIdx}
            onSelectIdea={setSelectedIdeaIdx}
            musicMood={musicMood || run.musicMood || ""}
            onMusicMoodChange={setMusicMood}
            editingScript={editingScript}
            scriptDraft={scriptDraft}
            onStartEditScript={() => {
              setScriptDraft(run.script ?? "");
              setEditingScript(true);
            }}
            onScriptDraftChange={setScriptDraft}
            editingCaptions={editingCaptions}
            captionDrafts={captionDrafts}
            onStartEditCaptions={() => {
              setCaptionDrafts(run.storyboard?.scenes.map((s) => s.caption) ?? []);
              setEditingCaptions(true);
            }}
            onCaptionChange={(idx, val) =>
              setCaptionDrafts((prev) => prev.map((c, i) => (i === idx ? val : c)))
            }
          />

          {!isDone && (
            <StepGateActions
              onApprove={
                editingScript
                  ? handleEditScript
                  : editingCaptions
                    ? handleEditCaptions
                    : handleApprove
              }
              onRegenerate={handleRegenerate}
              onEdit={
                run.step === "script"
                  ? () => {
                      setScriptDraft(run.script ?? "");
                      setEditingScript(true);
                    }
                  : run.step === "storyboard"
                    ? () => {
                        setCaptionDrafts(run.storyboard?.scenes.map((s) => s.caption) ?? []);
                        setEditingCaptions(true);
                      }
                    : undefined
              }
              approving={approving || savingEdit}
              regenerating={regenerating}
              disabled={run.step === "ideate" && selectedIdeaIdx === null}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step Artifact ─────────────────────────────────────────────────────────────

interface StepArtifactProps {
  run: ContentRun;
  selectedIdeaIdx: number | null;
  onSelectIdea: (idx: number) => void;
  musicMood: string;
  onMusicMoodChange: (mood: string) => void;
  editingScript: boolean;
  scriptDraft: string;
  onStartEditScript: () => void;
  onScriptDraftChange: (s: string) => void;
  editingCaptions: boolean;
  captionDrafts: string[];
  onStartEditCaptions: () => void;
  onCaptionChange: (idx: number, val: string) => void;
}

function StepArtifact({
  run,
  selectedIdeaIdx,
  onSelectIdea,
  musicMood,
  onMusicMoodChange,
  editingScript,
  scriptDraft,
  onScriptDraftChange,
  editingCaptions,
  captionDrafts,
  onCaptionChange,
}: StepArtifactProps) {
  switch (run.step) {
    case "ideate":
      return <IdeateStep run={run} selectedIdx={selectedIdeaIdx} onSelect={onSelectIdea} />;
    case "script":
      return (
        <ScriptStep
          run={run}
          editing={editingScript}
          draft={scriptDraft}
          onDraftChange={onScriptDraftChange}
        />
      );
    case "storyboard":
      return (
        <StoryboardStep
          run={run}
          editing={editingCaptions}
          captionDrafts={captionDrafts}
          onCaptionChange={onCaptionChange}
        />
      );
    case "images":
      return <ImagesStep run={run} />;
    case "voice":
      return <VoiceStep run={run} />;
    case "music":
      return (
        <MusicStep
          run={run}
          selectedMood={musicMood}
          onMoodChange={onMusicMoodChange}
        />
      );
    case "assemble":
    case "done":
      return run.outputPath ? (
        <DonePanel outputPath={run.outputPath} />
      ) : (
        <EmptyStep label="Assembling your reel…" />
      );
    default:
      return <EmptyStep label="Loading…" />;
  }
}

// ─── Ideate step ──────────────────────────────────────────────────────────────

function IdeateStep({
  run,
  selectedIdx,
  onSelect,
}: {
  run: ContentRun;
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  const options: Idea[] = run.idea?.options ?? [];

  return (
    <div>
      <StepHeading>Choose an idea</StepHeading>
      {options.length === 0 ? (
        <EmptyStep label="No ideas generated yet" />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((idea, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all",
                selectedIdx === idx
                  ? "border-violet-400 bg-violet-50 shadow-sm shadow-violet-200/60"
                  : "border-[#e8e8f0] bg-white hover:border-violet-200",
              )}
            >
              <p className="font-semibold text-slate-800">{idea.title}</p>
              <p className="text-sm text-slate-600">{idea.hook}</p>
              <div className="mt-auto flex items-center gap-1.5">
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.68rem] font-medium text-violet-700">
                  {idea.angle}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Script step ──────────────────────────────────────────────────────────────

function ScriptStep({
  run,
  editing,
  draft,
  onDraftChange,
}: {
  run: ContentRun;
  editing: boolean;
  draft: string;
  onDraftChange: (s: string) => void;
}) {
  return (
    <div>
      <StepHeading>Script</StepHeading>
      {editing ? (
        <textarea
          rows={14}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          className="mt-4 w-full resize-none rounded-xl border border-violet-300 px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
        />
      ) : (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[#e8e8f0] bg-slate-50 px-4 py-4 font-mono text-sm leading-relaxed text-slate-700">
          {run.script ?? "No script yet"}
        </pre>
      )}
    </div>
  );
}

// ─── Storyboard step ──────────────────────────────────────────────────────────

function StoryboardStep({
  run,
  editing,
  captionDrafts,
  onCaptionChange,
}: {
  run: ContentRun;
  editing: boolean;
  captionDrafts: string[];
  onCaptionChange: (idx: number, val: string) => void;
}) {
  const scenes: StoryboardScene[] = run.storyboard?.scenes ?? [];

  return (
    <div>
      <StepHeading>Storyboard</StepHeading>
      <div className="mt-4 space-y-3">
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#e8e8f0] bg-slate-50 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {editing ? (
                  <textarea
                    rows={2}
                    value={captionDrafts[idx] ?? scene.caption}
                    onChange={(e) => onCaptionChange(idx, e.target.value)}
                    className="w-full resize-none rounded-xl border border-violet-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800">{scene.caption}</p>
                )}
                {scene.imagePrompt && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Prompt:</span> {scene.imagePrompt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{scene.motionStyle}</Pill>
                  <Pill>{scene.durationSec}s</Pill>
                  {scene.cinemagraph && (
                    <Pill variant="amber">cinemagraph · {scene.cinemagraph.region}</Pill>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {scenes.length === 0 && <EmptyStep label="No storyboard yet" />}
      </div>
    </div>
  );
}

// ─── Images step ──────────────────────────────────────────────────────────────

function ImagesStep({ run }: { run: ContentRun }) {
  const scenes = run.plan?.scenes ?? [];

  return (
    <div>
      <StepHeading>Generated images</StepHeading>
      {scenes.length === 0 ? (
        <EmptyStep label="No images yet" />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {scenes.map((scene, idx) => (
            <div
              key={idx}
              className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#e8e8f0] bg-slate-100"
            >
              {scene.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.imageUrl}
                  alt={`Scene ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  {idx + 1}
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[0.65rem] text-white backdrop-blur-sm">
                Scene {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Voice step ───────────────────────────────────────────────────────────────

function VoiceStep({ run }: { run: ContentRun }) {
  return (
    <div>
      <StepHeading>Voiceover</StepHeading>
      {run.voiceoverPath ? (
        <div className="mt-4">
          <audio
            controls
            src={`/${run.voiceoverPath}`}
            className="w-full rounded-xl"
          />
        </div>
      ) : (
        <EmptyStep label="Voiceover not ready yet" />
      )}
    </div>
  );
}

// ─── Music step ───────────────────────────────────────────────────────────────

function MusicStep({
  run,
  selectedMood,
  onMoodChange,
}: {
  run: ContentRun;
  selectedMood: string;
  onMoodChange: (mood: string) => void;
}) {
  const activeMood = selectedMood || run.musicMood || "";

  return (
    <div>
      <StepHeading>Music mood</StepHeading>
      <p className="mt-1 text-sm text-slate-500">
        Choose the ambient track mood for this reel
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {MUSIC_MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onMoodChange(mood)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
              activeMood === mood
                ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                : "border-[#e8e8f0] bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50",
            )}
          >
            <Music className="size-3.5" />
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Done panel ───────────────────────────────────────────────────────────────

function DonePanel({ outputPath }: { outputPath: string }) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="size-6 text-emerald-600" />
        <h2 className="text-lg font-semibold text-emerald-900">Reel ready!</h2>
      </div>
      <div className="mt-5">
        <video
          controls
          src={`/${outputPath}`}
          className="w-full max-w-sm rounded-2xl border border-emerald-200 shadow-md"
        />
      </div>
      <a
        href={`/${outputPath}`}
        download
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-colors hover:bg-emerald-700"
      >
        <Download className="size-4" />
        Download reel
      </a>
    </div>
  );
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function StepHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-800">{children}</h2>;
}

function EmptyStep({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e8f0] py-14">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function Pill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "amber";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium",
        variant === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-violet-50 text-violet-700",
      )}
    >
      {children}
    </span>
  );
}
