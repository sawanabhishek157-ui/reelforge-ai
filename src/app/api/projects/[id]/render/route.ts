import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  projectOutputPath,
  toPublicUrl,
} from "@/lib/paths";
import { renderReel } from "@/lib/remotion-render";
import { aspectDims, type Aspect } from "@/lib/duration";
import type { Motion, Plan } from "@/remotion/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const VALID_MOTIONS: Motion[] = ["zoom-in", "zoom-out", "pan-left", "pan-right"];

function normalizeMotion(raw: string, idx: number): Motion {
  if (VALID_MOTIONS.includes(raw as Motion)) return raw as Motion;
  if (raw === "in") return "zoom-in";
  if (raw === "out") return "zoom-out";
  return VALID_MOTIONS[idx % VALID_MOTIONS.length];
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = db
    .prepare(
      `SELECT id, voiceover_path as voiceoverPath, plan_json as planJson, aspect FROM projects WHERE id = ?`,
    )
    .get(id) as
    | { id: string; voiceoverPath: string | null; planJson: string | null; aspect: string | null }
    | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!project.voiceoverPath || !project.planJson) {
    return NextResponse.json(
      { error: "Run /generate first to create voiceover + scenes." },
      { status: 400 },
    );
  }

  const scenes = db
    .prepare(
      `SELECT idx, start_sec as startSec, end_sec as endSec, image_path as imagePath, caption, zoom
       FROM scenes WHERE project_id = ? ORDER BY idx`,
    )
    .all(id) as {
    idx: number;
    startSec: number;
    endSec: number;
    imagePath: string;
    caption: string;
    zoom: string;
  }[];

  if (scenes.length === 0) {
    return NextResponse.json({ error: "No scenes found." }, { status: 400 });
  }

  const planMeta = JSON.parse(project.planJson) as { durationSec: number };
  const aspect = (project.aspect ?? "9:16") as Aspect;
  const dims = aspectDims(aspect);

  const plan: Plan = {
    durationSec: planMeta.durationSec,
    voiceoverUrl: "/" + project.voiceoverPath,
    width: dims.width,
    height: dims.height,
    scenes: scenes.map((s) => ({
      startSec: s.startSec,
      endSec: s.endSec,
      imageUrl: "/" + s.imagePath,
      caption: s.caption,
      motion: normalizeMotion(s.zoom, s.idx),
    })),
  };

  db.prepare(`UPDATE projects SET status = 'rendering', error = NULL WHERE id = ?`).run(
    id,
  );

  const outAbs = projectOutputPath(id);

  try {
    await renderReel({
      plan,
      outputPath: outAbs,
      onLog: (line) => {
        if (process.env.NODE_ENV !== "production") {
          process.stdout.write(line.toString());
        }
      },
    });

    const outputUrl = toPublicUrl(outAbs);
    db.prepare(
      `UPDATE projects SET output_path = ?, status = 'done' WHERE id = ?`,
    ).run(outputUrl.replace(/^\//, ""), id);

    return NextResponse.json({ ok: true, outputUrl, aspect });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Render failed";
    db.prepare(`UPDATE projects SET status = 'failed', error = ? WHERE id = ?`).run(
      message,
      id,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
