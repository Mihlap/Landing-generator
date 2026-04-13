import type { TemplateId } from "../templateId.js";
import type { LlmProvider } from "./llm.js";
import { WIKIMEDIA_ALT_FALLBACK_JPEG, WIKIMEDIA_STATIC_FALLBACK_JPEG } from "./imageGen.js";

type SiteLocale = "ru" | "en";

export function inferTemplateFromPrompt(prompt: string): TemplateId {
  const p = prompt.toLowerCase();

  if (/стоматолог|зуб|dentist|dental|orthodont|implant|осмотр\s*полости/i.test(p)) return "dental";
  if (/парикмахер|паркмахер|барбер|салон\s*красоты|hair|barber|beauty/i.test(p)) return "repair";
  if (/недвижим|риелтор|real\s*estate|property|realtor|квартир|жиль[ёе]|ипотек|аренд.*жил|new\s*build|listing/i.test(p))
    return "realestate";
  if (/интернет[\s-]*магазин|online\s*store|e[\s-]?commerce|eshop|магазин\s*онлайн|каталог\s*товар|доставк.*заказ/i.test(p))
    return "ecommerce";
  if (/авто|автосервис|машин|car\s*repair|auto\s*shop|трансмис|акпп|коробк|двигател|шин|диагностик.*авто|oil\s*change/i.test(p))
    return "auto";
  if (/ремонт|repair|мастер\s*на|handyman|бытов|сантехник|электрик|техник|выезд|прибор/i.test(p)) return "repair";

  return "repair";
}

export function landingBuildMode(provider: LlmProvider | "none"): "template" | "html" {
  const env = process.env.LANDING_BUILD_MODE?.trim().toLowerCase();
  if (env === "template" || env === "html") return env;
  if (provider === "gigachat" || provider === "zai") return "html";
  return "template";
}

export function resolveLandingBuildMode(
  provider: LlmProvider | "none",
  explicit?: "html" | "template",
): "html" | "template" {
  if (explicit === "html" || explicit === "template") return explicit;
  return landingBuildMode(provider);
}

function themedFallbackImage(templateId: TemplateId): string {
  const byTemplate: Record<TemplateId, string> = {
    auto: WIKIMEDIA_STATIC_FALLBACK_JPEG,
    dental: WIKIMEDIA_ALT_FALLBACK_JPEG,
    repair: WIKIMEDIA_STATIC_FALLBACK_JPEG,
    realestate: WIKIMEDIA_ALT_FALLBACK_JPEG,
    ecommerce: WIKIMEDIA_STATIC_FALLBACK_JPEG,
  };
  return byTemplate[templateId];
}

export function themedFallbackImageByPrompt(prompt: string, templateId: TemplateId): string {
  const p = prompt.toLowerCase();
  if (/авто|машин|шиномонтаж|автосервис|car|auto/i.test(p)) {
    return WIKIMEDIA_STATIC_FALLBACK_JPEG;
  }
  if (/стоматолог|зуб|dentist|dental/i.test(p)) {
    return WIKIMEDIA_ALT_FALLBACK_JPEG;
  }
  if (/недвижим|риелтор|real\s*estate|property|квартир|дом/i.test(p)) {
    return WIKIMEDIA_STATIC_FALLBACK_JPEG;
  }
  if (/магазин|товар|каталог|ecommerce|online\s*store|shop/i.test(p)) {
    return WIKIMEDIA_ALT_FALLBACK_JPEG;
  }
  if (/парикмахер|паркмахер|барбер|салон\s*красоты|hair|barber|beauty/i.test(p)) {
    return WIKIMEDIA_STATIC_FALLBACK_JPEG;
  }
  if (/тюльпан|цветы|букет|флорист|flower|tulip|bouquet|florist/i.test(p)) {
    return WIKIMEDIA_ALT_FALLBACK_JPEG;
  }
  if (/ремонт|мастер|handyman|сантехник|электрик|repair/i.test(p)) {
    return WIKIMEDIA_STATIC_FALLBACK_JPEG;
  }
  if (/курс|обучение|школ|education|course/i.test(p)) {
    return WIKIMEDIA_ALT_FALLBACK_JPEG;
  }
  if (templateId === "auto") {
    return WIKIMEDIA_STATIC_FALLBACK_JPEG;
  }
  return themedFallbackImage(templateId);
}

export function normalizeGeneratedTitle(title: string, locale: SiteLocale): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) return locale === "ru" ? "Бизнес" : "Business";
  const withoutPrefix = trimmed.replace(/^(ваш|ваша|ваше|your)\s+/i, "").trim();
  return withoutPrefix || (locale === "ru" ? "Бизнес" : "Business");
}

export function sliceOuterHtmlDocument(text: string): string {
  const s = text.trim();
  if (!s) return s;
  const lower = s.toLowerCase();
  const startDoctype = lower.indexOf("<!doctype html");
  const startHtml = lower.indexOf("<html");
  const start = startDoctype >= 0 ? startDoctype : startHtml >= 0 ? startHtml : -1;
  if (start < 0) return s;
  const fromDoc = s.slice(start);
  const end = fromDoc.toLowerCase().lastIndexOf("</html>");
  if (end < 0) return fromDoc.trim();
  return fromDoc.slice(0, end + 7).trim();
}

export function extractHtmlFromModelOutput(text: string): string {
  let t = text.trim();
  const fenced = /```(?:html)?\s*\n([\s\S]*?)```/i.exec(t);
  if (fenced) t = fenced[1].trim();
  return sliceOuterHtmlDocument(t);
}

export function isPlausibleHtml(html: string): boolean {
  const head = html.slice(0, 2000).toLowerCase();
  return /<!doctype\s+html/i.test(html) || (head.includes("<html") && head.includes("<body"));
}

export function hasRenderableImages(html: string): boolean {
  if (/<img\b[^>]*\ssrc\s*=\s*["']https?:\/\/[^"']+["']/i.test(html)) return true;
  if (/<img\b[^>]*\ssrc\s*=\s*["']\/image\?[^"']+["']/i.test(html)) return true;
  if (/background-image\s*:\s*url\(["']https?:\/\/[^"']+["']\)/i.test(html)) return true;
  if (/url\(["']https?:\/\/[^"']+["']\)/i.test(html)) return true;
  return false;
}

export function extractTitleFromHtml(html: string): string | null {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return title[1].trim().replace(/\s+/g, " ");
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return h1[1].trim().replace(/\s+/g, " ");
  return null;
}
