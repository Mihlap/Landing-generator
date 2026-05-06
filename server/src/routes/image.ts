import type { Request, Response } from "express";
import { Router } from "express";
import {
  getImageUrl,
  resolveImageProvider,
  toPollinationsImageUrl,
} from "../services/imageGen.js";

const router = Router();
const IMAGE_TIMEOUT_MS = 20_000;
const IMAGE_CACHE_MS = 20 * 60 * 1000;

type CachedImage = {
  body: Buffer;
  contentType: string;
  expiresAt: number;
};

const imageCache = new Map<string, CachedImage>();
const imageInflight = new Map<string, Promise<CachedImage>>();

function parseLandingSid(raw: unknown): number {
  if (typeof raw !== "string" || !raw.trim()) return 0;
  const t = raw.trim();
  if (/^\d{1,15}$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n >>> 0 : 0;
  }
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return Math.abs(h) >>> 0;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`image timeout after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function clampDimension(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(256, Math.min(2048, Math.round(raw)));
}

function neutralFallbackSvg(width: number, height: number): string {
  const w = clampDimension(width, 1024);
  const h = clampDimension(height, 768);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Image is being generated">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#312e81"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0" stop-color="#818cf8" stop-opacity=".32"/>
      <stop offset="1" stop-color="#818cf8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <g fill="none" stroke="#c7d2fe" stroke-opacity=".42" stroke-width="${Math.max(2, Math.round(w / 420))}">
    <path d="M${Math.round(w * 0.18)} ${Math.round(h * 0.58)}c${Math.round(w * 0.12)}-${Math.round(h * 0.22)} ${Math.round(w * 0.26)}-${Math.round(h * 0.22)} ${Math.round(w * 0.38)} 0s${Math.round(w * 0.26)} ${Math.round(h * 0.22)} ${Math.round(w * 0.38)} 0"/>
    <circle cx="${Math.round(w * 0.5)}" cy="${Math.round(h * 0.42)}" r="${Math.round(Math.min(w, h) * 0.12)}"/>
  </g>
  <text x="50%" y="58%" text-anchor="middle" fill="#eef2ff" font-family="Inter, Arial, sans-serif" font-size="${Math.max(18, Math.round(w / 34))}" font-weight="700">Изображение генерируется</text>
  <text x="50%" y="64%" text-anchor="middle" fill="#c7d2fe" font-family="Inter, Arial, sans-serif" font-size="${Math.max(13, Math.round(w / 54))}">AI preview fallback</text>
</svg>`;
}

function sendNeutralFallback(res: Response, width: number, height: number): void {
  res.status(200);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.send(neutralFallbackSvg(width, height));
}

async function fetchGeneratedImage(url: string, cacheKey: string, signal?: AbortSignal): Promise<CachedImage> {
  const now = Date.now();
  const cached = imageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached;

  const running = imageInflight.get(cacheKey);
  if (running) return running;

  const job = (async () => {
    const response = await withTimeout(
      fetch(url, {
        method: "GET",
        signal,
        redirect: "follow",
        headers: { Accept: "image/*" },
      }),
      IMAGE_TIMEOUT_MS,
    );
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`image provider returned ${response.status} ${contentType || "unknown content-type"}`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0) throw new Error("image provider returned empty body");

    const result = { body, contentType, expiresAt: Date.now() + IMAGE_CACHE_MS };
    imageCache.set(cacheKey, result);
    return result;
  })().finally(() => {
    imageInflight.delete(cacheKey);
  });

  imageInflight.set(cacheKey, job);
  return job;
}

router.get("/", async (req: Request, res: Response) => {
  const promptRaw = typeof req.query.prompt === "string" ? req.query.prompt : "";
  const prompt = promptRaw.trim() || "website section illustration";
  const wRaw = typeof req.query.w === "string" ? Number(req.query.w) : NaN;
  const hRaw = typeof req.query.h === "string" ? Number(req.query.h) : NaN;
  const vRaw = typeof req.query.v === "string" ? Number(req.query.v) : NaN;
  const variation = Number.isFinite(vRaw) && vRaw >= 0 ? Math.min(999, Math.floor(vRaw)) : 0;
  const landingSid = parseLandingSid(req.query.sid);

  const width = clampDimension(wRaw, 1024);
  const height = clampDimension(hRaw, 768);
  res.setHeader("Cache-Control", "no-store");
  const abortController = new AbortController();
  const abortImage = () => abortController.abort();
  req.on("aborted", abortImage);
  req.on("close", abortImage);

  try {
    const provider = resolveImageProvider();
    let url: string;
    try {
      url = await withTimeout(
        getImageUrl(provider, prompt, { width, height }, variation, landingSid, abortController.signal),
        IMAGE_TIMEOUT_MS,
      );
    } catch (err) {
      if (provider !== "doubao") throw err;
      url = toPollinationsImageUrl(prompt, { width, height }, variation, landingSid);
    }
    const cacheKey = `${provider}|${landingSid}|${variation}|${width}x${height}|${prompt}`;
    const image = await fetchGeneratedImage(url, cacheKey, abortController.signal);
    if (abortController.signal.aborted) return;
    res.status(200);
    res.setHeader("Cache-Control", "public, max-age=1200");
    res.setHeader("Content-Type", image.contentType);
    res.send(image.body);
  } catch (e) {
    if (abortController.signal.aborted) return;
    sendNeutralFallback(res, width, height);
  } finally {
    req.off("aborted", abortImage);
    req.off("close", abortImage);
  }
});

export default router;

