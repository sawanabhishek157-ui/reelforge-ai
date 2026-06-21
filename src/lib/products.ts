import type { Product, ProductInput, Language } from "@/lib/types";
import { getDb } from "@/lib/db";
import { shortId } from "@/lib/ids";

// ---------------------------------------------------------------------------
// DB row shape (snake_case) — internal only
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  audience: string | null;
  voice_tone: string | null;
  language: string;
  content_pillars: string | null;
  dos: string | null;
  donts: string | null;
  example_posts: string | null;
  default_voice_id: string | null;
  default_music_mood: string | null;
  image_style: string | null;
  brand_assets: string | null;
  repo_url: string | null;
  store_url: string | null;
  site_url: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    ...(row.slug != null && { slug: row.slug }),
    ...(row.description != null && { description: row.description }),
    ...(row.audience != null && { audience: row.audience }),
    ...(row.voice_tone != null && { voiceTone: row.voice_tone }),
    language: row.language as Language,
    contentPillars: parseJsonArray(row.content_pillars),
    dos: parseJsonArray(row.dos),
    donts: parseJsonArray(row.donts),
    examplePosts: parseJsonArray(row.example_posts),
    ...(row.default_voice_id != null && { defaultVoiceId: row.default_voice_id }),
    ...(row.default_music_mood != null && { defaultMusicMood: row.default_music_mood }),
    ...(row.image_style != null && { imageStyle: row.image_style }),
    brandAssets: parseJsonArray(row.brand_assets),
    ...(row.repo_url != null && { repoUrl: row.repo_url }),
    ...(row.store_url != null && { storeUrl: row.store_url }),
    ...(row.site_url != null && { siteUrl: row.site_url }),
    ...(row.created_at != null && { createdAt: row.created_at }),
  };
}

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createProduct(input: ProductInput): Product {
  const db = getDb();
  const id = shortId();
  const slug = input.slug ?? deriveSlug(input.name);

  const stmt = db.prepare<[
    string, string, string, string | null, string | null,
    string | null, string, string, string, string,
    string, string | null, string | null, string | null,
    string, string | null, string | null, string | null
  ]>(`
    INSERT INTO products (
      id, name, slug, description, audience,
      voice_tone, language, content_pillars, dos, donts,
      example_posts, default_voice_id, default_music_mood, image_style,
      brand_assets, repo_url, store_url, site_url
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    input.name,
    slug,
    input.description ?? null,
    input.audience ?? null,
    input.voiceTone ?? null,
    input.language,
    JSON.stringify(input.contentPillars ?? []),
    JSON.stringify(input.dos ?? []),
    JSON.stringify(input.donts ?? []),
    JSON.stringify(input.examplePosts ?? []),
    input.defaultVoiceId ?? null,
    input.defaultMusicMood ?? null,
    input.imageStyle ?? null,
    JSON.stringify(input.brandAssets ?? []),
    input.repoUrl ?? null,
    input.storeUrl ?? null,
    input.siteUrl ?? null,
  );

  const created = getProduct(id);
  if (!created) throw new Error(`Failed to read back product after insert (id=${id})`);
  return created;
}

export function getProduct(id: string): Product | null {
  const db = getDb();
  const row = db
    .prepare<[string], ProductRow>(`SELECT * FROM products WHERE id = ? LIMIT 1`)
    .get(id);
  return row ? rowToProduct(row) : null;
}

export function getProductBySlug(slug: string): Product | null {
  const db = getDb();
  const row = db
    .prepare<[string], ProductRow>(`SELECT * FROM products WHERE slug = ? LIMIT 1`)
    .get(slug);
  return row ? rowToProduct(row) : null;
}

export function listProducts(): Product[] {
  const db = getDb();
  const rows = db
    .prepare<[], ProductRow>(`SELECT * FROM products ORDER BY created_at DESC`)
    .all();
  return rows.map(rowToProduct);
}

export function updateProduct(id: string, patch: Partial<ProductInput>): Product {
  const existing = getProduct(id);
  if (!existing) throw new Error(`Product not found: ${id}`);

  const merged: ProductInput = {
    name: patch.name ?? existing.name,
    slug: patch.slug ?? existing.slug,
    description: patch.description ?? existing.description,
    audience: patch.audience ?? existing.audience,
    voiceTone: patch.voiceTone ?? existing.voiceTone,
    language: patch.language ?? existing.language,
    contentPillars: patch.contentPillars ?? existing.contentPillars,
    dos: patch.dos ?? existing.dos,
    donts: patch.donts ?? existing.donts,
    examplePosts: patch.examplePosts ?? existing.examplePosts,
    defaultVoiceId: patch.defaultVoiceId ?? existing.defaultVoiceId,
    defaultMusicMood: patch.defaultMusicMood ?? existing.defaultMusicMood,
    imageStyle: patch.imageStyle ?? existing.imageStyle,
    brandAssets: patch.brandAssets ?? existing.brandAssets,
    repoUrl: patch.repoUrl ?? existing.repoUrl,
    storeUrl: patch.storeUrl ?? existing.storeUrl,
    siteUrl: patch.siteUrl ?? existing.siteUrl,
  };

  const db = getDb();
  db.prepare<[
    string, string | null, string | null, string | null,
    string | null, string, string, string, string,
    string, string | null, string | null, string | null,
    string, string | null, string | null, string | null,
    string
  ]>(`
    UPDATE products SET
      name = ?,
      slug = ?,
      description = ?,
      audience = ?,
      voice_tone = ?,
      language = ?,
      content_pillars = ?,
      dos = ?,
      donts = ?,
      example_posts = ?,
      default_voice_id = ?,
      default_music_mood = ?,
      image_style = ?,
      brand_assets = ?,
      repo_url = ?,
      store_url = ?,
      site_url = ?
    WHERE id = ?
  `).run(
    merged.name,
    merged.slug ?? null,
    merged.description ?? null,
    merged.audience ?? null,
    merged.voiceTone ?? null,
    merged.language,
    JSON.stringify(merged.contentPillars),
    JSON.stringify(merged.dos),
    JSON.stringify(merged.donts),
    JSON.stringify(merged.examplePosts),
    merged.defaultVoiceId ?? null,
    merged.defaultMusicMood ?? null,
    merged.imageStyle ?? null,
    JSON.stringify(merged.brandAssets),
    merged.repoUrl ?? null,
    merged.storeUrl ?? null,
    merged.siteUrl ?? null,
    id,
  );

  const updated = getProduct(id);
  if (!updated) throw new Error(`Failed to read back product after update (id=${id})`);
  return updated;
}

export function deleteProduct(id: string): void {
  const db = getDb();
  db.prepare<[string]>(`DELETE FROM products WHERE id = ?`).run(id);
}
