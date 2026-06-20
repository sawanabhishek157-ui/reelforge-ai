import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { db } from "@/lib/db";
import { generateMotionPrompt } from "@/lib/claude";
import { startImageToVideo } from "@/lib/veo";
import { shortId } from "@/lib/ids";
import { ensureDir, PUBLIC_DIR, toPublicUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Start a Veo image→video job.
 * Body: multipart with `image` (File) and `prompt` (string), optional `durationSec`.
 * Returns: { jobId, operationName, sourceImageUrl }
 *
 * Veo jobs take 30s–2min; the client polls /api/veo/status/<jobId>.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    const userPrompt = String(form.get("prompt") ?? "").trim();
    const durationSec = Math.max(2, Math.min(10, Number(form.get("durationSec") ?? 3)));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image file required" }, { status: 400 });
    }

    const jobId = shortId("veo_");
    const jobDir = ensureDir(path.join(PUBLIC_DIR, "veo", jobId));

    const ext = (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
    const srcPath = path.join(jobDir, `source.${ext}`);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(srcPath, buf);

    const mimeType = file.type || "image/png";

    // If the user left the prompt blank, Claude looks at the image and
    // writes a cinematic motion prompt automatically.
    const promptSource: "user" | "auto" = userPrompt ? "user" : "auto";
    const prompt =
      userPrompt ||
      (await generateMotionPrompt({ imageBytes: buf, imageMimeType: mimeType }));

    const op = await startImageToVideo({
      imageBytes: buf,
      imageMimeType: mimeType,
      prompt,
      durationSec,
    });

    db.prepare(
      `INSERT INTO veo_jobs (id, op_name, prompt, duration_sec, source_path, output_path, status, error)
       VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL)`,
    ).run(jobId, op.name, prompt, durationSec, toPublicUrl(srcPath).replace(/^\//, ""));

    return NextResponse.json({
      jobId,
      operationName: op.name,
      sourceImageUrl: toPublicUrl(srcPath),
      durationSec,
      prompt,
      promptSource,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Veo generate failed";
    console.error("[POST /api/veo/generate]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
