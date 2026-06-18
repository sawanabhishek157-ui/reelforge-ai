"use client";

import { ChevronDown, Coins } from "lucide-react";

export function Topbar() {
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-6 flex items-center justify-end gap-3 border-b border-[#e8e8f0] bg-white/70 px-6 py-3 backdrop-blur lg:-mx-10 lg:px-10">
      <div className="flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-3 py-2 text-sm">
        <Coins className="size-4 text-violet-600" strokeWidth={1.9} />
        <span className="font-semibold">100</span>
        <span className="text-slate-500">Credits</span>
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-[#e8e8f0] bg-white px-2.5 py-1.5 text-sm transition-colors hover:bg-slate-50"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700">
          U
        </span>
        <span className="hidden font-medium text-slate-700 sm:inline">User</span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
    </div>
  );
}
