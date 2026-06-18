import * as falModule from "@fal-ai/serverless-client";
import fs from "node:fs";
import path from "node:path";

const fal = (falModule as unknown as { fal: typeof falModule }).fal ?? falModule;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  fal.config({ credentials: process.env.FAL_KEY });
  configured = true;
}

export async function generateImage(prompt: string, outFilePath: string) {
  ensureConfigured();

  const result = (await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: "portrait_16_9",
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: false,
  })) as { images: { url: string }[] };

  const url = result.images?.[0]?.url;
  if (!url) throw new Error("FLUX returned no image URL");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download generated image: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
  fs.writeFileSync(outFilePath, buf);
  return outFilePath;
}
