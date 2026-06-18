import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, "reelforge.db");

declare global {
  // eslint-disable-next-line no-var
  var __reelforgeDb: Database.Database | undefined;
}

function open() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");

  conn.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT,
      duration_sec INTEGER,
      script TEXT,
      voice_id TEXT,
      plan_json TEXT,
      voiceover_path TEXT,
      output_path TEXT,
      status TEXT,
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      file_path TEXT NOT NULL,
      meta TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      idx INTEGER NOT NULL,
      start_sec REAL NOT NULL,
      end_sec REAL NOT NULL,
      source TEXT NOT NULL,
      image_path TEXT NOT NULL,
      caption TEXT,
      prompt TEXT,
      zoom TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id, idx);
  `);

  return conn;
}

/** Returns a singleton SQLite handle. Opens on first call, not at import time. */
export function getDb(): Database.Database {
  if (!global.__reelforgeDb) {
    global.__reelforgeDb = open();
  }
  return global.__reelforgeDb;
}

// Proxy export so existing `db.prepare(...)` call sites keep working without
// triggering DB open at module import time.
export const db = new Proxy({} as Database.Database, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});
