/**
 * DepthFlow parallax clip generator.
 * Wraps the `depthflow` CLI to produce an MP4 with parallax motion
 * from a still image + depth map pair.
 *
 * Node-only — do not import this file from Remotion components.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEPTHFLOW_BIN = path.join(
  process.env.HOME ?? "/",
  ".local",
  "bin",
  "depthflow",
);

export interface GenerateParallaxClipOpts {
  imageAbs: string;
  depthAbs: string;
  outAbs: string;
  durationSec: number;
  fps?: number;
  width?: number;
  height?: number;
  /**
   * DepthFlow parallax intensity (`state --height`). Default 0.2 is too subtle;
   * 0.4 gives a strong 3D pop on images with a clear foreground subject.
   * Pushing past ~0.5 starts to stretch flat/low-depth images.
   */
  intensity?: number;
}

/**
 * Generate a parallax MP4 clip using the DepthFlow CLI.
 *
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
    intensity = 0.4,
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

  const args = [
    "state",
    "--height", String(intensity),
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

  // Extend PATH so the CLI and its dependencies are found.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${path.join(process.env.HOME ?? "/", ".local", "bin")}:${process.env.PATH ?? ""}`,
  };

  await new Promise<void>((resolve, reject) => {
    let stderrBuf = "";

    const child = execFile(
      DEPTHFLOW_BIN,
      args,
      { env, maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        stderrBuf = stderr;
        if (error) {
          const tail = stderrBuf.split("\n").slice(-20).join("\n");
          reject(
            new Error(
              `depthflow exited with code ${error.code ?? "?"}\n--- stderr tail ---\n${tail}`,
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
