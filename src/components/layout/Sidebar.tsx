"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Film,
  Folder,
  Home,
  Image as ImageIcon,
  Map,
  Mic,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";

import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

const NAV = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Create Video", href: "/create", icon: Plus },
  { label: "Image → Video", href: "/image-to-video", icon: Film },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Assets", href: "/assets", icon: ImageIcon },
  { label: "Voice Library", href: "/voice-library", icon: Mic },
  { label: "Tech Docs", href: "/docs", icon: BookOpen },
  { label: "Version Plan", href: "/roadmap", icon: Map },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#e8e8f0] bg-white px-4 py-5 lg:flex">
      <div className="px-2 pb-2">
        <Logo />
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-[#e8e8f0] pt-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-violet-50 text-violet-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          <Settings className="size-[18px]" strokeWidth={1.8} />
          Settings
        </Link>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-[#e8e8f0] bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Sparkles className="size-3.5 text-violet-600" />
            AI Credits
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight">100</span>
            <span className="text-xs text-slate-400">/ 200</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 rounded-full bg-violet-600" />
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
          >
            ✦ Upgrade Plan
          </button>
        </div>
      </div>
    </aside>
  );
}
