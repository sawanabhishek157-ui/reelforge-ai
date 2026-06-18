import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md shadow-violet-500/30">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="text-[1.05rem] font-semibold tracking-tight">
        ReelForge <span className="text-violet-600">AI</span>
      </span>
    </Link>
  );
}
