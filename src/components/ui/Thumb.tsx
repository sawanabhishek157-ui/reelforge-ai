export function Thumb({
  hue,
  size = "md",
  letter,
}: {
  hue: number;
  size?: "sm" | "md" | "lg";
  letter?: string;
}) {
  const sizeCls =
    size === "sm" ? "size-10" : size === "lg" ? "size-16" : "size-12";
  return (
    <div
      className={`${sizeCls} flex shrink-0 items-center justify-center overflow-hidden rounded-lg text-white shadow-sm`}
      style={{
        background: `radial-gradient(circle at 30% 30%, hsl(${hue} 80% 65%), hsl(${(hue + 40) % 360} 70% 35%))`,
      }}
      aria-hidden
    >
      {letter ? (
        <span className="text-lg font-bold drop-shadow">{letter}</span>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 opacity-80">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </div>
  );
}
