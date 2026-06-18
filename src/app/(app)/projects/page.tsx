import { Download, Filter, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatDuration, type ProjectStatus } from "@/lib/data";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Thumb } from "@/components/ui/Thumb";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  durationSec: number;
  status: string;
  outputPath: string | null;
  createdAt: string;
};

function mapStatus(s: string): ProjectStatus {
  if (s === "done") return "completed";
  if (s === "failed") return "failed";
  return "processing";
}

function hueFromId(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function ProjectsPage() {
  const rows = db
    .prepare(
      `SELECT id, title, duration_sec as durationSec, status, output_path as outputPath, created_at as createdAt
       FROM projects ORDER BY created_at DESC LIMIT 50`,
    )
    .all() as ProjectRow[];

  return (
    <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">
            {rows.length} project{rows.length === 1 ? "" : "s"}, newest first
          </p>
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

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e8f0] p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No projects yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Head to <Link href="/create" className="text-violet-600 underline">Create Video</Link> to make your first reel.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <th className="py-3 pr-4">Project</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8f0]">
              {rows.map((v) => (
                <tr key={v.id} className="text-sm">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Thumb hue={hueFromId(v.id)} />
                      <div className="leading-tight">
                        <div className="font-medium text-slate-800">{v.title}</div>
                        <div className="text-xs text-slate-400">9:16 · 1080p</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{v.createdAt}</td>
                  <td className="py-3 pr-4 text-slate-500">{formatDuration(v.durationSec)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={mapStatus(v.status)} />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      {v.outputPath && (
                        <a
                          href={"/" + v.outputPath}
                          download
                          aria-label="Download"
                          className="flex size-8 items-center justify-center rounded-lg border border-[#e8e8f0] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Download className="size-4" />
                        </a>
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
      )}
    </div>
  );
}
