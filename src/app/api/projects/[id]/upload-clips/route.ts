import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

import { db } from "@/lib/db";
import { shortId } from "@/lib/ids";
import { ensureDir, projectDir, toPublicUrl } from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * V0 Step 8 — accept user-generated MP4 clips back into the project.
 *
 * Multipart form: clip_0, clip_1, … (one File per image scene). The order
 * MUST match the project's scenes (which match the upload order of the
 * reference images).
 *
 * Replaces any previously uploaded clips for this project.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = db
      .prepare(`SELECT id FROM projects WHERE id = ?`)
      .get(id) as { id: string } | undefined;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const form = await req.formData();

    // Collect numbered clip_<idx> files in order
    type Saved = { idx: number; path: string; url: string; size: number };
    const saved: Saved[] = [];
    const clipDir = ensureDir(path.join(projectDir(id), "clips"));

    // Wipe previous clip uploads on disk + DB
    const existing = db
      .prepare(
        `SELECT file_path as filePath FROM project_assets WHERE project_id = ? AND kind = 'clip'`,
      )
      .all(id) as { filePath: string }[];
    for (const e of existing) {
      try {
        fs.unlinkSync(path.join(process.cwd(), "public", e.filePath));
      } catch {}
    }
    db.prepare(
      `DELETE FROM project_assets WHERE project_id = ? AND kind = 'clip'`,
    ).run(id);

    // Save new clips
    const entries = Array.from(form.entries()).filter(
      ([key, value]) => key.startsWith("clip_") && value instanceof File,
    ) as [string, File][];

    // sort by numeric index in the field name
    entries.sort((a, b) => {
      const ai = parseInt(a[0].replace("clip_", ""), 10) || 0;
      const bi = parseInt(b[0].replace("clip_", ""), 10) || 0;
      return ai - bi;
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No clips uploaded. Field names must be clip_0, clip_1, …" },
        { status: 400 },
      );
    }

    const insert = db.prepare(
      `INSERT INTO project_assets (id, project_id, kind, file_path, meta)
       VALUES (?, ?, 'clip', ?, ?)`,
    );

    for (let i = 0; i < entries.length; i++) {
      const [fieldName, file] = entries[i];
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase().slice(0, 5);
      const fileName = `clip-${String(i).padStart(2, "0")}.${ext}`;
      const outPath = path.join(clipDir, fileName);
      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      const url = toPublicUrl(outPath);
      insert.run(
        shortId("c"),
        id,
        url.replace(/^\//, ""),
        JSON.stringify({ idx: i, originalName: file.name, fieldName, size: file.size }),
      );
      saved.push({ idx: i, path: outPath, url, size: file.size });
    }

    return NextResponse.json({
      ok: true,
      count: saved.length,
      clips: saved.map((s) => ({ idx: s.idx, url: s.url, size: s.size })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload clips failed";
    console.error("[upload-clips]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** List currently-uploaded clips for the project. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = db
    .prepare(
      `SELECT file_path as filePath, meta FROM project_assets
       WHERE project_id = ? AND kind = 'clip' ORDER BY file_path`,
    )
    .all(id) as { filePath: string; meta: string }[];
  const clips = rows.map((r, i) => {
    let meta: { idx?: number; size?: number; originalName?: string } = {};
    try {
      meta = JSON.parse(r.meta);
    } catch {}
    return { idx: meta.idx ?? i, url: "/" + r.filePath, size: meta.size ?? 0, originalName: meta.originalName };
  });
  return NextResponse.json({ clips });
}
