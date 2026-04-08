import type { LandingData, SiteLocale } from "./services/ai.js";
import { isSectionKind } from "./services/ai.js";
import { isTemplateId } from "./templateId.js";

export { isTemplateId };

export function isSiteLocale(x: unknown): x is SiteLocale {
  return x === "ru" || x === "en";
}

export function isLandingData(x: unknown): x is LandingData {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!isSiteLocale(o.locale)) return false;
  if (!isTemplateId(o.templateId)) return false;
  if (typeof o.title !== "string" || typeof o.subtitle !== "string" || typeof o.cta !== "string")
    return false;
  if (!Array.isArray(o.services) || !o.services.every((s) => typeof s === "string")) return false;
  if (o.generationNotice !== undefined && typeof o.generationNotice !== "string") return false;
  if (o.generatedHtml !== undefined && typeof o.generatedHtml !== "string") return false;
  if (!Array.isArray(o.reviews)) return false;
  for (const r of o.reviews) {
    if (!r || typeof r !== "object") return false;
    const rv = r as Record<string, unknown>;
    if (typeof rv.quote !== "string" || typeof rv.author !== "string") return false;
  }
  if (o.skinId !== undefined) {
    const s = o.skinId;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 10) return false;
  }
  if (o.sections !== undefined) {
    if (!Array.isArray(o.sections) || !o.sections.every((x) => isSectionKind(x))) return false;
  }
  if (o.sectionVariants !== undefined) {
    if (!o.sectionVariants || typeof o.sectionVariants !== "object") return false;
    for (const [k, v] of Object.entries(o.sectionVariants as Record<string, unknown>)) {
      if (!isSectionKind(k)) return false;
      if (v !== "a" && v !== "b") return false;
    }
  }
  if (o.benefits !== undefined) {
    if (!Array.isArray(o.benefits)) return false;
    for (const b of o.benefits) {
      if (!b || typeof b !== "object") return false;
      const bv = b as Record<string, unknown>;
      if (typeof bv.title !== "string" || typeof bv.text !== "string") return false;
    }
  }
  if (o.pricing !== undefined) {
    if (!Array.isArray(o.pricing)) return false;
    for (const p of o.pricing) {
      if (!p || typeof p !== "object") return false;
      const pv = p as Record<string, unknown>;
      if (typeof pv.name !== "string" || typeof pv.price !== "string") return false;
      if (!Array.isArray(pv.bullets) || !pv.bullets.every((x) => typeof x === "string")) return false;
    }
  }
  if (o.processSteps !== undefined) {
    if (!Array.isArray(o.processSteps)) return false;
    for (const s of o.processSteps) {
      if (!s || typeof s !== "object") return false;
      const sv = s as Record<string, unknown>;
      if (typeof sv.title !== "string" || typeof sv.text !== "string") return false;
    }
  }
  if (o.faq !== undefined) {
    if (!Array.isArray(o.faq)) return false;
    for (const f of o.faq) {
      if (!f || typeof f !== "object") return false;
      const fv = f as Record<string, unknown>;
      if (typeof fv.q !== "string" || typeof fv.a !== "string") return false;
    }
  }
  return true;
}
