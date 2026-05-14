import type { ImagePreference } from "./landingHtmlPostprocessTypes.js";
import { resolveImageProvider, toPollinationsImageUrl } from "./imageGen.js";

function preferParam(pref: ImagePreference | undefined): "stock" | "gen" | undefined {
  if (pref === "stock_first") return "gen";
  if (pref === "gen_first") return "gen";
  return undefined;
}

export const FALLBACK_IMAGE_SRC =
  "/image?prompt=modern%20professional%20website%20hero%20image&w=1280&h=720&prefer=gen";
export const INLINE_IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%234f46e5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='700' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='48' text-anchor='middle' dominant-baseline='middle' font-family='system-ui,sans-serif'%3EPreview image%3C/text%3E%3C/svg%3E";


export function toLocalImageUrl(
  prompt: string,
  size: { width: number; height: number },
  imagePreference?: ImagePreference,
  variation?: number,
): string {
  const encoded = encodeURIComponent(prompt.trim().slice(0, 600));
  const width = Math.max(256, Math.min(2048, Math.round(size.width)));
  const height = Math.max(256, Math.min(2048, Math.round(size.height)));
  const p = preferParam(imagePreference);
  const extra = p ? `&prefer=${p}` : "";
  const v =
    variation !== undefined &&
    Number.isFinite(variation) &&
    variation > 0 &&
    variation <= 999
      ? `&v=${Math.floor(variation)}`
      : "";
  return `/image?prompt=${encoded}&w=${width}&h=${height}${extra}${v}`;
}

function canonicalizeLocalImagePath(path: string): string {
  const qi = path.indexOf("?");
  if (qi < 0) return path;
  const sp = new URLSearchParams(path.slice(qi + 1));
  sp.delete("v");
  sp.delete("retry");
  sp.delete("sid");
  const keys = [...new Set(sp.keys())].sort();
  const out = new URLSearchParams();
  for (const k of keys) {
    for (const val of sp.getAll(k)) {
      out.append(k, val);
    }
  }
  const qs = out.toString();
  return qs ? `${path.slice(0, qi)}?${qs}` : path.slice(0, qi);
}

function applyImageVariationToPath(path: string, variation: number): string {
  const qi = path.indexOf("?");
  if (qi < 0) return variation > 0 ? `${path}?v=${variation}` : path;
  const sp = new URLSearchParams(path.slice(qi + 1));
  if (variation <= 0) sp.delete("v");
  else sp.set("v", String(variation));
  const qs = sp.toString();
  const base = path.slice(0, qi);
  return qs ? `${base}?${qs}` : base;
}

