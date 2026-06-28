/**
 * Free, local, deterministic background inpainting.
 *
 * Produces a subject-free copy of a scene image by filling the masked subject
 * region with surrounding background colour. This lets the depth-layered
 * compositor (LayeredScene) parallax the masked subject plane HARD without
 * revealing a "ghost hole" of the original subject behind it.
 *
 * Method: dilate the subject mask (to swallow the feathered halo), multi-source
 * BFS fill from the hole boundary inward (each hole pixel takes the average of
 * its already-filled neighbours → a nearest-boundary "smear"), then a box blur
 * over the filled region so it reads as soft, defocused background. The plane
 * sits behind the subject and the effects, so a smear is more than enough — and
 * unlike a paid inpaint model it is free and byte-deterministic.
 *
 * Node-only — do not import from Remotion components. A higher-quality paid
 * path (Segmind FLUX Fill) lives in src/lib/segmind.ts behind BG_INPAINT=flux.
 */

import fs from "node:fs";
import path from "node:path";

/** px to grow the subject hole, covering the mask's feathered edge + halo. */
const DILATE_RADIUS = 8;
/** Blur passes scale with hole size so large subjects smear softer. */
const MIN_BLUR_PASSES = 6;
const MAX_BLUR_PASSES = 26;

/** More blur for bigger holes — a wide silhouette needs a softer smear. */
function blurPassesFor(holeCount: number): number {
  const scaled = Math.round(Math.sqrt(holeCount) / 11);
  return Math.min(MAX_BLUR_PASSES, Math.max(MIN_BLUR_PASSES, scaled));
}

/** Canonical clean-background path: `<dir>/<stem>.bg.png`. */
export function backgroundPathFor(imageAbsPath: string): string {
  const dir = path.dirname(imageAbsPath);
  const stem = path.basename(imageAbsPath, path.extname(imageAbsPath));
  return path.join(dir, `${stem}.bg.png`);
}

/** Grow a boolean hole mask by `radius` px (4-neighbour morphological dilation). */
function dilate(hole: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  let buf = hole;
  for (let pass = 0; pass < radius; pass++) {
    const next = new Uint8Array(buf.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (buf[i]) {
          next[i] = 1;
          continue;
        }
        if (
          (x > 0 && buf[i - 1]) ||
          (x < width - 1 && buf[i + 1]) ||
          (y > 0 && buf[i - width]) ||
          (y < height - 1 && buf[i + width])
        ) {
          next[i] = 1;
        }
      }
    }
    buf = next;
  }
  return buf;
}

/**
 * Multi-source BFS fill. Known (non-hole) pixels seed the queue; each hole
 * pixel is assigned the average colour of its already-filled neighbours as the
 * front sweeps inward. O(n) and deterministic.
 */
function bfsFill(
  rgb: Uint8Array,
  hole: Uint8Array,
  width: number,
  height: number,
  channels: number,
): void {
  const n = width * height;
  const filled = new Uint8Array(n); // 1 = has a colour (known or assigned)
  for (let i = 0; i < n; i++) filled[i] = hole[i] ? 0 : 1;

  // Seed: known pixels adjacent to at least one hole pixel.
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const enqueued = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (hole[i]) continue;
      const borders =
        (x > 0 && hole[i - 1]) ||
        (x < width - 1 && hole[i + 1]) ||
        (y > 0 && hole[i - width]) ||
        (y < height - 1 && hole[i + width]);
      if (borders) {
        queue[tail++] = i;
        enqueued[i] = 1;
      }
    }
  }

  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i / width) | 0;
    // Visit 4-neighbour hole pixels not yet filled.
    const neighbours = [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      y > 0 ? i - width : -1,
      y < height - 1 ? i + width : -1,
    ];
    for (const q of neighbours) {
      if (q < 0 || filled[q]) continue;
      // Average colour of q's already-filled 4-neighbours.
      const qx = q % width;
      const qy = (q / width) | 0;
      const qn = [
        qx > 0 ? q - 1 : -1,
        qx < width - 1 ? q + 1 : -1,
        qy > 0 ? q - width : -1,
        qy < height - 1 ? q + width : -1,
      ];
      let count = 0;
      const sum = [0, 0, 0];
      for (const r of qn) {
        if (r < 0 || !filled[r]) continue;
        for (let c = 0; c < 3; c++) sum[c] += rgb[r * channels + c];
        count++;
      }
      if (count === 0) continue; // shouldn't happen — q reached via a filled pixel
      for (let c = 0; c < 3; c++) rgb[q * channels + c] = Math.round(sum[c] / count);
      filled[q] = 1;
      if (!enqueued[q]) {
        queue[tail++] = q;
        enqueued[q] = 1;
      }
    }
  }
}

