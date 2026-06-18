import {
  FileText,
  FolderPlus,
  Grid as GridIcon,
  List as ListIcon,
  Music,
  PlayCircle,
  Upload,
} from "lucide-react";

import { ASSETS } from "@/lib/data";
import { Thumb } from "@/components/ui/Thumb";

const TABS = ["All", "Images", "Videos", "Audio", "Scripts"] as const;

export default function AssetsPage() {
  return (
    <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Assets</h1>
          <p className="text-sm text-slate-500">All your uploaded and generated assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
            <FolderPlus className="size-4" />
            New Folder
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700">
            <Upload className="size-4" />
            Upload
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8f0]">
        <div className="flex items-center gap-1">
          {TABS.map((t, i) => {
            const active = i === 0;
            return (
              <button
                key={t}
                className={
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-800")
                }
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="mb-2 flex items-center gap-1 rounded-lg border border-[#e8e8f0] bg-white p-0.5">
          <button
            aria-label="Grid view"
            className="flex size-7 items-center justify-center rounded-md bg-violet-50 text-violet-700"
          >
            <GridIcon className="size-4" />
          </button>
          <button
            aria-label="List view"
            className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
          >
            <ListIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ASSETS.map((a) => (
          <AssetTile key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}

function AssetTile({ asset }: { asset: (typeof ASSETS)[number] }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-[#e8e8f0] bg-white transition-colors hover:border-violet-300">
      <div
        className="relative flex aspect-video items-center justify-center"
        style={{
          background:
            asset.kind === "audio"
              ? "linear-gradient(135deg, #f5f3ff, #ede9fe)"
              : asset.kind === "script"
                ? "linear-gradient(135deg, #f3f4f6, #e5e7eb)"
                : `radial-gradient(circle at 30% 30%, hsl(${asset.thumbHue} 80% 65%), hsl(${(asset.thumbHue + 40) % 360} 70% 35%))`,
        }}
      >
        {asset.kind === "video" && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <PlayCircle className="size-10 drop-shadow" strokeWidth={1.5} />
          </div>
        )}
        {asset.kind === "audio" && (
          <div className="flex items-center gap-[2px] px-4">
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                style={{ height: `${30 + Math.abs(Math.sin(i * 0.7)) * 60}%` }}
                className="block w-[3px] rounded-full bg-violet-400"
              />
            ))}
          </div>
        )}
        {asset.kind === "script" && (
          <FileText className="size-10 text-slate-400" strokeWidth={1.5} />
        )}
        {asset.meta && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
            {asset.meta}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
          {asset.kind === "audio" && <Music className="size-3.5 text-violet-500" />}
          <span className="truncate">{asset.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-slate-400">
          <span className="capitalize">{asset.kind}</span>
          <span>·</span>
          <span>{asset.sizeLabel}</span>
        </div>
      </div>
    </div>
  );
}
