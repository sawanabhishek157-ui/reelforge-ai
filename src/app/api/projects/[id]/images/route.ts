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

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Add (or REPLACE) reference images on an existing project.
 * Used by the V0 flow where script + voice are created first, images come later.
 *
 * Multipart form: images[] (Files). Order is final — image[0] becomes scene 1, etc.
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
    const files = form
      .getAll("images")
      .filter((f) => f instanceof File) as File[];
    if (files.length < 1) {
      return NextResponse.json({ error: "Upload at least 1 image" }, { status: 400 });
    }
    if (files.length > 12) {
      return NextResponse.json({ error: "Maximum 12 images" }, { status: 400 });
    }

    const refDir = ensureDir(projectReferencesDir(id));

    // Wipe previous references on disk + DB
    const existing = db
      .prepare(
        `SELECT file_path as filePath FROM project_assets WHERE project_id = ? AND kind = 'reference'`,
      )
      .all(id) as { filePath: string }[];
    for (const e of existing) {
      try {
        fs.unlinkSync(path.join(process.cwd(), "public", e.filePath));
      } catch {}
    }
    db.prepare(
      `DELETE FROM project_assets WHERE project_id = ? AND kind = 'reference'`,
    ).run(id);

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

    const insertAsset = db.prepare(
      `INSERT INTO project_assets (id, project_id, kind, file_path, meta)
       VALUES (?, ?, 'reference', ?, ?)`,
    );
    db.transaction(() => {
      for (const w of writtenFiles) {
        insertAsset.run(
          shortId("a"),
          id,
          w.url.replace(/^\//, ""),
          JSON.stringify(w.meta),
        );
      }
    })();

    return NextResponse.json({
      ok: true,
      references: writtenFiles.map((w) => w.url),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Add images failed";
    console.error("[POST /api/projects/[id]/images]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
