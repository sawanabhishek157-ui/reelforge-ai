import fs from "node:fs";
import path from "node:path";

import { MOODS } from "@/lib/music";
import { PUBLIC_DIR } from "@/lib/paths";

export const runtime = "nodejs";

/** GET /api/music — list moods + which ones have actual MP3s on disk. */
export async function GET() {
  const moods = MOODS.map((m) => {
    if (!m.url) return { ...m, available: true };
    const abs = path.join(PUBLIC_DIR, m.url.replace(/^\//, ""));
    return { ...m, available: fs.existsSync(abs) };
  });
  return Response.json({ moods });
}
