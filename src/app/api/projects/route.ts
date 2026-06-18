import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { db } from "@/lib/db";
import { shortId } from "@/lib/ids";
import {
  ensureDir,
  projectReferencesDir,
  toPublicUrl,
} from "@/lib/paths";
import {
  MAX_SCRIPT_CHARS,
  estimateDurationSec,
} from "@/lib/duration";

export const runtime = "nodejs";

/** Create a new project. Multipart form with: script (string), voiceId, images[] (files). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const script = String(form.get("script") ?? "").trim();
    const voiceId = String(form.get("voiceId") ?? "alloy");
    const title = String(form.get("title") ?? "Untitled reel").slice(0, 80);

    if (!script || script.length < 20) {
      return NextResponse.json(
        { error: "Script is too short. Add at least 20 characters." },
        { status: 400 },
      );
    }
    if (script.length > MAX_SCRIPT_CHARS) {
      return NextResponse.json(
        {
          error: `Script too long (${script.length} chars). Max is ${MAX_SCRIPT_CHARS} so the voiceover stays under 60 seconds.`,
        },
        { status: 400 },
      );
    }

    const durationSec = estimateDurationSec(script);

    const files = form.getAll("images").filter((f) => f instanceof File) as File[];
    if (files.length < 1) {
      return NextResponse.json(
        { error: "Upload at least 1 reference image (3–8 recommended)." },
        { status: 400 },
      );
    }
    if (files.length > 8) {
      return NextResponse.json(
        { error: "Maximum 8 reference images." },
        { status: 400 },
      );
    }

    const projectId = shortId();
    const refDir = ensureDir(projectReferencesDir(projectId));

    // 1. Write files to disk first (cheap to roll back if DB insert fails)
    const writtenFiles: { url: string; meta: { originalName: string; size: number } }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
      const fileName = `ref-${String(i).padStart(2, "0")}.${ext}`;
      const outPath = path.join(refDir, fileName);
      const buf = Buffer.from(await f.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      writtenFiles.push({
        url: toPublicUrl(outPath),
        meta: { originalName: f.name, size: f.size },
      });
    }

    // 2. Insert the project row + asset rows atomically. Project FIRST (FK target).
    const insertProject = db.prepare(
      `INSERT INTO projects (id, title, duration_sec, script, voice_id, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
    );
    const insertAsset = db.prepare(
      `INSERT INTO project_assets (id, project_id, kind, file_path, meta)
       VALUES (?, ?, 'reference', ?, ?)`,
    );

    const txn = db.transaction(() => {
      insertProject.run(projectId, title, durationSec, script, voiceId);
      for (const w of writtenFiles) {
        insertAsset.run(
          shortId("a"),
          projectId,
          w.url.replace(/^\//, ""),
          JSON.stringify(w.meta),
        );
      }
    });
    txn();

    return NextResponse.json({
      id: projectId,
      title,
      durationSec,
      script,
      voiceId,
      references: writtenFiles.map((w) => w.url),
      status: "draft",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create project";
    console.error("[POST /api/projects] failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** List recent projects. */
export async function GET() {
  try {
    const rows = db
      .prepare(
        `SELECT id, title, duration_sec as durationSec, status, output_path as outputPath, created_at as createdAt
         FROM projects ORDER BY created_at DESC LIMIT 50`,
      )
      .all();
    return NextResponse.json({ projects: rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
