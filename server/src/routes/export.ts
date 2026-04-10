import type { Request, Response } from "express";
import { Router } from "express";
import { getImageUrl, resolveImageProvider, toPollinationsImageUrl } from "../services/imageGen.js";
import { isPaymentSucceededForExport } from "../services/yookassa.js";
import { renderTemplate } from "../services/template.js";
import { isLandingData } from "../validation.js";

const router = Router();
const EXPORT_IMAGE_TIMEOUT_MS = 7000;
const STATIC_FALLBACK_IMAGE_URL =
  "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&dpr=1";

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
    if (!res.ok) return STATIC_FALLBACK_IMAGE_URL;
    if (!contentType.startsWith("image/")) return STATIC_FALLBACK_IMAGE_URL;
    return url;
  } catch {
    return STATIC_FALLBACK_IMAGE_URL;
  }
}

async function resolveFinalImageUrl(prompt: string, width: number, height: number): Promise<string> {
  const provider = resolveImageProvider();
  try {
    const candidate = await withTimeout(getImageUrl(provider, prompt, { width, height }), EXPORT_IMAGE_TIMEOUT_MS);
    return await ensureRenderableImageUrl(candidate);
  } catch {
    if (provider === "doubao") {
      const pollinations = toPollinationsImageUrl(prompt, { width, height });
      return await ensureRenderableImageUrl(pollinations);
    }
    return STATIC_FALLBACK_IMAGE_URL;
  }
}

async function replaceLocalImageSourcesForExport(html: string): Promise<string> {
  const srcRegex = /(<img\b[^>]*\ssrc\s*=\s*["'])(\/image\?[^"']+)(["'][^>]*>)/gi;
  const matches = Array.from(html.matchAll(srcRegex));
  if (!matches.length) return html;

  const urlMap = new Map<string, string>();

  for (const match of matches) {
    const localPath = match[2];
    if (urlMap.has(localPath)) continue;

    let finalUrl = STATIC_FALLBACK_IMAGE_URL;
    try {
      const parsed = new URL(localPath, "http://localhost");
      const prompt = (parsed.searchParams.get("prompt") || "").trim() || "website section illustration";
      const w = Number(parsed.searchParams.get("w"));
      const h = Number(parsed.searchParams.get("h"));
      const width = Number.isFinite(w) ? w : 1024;
      const height = Number.isFinite(h) ? h : 768;
      finalUrl = await resolveFinalImageUrl(prompt, width, height);
    } catch {
      finalUrl = STATIC_FALLBACK_IMAGE_URL;
    }

    urlMap.set(localPath, finalUrl);
  }

  return html.replace(srcRegex, (_full, p1: string, localPath: string, p3: string) => {
    const resolved = urlMap.get(localPath) ?? STATIC_FALLBACK_IMAGE_URL;
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
