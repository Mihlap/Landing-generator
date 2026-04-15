import type { Request, Response } from "express";
import { Router } from "express";
import {
  getImageUrl,
  pickCuratedStockImageUrl,
  resolveImageProvider,
  toPollinationsImageUrl,
  WIKIMEDIA_STATIC_FALLBACK_JPEG,
} from "../services/imageGen.js";
import { fetchStockImageUrl, stockSearchConfigured } from "../services/stockImageSearch.js";

const router = Router();
const IMAGE_TIMEOUT_MS = 8_000;

function parseStockApiTimeoutMs(): number {
  const raw = process.env.IMAGE_STOCK_API_TIMEOUT_MS?.trim();
  if (!raw) return 2200;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 2200;
  return Math.min(15_000, Math.max(600, Math.round(n)));
}

const STOCK_API_TIMEOUT_MS = parseStockApiTimeoutMs();
const STATIC_FALLBACK_IMAGE_URL = WIKIMEDIA_STATIC_FALLBACK_JPEG;

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

async function headOkImage(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const head = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    const ct = head.headers.get("content-type") || "";
    return head.ok && ct.startsWith("image/");
  } catch {
    return false;
  }
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

router.get("/", async (req: Request, res: Response) => {
  const promptRaw = typeof req.query.prompt === "string" ? req.query.prompt : "";
  const prompt = promptRaw.trim() || "website section illustration";
  const wRaw = typeof req.query.w === "string" ? Number(req.query.w) : NaN;
  const hRaw = typeof req.query.h === "string" ? Number(req.query.h) : NaN;
  const preferRaw = typeof req.query.prefer === "string" ? req.query.prefer.trim().toLowerCase() : "";
  const vRaw = typeof req.query.v === "string" ? Number(req.query.v) : NaN;
  const variation = Number.isFinite(vRaw) && vRaw >= 0 ? Math.min(999, Math.floor(vRaw)) : 0;
  const landingSid = parseLandingSid(req.query.sid);

  const width = Number.isFinite(wRaw) ? wRaw : 1024;
  const height = Number.isFinite(hRaw) ? hRaw : 768;
  res.setHeader("Cache-Control", "no-store");

  const genFirstByEnv =
    process.env.IMAGE_GEN_FIRST?.trim().toLowerCase() === "true" ||
    process.env.IMAGE_STOCK_FIRST?.trim().toLowerCase() === "false";
  const wantGenFirst = preferRaw === "gen" || genFirstByEnv;
  const wantStockFirst = !wantGenFirst;

  try {
    if (wantStockFirst) {
      if (stockSearchConfigured()) {
        try {
          const apiUrl = await withTimeout(
            fetchStockImageUrl(prompt, { width, height }, variation, landingSid),
            STOCK_API_TIMEOUT_MS,
          );
          if (apiUrl && (await headOkImage(apiUrl, 1400))) {
            res.redirect(302, apiUrl);
            return;
          }
        } catch {
        }
      }
      const stockUrl = pickCuratedStockImageUrl(prompt, { width, height }, variation, landingSid);
      if (await headOkImage(stockUrl, 1400)) {
        res.redirect(302, stockUrl);
        return;
      }
    }

    const provider = resolveImageProvider();
    let url: string;
    try {
      url = await withTimeout(
        getImageUrl(provider, prompt, { width, height }, variation, landingSid),
        IMAGE_TIMEOUT_MS,
      );
    } catch (err) {
      if (provider !== "doubao") throw err;
      url = toPollinationsImageUrl(prompt, { width, height }, variation, landingSid);
    }
    res.redirect(302, url);
  } catch (e) {
    res.redirect(302, STATIC_FALLBACK_IMAGE_URL);
  }
});

export default router;

