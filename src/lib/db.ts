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
      aspect TEXT DEFAULT '9:16',
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

    CREATE TABLE IF NOT EXISTS veo_jobs (
      id TEXT PRIMARY KEY,
      op_name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      duration_sec INTEGER,
      source_path TEXT NOT NULL,
      output_path TEXT,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 2: per-product brand/content profile (grounding for the AI).
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      description TEXT,
      audience TEXT,
      voice_tone TEXT,
      language TEXT DEFAULT 'english',   -- 'hinglish' | 'english'
      content_pillars TEXT,              -- JSON string[]
      dos TEXT,                          -- JSON string[]
      donts TEXT,                        -- JSON string[]
      example_posts TEXT,                -- JSON string[]
      default_voice_id TEXT,
      default_music_mood TEXT,
      image_style TEXT,                  -- style descriptor for FLUX prompts
      brand_assets TEXT,                 -- JSON string[] of public-relative paths
      repo_url TEXT,                     -- reserved for future auto-grounding
      store_url TEXT,
      site_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 2: an agentic content run walks the gated step pipeline.
    CREATE TABLE IF NOT EXISTS content_runs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      title TEXT,
      step TEXT NOT NULL DEFAULT 'ideate',   -- ideate|script|storyboard|images|voice|music|assemble|done
      status TEXT NOT NULL DEFAULT 'awaiting_approval', -- generating|awaiting_approval|approved|failed|done
      idea_json TEXT,        -- { chosen, options[] }
      script TEXT,
      storyboard_json TEXT,  -- the scene-level storyboard (pre image-gen)
      plan_json TEXT,        -- the Remotion Plan (scenes) being assembled
      voiceover_path TEXT,
      music_mood TEXT,
      output_path TEXT,
      step_state_json TEXT,  -- { step: 'pending'|'approved' }
      feedback_json TEXT,    -- { step: [feedback strings] }
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_runs_product ON content_runs(product_id, created_at);
  `);

  // Idempotent migrations
  const cols = conn.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "aspect")) {
    conn.exec(`ALTER TABLE projects ADD COLUMN aspect TEXT DEFAULT '9:16'`);
  }
  if (!cols.some((c) => c.name === "speech_plan_json")) {
    conn.exec(`ALTER TABLE projects ADD COLUMN speech_plan_json TEXT`);
  }

  const runCols = conn.prepare(`PRAGMA table_info(content_runs)`).all() as { name: string }[];
  if (runCols.length && !runCols.some((c) => c.name === "storyboard_json")) {
    conn.exec(`ALTER TABLE content_runs ADD COLUMN storyboard_json TEXT`);
  }

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