export function assignVariationSlotsToLocalImages(html: string): string {
  const counts = new Map<string, number>();
  return html.replace(/(\ssrc\s*=\s*)(["'])(\/image\?[^"']*)(\2)/gi, (_full, pre, q, path: string, q2) => {
    const canonical = canonicalizeLocalImagePath(path);
    const idx = counts.get(canonical) ?? 0;
    counts.set(canonical, idx + 1);
    const newPath = applyImageVariationToPath(path, idx);
    return `${pre}${q}${newPath}${q2}`;
  });
}

export function computeLandingImageSeed(html: string): number {
  let h = 2166136261;
  const condensed = html.replace(/\s+/g, " ").slice(0, 12000);
  for (let i = 0; i < condensed.length; i++) {
    h = Math.imul(h ^ condensed.charCodeAt(i), 16777619);
  }
  const x = h >>> 0;
  return x === 0 ? 0xdea110f : x;
}

export function appendLandingSidToLocalImages(html: string, seed: number): string {
  const sid = seed >>> 0;
  return html.replace(/(\ssrc\s*=\s*)(["'])(\/image\?[^"']*)(\2)/gi, (_full, pre, q, path: string, q2) => {
    const qi = path.indexOf("?");
    if (qi < 0) return `${pre}${q}${path}${q2}`;
    const sp = new URLSearchParams(path.slice(qi + 1));
    sp.set("sid", String(sid));
    return `${pre}${q}${path.slice(0, qi)}?${sp.toString()}${q2}`;
  });
}

function parseLocalImagePath(path: string): {
  prompt: string;
  width: number;
  height: number;
  variation: number;
  landingSid: number;
} | null {
  try {
    const parsed = new URL(path, "http://localhost");
    const prompt =
      (parsed.searchParams.get("prompt") || "").trim() || "website section illustration";
    const w = Number(parsed.searchParams.get("w"));
    const h = Number(parsed.searchParams.get("h"));
    const vRaw = Number(parsed.searchParams.get("v"));
    const variation =
      Number.isFinite(vRaw) && vRaw >= 0 ? Math.min(999, Math.floor(vRaw)) : 0;
    const sidRaw = parsed.searchParams.get("sid");
    const landingSid =
      sidRaw && /^\d{1,15}$/.test(sidRaw.trim()) ? (Number(sidRaw.trim()) >>> 0) : 0;
    const width = Number.isFinite(w) ? w : 1024;
    const height = Number.isFinite(h) ? h : 768;
    return { prompt, width, height, variation, landingSid };
  } catch {
    return null;
  }
}

/**
 * Для провайдера pollinations подставляет прямой URL image.pollinations.ai вместо /image?,
 * чтобы «Копировать адрес изображения» открывался в новой вкладке без вашего API.
 * Для doubao/off не трогаем — иначе ссылка не совпадала бы с прокси /image.
 */
export function expandLocalImageUrlsToDirectPollinations(html: string): string {
  if (resolveImageProvider() !== "pollinations") return html;

  const toDirect = (path: string): string | null => {
    const p = parseLocalImagePath(path);
    if (!p) return null;
    return toPollinationsImageUrl(p.prompt, { width: p.width, height: p.height }, p.variation, p.landingSid);
  };

  let out = html.replace(/(\ssrc\s*=\s*)(["'])(\/image\?[^"']*)(\2)/gi, (full, pre, q, path: string, q2) => {
    const direct = toDirect(path);
    return direct ? `${pre}${q}${direct}${q2}` : full;
  });

  out = out.replace(/url\(\s*(["']?)(\/image\?[^"')]+)\1\s*\)/gi, (full, _q: string, path: string) => {
    const direct = toDirect(path);
    if (!direct) return full;
    return `url("${direct}")`;
  });

  return out;
}

export function replaceStockImagesWithAi(html: string, imagePreference?: ImagePreference): string {
  const title =
    /<title[^>]*>([^<]{1,160})<\/title>/i.exec(html)?.[1]?.trim() ||
    /<h1[^>]*>([^<]{1,160})<\/h1>/i.exec(html)?.[1]?.trim() ||
    "";

  const heroSize = { width: 1280, height: 720 };
  const cardSize = { width: 1024, height: 768 };

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const src = srcMatch?.[2]?.trim() ?? "";
    if (!src) return tag;
  
    const altMatch = /\salt\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const alt = altMatch?.[2]?.trim() ?? "";
    const basePrompt = alt || "Website section illustration";
    const fullPrompt = title ? `${basePrompt}. ${title}.` : basePrompt;

    if (/^\/image\?/i.test(src)) {
      if (!shouldRewriteLocalPrompt(src)) return tag;
      const size = /class\s*=\s*(["'])[^"']*\bhero\b/i.test(tag) ? heroSize : cardSize;
      const aiUrl = toLocalImageUrl(fullPrompt, size, imagePreference);
      return tag.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i, ` src="${aiUrl}"`);
    }
    if (!/^(https?:\/\/)/i.test(src)) return tag;
    if (
      !/(images\.unsplash\.com|upload\.wikimedia\.org|image\.pollinations\.ai|pravatar\.cc|i\.pravatar\.cc|randomuser\.me|ui-avatars\.com)/i.test(
        src,
      )
    )
      return tag;

    const isHero = /data-landing-title-fix\s*=\s*(["'])1\1/i.test(html) && /class\s*=\s*(["'])[^"']*\bhero\b/i.test(html)
      ? /class\s*=\s*(["'])[^"']*\bhero\b[^"']*\1/i.test(html.slice(Math.max(0, html.indexOf(tag) - 400), html.indexOf(tag) + 400))
      : /class\s*=\s*(["'])[^"']*\bhero\b/i.test(tag);

    const isFakeAvatar =
      /pravatar\.cc|i\.pravatar\.cc|randomuser\.me|ui-avatars\.com/i.test(src);
    const effectivePrompt = isFakeAvatar
      ? `Customer portrait headshot for website testimonial, ${alt || "anonymous reviewer"}`
      : fullPrompt;
    const size = isFakeAvatar ? { width: 400, height: 400 } : isHero ? heroSize : cardSize;
    const aiUrl = toLocalImageUrl(effectivePrompt, size, imagePreference);

    if (srcMatch) {
      return tag.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i, ` src="${aiUrl}"`);
    }
    return tag.replace(/<img/i, `<img src="${aiUrl}"`);
  });
}

function shouldRewriteLocalPrompt(src: string): boolean {
  try {
    const u = new URL(src, "http://localhost");
    const raw = (u.searchParams.get("prompt") ?? "").toLowerCase();
    if (!raw) return true;
    if (/(киров|москва|ул\.|улица|д\.|дом|адрес|контакт|тел|телефон|карта|map|phone)/i.test(raw)) return true;
    return false;
  } catch {
    return false;
  }
}