/** Separable box blur applied only where `region` is set, leaving the rest crisp. */
function blurRegion(
  rgb: Uint8Array,
  region: Uint8Array,
  width: number,
  height: number,
  channels: number,
  passes: number,
): void {
  for (let pass = 0; pass < passes; pass++) {
    // Horizontal then vertical, sampling the 3-tap neighbourhood.
    const tmp = new Uint8Array(rgb.length);
    tmp.set(rgb);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!region[i]) continue;
        const l = x > 0 ? i - 1 : i;
        const r = x < width - 1 ? i + 1 : i;
        for (let c = 0; c < 3; c++) {
          tmp[i * channels + c] = Math.round(
            (rgb[l * channels + c] + rgb[i * channels + c] + rgb[r * channels + c]) / 3,
          );
        }
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!region[i]) continue;
        const u = y > 0 ? i - width : i;
        const d = y < height - 1 ? i + width : i;
        for (let c = 0; c < 3; c++) {
          rgb[i * channels + c] = Math.round(
            (tmp[u * channels + c] + tmp[i * channels + c] + tmp[d * channels + c]) / 3,
          );
        }
      }
    }
  }
}

export interface InpaintResult {
  /** Path the subject-free background PNG was written to. */
  backgroundPath: string;
}

/**
 * Write a subject-free background image from a scene image + subject mask.
 *
 * @param imageAbsPath  Source scene image (RGB PNG).
 * @param maskAbsPath   White-on-black subject mask (white = subject to remove).
 * @param outBgAbsPath  Destination for the subject-free PNG.
 */
export async function generateCleanBackground(
  imageAbsPath: string,
  maskAbsPath: string,
  outBgAbsPath: string,
): Promise<InpaintResult> {
  // Cache: skip if the bg is newer than both inputs.
  if (
    fs.existsSync(outBgAbsPath) &&
    fs.existsSync(imageAbsPath) &&
    fs.existsSync(maskAbsPath)
  ) {
    const bgM = fs.statSync(outBgAbsPath).mtimeMs;
    if (bgM >= fs.statSync(imageAbsPath).mtimeMs && bgM >= fs.statSync(maskAbsPath).mtimeMs) {
      return { backgroundPath: outBgAbsPath };
    }
  }

  const { RawImage } = await import("@huggingface/transformers");

  const imgBuf = fs.readFileSync(imageAbsPath);
  const imgExt = path.extname(imageAbsPath).toLowerCase().replace(".", "");
  const imgMime = imgExt === "jpg" || imgExt === "jpeg" ? "image/jpeg" : `image/${imgExt}`;
  const src = (await RawImage.fromBlob(new Blob([imgBuf], { type: imgMime }))) as {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array | Uint8ClampedArray;
  };

  const { width, height, channels } = src;
  const rgb = Uint8Array.from(src.data); // working copy

  const maskBuf = fs.readFileSync(maskAbsPath);
  const maskImg = (await RawImage.fromBlob(new Blob([maskBuf], { type: "image/png" }))) as {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array | Uint8ClampedArray;
  };

  // The mask may differ in resolution; sample it nearest-neighbour onto the image grid.
  const n = width * height;
  const hole = new Uint8Array(n);
  const mw = maskImg.width;
  const mh = maskImg.height;
  const mc = maskImg.channels;
  for (let y = 0; y < height; y++) {
    const my = Math.min(mh - 1, (y * mh / height) | 0);
    for (let x = 0; x < width; x++) {
      const mx = Math.min(mw - 1, (x * mw / width) | 0);
      if (maskImg.data[(my * mw + mx) * mc] > 127) hole[(y * width + x)] = 1;
    }
  }

  const grown = dilate(hole, width, height, DILATE_RADIUS);

  // If the hole covers nearly the whole frame there is no background to borrow
  // from — bail and let the caller fall back to the full image.
  let holeCount = 0;
  for (let i = 0; i < n; i++) holeCount += grown[i];
  if (holeCount === 0 || holeCount > n * 0.92) {
    fs.mkdirSync(path.dirname(outBgAbsPath), { recursive: true });
    fs.copyFileSync(imageAbsPath, outBgAbsPath);
    return { backgroundPath: outBgAbsPath };
  }

  bfsFill(rgb, grown, width, height, channels);
  blurRegion(rgb, grown, width, height, channels, blurPassesFor(holeCount));

  const out = new RawImage(rgb, width, height, channels as 1 | 2 | 3 | 4);
  fs.mkdirSync(path.dirname(outBgAbsPath), { recursive: true });
  await out.save(outBgAbsPath);

  return { backgroundPath: outBgAbsPath };
}
