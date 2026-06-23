/**
 * ContentRun orchestrator — Phase 2 agentic content pipeline.
 *
 * Persists ContentRun ↔ content_runs (SQLite) and drives the gated step
 * machine:
 *   ideate → script → storyboard → images → voice → music → assemble → done
 *
 * Node-only — do not import from Remotion components.
 */

import path from "node:path";
import fs from "node:fs";

import { getDb } from "./db";
import { getProduct } from "./products";
import { brandTheme } from "../remotion/effects/brands";

/** Branded outro length appended after the scenes (must match ReelComposition). */
const OUTRO_SEC = 3.5;
import { generateIdeas } from "./ideation";
import { writeScript, buildStoryboard } from "./storyboard";
import { generateSpeechPlan } from "./speech-plan";
import { generateSceneAssets } from "./scene-images";
import { generateVoiceover, audioDurationSec } from "./tts";
import { generateParallaxClip } from "./depthflow";
import { renderReel } from "./remotion-render";
import { PUBLIC_DIR, toPublicUrl, ensureDir } from "./paths";
import { shortId } from "./ids";

import type { ContentRun, RunStep, RunStatus, Idea, Storyboard, MotionStyle } from "./types";
import type { Plan, Scene } from "@/remotion/types";

// ---------------------------------------------------------------------------
// DB row shape (snake_case) — internal only
// ---------------------------------------------------------------------------

