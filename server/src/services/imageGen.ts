export type ImageProvider = "pollinations" | "doubao" | "off";

const DEFAULT_DOUBAO_BASE_URL = "https://api.doubao-ai.com/v1";

export const WIKIMEDIA_STATIC_FALLBACK_JPEG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/1400px-Fronalpstock_big.jpg";

export const WIKIMEDIA_ALT_FALLBACK_JPEG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Felis_catus-cat_on_snow.jpg/1200px-Felis_catus-cat_on_snow.jpg";

type Size = { width: number; height: number };

function clampSize(size: Size): Size {
  return {
    width: Math.max(256, Math.min(2048, Math.round(size.width))),
    height: Math.max(256, Math.min(2048, Math.round(size.height))),
  };
}

const UNSPLASH_FLOWER_IDS = [
  "photo-1563241527-3004b7be0ffd",
  "photo-1490750967868-88aa4486c946",
  "photo-1518882605630-8e3e4de6c1e3",
  "photo-1582792182709-0f92e52964f5",
  "photo-1455659817273-f96807779a8a",
  "photo-1520763185298-35f360db26a1",
];

const UNSPLASH_GENERIC_IDS = [
  "photo-1460925895917-afdab827c52f",
  "photo-1557804506-669a67965ba0",
  "photo-1552664730-d307ca884978",
  "photo-1522071820081-009f0129c71c",
  "photo-1504384308090-c894fdcc538d",
];

const UNSPLASH_PORTRAIT_IDS = [
  "photo-1494790108377-be9c29b29330",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1438761681033-6461ffad8d80",
  "photo-1472099645785-5658abf4ff4e",
  "photo-1500648767791-00dcc994a43e",
  "photo-1534528741775-53994a69daeb",
  "photo-1527980965255-d3b416303d12",
  "photo-1544725176-7c40e5a71c5e",
  "photo-1560250097-0b93528c311a",
  "photo-1573496359142-b8d87734a5a2",
  "photo-1519345182560-3f2917c472ef",
  "photo-1580489944761-15a19d654956",
];

function hashPrompt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normLandingSid(sid: number): number {
  if (!Number.isFinite(sid) || sid < 0) return 0;
  return sid >>> 0;
}

export function pickCuratedStockImageUrl(
  prompt: string,
  size: Size,
  variation: number = 0,
  landingSid: number = 0,
): string {
  const s = clampSize(size);
  const w = s.width;
  const h = s.height;
  const p = prompt.toLowerCase();
  const v = Number.isFinite(variation) && variation >= 0 ? Math.min(999, Math.floor(variation)) : 0;
  const sid = normLandingSid(landingSid);
  const isFlower =
    /цвет|букет|роз|пион|тюльпан|флор|сухоцвет|flower|bouquet|rose|florist|wedding|peony|tulip/i.test(
      p,
    );
  const avatarish =
    s.width <= 520 && s.height <= 520 && Math.abs(s.width - s.height) <= 120;
  const isPortrait =
    avatarish ||
    /портрет|отзыв|review|клиент|покупател|аватар|headshot|portrait|reviewer|customer photo|фото\s*клиент|author photo|лицо|smiling (man|woman|person)|pravatar|randomuser|thispersondoesnotexist/i.test(
      p,
    );
  let pool: readonly string[];
  if (isPortrait) {
    pool = UNSPLASH_PORTRAIT_IDS;
  } else if (isFlower) {
    pool = UNSPLASH_FLOWER_IDS;
  } else {
    pool = UNSPLASH_GENERIC_IDS;
  }
  const mix = hashPrompt(`${prompt}\0${sid}`);
  const id = pool[(mix + v) % pool.length]!;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export function resolveImageProvider(): ImageProvider {
  const raw = String(process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  if (raw === "doubao") return "doubao";
  if (raw === "off") return "off";
  return "pollinations";
}

export function toPollinationsImageUrl(
  prompt: string,
  size: Size,
  variation: number = 0,
  landingSid: number = 0,
): string {
  const s = clampSize(size);
  const v = Number.isFinite(variation) && variation > 0 ? Math.min(999, Math.floor(variation)) : 0;
  const sid = normLandingSid(landingSid);
  let p = prompt.trim().slice(0, 360);
  if (v > 0) {
    p = `${p}, alternate composition ${v}`;
  }
  if (sid > 0) {
    p = `${p}, unique scene ${sid}`;
  }
  const encoded = encodeURIComponent(p.slice(0, 400));
  return `https://image.pollinations.ai/prompt/${encoded}?width=${s.width}&height=${s.height}`;
}

function toDoubaoSize(size: Size): string {
  const s = clampSize(size);
  return `${s.width}x${s.height}`;
}

async function generateDoubaoImageUrl(
  prompt: string,
  size: Size,
  variation: number = 0,
  landingSid: number = 0,
): Promise<string> {
  const apiKey = String(process.env.DOUBAO_API_KEY || "").trim();
  if (!apiKey) throw new Error("DOUBAO_API_KEY is not set");

  const baseUrl = String(process.env.DOUBAO_BASE_URL || DEFAULT_DOUBAO_BASE_URL).trim();
  const model = String(process.env.DOUBAO_IMAGE_MODEL || "doubao-seedream-5-0-260128").trim();
  const v = Number.isFinite(variation) && variation > 0 ? Math.min(999, Math.floor(variation)) : 0;
  const sid = normLandingSid(landingSid);
  let base = prompt.trim();
  if (v > 0) base = `${base.slice(0, 720)} (composition variant ${v})`;
  if (sid > 0) base = `${base.slice(0, 760)} [ref-${sid}]`;
  const fullPrompt = base.slice(0, 800);

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      size: toDoubaoSize(size),
      response_format: "url",
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Doubao ${res.status}: ${raw.slice(0, 500)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Doubao: invalid JSON response");
  }

  const url = parsed?.data?.[0]?.url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new Error("Doubao: missing image url");
  }
  return url;
}

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(
  provider: ImageProvider,
  prompt: string,
  size: Size,
  variation: number,
  landingSid: number,
): string {
  const s = clampSize(size);
  const v = Number.isFinite(variation) && variation >= 0 ? Math.min(999, Math.floor(variation)) : 0;
  const sid = normLandingSid(landingSid);
  return `${provider}|s${sid}|v${v}|${s.width}x${s.height}|${prompt.trim().slice(0, 400)}`;
}

export async function getImageUrl(
  provider: ImageProvider,
  prompt: string,
  size: Size,
  variation: number = 0,
  landingSid: number = 0,
): Promise<string> {
  const p = prompt.trim();
  if (!p) throw new Error("prompt is required");

  if (provider === "off") throw new Error("image generation is disabled");
  if (provider === "pollinations") return toPollinationsImageUrl(p, size, variation, landingSid);

  const key = cacheKey(provider, p, size, variation, landingSid);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    const url = await generateDoubaoImageUrl(p, size, variation, landingSid);
    cache.set(key, { url, expiresAt: Date.now() + 30 * 60 * 1000 });
    return url;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
}

