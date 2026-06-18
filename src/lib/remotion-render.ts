import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

import type { Plan } from "@/remotion/types";

export async function renderReel({
  plan,
  outputPath,
  onLog,
}: {
  plan: Plan;
  outputPath: string;
  onLog?: (line: string) => void;
}): Promise<void> {
  // Write props JSON to a temp file so CLI gets it cleanly even when large
  const tmpProps = path.join(
    process.cwd(),
    "data",
    `props-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  );
  fs.mkdirSync(path.dirname(tmpProps), { recursive: true });
  fs.writeFileSync(tmpProps, JSON.stringify({ plan }, null, 2));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const entry = path.join(process.cwd(), "src/remotion/index.ts");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "remotion",
        "render",
        entry,
        "Reel",
        outputPath,
        `--props=${tmpProps}`,
        "--codec=h264",
        "--log=info",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout?.on("data", (chunk) => onLog?.(chunk.toString()));
    child.stderr?.on("data", (chunk) => onLog?.(chunk.toString()));

    child.on("error", reject);
    child.on("exit", (code) => {
      // best-effort cleanup
      try {
        fs.unlinkSync(tmpProps);
      } catch {}
      if (code === 0) resolve();
      else reject(new Error(`Remotion render exited with code ${code}`));
    });
  });
}
