import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Search,
} from "lucide-react";

import { ALL_PROJECTS, formatDuration } from "@/lib/data";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Thumb } from "@/components/ui/Thumb";

export default function ProjectsPage() {
  return (
    <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">All your generated videos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search projects..."
              className="rounded-xl border border-[#e8e8f0] bg-white py-2 pr-3 pl-9 text-sm placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Filter className="size-4" /> Filter
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <th className="py-3 pr-4">Project</th>
              <th className="py-3 pr-4">Created At</th>
              <th className="py-3 pr-4">Duration</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            {ALL_PROJECTS.map((v) => (
              <tr key={v.id} className="text-sm">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Thumb hue={v.thumbHue} />
                    <div className="leading-tight">
                      <div className="font-medium text-slate-800">{v.name}</div>
                      <div className="text-xs text-slate-400">
                        {v.aspect} · {v.quality}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{v.createdAt}</td>
                <td className="py-3 pr-4 text-slate-500">{formatDuration(v.durationSec)}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={v.status} />
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center justify-end gap-2">
                    {v.status === "completed" && (
                      <button
                        aria-label="Download"
                        className="flex size-8 items-center justify-center rounded-lg border border-[#e8e8f0] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Download className="size-4" />
                      </button>
                    )}
                    <button
                      aria-label="More"
                      className="flex size-8 items-center justify-center rounded-lg border border-[#e8e8f0] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Showing 1 to {ALL_PROJECTS.length} of 12 projects
        </p>
        <div className="flex items-center gap-1">
          <PagerButton aria-label="Previous">
            <ChevronLeft className="size-4" />
          </PagerButton>
          <PagerButton active>1</PagerButton>
          <PagerButton>2</PagerButton>
          <PagerButton>3</PagerButton>
          <PagerButton aria-label="Next">
            <ChevronRight className="size-4" />
          </PagerButton>
        </div>
      </div>
    </div>
  );
}

function PagerButton({
  children,
  active,
  ...props
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={
        "flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors " +
        (active
          ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
          : "border border-[#e8e8f0] bg-white text-slate-600 hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}
