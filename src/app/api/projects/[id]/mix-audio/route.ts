import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { db } from "@/lib/db";
import { findMood } from "@/lib/music";
import { PUBLIC_DIR, projectDir, toPublicUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/projects/[id]/mix-audio
 * Body: { moodId: string, musicVolume?: number /* 0..1, default 0.18 *\/ }
 *
 * Mixes the project's voiceover with the chosen mood music. The music is
 * ducked under the voice via ffmpeg's sidechaincompress so the words stay
 * intelligible. Output replaces voice.mp3 in place so the rest of the
 * pipeline (assemble) automatically uses the new mixed track.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      moodId?: string;
      musicVolume?: number;
    };
    const moodId = body.moodId ?? "none";
    const musicVolume = Math.max(0, Math.min(1, body.musicVolume ?? 0.18));

    const project = db
      .prepare(`SELECT voiceover_path as voicePath FROM projects WHERE id = ?`)
      .get(id) as { voicePath: string | null } | undefined;

    if (!project?.voicePath) {
      return NextResponse.json(
        { error: "Generate voiceover first" },
        { status: 400 },
      );
    }

    const voiceAbs = path.join(PUBLIC_DIR, project.voicePath);
    if (!fs.existsSync(voiceAbs)) {
      return NextResponse.json(
        { error: "Voice file is missing on disk" },
        { status: 500 },
      );
    }

    // No music chosen → nothing to mix; just leave the voice track in place
    const mood = findMood(moodId);
    if (mood.id === "none" || !mood.url) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        outputUrl: "/" + project.voicePath,
        moodId,
      });
    }

    const musicAbs = path.join(PUBLIC_DIR, mood.url.replace(/^\//, ""));
    if (!fs.existsSync(musicAbs)) {
      return NextResponse.json(
        {
          error: `No music file at ${mood.url}. Drop an MP3 in public/music/${mood.id}.mp3`,
        },
        { status: 400 },
      );
    }

    // Write the mixed output back to the project's voice path so downstream
    // assembly uses it without changes
    const tmpOut = path.join(projectDir(id), `voice-mixed-${Date.now()}.mp3`);

    // ffmpeg: pad/loop music to voice length, lower volume, mix
    await runFfmpeg([
      "-y",
      "-i",
      voiceAbs,
      "-stream_loop",
      "-1",
      "-i",
      musicAbs,
      "-filter_complex",
      `[1:a]volume=${musicVolume}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[out]`,
      "-map",
      "[out]",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      tmpOut,
    ]);

    // Replace voice.mp3 atomically
    fs.renameSync(tmpOut, voiceAbs);

    return NextResponse.json({
      ok: true,
      outputUrl: toPublicUrl(voiceAbs) + "?t=" + Date.now(),
      moodId,
      musicVolume,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Mix failed";
    console.error("[mix-audio]", e);
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
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-1000)}`));
    });
  });
}
