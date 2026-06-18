import path from "node:path";
import fs from "node:fs";

export const PUBLIC_DIR = path.join(process.cwd(), "public");
export const PROJECTS_DIR = path.join(PUBLIC_DIR, "projects");

export function projectDir(projectId: string) {
  return path.join(PROJECTS_DIR, projectId);
}

export function projectReferencesDir(projectId: string) {
  return path.join(projectDir(projectId), "references");
}

export function projectScenesDir(projectId: string) {
  return path.join(projectDir(projectId), "scenes");
}

export function projectVoicePath(projectId: string) {
  return path.join(projectDir(projectId), "voice.mp3");
}

export function projectOutputPath(projectId: string) {
  return path.join(projectDir(projectId), "output.mp4");
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Convert an absolute public/-rooted path into a URL path. */
export function toPublicUrl(absPath: string) {
  const rel = path.relative(PUBLIC_DIR, absPath).split(path.sep).join("/");
  return "/" + rel;
}
