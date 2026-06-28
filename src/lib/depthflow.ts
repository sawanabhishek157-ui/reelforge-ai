/**
 * DepthFlow parallax clip generator.
 * Drives df_scene.py via the DepthFlow virtual-env Python interpreter to
 * produce an animated MP4 with strong parallax motion from a still image +
 * depth map pair.
 *
 * The bare `depthflow` CLI renders a static frame; the animated parallax sweep
 * lives exclusively in scripts/df_scene.py called through the venv Python.
 *
 * Node-only — do not import this file from Remotion components.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { MotionStyle } from "./types";

/** Path to the DepthFlow virtual-env Python interpreter (installed via uv). */
const DEPTHFLOW_PY = path.join(
  os.homedir(),
  ".local",
  "share",
  "uv",
  "tools",
  "depthflow",
  "bin",
  "python",
);

/** Resolved at runtime so it works regardless of cwd at import time. */
function sceneScriptPath(): string {
  return path.join(process.cwd(), "scripts", "df_scene.py");
}

export interface GenerateParallaxClipOpts {
  imageAbs: string;
  depthAbs: string;
  outAbs: string;
  durationSec: number;
  fps?: number;
  width?: number;
  height?: number;
  /**
   * DepthFlow parallax intensity (DF_AMP env var). 0.5 gives a strong 3D pop
   * on images with a clear foreground subject. Values above 0.6 can introduce
   * edge-stretching artifacts on flat images.
   */
  intensity?: number;
  /**
   * DepthFlow height scale (DF_HEIGHT env var). Controls vertical parallax
   * displacement. Default 0.35 matches the demo preset.
   */
  heightScale?: number;
  /**
   * One of the motion presets defined in df_scene.py (DF_STYLE env var).
   * Defaults to "zoomdrift".
   */
  style?: MotionStyle;
  /**
   * Phase offset in radians for the parallax animation cycle (DF_PHASE env
   * var). Stagger adjacent scenes by ~1.3 to avoid identical motion rhythm.
   */
  phase?: number;
}

/**
 * Generate an animated parallax MP4 clip via scripts/df_scene.py.
 *
 * - Invokes the DepthFlow virtual-env Python (NOT the bare `depthflow` CLI).
 * - Skips generation if outAbs already exists and is newer than the source image.
 * - Rejects with a descriptive error (including stderr tail) on non-zero exit.
 * - Uses --no-turbo to avoid macOS segfaults.
 *
 * @returns The outAbs path that was written (or already existed).
 */
export async function generateParallaxClip(
  opts: GenerateParallaxClipOpts,
): Promise<string> {
  const {
    imageAbs,
    depthAbs,
    outAbs,
    durationSec,
    fps = 30,
    width = 1080,
    height = 1920,
    intensity = 0,
    heightScale = 0.35,
    style = "zoomdrift",
    phase = 0,
  } = opts;

  // Cache: skip if output is newer than source image.
  if (fs.existsSync(outAbs) && fs.existsSync(imageAbs)) {
    const srcMtime = fs.statSync(imageAbs).mtimeMs;
    const outMtime = fs.statSync(outAbs).mtimeMs;
    if (outMtime >= srcMtime) {
      return outAbs;
    }
  }

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });

  // df_scene.py CLI: <script> input -i <img> -d <depth> main -o <out> -t <sec> -f <fps> -w <w> -h <h> --no-turbo
  const args = [
    sceneScriptPath(),
    "input",
    "-i", imageAbs,
    "-d", depthAbs,
    "main",
    "-o", outAbs,
    "-t", String(durationSec),
    "-f", String(fps),
    "-w", String(width),
    "-h", String(height),
    "--no-turbo",
  ];

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${path.join(os.homedir(), ".local", "bin")}:${process.env.PATH ?? ""}`,
    DF_AMP: String(intensity),
    DF_HEIGHT: String(heightScale),
    DF_INPAINT: "0.0",
    DF_STYLE: style,
    DF_PHASE: phase.toFixed(2),
  };

  await new Promise<void>((resolve, reject) => {
    let stderrBuf = "";

    const child = execFile(
      DEPTHFLOW_PY,
      args,
      { env, maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        stderrBuf = stderr;
        if (error) {
          const tail = stderrBuf.split("\n").slice(-20).join("\n");
          reject(
            new Error(
              `df_scene.py exited with code ${error.code ?? "?"}\n--- stderr tail ---\n${tail}`,
            ),
          );
        } else {
          resolve();
        }
      },
    );

    child.stderr?.on("data", (chunk: string) => {
      stderrBuf += chunk;
    });
  });

  return outAbs;
}
