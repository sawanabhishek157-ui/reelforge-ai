import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";

/**
 * Frame-accurate Lottie playback for reusable animated OBJECTS (solar system,
 * city skyline, fire, smoke, confetti, rocket, tech network). @remotion/lottie
 * advances by Remotion's frame, so renders are deterministic. JSON lives in
 * public/lottie/ (free, commercially-licensed assets).
 */

export interface LottieObjectDef {
  /** filename under public/lottie/ */
  file: string;
  /** placement + blend of the animation within the frame */
  style?: React.CSSProperties;
  loop?: boolean;
}

/** name -> asset. Objects carry their own colors (palette does not tint them).
 *  Only content-verified free assets are kept; add more by dropping a JSON into
 *  public/lottie/ and previewing it before wiring (download-verified != correct). */
export const LOTTIE_OBJECTS: Record<string, LottieObjectDef> = {
  citySkyline: { file: "city-building.json", style: { top: "38%", height: "62%", opacity: 0.95 } },
  confetti: { file: "confetti.json", style: { opacity: 1 } },
  rocket: { file: "rocket.json", style: { opacity: 1 } },
};

export const LottieObject: React.FC<{ def: LottieObjectDef }> = ({ def }) => {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`lottie-${def.file}`));

  useEffect(() => {
    let cancelled = false;
    fetch(staticFile(`lottie/${def.file}`))
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setData(json);
          continueRender(handle);
        }
      })
      .catch((e) => cancelRender(e));
    return () => {
      cancelled = true;
    };
  }, [handle, def.file]);

  if (!data) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", ...def.style }}>
      <Lottie animationData={data} loop={def.loop ?? true} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