interface RunRow {
  id: string;
  product_id: string;
  title: string | null;
  step: string;
  status: string;
  idea_json: string | null;
  script: string | null;
  storyboard_json: string | null;
  plan_json: string | null;
  voiceover_path: string | null;
  music_mood: string | null;
  output_path: string | null;
  step_state_json: string | null;
  feedback_json: string | null;
  error: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function rowToRun(row: RunRow): ContentRun {
  return {
    id: row.id,
    productId: row.product_id,
    ...(row.title != null && { title: row.title }),
    step: row.step as RunStep,
    status: row.status as RunStatus,
    ...(row.idea_json != null
      ? {
          idea: JSON.parse(row.idea_json) as {
            chosen: Idea;
            options: Idea[];
          },
        }
      : {}),
    ...(row.script != null && { script: row.script }),
    ...(row.storyboard_json != null
      ? { storyboard: JSON.parse(row.storyboard_json) as Storyboard }
      : {}),
    ...(row.plan_json != null
      ? { plan: JSON.parse(row.plan_json) as Plan }
      : {}),
    ...(row.voiceover_path != null && { voiceoverPath: row.voiceover_path }),
    ...(row.music_mood != null && { musicMood: row.music_mood }),
    ...(row.output_path != null && { outputPath: row.output_path }),
    ...(row.step_state_json != null
      ? {
          stepState: JSON.parse(row.step_state_json) as Partial<
            Record<RunStep, "pending" | "approved">
          >,
        }
      : {}),
    ...(row.feedback_json != null
      ? { feedback: JSON.parse(row.feedback_json) as Partial<Record<RunStep, string[]>> }
      : {}),
    ...(row.error != null && { error: row.error }),
    ...(row.created_at != null && { createdAt: row.created_at }),
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function saveRun(run: ContentRun): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO content_runs
      (id, product_id, title, step, status, idea_json, script, storyboard_json, plan_json,
       voiceover_path, music_mood, output_path, step_state_json, feedback_json,
       error, created_at)
    VALUES
      (@id, @product_id, @title, @step, @status, @idea_json, @script, @storyboard_json, @plan_json,
       @voiceover_path, @music_mood, @output_path, @step_state_json, @feedback_json,
       @error, @created_at)
  `).run({
    id: run.id,
    product_id: run.productId,
    title: run.title ?? null,
    step: run.step,
    status: run.status,
    idea_json: run.idea != null ? JSON.stringify(run.idea) : null,
    script: run.script ?? null,
    storyboard_json: run.storyboard != null ? JSON.stringify(run.storyboard) : null,
    plan_json: run.plan != null ? JSON.stringify(run.plan) : null,
    voiceover_path: run.voiceoverPath ?? null,
    music_mood: run.musicMood ?? null,
    output_path: run.outputPath ?? null,
    step_state_json: run.stepState != null ? JSON.stringify(run.stepState) : null,
    feedback_json: run.feedback != null ? JSON.stringify(run.feedback) : null,
    error: run.error ?? null,
    created_at: run.createdAt ?? new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Run directory helpers
// ---------------------------------------------------------------------------

function runDir(runId: string): string {
  return path.join(PUBLIC_DIR, "runs", runId);
}

function runVoicePath(runId: string): string {
  return path.join(runDir(runId), "voice.mp3");
}

function runOutputPath(runId: string): string {
  return path.join(runDir(runId), "output.mp4");
}

function runClipPath(runId: string, sceneIndex: number): string {
  return path.join(runDir(runId), `clip-${sceneIndex}.mp4`);
}

// ---------------------------------------------------------------------------
// Error helper — marks the run as failed, persists, then rethrows
// ---------------------------------------------------------------------------

function markFailed(run: ContentRun, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  saveRun({ ...run, status: "failed", error: message });
  throw err instanceof Error ? err : new Error(message);
}

// ---------------------------------------------------------------------------
// Step generators (private)
// ---------------------------------------------------------------------------

/** ideate: generate idea options and park awaiting_approval. */
async function runIdeate(run: ContentRun): Promise<ContentRun> {
  const product = getProduct(run.productId);
  if (!product) throw new Error(`Product not found: ${run.productId}`);

  const feedbackStrings = run.feedback?.ideate ?? [];
  const feedback = feedbackStrings.length > 0 ? feedbackStrings.join("\n") : undefined;

  let ideas: Idea[];
  try {
    ideas = await generateIdeas(product, { count: 4, feedback });
  } catch (err) {
    return markFailed(run, err);
  }

  const updated: ContentRun = {
    ...run,
    idea: { chosen: ideas[0], options: ideas },
    status: "awaiting_approval",
  };
  saveRun(updated);
  return updated;
}

/** script: write the voiceover script from the chosen idea. */
async function runScript(run: ContentRun): Promise<ContentRun> {
  const product = getProduct(run.productId);
  if (!product) throw new Error(`Product not found: ${run.productId}`);
  if (!run.idea?.chosen) throw new Error(`No chosen idea on run ${run.id}`);

  const feedbackStrings = run.feedback?.script ?? [];
  const feedback = feedbackStrings.length > 0 ? feedbackStrings.join("\n") : undefined;

  let script: string;
  try {
    script = await writeScript(product, run.idea.chosen, { feedback });
  } catch (err) {
    return markFailed(run, err);
  }

  const updated: ContentRun = { ...run, script, status: "awaiting_approval" };
  saveRun(updated);
  return updated;
}

/** storyboard: build scene-level storyboard from the script. */
async function runStoryboard(run: ContentRun): Promise<ContentRun> {
  const product = getProduct(run.productId);
  if (!product) throw new Error(`Product not found: ${run.productId}`);
  if (!run.script) throw new Error(`No script on run ${run.id}`);

  const feedbackStrings = run.feedback?.storyboard ?? [];
  const feedback = feedbackStrings.length > 0 ? feedbackStrings.join("\n") : undefined;

  let storyboard: Storyboard;
  try {
    storyboard = await buildStoryboard(product, run.script, { feedback });
  } catch (err) {
    return markFailed(run, err);
  }

  const updated: ContentRun = { ...run, storyboard, status: "awaiting_approval" };
  saveRun(updated);
  return updated;
}

/** images: generate per-scene assets and build the initial Remotion Plan. */
async function runImages(run: ContentRun): Promise<ContentRun> {
  if (!run.storyboard) throw new Error(`No storyboard on run ${run.id}`);

  let assets: Awaited<ReturnType<typeof generateSceneAssets>>;
  try {
    assets = await generateSceneAssets(run.id, run.storyboard);
  } catch (err) {
    return markFailed(run, err);
  }

  // Brand palette tints the effects to match product identity.
  const product = getProduct(run.productId);
  const brand = brandTheme(product?.slug);
  const palette = brand.palette;

  let cumSec = 0;
  const scenes: Scene[] = run.storyboard.scenes.map((sbScene, i) => {
    const asset = assets[i];
    const startSec = +cumSec.toFixed(3);
    const endSec = +(cumSec + sbScene.durationSec).toFixed(3);
    cumSec = endSec;

    const scene: Scene = {
      startSec,
      endSec,
      imageUrl: asset.imageUrl,
      caption: sbScene.caption,
      motion: "zoom-in",
      motionPreset: sbScene.motionStyle,
      depthMapUrl: asset.depthMapUrl,
      ...(sbScene.motionGraphics && sbScene.motionGraphics.length > 0
        ? { motionGraphics: sbScene.motionGraphics }
        : {}),
      ...(sbScene.effects && sbScene.effects.length > 0
        ? { effects: sbScene.effects, palette }
        : {}),
      ...(asset.subjectMaskUrl != null ? { subjectMaskUrl: asset.subjectMaskUrl } : {}),
      ...(asset.cinemagraph != null
        ? {
            cinemagraph: {
              maskUrl: asset.cinemagraph.maskUrl,
              region: asset.cinemagraph.region,
              mode: "classic" as const,
            },
          }
        : {}),
    };

    return scene;
  });

  const plan: Plan = {
    durationSec: +cumSec.toFixed(3),
    voiceoverUrl: "",
    width: 1080,
    height: 1920,
    scenes,
    // Reusable branded sign-off, themed to the product.
    outro: {
      brandName: product?.name ?? "ReelForge",
      palette: brand.palette,
      ...(brand.tagline ? { tagline: brand.tagline } : {}),
    },
  };

  const updated: ContentRun = { ...run, plan, status: "awaiting_approval" };
  saveRun(updated);
  return updated;
}

/** voice: synthesize voiceover then rescale scene timing to match actual audio. */
async function runVoice(run: ContentRun): Promise<ContentRun> {
  if (!run.script) throw new Error(`No script on run ${run.id}`);
  if (!run.plan) throw new Error(`No plan on run ${run.id}`);
  if (!run.storyboard) throw new Error(`No storyboard on run ${run.id}`);

  ensureDir(runDir(run.id));
  const voiceOutAbs = runVoicePath(run.id);

  try {
    // Speech Performance Plan: Claude directs emotion / pace / pauses / emphasis
    // per sentence, then the TTS engine performs it — far more human than flat TTS.
    const speechPlan = await generateSpeechPlan(run.script);
    await generateVoiceover(run.script, voiceOutAbs, run.storyboard.voiceId, speechPlan);
  } catch (err) {
    return markFailed(run, err);
  }

  let actualDuration: number;
  try {
    actualDuration = await audioDurationSec(voiceOutAbs);
  } catch (err) {
    return markFailed(run, err);
  }

  const scale = actualDuration / run.plan.durationSec;

  const rescaledScenes: Scene[] = run.plan.scenes.map((scene) => ({
    ...scene,
    startSec: +(scene.startSec * scale).toFixed(3),
    endSec: +(scene.endSec * scale).toFixed(3),
  }));

  const plan: Plan = {
    ...run.plan,
    // Scenes span [0, actualDuration]; the branded outro plays after that.
    durationSec: +(actualDuration + OUTRO_SEC).toFixed(3),
    voiceoverUrl: toPublicUrl(voiceOutAbs),
    scenes: rescaledScenes,
  };

  const updated: ContentRun = {
    ...run,
    plan,
    voiceoverPath: voiceOutAbs,
    status: "awaiting_approval",
  };
  saveRun(updated);
  return updated;
}

/**
 * music: record the chosen music mood.
 * Actual audio mixing happens at render time (TODO: wire in mix-audio step).
 */
function runMusic(run: ContentRun, musicMood: string): ContentRun {
  const updated: ContentRun = { ...run, musicMood, status: "awaiting_approval" };
  saveRun(updated);
  return updated;
}

/**
 * assemble: generate per-scene parallax clips (non-cinemagraph scenes only),
 * then render the final Remotion reel.
 */
async function runAssemble(run: ContentRun): Promise<ContentRun> {
  if (!run.plan) throw new Error(`No plan on run ${run.id}`);

  saveRun({ ...run, status: "generating" });
  ensureDir(runDir(run.id));

  const updatedScenes: Scene[] = run.plan.scenes.map((s) => ({ ...s }));

  for (let i = 0; i < updatedScenes.length; i++) {
    const scene = updatedScenes[i];

    // Cinemagraph scenes keep their still image + mask — no parallax clip.
    if (scene.cinemagraph) continue;
    // Skip scenes that have no depth map.
    if (!scene.depthMapUrl) continue;

    const imageAbs = path.join(PUBLIC_DIR, scene.imageUrl.replace(/^\//, ""));
    const depthAbs = path.join(PUBLIC_DIR, scene.depthMapUrl.replace(/^\//, ""));
    const outAbs = runClipPath(run.id, i);
    const durationSec = +(scene.endSec - scene.startSec).toFixed(3);

    try {
      await generateParallaxClip({
        imageAbs,
        depthAbs,
        outAbs,
        durationSec,
        style: scene.motionPreset as MotionStyle | undefined,
        phase: i * 1.3,
      });
    } catch (err) {
      return markFailed({ ...run, plan: { ...run.plan, scenes: updatedScenes } }, err);
    }

    updatedScenes[i] = { ...scene, clipUrl: toPublicUrl(outAbs) };
  }

  const assembledPlan: Plan = { ...run.plan, scenes: updatedScenes };
  const outputAbs = runOutputPath(run.id);

  try {
    await renderReel({ plan: assembledPlan, outputPath: outputAbs });
  } catch (err) {
    return markFailed({ ...run, plan: assembledPlan }, err);
  }

  const updated: ContentRun = {
    ...run,
    plan: assembledPlan,
    outputPath: toPublicUrl(outputAbs),
    step: "done",
    status: "done",
  };
  saveRun(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new ContentRun for the given product, immediately kick off
 * ideation, and return the run in "awaiting_approval" with idea options set.
 */
export async function createRun(productId: string): Promise<ContentRun> {
  const product = getProduct(productId);
  if (!product) throw new Error(`Product not found: ${productId}`);

  const id = shortId("run-");
  const now = new Date().toISOString();

  const run: ContentRun = {
    id,
    productId,
    title: product.name,
    step: "ideate",
    status: "generating",
    createdAt: now,
  };

  saveRun(run);

  return runIdeate(run);
}

/** Retrieve a single run by ID. Returns null if not found. */
export function getRun(id: string): ContentRun | null {
  const row = getDb()
    .prepare<[string], RunRow>("SELECT * FROM content_runs WHERE id = ? LIMIT 1")
    .get(id);
  return row ? rowToRun(row) : null;
}

/** List all runs, optionally filtered to a specific product. Most recent first. */
export function listRuns(productId?: string): ContentRun[] {
  const db = getDb();
  const rows: RunRow[] = productId
    ? db
        .prepare<[string], RunRow>(
          "SELECT * FROM content_runs WHERE product_id = ? ORDER BY created_at DESC",
        )
        .all(productId)
    : db
        .prepare<[], RunRow>("SELECT * FROM content_runs ORDER BY created_at DESC")
        .all();
  return rows.map(rowToRun);
}

/**
 * Re-run the current step's generator, optionally recording feedback that
 * is appended to the run's per-step feedback log before regenerating.
 */
export async function regenerateStep(id: string, feedback?: string): Promise<ContentRun> {
  const run = getRun(id);
  if (!run) throw new Error(`Run not found: ${id}`);

  let current: ContentRun = run;

  if (feedback) {
    const existing = run.feedback ?? {};
    const stepFeedback = existing[run.step] ?? [];
    current = {
      ...run,
      feedback: { ...existing, [run.step]: [...stepFeedback, feedback] },
      status: "generating",
    };
    saveRun(current);
  } else {
    current = { ...run, status: "generating" };
    saveRun(current);
  }

  switch (current.step) {
    case "ideate":     return runIdeate(current);
    case "script":     return runScript(current);
    case "storyboard": return runStoryboard(current);
    case "images":     return runImages(current);
    case "voice":      return runVoice(current);
    case "assemble":   return runAssemble(current);
    // music has no generator to re-run independently; return as-is.
    default:           return current;
  }
}

/**
 * Approve the current step and immediately run the next step's generator so
 * its result is ready for review.
 *
 * Step machine:
 *   ideate → script → storyboard → images → voice → music → assemble → done
 */
export async function approveStep(
  id: string,
  payload?: { ideaIndex?: number; musicMood?: string },
): Promise<ContentRun> {
  const run = getRun(id);
  if (!run) throw new Error(`Run not found: ${id}`);

  const product = getProduct(run.productId);
  if (!product) throw new Error(`Product not found: ${run.productId}`);

  switch (run.step) {
    case "ideate": {
      if (!run.idea?.options?.length) {
        throw new Error(`Run ${id}: no idea options to approve`);
      }
      const idx = payload?.ideaIndex ?? 0;
      const chosen = run.idea.options[idx];
      if (!chosen) {
        throw new Error(`Run ${id}: idea index ${idx} out of range`);
      }
      const next: ContentRun = {
        ...run,
        idea: { ...run.idea, chosen },
        step: "script",
        status: "generating",
      };
      saveRun(next);
      return runScript(next);
    }

    case "script": {
      const next: ContentRun = { ...run, step: "storyboard", status: "generating" };
      saveRun(next);
      return runStoryboard(next);
    }

    case "storyboard": {
      const next: ContentRun = { ...run, step: "images", status: "generating" };
      saveRun(next);
      return runImages(next);
    }

    case "images": {
      const next: ContentRun = { ...run, step: "voice", status: "generating" };
      saveRun(next);
      return runVoice(next);
    }

    case "voice": {
      const mood =
        payload?.musicMood ??
        run.storyboard?.musicMood ??
        product.defaultMusicMood ??
        "cinematic";
      const next: ContentRun = { ...run, step: "music", status: "generating" };
      saveRun(next);
      return runMusic(next, mood);
    }

    case "music": {
      const next: ContentRun = { ...run, step: "assemble", status: "generating" };
      saveRun(next);
      return runAssemble(next);
    }

    // Terminal steps — nothing to advance.
    case "assemble":
    case "done":
      return run;

    default:
      return run;
  }
}

/**
 * Apply a manual edit to the current step's artifact and persist.
 *
 * - `script`: replace the script text.
 * - `caption`: update a specific scene caption by index in the assembled plan.
 * - `musicMood`: override the music mood.
 */
export function editStep(
  id: string,
  edit: {
    script?: string;
    caption?: { index: number; text: string };
    musicMood?: string;
  },
): ContentRun {
  const run = getRun(id);
  if (!run) throw new Error(`Run not found: ${id}`);

  let updated: ContentRun = run;

  if (edit.script != null) {
    updated = { ...updated, script: edit.script };
  }

  if (edit.caption != null) {
    if (!updated.plan) throw new Error(`Run ${id}: no plan to edit captions in`);
    const { index, text } = edit.caption;
    if (index < 0 || index >= updated.plan.scenes.length) {
      throw new Error(`Run ${id}: caption index ${index} out of range (${updated.plan.scenes.length} scenes)`);
    }
    const scenes = updated.plan.scenes.map((s, i) =>
      i === index ? { ...s, caption: text } : s,
    );
    updated = { ...updated, plan: { ...updated.plan, scenes } };
  }

  if (edit.musicMood != null) {
    updated = { ...updated, musicMood: edit.musicMood };
  }

  saveRun(updated);
  return updated;
}
