/**
 * Parse a fetch Response that may or may not contain JSON, and throw a
 * useful Error when the response wasn't OK. Replaces the brittle
 * `(await r.json()).error` pattern that breaks on empty bodies.
 */
export async function ensureOk(res: Response): Promise<unknown> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // fall through; we'll surface raw text
    }
  }

  if (!res.ok) {
    const fromJson =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null;
    const snippet = text.slice(0, 300);
    throw new Error(
      fromJson ??
        `HTTP ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ""}`,
    );
  }

  return data;
}
