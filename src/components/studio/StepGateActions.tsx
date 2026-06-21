"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

type Mode = "idle" | "regenerate" | "edit";

interface StepGateActionsProps {
  onApprove: () => Promise<void>;
  onRegenerate: (feedback: string) => Promise<void>;
  onEdit?: () => void;
  approving: boolean;
  regenerating: boolean;
  disabled?: boolean;
  hideEdit?: boolean;
}

export function StepGateActions({
  onApprove,
  onRegenerate,
  onEdit,
  approving,
  regenerating,
  disabled = false,
  hideEdit = false,
}: StepGateActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [feedback, setFeedback] = useState("");

  async function submitRegenerate() {
    await onRegenerate(feedback);
    setMode("idle");
    setFeedback("");
  }

  const busy = approving || regenerating;

  return (
    <div className="mt-6 space-y-3 border-t border-[#e8e8f0] pt-6">
      {mode === "regenerate" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">
            Feedback for regeneration
          </label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell the AI what to change…"
            className="w-full resize-none rounded-xl border border-[#e8e8f0] px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submitRegenerate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {regenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Regenerate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              disabled={busy}
              className="rounded-xl border border-[#e8e8f0] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode !== "regenerate" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {approving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <Check className="size-4" />
                Approve
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode("regenerate")}
            disabled={busy || disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              "border-[#e8e8f0] bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <RefreshCw className="size-4" />
            Regenerate
          </button>

          {!hideEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={busy || disabled}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                "border-[#e8e8f0] bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Pencil className="size-4" />
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
