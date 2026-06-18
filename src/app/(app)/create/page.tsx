import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Mic,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Stepper } from "@/components/create/Stepper";
import { Thumb } from "@/components/ui/Thumb";
import { Waveform } from "@/components/ui/Waveform";

const REFERENCE_HUES = [340, 30, 200, 270];

export default function CreatePage() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-xl border border-[#e8e8f0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold">Create New Video</h1>
        </div>

        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <Stepper active={1} />
        </div>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <SectionHeader
            icon={FileText}
            title="1. Upload Script"
            sub="Upload your script file or paste text"
          />

          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-10 text-center transition-colors hover:border-violet-400 hover:bg-violet-50">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <Cloud className="size-6" strokeWidth={1.8} />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-700">
                Drag &amp; drop your file here
              </span>
              <span className="mt-1 text-xs text-slate-500">
                or <span className="text-violet-600">click to browse</span>
              </span>
              <span className="mt-4 inline-flex size-1.5 rounded-full bg-violet-300" />
              <span className="mt-5 text-[0.7rem] text-slate-400">
                Supports: TXT, PDF, DOCX (Max 10MB)
              </span>
              <input type="file" className="sr-only" accept=".txt,.pdf,.docx" />
            </label>

            <div className="flex items-center justify-center text-xs font-semibold tracking-wide text-slate-400 uppercase sm:flex-col">
              <span className="hidden h-full w-px bg-[#e8e8f0] sm:block" />
              <span className="px-3 sm:my-3 sm:px-0">OR</span>
              <span className="hidden h-full w-px bg-[#e8e8f0] sm:block" />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500">
                Paste your script
              </label>
              <textarea
                placeholder="Enter or paste your script here..."
                className="mt-2 h-44 w-full resize-none rounded-2xl border border-[#e8e8f0] bg-white p-4 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60"
              />
              <div className="mt-2 self-end text-xs text-slate-400">0 / 5000</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <SectionHeader
            icon={ImageIcon}
            title="2. Upload Reference Images"
            sub="Upload screenshots or reference images for better results"
          />

          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-6 py-8 text-center transition-colors hover:border-violet-400 hover:bg-violet-50">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                <ImagePlus className="size-6" strokeWidth={1.8} />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-700">
                Drag &amp; drop images here
              </span>
              <span className="mt-1 text-xs text-slate-500">
                or <span className="text-violet-600">click to browse</span>
              </span>
              <span className="mt-3 text-[0.7rem] text-slate-400">
                PNG, JPG, WEBP (Max 10MB each)
              </span>
              <input type="file" multiple className="sr-only" accept="image/*" />
            </label>

            <div>
              <div className="text-xs font-semibold text-slate-500">
                Reference Images
              </div>
              <div className="mt-2 grid grid-cols-5 gap-3">
                {REFERENCE_HUES.map((hue, i) => (
                  <div key={i} className="size-16">
                    <Thumb hue={hue} size="lg" />
                  </div>
                ))}
                <button
                  type="button"
                  className="flex size-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-violet-200 text-violet-500 transition-colors hover:border-violet-400 hover:bg-violet-50"
                >
                  <Plus className="size-4" strokeWidth={2.2} />
                  <span className="text-[0.6rem] font-semibold">Add More</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
          <SectionHeader
            icon={Mic}
            title="3. Choose Voice"
            sub="Select AI voice for your video narration"
          />

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[#e8e8f0] bg-slate-50/60 p-4">
            <button
              type="button"
              aria-label="Play preview"
              className="flex size-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-500/30 transition-colors hover:bg-violet-700"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Sarah</span>
              <span className="text-sm text-slate-500">(Female)</span>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700">
                Natural
              </span>
            </div>
            <Waveform className="h-7 flex-1" />
            <span className="text-xs text-slate-500">00:20</span>
            <Link
              href="/voice-library"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#e8e8f0] bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Mic className="size-3.5" /> Change Voice
            </Link>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Video Preview</h2>
            <span className="rounded-md border border-[#e8e8f0] px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
              9:16
            </span>
          </div>

          <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-gradient-to-b from-slate-900 to-slate-700 shadow-xl">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center 30%, rgba(124,58,237,0.55), transparent 60%), radial-gradient(ellipse at center 80%, rgba(234,88,12,0.5), transparent 60%), #06051a",
              }}
            />
            <div className="absolute inset-x-6 top-12 text-center text-white">
              <p className="font-serif text-2xl leading-tight font-semibold">
                The universe
              </p>
              <p className="font-serif text-2xl leading-tight font-semibold">
                <span className="text-amber-300">is talking to you.</span>
              </p>
            </div>
            <div className="absolute inset-x-6 bottom-20 text-center text-white">
              <p className="font-serif text-xl leading-tight font-semibold">
                And most people
              </p>
              <p className="font-serif text-xl leading-tight font-semibold">
                never listen...
              </p>
            </div>
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-1.5 text-[0.65rem] text-white backdrop-blur">
              <button aria-label="Play" className="text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <span>0:00 / 0:30</span>
              <div className="ml-2 h-[3px] flex-1 rounded-full bg-white/30">
                <div className="h-full w-1/4 rounded-full bg-white" />
              </div>
              <span aria-hidden>🔊</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs">
            <button aria-label="Play" className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div className="h-full w-1/5 rounded-full bg-violet-600" />
            </div>
            <span aria-hidden>🔊</span>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
          <Wand2 className="size-5 shrink-0 text-violet-600" strokeWidth={1.8} />
          <div className="text-sm">
            <p className="font-semibold text-violet-900">You&apos;re almost ready!</p>
            <p className="mt-0.5 text-xs text-violet-700/80">
              Click Generate Video to let AI work its magic ✨
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-colors hover:bg-violet-700"
        >
          <Sparkles className="size-4" />
          Generate Video
          <ArrowRight className="size-4" />
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-slate-500">
          This will consume 10 credits
        </p>
      </aside>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof FileText;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
