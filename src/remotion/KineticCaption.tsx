import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type CaptionStyle = "wordPop" | "lineUp" | "karaoke";

interface KineticCaptionProps {
  caption: string;
  durationInFrames: number;
  style?: CaptionStyle;
}

const CAPTION_BASE: React.CSSProperties = {
  position: "absolute",
  bottom: 180,
  left: 0,
  right: 0,
  paddingLeft: 56,
  paddingRight: 56,
  textAlign: "center",
  fontFamily: "'Arial Black', 'Impact', sans-serif",
  fontWeight: 900,
  fontSize: 72,
  lineHeight: 1.15,
  color: "#ffffff",
  textShadow:
    "0 2px 12px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.9), 2px 2px 0 rgba(0,0,0,0.7)",
  letterSpacing: "-0.5px",
  wordBreak: "break-word",
};

// --- WordPop ---

function WordPop({
  words,
  durationInFrames,
}: {
  words: string[];
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerWord = Math.max(4, Math.floor(durationInFrames / (words.length + 1)));

  return (
    <div style={CAPTION_BASE}>
      {words.map((word, i) => {
        const wordFrame = frame - i * framesPerWord;
        const scale = spring({
          fps,
          frame: wordFrame,
          config: { damping: 200, stiffness: 300 },
          from: 0,
          to: 1,
        });
        const opacity = interpolate(wordFrame, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: 14,
              transform: `scale(${scale})`,
              opacity,
              transformOrigin: "bottom center",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// --- LineUp ---

function LineUp({
  caption,
  durationInFrames,
}: {
  caption: string;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({
    fps,
    frame,
    config: { damping: 200, stiffness: 120 },
    from: 0,
    to: 1,
  });

  const opacity = interpolate(frame, [0, 10, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(slideProgress, [0, 1], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        ...CAPTION_BASE,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {caption}
    </div>
  );
}

// --- Karaoke ---

function Karaoke({
  words,
  durationInFrames,
}: {
  words: string[];
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();

  const framesPerWord = durationInFrames / Math.max(1, words.length);
  const activeIndex = Math.floor(frame / framesPerWord);

  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div style={{ ...CAPTION_BASE, opacity }}>
      {words.map((word, i) => {
        const isActive = i <= activeIndex;
        const justActivated = i === activeIndex;

        const wordFrame = frame - i * framesPerWord;
        const highlightOpacity = interpolate(
          isActive ? Math.min(wordFrame, 6) : 0,
          [0, 6],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: 14,
              color: isActive ? "#FFE600" : "#ffffff",
              textShadow: isActive
                ? "0 0 20px rgba(255,230,0,0.8), 0 2px 8px rgba(0,0,0,0.9)"
                : "0 2px 12px rgba(0,0,0,0.85)",
              transition: "none",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// --- Main component ---

const CAPTION_STYLES_SEQUENCE: CaptionStyle[] = ["wordPop", "lineUp", "karaoke"];

export const KineticCaption: React.FC<KineticCaptionProps> = ({
  caption,
  durationInFrames,
  style = "lineUp",
}) => {
  const words = caption.trim().split(/\s+/);

  if (style === "wordPop") {
    return <WordPop words={words} durationInFrames={durationInFrames} />;
  }
  if (style === "karaoke") {
    return <Karaoke words={words} durationInFrames={durationInFrames} />;
  }
  return <LineUp caption={caption} durationInFrames={durationInFrames} />;
};

export function pickCaptionStyle(index: number): CaptionStyle {
  return CAPTION_STYLES_SEQUENCE[index % CAPTION_STYLES_SEQUENCE.length];
}
