import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RunStep } from "@/lib/types";

const STEPS: { key: RunStep; label: string }[] = [
  { key: "ideate", label: "Ideate" },
  { key: "script", label: "Script" },
  { key: "storyboard", label: "Storyboard" },
  { key: "images", label: "Images" },
  { key: "voice", label: "Voice" },
  { key: "music", label: "Music" },
  { key: "assemble", label: "Assemble" },
  { key: "done", label: "Done" },
];

const ORDER = STEPS.map((s) => s.key);

function stepIndex(step: RunStep): number {
  return ORDER.indexOf(step);
}

export function RunStepper({ current }: { current: RunStep }) {
  const currentIdx = stepIndex(current);

  return (
    <ol className="flex items-center gap-0.5 overflow-x-auto">
      {STEPS.map((s, i) => {
        const isDone = currentIdx > i;
        const isActive = currentIdx === i;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={s.key} className="flex items-center">
            <span className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                    : isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {isDone ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-[0.65rem] font-medium sm:block",
                  isActive ? "text-violet-700" : isDone ? "text-emerald-700" : "text-slate-400",
                )}
              >
                {s.label}
              </span>
            </span>
            {!isLast && (
              <span
                className={cn(
                  "mx-1.5 h-px w-6 flex-shrink-0 border-t border-dashed",
                  isDone ? "border-emerald-300" : "border-slate-200",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
