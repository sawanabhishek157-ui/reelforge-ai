import { NextResponse } from "next/server";
import path from "node:path";

import { db } from "@/lib/db";
import type { VideoPlan } from "@/lib/claude";
import { audioDurationSec, generateVoiceover, type VoiceName } from "@/lib/tts";
import { MAX_DURATION_SEC } from "@/lib/duration";
import { shortId } from "@/lib/ids";

const MOTIONS = ["zoom-in", "pan-right", "zoom-out", "pan-left"] as const;
import {
  ensureDir,
  projectVoicePath,
  toPublicUrl,
} from "@/lib/paths";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = db
    .prepare(
      `SELECT id, plan_json as planJson, script, voice_id as voiceId, duration_sec as durationSec FROM projects WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        planJson: string | null;
        script: string;
        voiceId: string;
        durationSec: number;
      }
    | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!project.planJson) {
    return NextResponse.json(
      { error: "Run /plan first to generate the scene plan." },
      { status: 400 },
    );
  }

  const plan: VideoPlan = JSON.parse(project.planJson);

  const references = (db
    .prepare(
      `SELECT file_path as filePath FROM project_assets
       WHERE project_id = ? AND kind = 'reference' ORDER BY file_path`,
    )
    .all(id) as { filePath: string }[]).map((r) => "/" + r.filePath);

  db.prepare(`UPDATE projects SET status = 'generating', error = NULL WHERE id = ?`).run(
    id,
  );

  try {
    // 1. Voiceover (run in parallel with image gen)
    const voiceAbs = projectVoicePath(id);
    ensureDir(path.dirname(voiceAbs));
    const voicePromise = generateVoiceover(
      project.script,
      voiceAbs,
      (project.voiceId as VoiceName) || "alloy",
    ).then(() => toPublicUrl(voiceAbs));

    // 2. Per-scene image: reuse uploaded references (reference-only mode)
    const sceneRows: {
      idx: number;
      startSec: number;
      endSec: number;
      source: "reference";
      imageUrl: string;
      caption: string;
      prompt: string;
      motion: (typeof MOTIONS)[number];
    }[] = [];

    for (const s of plan.scenes) {
      // Reference-only: always reuse an uploaded image. Round-robin if Claude
      // returned an out-of-range or missing index.
      const fallbackIdx = s.idx % references.length;
      const requested = s.referenceIndex ?? fallbackIdx;
      const refIdx = Math.max(
        0,
        Math.min(requested, references.length - 1),
      );
      const imageUrl = references[refIdx];
      // Cycle motions for variety: zoom-in → pan-right → zoom-out → pan-left
      const motion = MOTIONS[s.idx % MOTIONS.length];
      sceneRows.push({
        idx: s.idx,
        startSec: s.startSec,
        endSec: s.endSec,
        source: "reference" as const,
        imageUrl,
        caption: s.caption,
        prompt: s.prompt ?? "",
        motion,
      });
    }

    const voiceoverUrl = await voicePromise;

    // 3. Use the real voiceover duration as the source of truth.
    const actualSec = await audioDurationSec(voiceAbs);
    if (actualSec > MAX_DURATION_SEC) {
      throw new Error(
        `Voiceover came out ${actualSec.toFixed(1)}s — over the ${MAX_DURATION_SEC}s limit. Shorten the script.`,
      );
    }
    if (actualSec > 0 && Math.abs(actualSec - plan.durationSec) > 0.5) {
      const ratio = actualSec / plan.durationSec;
      sceneRows.forEach((s) => {
        s.startSec = +(s.startSec * ratio).toFixed(3);
        s.endSec = +(s.endSec * ratio).toFixed(3);
      });
      plan.durationSec = +actualSec.toFixed(3);
    }
    // Persist the real duration on the project row too.
    db.prepare(`UPDATE projects SET duration_sec = ? WHERE id = ?`).run(
      Math.round(plan.durationSec),
      id,
    );

    // 4. Persist
    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM scenes WHERE project_id = ?`).run(id);
      const ins = db.prepare(
        `INSERT INTO scenes (id, project_id, idx, start_sec, end_sec, source, image_path, caption, prompt, zoom)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const s of sceneRows) {
        ins.run(
          shortId("s"),
          id,
          s.idx,
          s.startSec,
          s.endSec,
          s.source,
          s.imageUrl.replace(/^\//, ""),
          s.caption,
          s.prompt,
          s.motion,
        );
      }
      db.prepare(
        `UPDATE projects SET voiceover_path = ?, status = 'generated', plan_json = ? WHERE id = ?`,
      ).run(voiceoverUrl.replace(/^\//, ""), JSON.stringify(plan), id);
    });
    txn();

    return NextResponse.json({
      ok: true,
      voiceoverUrl,
      durationSec: plan.durationSec,
      scenes: sceneRows,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generate failed";
    db.prepare(`UPDATE projects SET status = 'failed', error = ? WHERE id = ?`).run(
      message,
      id,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
