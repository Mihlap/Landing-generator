import type { Request, Response } from "express";
import { Router } from "express";
import {
  getImageUrl,
  pickCuratedStockImageUrl,
  resolveImageProvider,
  toPollinationsImageUrl,
} from "../services/imageGen.js";

const router = Router();
const IMAGE_TIMEOUT_MS = 12_000;
const STATIC_FALLBACK_IMAGE_URL =
  "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&dpr=1";

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

  const width = Number.isFinite(wRaw) ? wRaw : 1024;
  const height = Number.isFinite(hRaw) ? hRaw : 768;
  res.setHeader("Cache-Control", "no-store");

  const stockFirst = process.env.IMAGE_STOCK_FIRST?.trim().toLowerCase() === "true";

  try {
    if (stockFirst) {
      const stockUrl = pickCuratedStockImageUrl(prompt, { width, height });
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000);
        const head = await fetch(stockUrl, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
        clearTimeout(t);
        const ct = head.headers.get("content-type") || "";
        if (head.ok && ct.startsWith("image/")) {
          res.redirect(302, stockUrl);
          return;
        }
      } catch {}
    }

    const provider = resolveImageProvider();
    let url: string;
    try {
      url = await withTimeout(getImageUrl(provider, prompt, { width, height }), IMAGE_TIMEOUT_MS);
    } catch (err) {
      if (provider !== "doubao") throw err;
      url = toPollinationsImageUrl(prompt, { width, height });
    }
    res.redirect(302, url);
  } catch (e) {
    res.redirect(302, STATIC_FALLBACK_IMAGE_URL);
  }
});

export default router;

