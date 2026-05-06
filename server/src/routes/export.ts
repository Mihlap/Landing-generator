import type { Request, Response } from "express";
import { Router } from "express";
import {
  getImageUrl,
  resolveImageProvider,
  toPollinationsImageUrl,
} from "../services/imageGen.js";
import { isPaymentSucceededForExport } from "../services/yookassa.js";
import { renderTemplate } from "../services/template.js";
import { isLandingData } from "../validation.js";

const router = Router();
const EXPORT_IMAGE_TIMEOUT_MS = 7000;
const NEUTRAL_FALLBACK_IMAGE_URL =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%201200%20700'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20stop-color='%23111827'/%3E%3Cstop%20offset='1'%20stop-color='%23312e81'/%3E%3C/linearGradient%3E%3CradialGradient%20id='r'%20cx='50%25'%20cy='42%25'%20r='55%25'%3E%3Cstop%20stop-color='%23818cf8'%20stop-opacity='.32'/%3E%3Cstop%20offset='1'%20stop-color='%23818cf8'%20stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='1200'%20height='700'%20fill='url(%23g)'/%3E%3Crect%20width='1200'%20height='700'%20fill='url(%23r)'/%3E%3Ctext%20x='50%25'%20y='50%25'%20text-anchor='middle'%20fill='%23eef2ff'%20font-family='Arial,sans-serif'%20font-size='42'%20font-weight='700'%3EAI%20preview%20image%3C/text%3E%3C/svg%3E";

function allowMockPaidExport(): boolean {
  return process.env.NODE_ENV === "test" || process.env.ALLOW_EXPORT_MOCK_PAID === "true";
}

function allowMockPaidExportBypass(): boolean {
  return process.env.ALLOW_EXPORT_MOCK_PAID === "true";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
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

async function ensureRenderableImageUrl(url: string): Promise<string> {
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: { Accept: "image/*" },
      }),
      EXPORT_IMAGE_TIMEOUT_MS,
    );
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok) return NEUTRAL_FALLBACK_IMAGE_URL;
    if (!contentType.startsWith("image/")) return NEUTRAL_FALLBACK_IMAGE_URL;
    return url;
  } catch {
    return NEUTRAL_FALLBACK_IMAGE_URL;
  }
}

async function resolveFinalImageUrl(
  prompt: string,
  width: number,
  height: number,
  variation: number = 0,
  landingSid: number = 0,
): Promise<string> {
  const provider = resolveImageProvider();
  try {
    const candidate = await withTimeout(
      getImageUrl(provider, prompt, { width, height }, variation, landingSid),
      EXPORT_IMAGE_TIMEOUT_MS,
    );
    return await ensureRenderableImageUrl(candidate);
  } catch {
    if (provider === "doubao") {
      const pollinations = toPollinationsImageUrl(prompt, { width, height }, variation, landingSid);
      return await ensureRenderableImageUrl(pollinations);
    }
    return NEUTRAL_FALLBACK_IMAGE_URL;
  }
}

async function replaceLocalImageSourcesForExport(html: string): Promise<string> {
  const srcRegex = /(<img\b[^>]*\ssrc\s*=\s*["'])([^"']*\/image\?[^"']+)(["'][^>]*>)/gi;
  const matches = Array.from(html.matchAll(srcRegex));
  if (!matches.length) return html;

  const urlMap = new Map<string, string>();

  for (const match of matches) {
    const srcValue = match[2] ?? "";
    if (urlMap.has(srcValue)) continue;

    let finalUrl = NEUTRAL_FALLBACK_IMAGE_URL;
    try {
      const parsed = new URL(srcValue, "http://localhost");
      const prompt = (parsed.searchParams.get("prompt") || "").trim() || "website section illustration";
      const w = Number(parsed.searchParams.get("w"));
      const h = Number(parsed.searchParams.get("h"));
      const vRaw = Number(parsed.searchParams.get("v"));
      const variation =
        Number.isFinite(vRaw) && vRaw >= 0 ? Math.min(999, Math.floor(vRaw)) : 0;
      const sidRaw = parsed.searchParams.get("sid");
      const landingSid =
        sidRaw && /^\d{1,15}$/.test(sidRaw.trim())
          ? (Number(sidRaw.trim()) >>> 0)
          : 0;
      const width = Number.isFinite(w) ? w : 1024;
      const height = Number.isFinite(h) ? h : 768;
      finalUrl = await resolveFinalImageUrl(prompt, width, height, variation, landingSid);
    } catch {
      finalUrl = NEUTRAL_FALLBACK_IMAGE_URL;
    }

    urlMap.set(srcValue, finalUrl);
  }

  return html.replace(srcRegex, (_full, p1: string, srcValue: string, p3: string) => {
    const resolved = urlMap.get(srcValue) ?? NEUTRAL_FALLBACK_IMAGE_URL;
    return `${p1}${resolved}${p3}`;
  });
}

router.post("/", async (req: Request, res: Response) => {
  const data = req.body?.data;
  const mockFlag = req.body?.paid === true || req.headers["x-export-paid"] === "true";
  const paymentId =
    typeof req.body?.paymentId === "string" ? req.body.paymentId.trim() : "";

  if (!isLandingData(data)) {
    res.status(400).json({ error: "invalid data payload" });
    return;
  }

  let paid = false;
  if (allowMockPaidExportBypass()) {
    paid = true;
  } else if (allowMockPaidExport() && mockFlag) {
    paid = true;
  } else if (paymentId) {
    paid = await isPaymentSucceededForExport(paymentId);
  }

  if (!paid) {
    res.status(402).json({
      error: "Payment required",
      message:
        "Экспорт HTML доступен после оплаты через ЮKassa. После успешной оплаты скачивание откроется автоматически. Для локальной отладки задайте ALLOW_EXPORT_MOCK_PAID=true.",
    });
    return;
  }

  const htmlRaw =
    typeof data.generatedHtml === "string" && data.generatedHtml.trim().length > 0
      ? data.generatedHtml
      : renderTemplate(data.templateId, data);
  const html = await replaceLocalImageSourcesForExport(htmlRaw);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="landing.html"');
  res.send(html);
});

export default router;
