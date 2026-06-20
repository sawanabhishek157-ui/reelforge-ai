/**
 * Image → Video via fal.ai (Kling 1.0 standard).
 *
 * Kept under the original `veo.ts` filename + `/api/veo/*` routes so we
 * don't break imports; internally it now calls fal.ai instead of Google
 * because the Veo quota on AI Studio's free tier is too tight.
 *
 * Model:   fal-ai/kling-video/v1/standard/image-to-video
 * Cost:    ~$0.20 per 5-second clip
 * Speed:   30–60 s end-to-end
 */
import * as falModule from "@fal-ai/serverless-client";
import fs from "node:fs";
import path from "node:path";

const fal = (falModule as unknown as { fal: typeof falModule }).fal ?? falModule;

const ENDPOINT = "fal-ai/kling-video/v1/standard/image-to-video";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      "FAL_KEY is not set. Get one at https://fal.ai/dashboard/keys (free $5 trial credit, no card).",
    );
  }
  fal.config({ credentials: key });
  configured = true;
}

export type VeoOperation = {
  name: string;
  done?: boolean;
  response?: {
    generatedVideos?: { video: { uri?: string; bytes?: string; mimeType?: string } }[];
  };
};

/** Kick off image→video generation. Returns a polling handle. */
export async function startImageToVideo(opts: {
  imageBytes: Buffer;
  imageMimeType: string;
  prompt: string;
  durationSec?: number;
}) {
  ensureConfigured();

  const dataUri = `data:${opts.imageMimeType};base64,${opts.imageBytes.toString("base64")}`;

  // Kling supports 5 or 10 second clips only — round up to the nearest valid value.
  const duration = (opts.durationSec ?? 5) > 7 ? "10" : "5";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = await (fal as any).queue.submit(ENDPOINT, {
    input: {
      prompt: opts.prompt,
      image_url: dataUri,
      duration,
    },
  });

  return { name: sub.request_id, done: false } as VeoOperation;
}

/** Poll the queue. Returns done=true with a video URI when ready. */
export async function pollOperation(operationName: string): Promise<VeoOperation> {
  ensureConfigured();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (fal as any).queue;

  const status = await q.status(ENDPOINT, {
    requestId: operationName,
    logs: false,
  });

  if (status.status === "COMPLETED") {
    const r = await q.result(ENDPOINT, { requestId: operationName });
    return {
      name: operationName,
      done: true,
      response: {
        generatedVideos: [{ video: { uri: r.data.video.url } }],
      },
    };
  }

  return { name: operationName, done: false };
}

/** Download a completed video and save locally. */
export async function downloadVideoFromOperation(
  operationName: string,
  outPath: string,
) {
  const op = await pollOperation(operationName);
  if (!op.done) throw new Error("Operation not done yet");

  const video = op.response?.generatedVideos?.[0]?.video;
  if (!video?.uri) throw new Error("No generated video in operation response");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const res = await fetch(video.uri);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return outPath;
}
