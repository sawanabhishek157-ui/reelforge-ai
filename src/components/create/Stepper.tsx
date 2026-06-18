import { cn } from "@/lib/cn";

const STEPS = [
  { num: 1, title: "Upload", sub: "Add script & images" },
  { num: 2, title: "Voice", sub: "Choose voice" },
  { num: 3, title: "Generate", sub: "AI processing" },
  { num: 4, title: "Preview", sub: "Review video" },
  { num: 5, title: "Download", sub: "Export video" },
] as const;

export function Stepper({ active = 1 }: { active?: number }) {
  return (
    <ol className="grid grid-cols-5 gap-2">
      {STEPS.map((s, i) => {
        const isActive = active === s.num;
        const isDone = active > s.num;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={s.num} className="relative flex flex-col items-center text-center">
            {!isLast && (
              <span
                className={cn(
                  "absolute top-4 left-1/2 hidden h-px w-full -translate-y-1/2 border-t border-dashed sm:block",
                  isDone ? "border-violet-400" : "border-violet-200",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                  : isDone
                    ? "bg-violet-100 text-violet-700"
                    : "bg-white text-slate-400 ring-2 ring-slate-200",
              )}
            >
              {s.num}
            </span>
            <span
              className={cn(
                "mt-2 text-[0.78rem] font-semibold",
                isActive || isDone ? "text-slate-900" : "text-slate-500",
              )}
            >
              {s.title}
            </span>
            <span className="text-[0.7rem] text-slate-400">{s.sub}</span>
          </li>
        );
      })}
    </ol>
  );
}
