import { cn } from "@/lib/cn";
import type { ProjectStatus } from "@/lib/data";

const MAP: Record<ProjectStatus, { label: string; cls: string }> = {
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  processing: {
    label: "Processing",
    cls: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  failed: {
    label: "Failed",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, cls } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        cls,
      )}
    >
      {label}
    </span>
  );
}
