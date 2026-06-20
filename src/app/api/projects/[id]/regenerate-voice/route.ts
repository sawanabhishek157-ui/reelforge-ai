import { NextResponse } from "next/server";
import path from "node:path";

import { db } from "@/lib/db";
import {
  audioDurationSec,
  generateVoiceover,
  type VoiceName,
} from "@/lib/tts";
import { MAX_DURATION_SEC } from "@/lib/duration";
import {
  ensureDir,
  projectVoicePath,
  toPublicUrl,
} from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Re-generate the voiceover for an existing project, optionally with a
 * different voice. Scene timings are rescaled to match the new audio
 * duration. No reupload, no re-plan, no re-render needed before this — the
 * client will call /render next.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { voiceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const project = db
    .prepare(
      `SELECT id, script, voice_id as voiceId, plan_json as planJson FROM projects WHERE id = ?`,
    )
    .get(id) as
    | { id: string; script: string; voiceId: string; planJson: string | null }
    | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const newVoice = (body.voiceId ?? project.voiceId) as VoiceName;

  try {
    const voiceAbs = projectVoicePath(id);
    ensureDir(path.dirname(voiceAbs));
    await generateVoiceover(project.script, voiceAbs, newVoice);

    const actualSec = await audioDurationSec(voiceAbs);
    if (actualSec > MAX_DURATION_SEC) {
      throw new Error(
        `Voiceover came out ${actualSec.toFixed(1)}s — over the ${MAX_DURATION_SEC}s limit.`,
      );
    }

    // If we already have a plan, rescale its scene timings to the new audio
    const plan = project.planJson
      ? (JSON.parse(project.planJson) as { durationSec: number })
      : null;
    if (plan && actualSec > 0 && Math.abs(actualSec - plan.durationSec) > 0.5 && plan.durationSec > 0) {
      const ratio = actualSec / plan.durationSec;
      const scenes = db
        .prepare(
          `SELECT id, start_sec as startSec, end_sec as endSec FROM scenes WHERE project_id = ?`,
        )
        .all(id) as { id: string; startSec: number; endSec: number }[];

      const upd = db.prepare(`UPDATE scenes SET start_sec = ?, end_sec = ? WHERE id = ?`);
      db.transaction(() => {
        for (const s of scenes) {
          upd.run(+(s.startSec * ratio).toFixed(3), +(s.endSec * ratio).toFixed(3), s.id);
        }
      })();
      plan.durationSec = +actualSec.toFixed(3);
      db.prepare(`UPDATE projects SET plan_json = ?, duration_sec = ? WHERE id = ?`).run(
        JSON.stringify(plan),
        Math.round(plan.durationSec),
        id,
      );
    }

    db.prepare(
      `UPDATE projects SET voiceover_path = ?, voice_id = ?, status = 'generated', error = NULL WHERE id = ?`,
    ).run(toPublicUrl(voiceAbs).replace(/^\//, ""), newVoice, id);

    return NextResponse.json({
      ok: true,
      voiceoverUrl: toPublicUrl(voiceAbs),
      durationSec: actualSec,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Regenerate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
