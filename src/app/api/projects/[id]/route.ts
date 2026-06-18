import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = db
    .prepare(
      `SELECT id, title, duration_sec as durationSec, script, voice_id as voiceId,
              plan_json as planJson, voiceover_path as voiceoverPath,
              output_path as outputPath, status, error, created_at as createdAt
       FROM projects WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        title: string;
        durationSec: number;
        script: string;
        voiceId: string;
        planJson: string | null;
        voiceoverPath: string | null;
        outputPath: string | null;
        status: string;
        error: string | null;
        createdAt: string;
      }
    | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const references = db
    .prepare(
      `SELECT id, file_path as filePath FROM project_assets
       WHERE project_id = ? AND kind = 'reference' ORDER BY file_path`,
    )
    .all(id) as { id: string; filePath: string }[];

  const scenes = db
    .prepare(
      `SELECT id, idx, start_sec as startSec, end_sec as endSec, source, image_path as imagePath, caption, prompt, zoom
       FROM scenes WHERE project_id = ? ORDER BY idx`,
    )
    .all(id);

  return NextResponse.json({
    ...project,
    plan: project.planJson ? JSON.parse(project.planJson) : null,
    references: references.map((r) => "/" + r.filePath),
    scenes,
  });
}
