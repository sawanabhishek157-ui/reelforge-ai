import { ChevronDown, Crown, MoreHorizontal, Search } from "lucide-react";

import { VOICES, formatDuration } from "@/lib/data";
import { Thumb } from "@/components/ui/Thumb";
import { Waveform } from "@/components/ui/Waveform";

const FILTERS = ["All Voices", "Female", "Male", "Neutral"] as const;

export default function VoiceLibraryPage() {
  return (
    <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Voice Library</h1>
          <p className="text-sm text-slate-500">Choose the perfect voice for your video</p>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search voices..."
            className="w-64 rounded-xl border border-[#e8e8f0] bg-white py-2 pr-3 pl-9 text-sm placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f, i) => {
          const active = i === 0;
          return (
            <button
              key={f}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors " +
                (active
                  ? "bg-violet-100 text-violet-700"
                  : "border border-[#e8e8f0] bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              {i > 0 && <span className="text-base leading-none">⚲</span>}
              {f}
            </button>
          );
        })}
        <FilterSelect label="All Languages" />
        <FilterSelect label="All Accents" />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <th className="py-3 pr-4">Voice</th>
              <th className="py-3 pr-4">Preview</th>
              <th className="py-3 pr-4">Language</th>
              <th className="py-3 pr-4">Accent</th>
              <th className="py-3 pr-4">Style</th>
              <th className="py-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8f0]">
            {VOICES.map((v) => (
              <tr key={v.id} className="text-sm">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Thumb hue={v.initialHue} letter={v.name[0]} />
                    <div className="leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {v.name}
                        </span>
                        {v.tag === "Popular" && (
                          <Crown className="size-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium text-slate-600">
                          {v.gender}
                        </span>
                        {v.tag && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-medium text-amber-700">
                            {v.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <button
                      aria-label={`Play ${v.name}`}
                      className="flex size-8 items-center justify-center rounded-full bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <Waveform className="h-6 w-40" />
                    <span className="text-xs text-slate-500">
                      {formatDuration(v.durationSec)}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-700">{v.language}</td>
                <td className="py-3 pr-4 text-slate-500">{v.accent}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {v.style}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100">
                      Select
                    </button>
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
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
      {label}
      <ChevronDown className="size-3.5 text-slate-400" />
    </button>
  );
}
