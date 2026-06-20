import fs from "node:fs";
import path from "node:path";

const SEGMIND_BASE = "https://api.segmind.com/v1";

export interface GenerateImageOptions {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
}

export async function generateImage(
  prompt: string,
  outAbs: string,
  opts: GenerateImageOptions = {},
): Promise<string> {
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    throw new Error("SEGMIND_API_KEY environment variable is not set");
  }

  const width = opts.width ?? 832;
  const height = opts.height ?? 1216;
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 32);
  const steps = opts.steps ?? 4;

  const body = {
    prompt,
    negative_prompt: "",
    samples: 1,
    num_inference_steps: steps,
    guidance_scale: 3.5,
    seed,
    width,
    height,
    base64: false,
  };

  const res = await fetch(`${SEGMIND_BASE}/flux-schnell`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Segmind API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  let imageBuffer: Buffer;

  if (contentType.includes("application/json")) {
    // Some Segmind endpoints return { image: "<base64>" }
    const json = (await res.json()) as Record<string, unknown>;
    const b64 =
      typeof json["image"] === "string"
        ? json["image"]
        : typeof json["output"] === "string"
          ? json["output"]
          : null;
    if (!b64) {
      throw new Error(
        `Segmind returned JSON but no image field: ${JSON.stringify(json).slice(0, 200)}`,
      );
    }
    imageBuffer = Buffer.from(b64, "base64");
  } else {
    // Binary image bytes
    const arrayBuf = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuf);
  }

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, imageBuffer);

  return outAbs;
}
