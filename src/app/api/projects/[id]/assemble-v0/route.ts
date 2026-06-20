import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { db } from "@/lib/db";
import {
  PUBLIC_DIR,
  ensureDir,
  projectDir,
  projectOutputPath,
  toPublicUrl,
} from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * V0 Step 9 — assemble the final reel.
 *  - Concatenate user-uploaded clips (in order)
 *  - Replace audio with the project's voiceover
 *  - Output H.264/AAC MP4 to public/projects/<id>/output.mp4
 *
 * Uses ffmpeg directly (no Remotion) — simpler + faster for V0.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = db
      .prepare(
        `SELECT id, voiceover_path as voiceoverPath FROM projects WHERE id = ?`,
      )
      .get(id) as { id: string; voiceoverPath: string | null } | undefined;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!project.voiceoverPath) {
      return NextResponse.json(
        { error: "Voiceover not generated yet. Approve voice first." },
        { status: 400 },
      );
    }

    const clipRows = db
      .prepare(
        `SELECT file_path as filePath, meta FROM project_assets
         WHERE project_id = ? AND kind = 'clip' ORDER BY file_path`,
      )
      .all(id) as { filePath: string; meta: string }[];

    if (clipRows.length === 0) {
      return NextResponse.json(
        { error: "No clips uploaded. Upload at least one clip first." },
        { status: 400 },
      );
    }

    // Sort clips by their stored idx (meta.idx), falling back to filename
    const sorted = clipRows
      .map((r) => {
        let idx = Number.MAX_SAFE_INTEGER;
        try {
          idx = JSON.parse(r.meta).idx ?? idx;
        } catch {}
        return { idx, absPath: path.join(PUBLIC_DIR, r.filePath) };
      })
      .sort((a, b) => a.idx - b.idx);

    const voiceAbs = path.join(PUBLIC_DIR, project.voiceoverPath);
    if (!fs.existsSync(voiceAbs)) {
      return NextResponse.json(
        { error: `Voiceover file missing at ${voiceAbs}` },
        { status: 500 },
      );
    }

    // Write a concat-demuxer manifest
    const tmpDir = ensureDir(path.join(projectDir(id), ".tmp"));
    const manifestPath = path.join(tmpDir, `concat-${Date.now()}.txt`);
    const manifest =
      sorted
        .map((s) => `file '${s.absPath.replace(/'/g, "'\\''")}'`)
        .join("\n") + "\n";
    fs.writeFileSync(manifestPath, manifest);

    const outAbs = projectOutputPath(id);
    ensureDir(path.dirname(outAbs));

    db.prepare(
      `UPDATE projects SET status = 'rendering', error = NULL WHERE id = ?`,
    ).run(id);

    await runFfmpeg([
      "-y",
      // concat input — re-encode is required because input clips may differ
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      manifestPath,
      // voiceover as the audio track
      "-i",
      voiceAbs,
      // keep the concatenated video; take audio from input 1 (voiceover)
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      // stop when shorter stream ends — keeps clip and voice in sync
      "-shortest",
      "-movflags",
      "+faststart",
      outAbs,
    ]);

    try {
      fs.unlinkSync(manifestPath);
    } catch {}

    const outUrl = toPublicUrl(outAbs);
    db.prepare(
      `UPDATE projects SET output_path = ?, status = 'done' WHERE id = ?`,
    ).run(outUrl.replace(/^\//, ""), id);

    return NextResponse.json({ ok: true, outputUrl: outUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Assemble failed";
    console.error("[assemble-v0]", e);
    try {
      const { id } = await params;
      db.prepare(
        `UPDATE projects SET status = 'failed', error = ? WHERE id = ?`,
      ).run(message, id);
    } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-1200)}`));
    });
  });
}
