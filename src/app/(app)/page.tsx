import Link from "next/link";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Sparkles,
} from "lucide-react";

import { RECENT_VIDEOS, formatDuration } from "@/lib/data";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Thumb } from "@/components/ui/Thumb";

const STEPS = [
  { num: 1, icon: FileText, title: "Upload Script", text: "Upload or paste your script" },
  { num: 2, icon: ImageIcon, title: "Upload Images", text: "Add reference images or screenshots" },
  { num: 3, icon: Mic, title: "Choose Voice", text: "Select AI voice for narration" },
  { num: 4, icon: Sparkles, title: "Generate Video", text: "AI will create scenes, voiceover and video" },
  { num: 5, icon: PlayCircle, title: "Preview & Download", text: "Preview your video and download" },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#e8e8f0] bg-white p-8 lg:p-10">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-medium text-slate-500">
            Welcome back, User <span aria-hidden>👋</span>
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-[2.6rem]">
            Create videos <span className="text-violet-600">with AI</span>
          </h1>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-slate-500">
            Upload a script and reference images. Our AI will generate scenes,
            voiceover and create your video.
          </p>
          <Link
            href="/create"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-colors hover:bg-violet-700"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            Create New Video
          </Link>
        </div>

        <HeroIllustration />
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Create New Video</h2>

        <ol className="mt-8 grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.num} className="relative flex flex-col items-center text-center">
                {!isLast && (
                  <span
                    className="absolute top-5 left-1/2 hidden h-px w-full -translate-y-1/2 border-t border-dashed border-violet-200 lg:block"
                    aria-hidden
                  />
                )}
                <span className="relative z-10 flex size-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-700 ring-2 ring-violet-200">
                  {step.num}
                </span>
                <span className="relative z-10 mt-5 flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 max-w-[150px] text-xs leading-snug text-slate-500">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Videos</h2>
          <Link
            href="/projects"
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            View all →
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <th className="py-3 pr-4">Video Name</th>
                <th className="py-3 pr-4">Created At</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8f0]">
              {RECENT_VIDEOS.map((v) => (
                <tr key={v.id} className="text-sm">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Thumb hue={v.thumbHue} />
                      <span className="font-medium text-slate-800">{v.name}</span>
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
      </section>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div
      className="pointer-events-none absolute top-1/2 right-6 hidden h-[260px] w-[440px] -translate-y-1/2 lg:block"
      aria-hidden
    >
      <div className="absolute top-6 left-10 flex size-24 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50">
        <ImageIcon className="size-9 text-violet-300" strokeWidth={1.4} />
      </div>
      <div className="absolute top-1/2 left-32 flex size-36 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-500/30">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-14 text-white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="absolute right-8 bottom-12 flex size-20 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50">
        <Mic className="size-7 text-violet-500" strokeWidth={1.4} />
      </div>
      <div className="absolute top-0 right-2 flex size-16 items-center justify-center rounded-xl border border-violet-100 bg-violet-50">
        <ImageIcon className="size-6 text-violet-300" strokeWidth={1.4} />
      </div>
      <div className="absolute bottom-4 left-12 flex h-12 w-32 items-center justify-center gap-1 rounded-2xl border border-violet-100 bg-white px-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="block w-[3px] rounded-full bg-violet-400"
            style={{
              height: `${30 + Math.abs(Math.sin(i * 0.7)) * 100}%`,
              opacity: 0.5 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
