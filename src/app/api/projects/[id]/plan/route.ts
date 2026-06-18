import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { planReel } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = db
    .prepare(
      `SELECT id, duration_sec as durationSec, script FROM projects WHERE id = ?`,
    )
    .get(id) as { id: string; durationSec: number; script: string } | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const refCount = (db
    .prepare(
      `SELECT COUNT(*) as n FROM project_assets WHERE project_id = ? AND kind = 'reference'`,
    )
    .get(id) as { n: number }).n;

  if (refCount === 0) {
    return NextResponse.json(
      { error: "Upload reference images first" },
      { status: 400 },
    );
  }

  try {
    const plan = await planReel({
      script: project.script,
      durationSec: project.durationSec,
      referenceCount: refCount,
    });

    db.prepare(
      `UPDATE projects SET plan_json = ?, status = 'planned', error = NULL WHERE id = ?`,
    ).run(JSON.stringify(plan), id);

    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Plan failed";
    db.prepare(`UPDATE projects SET status = 'failed', error = ? WHERE id = ?`).run(
      message,
      id,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
