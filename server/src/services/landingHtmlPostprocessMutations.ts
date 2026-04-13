import type { ImagePreference } from "./landingHtmlPostprocessTypes.js";
import { FALLBACK_IMAGE_SRC, INLINE_IMAGE_FALLBACK, toLocalImageUrl } from "./landingHtmlPostprocessImageUrl.js";

export function stripUnsafeHrefs(html: string): string {
  return html.replace(/\shref\s*=\s*(["'])javascript:[^"']*\1/gi, ' href="#"');
}
export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function regionHasRenderableImg(region: string): boolean {
  const re = /<img\b[^>]*\ssrc\s*=\s*(["'])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region)) !== null) {
    const src = m[2]?.trim() ?? "";
    if (/^https?:\/\//i.test(src) || /^\/image\?/i.test(src) || /^data:image\//i.test(src)) return true;
  }
  return false;
}

export function countRenderableImgTags(html: string): number {
  let n = 0;
  const re = /<img\b[^>]*\ssrc\s*=\s*(["'])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[2]?.trim() ?? "";
    if (/^https?:\/\//i.test(src) || /^\/image\?/i.test(src) || /^data:image\//i.test(src)) n++;
  }
  return n;
}

function normalizeId(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/\/$/, "")
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectIds(html: string): Set<string> {
  const ids = new Set<string>();
  const idRegex = /\sid\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = idRegex.exec(html);
  while (match) {
    const normalized = normalizeId(match[1] ?? "");
    if (normalized) ids.add(normalized);
    match = idRegex.exec(html);
  }
  return ids;
}

export function rewriteInternalLinksToAnchors(html: string): string {
  const ids = collectIds(html);
  if (ids.size === 0) return html;

  return html.replace(/\shref\s*=\s*(["'])([^"']+)\1/gi, (full, quote: string, hrefRaw: string) => {
    const href = hrefRaw.trim();
    if (!href) return full;
    if (/^(#|https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return full;

    const hashIndex = href.indexOf("#");
    if (hashIndex >= 0 && hashIndex < href.length - 1) {
      const hashPart = href.slice(hashIndex + 1);
      const normalizedHash = normalizeId(hashPart);
      if (normalizedHash && ids.has(normalizedHash)) {
        return ` href=${quote}#${normalizedHash}${quote}`;
      }
    }

    const normalizedPath = normalizeId(href);
    if (normalizedPath && ids.has(normalizedPath)) {
      return ` href=${quote}#${normalizedPath}${quote}`;
    }

    return full;
  });
}

export function ensureImageTagsHaveSource(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const dataSrcMatch = /\sdata-src\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const srcValue = srcMatch?.[2]?.trim() ?? "";
    const dataSrcValue = dataSrcMatch?.[2]?.trim() ?? "";
    const preferred = srcValue || dataSrcValue;
    if (!/^(https?:\/\/|data:image\/|\/image\?)/i.test(preferred)) {
      return "";
    }
    let resolvedSrc = preferred;
  
    if (/^data:image\//i.test(resolvedSrc) && resolvedSrc.length > 2048) {
      resolvedSrc = FALLBACK_IMAGE_SRC;
    }

    let updated = tag;
    if (srcMatch) {
      updated = updated.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i, ` src="${resolvedSrc}"`);
    } else {
      updated = updated.replace(/<img/i, `<img src="${resolvedSrc}"`);
    }
    if (!/\sloading\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img loading="eager"');
    }
    if (!/\sdecoding\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img decoding="async"');
    }
    if (!/\sreferrerpolicy\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img referrerpolicy="no-referrer"');
    }
    const altMatch = /\salt\s*=\s*(["'])(.*?)\1/i.exec(updated);
    if (!altMatch || !altMatch[2]?.trim()) {
      if (altMatch) {
        updated = updated.replace(/\salt\s*=\s*(["'])(.*?)\1/i, ' alt="Section image"');
      } else {
        updated = updated.replace(/<img/i, '<img alt="Section image"');
      }
    }

    return updated;
  });
}

export function ensureBackgroundImagesHaveSource(html: string): string {
  return html.replace(/background-image\s*:\s*url\((["']?)\s*\1\)\s*;?/gi, "background-image:none;");
}

export function sanitizeInlineCssDataUrls(html: string): string {
  return html
    .replace(/cursor\s*:[^;{}]*data:image[\s\S]*?(?:;|(?=\}))/gi, "cursor:auto;")  
    .replace(/url\((["']?)\s*data:[\s\S]*?\1\)/gi, "none") 
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, INLINE_IMAGE_FALLBACK)
    .replace(/cursor\s*:\s*none\s*;?/gi, "cursor:auto;");
}

export function ensureContactSectionAnchors(html: string): string {
  const hasContactId = /\sid\s*=\s*["']contacts?["']/i.test(html);
  if (hasContactId) return html;

  if (/<footer\b[^>]*>/i.test(html)) {
    return html.replace(/<footer\b([^>]*)>/i, `<footer$1 id="contact"><span id="contacts" style="display:none"></span>`);
  }
  return html;
}

function collectHtmlIds(html: string): Set<string> {
  const set = new Set<string>();
  const re = /\sid\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add(m[1].toLowerCase());
  return set;
}

export function fixIncompleteSectionAnchors(html: string): string {
  const ids = collectHtmlIds(html);
  const has = (id: string) => ids.has(id.toLowerCase());
  if (has("services")) return html;
  const target = has("gallery") ? "gallery" : has("benefits") ? "benefits" : has("contact") ? "contact" : "";
  if (!target) return html;
  return html.replace(/href\s*=\s*(["'])#services\1/gi, `href="#${target}"`);
}

export function ensureFooterNewsletterForm(html: string): string {
  if (/\bid\s*=\s*["']newsletter-form["']/i.test(html)) return html;
  return html.replace(/<footer\b([^>]*)>([\s\S]*?)<\/footer>/gi, (full, attrs: string, inner: string) => {
    if (/<form\b/i.test(inner)) return full;
    if (!/type\s*=\s*["']email["']/i.test(inner)) return full;
    return `<footer${attrs}><form id="newsletter-form" class="landing-newsletter-form" method="get" action="#">${inner}</form></footer>`;
  });
}

function shouldReplaceStockWithAi(): boolean {
  return process.env.LANDING_REPLACE_STOCK_WITH_AI?.trim().toLowerCase() === "true";
}

export function fillEmptyImagePlaceholders(html: string): string {
  return html.replace(
    /<div\b([^>]*class=["'][^"']*(?:image|img|photo|media|hero)[^"']*["'][^>]*)>([\s\n\r]*)<\/div>/gi,
    "",
  );
}

export function normalizeHeroHeadingSurface(html: string): string {
  if (/data-landing-title-fix=["']1["']/i.test(html)) return html;
  if (/<header\b[^>]*>/i.test(html)) {
    return html.replace(/<header\b([^>]*)>/i, `<header$1 data-landing-title-fix="1">`);
  }
  if (/<section\b[^>]*class=["'][^"']*hero[^"']*["'][^>]*>/i.test(html)) {
    return html.replace(
      /<section\b([^>]*class=["'][^"']*hero[^"']*["'][^>]*)>/i,
      `<section$1 data-landing-title-fix="1">`,
    );
  }
  return html;
}

export function ensureAtLeastOneHeroImage(
  html: string,
  _fallbackImageSrc: string,
  imagePreference?: ImagePreference,
): string {
  if (/\bdata-landing-hero-image\s*=/i.test(html)) return html;

  const title = /<title[^>]*>([^<]{0,200})<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const h1 =
    /<h1[^>]*>([\s\S]*?)<\/h1>/i
      .exec(html)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 160) ?? "";
  const altBase = h1 || title || "Hero";
  const imgPrompt = `${altBase} — professional wide hero image for website landing page`;
  const heroSrc = toLocalImageUrl(imgPrompt, { width: 1280, height: 720 }, imagePreference);
  const block = `<div data-landing-hero-image="1"><img src="${heroSrc}" alt="${escapeAttr(altBase)}" width="1280" height="720" loading="eager" decoding="async" referrerpolicy="no-referrer" /></div>`;

  const headerOpen = /<header\b[^>]*>/i.exec(html);
  if (headerOpen && headerOpen.index !== undefined) {
    const start = headerOpen.index;
    const end = html.indexOf("</header>", start);
    if (end > 0) {
      const headerBlock = html.slice(start, end);
      if (!regionHasRenderableImg(headerBlock)) {
        return html.slice(0, end) + block + html.slice(end);
      }
    }
  }

  const heroWhole = /<section\b[^>]*class=["'][^"']*hero[^"']*["'][^>]*>[\s\S]*?<\/section>/i.exec(html);
  if (heroWhole) {
    const fragment = heroWhole[0];
    if (!regionHasRenderableImg(fragment)) {
      return html.replace(fragment, fragment.replace(/<\/section>/i, `${block}</section>`));
    }
  }

  if (!regionHasRenderableImg(html.slice(0, Math.min(html.length, 14_000)))) {
    return html.replace(/<body\b[^>]*>/i, (open) => `${open}${block}`);
  }

  return html;
}

const MIN_LANDING_IMAGES = 3;

export function ensureVisualCoverage(html: string, imagePreference?: ImagePreference): string {
  if (/\bdata-landing-visuals\s*=/i.test(html)) return html;
  if (countRenderableImgTags(html) >= MIN_LANDING_IMAGES) return html;

  const title = /<title[^>]*>([^<]{0,200})<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const h1 =
    /<h1[^>]*>([\s\S]*?)<\/h1>/i
      .exec(html)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120) ?? "";
  const base = h1 || title || "Business";

  const prompts = [
    `${base} — service or product in context, professional photo`,
    `${base} — customer experience, authentic scene`,
    `${base} — modern workspace or detail, high quality`,
  ];
  const imgs = prompts
    .map(
      (p, i) =>
        `<img src="${toLocalImageUrl(p, { width: 1024, height: 768 }, imagePreference)}" alt="${escapeAttr(`${base} — ${i + 1}`)}" width="1024" height="768" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`,
    )
    .join("\n");

  const section = `<section data-landing-visuals="1" aria-label="Gallery">${imgs}</section>`;
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${section}\n</body>`);
  }
  return `${html}\n${section}`;
}

export function ensureLeadForm(html: string): string {
  return html;
}