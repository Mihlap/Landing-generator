export type StockImageSize = { width: number; height: number };

function clampDim(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normVariation(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(999, Math.floor(v));
}

function normLandingSid(sid: number): number {
  if (!Number.isFinite(sid) || sid < 0) return 0;
  return sid >>> 0;
}

function cacheKey(query: string, size: StockImageSize, variation: number, landingSid: number): string {
  const v = normVariation(variation);
  const s = normLandingSid(landingSid);
  return `${clampDim(size.width, 200, 2400)}x${clampDim(size.height, 200, 2400)}|s${s}|v${v}|${query.trim().toLowerCase().slice(0, 240)}`;
}

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

const CACHE_MS = 20 * 60 * 1000;

function commonsStockEnabled(): boolean {
  return process.env.IMAGE_COMMONS_STOCK?.trim().toLowerCase() !== "false";
}

function openverseStockEnabled(): boolean {
  return process.env.IMAGE_OPENVERSE_STOCK?.trim().toLowerCase() !== "false";
}

const COMMONS_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function fetchCommonsPhotoUrl(
  query: string,
  size: StockImageSize,
  variation: number,
  landingSid: number,
): Promise<string | null> {
  const q = query.trim().slice(0, 200);
  if (!q) return null;
  const thumbW = clampDim(size.width, 400, 1920);
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("formatversion", "2");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", q);
  u.searchParams.set("gsrnamespace", "6");
  u.searchParams.set("gsrlimit", "10");
  u.searchParams.set("prop", "imageinfo");
  u.searchParams.set("iiprop", "url|mime");
  u.searchParams.set("iiurlwidth", String(thumbW));

  const res = await fetch(u.toString(), {
    headers: {
      "User-Agent": "project-x-landing/1.0 (stock search; local server)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  type Page = { title?: string; imageinfo?: { thumburl?: string; url?: string; mime?: string }[] };
  const json = (await res.json()) as { query?: { pages?: Page[] | Record<string, Page> } };
  const rawPages = json.query?.pages;
  const pages: Page[] = Array.isArray(rawPages)
    ? rawPages
    : rawPages && typeof rawPages === "object"
      ? Object.values(rawPages)
      : [];
  if (pages.length === 0) return null;
  const candidates: string[] = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    const mime = info?.mime?.toLowerCase() ?? "";
    if (!info || !COMMONS_ALLOWED_MIME.has(mime)) continue;
    const raw = info.thumburl || info.url;
    if (raw && /^https?:\/\//i.test(raw)) candidates.push(raw);
  }
  if (candidates.length === 0) return null;
  const v = normVariation(variation);
  const sid = normLandingSid(landingSid);
  const idx = (v + sid) % candidates.length;
  return candidates[idx] ?? null;
}

async function fetchOpenversePhotoUrl(
  query: string,
  variation: number,
  landingSid: number,
): Promise<string | null> {
  const q = query.trim().slice(0, 200);
  if (!q) return null;
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", q);
  u.searchParams.set("page_size", "20");
  u.searchParams.set("page", "1");

  const res = await fetch(u.toString(), {
    headers: {
      "User-Agent": "project-x-landing/1.0 (stock search; local server)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    results?: { url?: string; mature?: boolean }[];
  };
  const list = json.results;
  if (!Array.isArray(list)) return null;
  const candidates: string[] = [];
  for (const item of list) {
    if (item.mature) continue;
    const raw = item.url?.trim();
    if (raw && /^https?:\/\//i.test(raw)) candidates.push(raw);
  }
  if (candidates.length === 0) return null;
  const v = normVariation(variation);
  const sid = normLandingSid(landingSid);
  const idx = (v + sid) % candidates.length;
  return candidates[idx] ?? null;
}

export function stockSearchConfigured(): boolean {
  return Boolean(commonsStockEnabled() || openverseStockEnabled());
}

export async function fetchStockImageUrl(
  query: string,
  size: StockImageSize,
  variation: number = 0,
  landingSid: number = 0,
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  const key = cacheKey(q, size, variation, landingSid);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.url;

  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    if (commonsStockEnabled()) {
      try {
        const url = await fetchCommonsPhotoUrl(q, size, variation, landingSid);
        if (url) {
          cache.set(key, { url, expiresAt: Date.now() + CACHE_MS });
          return url;
        }
      } catch {
      }
    }
    if (openverseStockEnabled()) {
      try {
        const url = await fetchOpenversePhotoUrl(q, variation, landingSid);
        if (url) {
          cache.set(key, { url, expiresAt: Date.now() + CACHE_MS });
          return url;
        }
      } catch {
      }
    }
    return null;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
}
