import { NextResponse } from "next/server";
import path from "node:path";

import { db } from "@/lib/db";
import { downloadVideoFromOperation, pollOperation } from "@/lib/veo";
import { PUBLIC_DIR, toPublicUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = {
  id: string;
  opName: string;
  prompt: string;
  durationSec: number;
  sourcePath: string;
  outputPath: string | null;
  status: string;
  error: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = db
    .prepare(
      `SELECT id, op_name as opName, prompt, duration_sec as durationSec,
              source_path as sourcePath, output_path as outputPath, status, error
       FROM veo_jobs WHERE id = ?`,
    )
    .get(jobId) as Row | undefined;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Already done? short-circuit
  if (job.status === "done" && job.outputPath) {
    return NextResponse.json({
      status: "done",
      outputUrl: "/" + job.outputPath,
      sourceImageUrl: "/" + job.sourcePath,
      prompt: job.prompt,
    });
  }
  if (job.status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: job.error,
      sourceImageUrl: "/" + job.sourcePath,
      prompt: job.prompt,
    });
  }

  try {
    const op = await pollOperation(job.opName);

    if (!op.done) {
      return NextResponse.json({
        status: "pending",
        sourceImageUrl: "/" + job.sourcePath,
        prompt: job.prompt,
      });
    }

    // Op finished → download the video bytes to disk
    const outAbs = path.join(PUBLIC_DIR, "veo", job.id, "output.mp4");
    await downloadVideoFromOperation(job.opName, outAbs);
    const outUrl = toPublicUrl(outAbs);

    db.prepare(
      `UPDATE veo_jobs SET output_path = ?, status = 'done' WHERE id = ?`,
    ).run(outUrl.replace(/^\//, ""), job.id);

    return NextResponse.json({
      status: "done",
      outputUrl: outUrl,
      sourceImageUrl: "/" + job.sourcePath,
      prompt: job.prompt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Poll failed";
    db.prepare(`UPDATE veo_jobs SET status = 'failed', error = ? WHERE id = ?`).run(
      message,
      job.id,
    );
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
