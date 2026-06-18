export function Waveform({
  bars = 40,
  className = "",
  color = "#7c3aed",
}: {
  bars?: number;
  className?: string;
  color?: string;
}) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const t = i / bars;
    const wave = Math.sin(t * Math.PI * 4) * 0.35 + Math.cos(t * Math.PI * 9) * 0.25;
    return Math.max(0.18, Math.min(1, 0.55 + wave));
  });
  return (
    <div className={`flex items-center gap-[2px] ${className}`} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h * 100}%`, background: color, opacity: 0.55 + h * 0.4 }}
          className="block w-[3px] rounded-full"
        />
      ))}
    </div>
  );
}
