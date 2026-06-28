import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";

export type DeviceKind = "phone" | "laptop" | "browser";

interface DeviceFrameProps {
  device?: DeviceKind;
  /** Screen content — a screenshot (imageSrc) or a screen recording (videoSrc). */
  imageSrc?: string;
  videoSrc?: string;
  /** Outer placement/scale of the whole device within the frame. */
  style?: React.CSSProperties;
  /** Browser address-bar text (browser kind only). */
  url?: string;
}

function toStatic(url: string) {
  return staticFile(url.replace(/^\//, ""));
}

/**
 * Wraps a screen recording or screenshot in a clean device mockup, for SaaS
 * launch / how-to / product-demo reels. Pure CSS/SVG — deterministic, no assets.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  device = "phone",
  imageSrc,
  videoSrc,
  style,
  url = "app.example.com",
}) => {
  const screen = videoSrc ? (
    <OffthreadVideo src={toStatic(videoSrc)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : imageSrc ? (
    <Img src={toStatic(imageSrc)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <div style={{ width: "100%", height: "100%", background: "#11131a" }} />
  );

  const center: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  if (device === "phone") {
    return (
      <AbsoluteFill style={center}>
        <div
          style={{
            width: 520,
            height: 1080,
            background: "#0b0b0f",
            borderRadius: 72,
            padding: 16,
            boxShadow: "0 40px 120px rgba(0,0,0,0.55), inset 0 0 0 2px #2a2a33",
            position: "relative",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: 58, overflow: "hidden", position: "relative" }}>
            {screen}
            {/* dynamic island */}
            <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", width: 120, height: 34, background: "#000", borderRadius: 20 }} />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (device === "laptop") {
    return (
      <AbsoluteFill style={center}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 900,
              height: 564,
              background: "#0b0b0f",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 40px 120px rgba(0,0,0,0.5), inset 0 0 0 2px #2a2a33",
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>{screen}</div>
          </div>
          {/* base / hinge */}
          <div style={{ width: 1020, height: 26, background: "linear-gradient(#23232b,#15151b)", borderRadius: "0 0 16px 16px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }} />
          <div style={{ width: 160, height: 8, background: "#0b0b0f", borderRadius: "0 0 10px 10px" }} />
        </div>
      </AbsoluteFill>
    );
  }

  // browser
  return (
    <AbsoluteFill style={center}>
      <div style={{ width: 960, height: 600, background: "#0b0b0f", borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.5), inset 0 0 0 2px #2a2a33" }}>
        <div style={{ height: 56, background: "#1a1b22", display: "flex", alignItems: "center", padding: "0 20px", gap: 10 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
          <div style={{ flex: 1, height: 30, margin: "0 16px", background: "#2a2b33", borderRadius: 15, color: "#9aa", fontSize: 18, display: "flex", alignItems: "center", padding: "0 16px", fontFamily: "system-ui" }}>
            {url}
          </div>
        </div>
        <div style={{ height: "calc(100% - 56px)" }}>{screen}</div>
      </div>
    </AbsoluteFill>
  );
};
