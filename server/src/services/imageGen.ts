export type ImageProvider = "pollinations" | "doubao" | "off";

const DEFAULT_DOUBAO_BASE_URL = "https://api.doubao-ai.com/v1";

type Size = { width: number; height: number };

function clampSize(size: Size): Size {
  return {
    width: Math.max(256, Math.min(2048, Math.round(size.width))),
    height: Math.max(256, Math.min(2048, Math.round(size.height))),
  };
}

/** Короткий список стабильных Unsplash-фото: без API, подбирается по ключевым словам промпта. */
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

function hashPrompt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickCuratedStockImageUrl(prompt: string, size: Size): string {
  const s = clampSize(size);
  const w = s.width;
  const h = s.height;
  const p = prompt.toLowerCase();
  const isFlower =
    /цвет|букет|роз|пион|тюльпан|флор|сухоцвет|flower|bouquet|rose|florist|wedding|peony|tulip/i.test(
      p,
    );
  const pool = isFlower ? UNSPLASH_FLOWER_IDS : UNSPLASH_GENERIC_IDS;
  const id = pool[hashPrompt(prompt) % pool.length]!;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export function resolveImageProvider(): ImageProvider {
  const raw = String(process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  if (raw === "doubao") return "doubao";
  if (raw === "off") return "off";
  return "pollinations";
}

export function toPollinationsImageUrl(prompt: string, size: Size): string {
  const s = clampSize(size);
  const encoded = encodeURIComponent(prompt.trim().slice(0, 400));
  return `https://image.pollinations.ai/prompt/${encoded}?width=${s.width}&height=${s.height}`;
}

function toDoubaoSize(size: Size): string {
  const s = clampSize(size);
  return `${s.width}x${s.height}`;
}

async function generateDoubaoImageUrl(prompt: string, size: Size): Promise<string> {
  const apiKey = String(process.env.DOUBAO_API_KEY || "").trim();
  if (!apiKey) throw new Error("DOUBAO_API_KEY is not set");

  const baseUrl = String(process.env.DOUBAO_BASE_URL || DEFAULT_DOUBAO_BASE_URL).trim();
  const model = String(process.env.DOUBAO_IMAGE_MODEL || "doubao-seedream-5-0-260128").trim();

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: prompt.trim().slice(0, 800),
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

function cacheKey(provider: ImageProvider, prompt: string, size: Size): string {
  const s = clampSize(size);
  return `${provider}|${s.width}x${s.height}|${prompt.trim().slice(0, 400)}`;
}

export async function getImageUrl(provider: ImageProvider, prompt: string, size: Size): Promise<string> {
  const p = prompt.trim();
  if (!p) throw new Error("prompt is required");

  if (provider === "off") throw new Error("image generation is disabled");
  if (provider === "pollinations") return toPollinationsImageUrl(p, size);

  const key = cacheKey(provider, p, size);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    const url = await generateDoubaoImageUrl(p, size);
    cache.set(key, { url, expiresAt: Date.now() + 30 * 60 * 1000 });
    return url;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
}

