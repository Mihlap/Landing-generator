import type { LandingData, SectionKind } from "./ai.js";
import { normalizeSectionOrder } from "../landingSections.js";

export type LandingPreset = "sales" | "minimal" | "premium" | "trust-first";

const PRESET_SET = new Set<LandingPreset>(["sales", "minimal", "premium", "trust-first"]);

export function isLandingPreset(x: unknown): x is LandingPreset {
  return typeof x === "string" && PRESET_SET.has(x as LandingPreset);
}

function ctaByPreset(preset: LandingPreset, locale: LandingData["locale"]): string {
  const ru: Record<LandingPreset, string> = {
    sales: "Получить предложение сегодня",
    minimal: "Связаться",
    premium: "Запросить персональную консультацию",
    "trust-first": "Обсудить задачу с экспертом",
  };
  const en: Record<LandingPreset, string> = {
    sales: "Get an offer today",
    minimal: "Contact us",
    premium: "Request a personal consultation",
    "trust-first": "Talk to an expert",
  };
  return locale === "ru" ? ru[preset] : en[preset];
}

function buildSectionOrder(base: SectionKind[] | undefined, preset: LandingPreset): SectionKind[] {
  const safe = normalizeSectionOrder(base);
  const middle: SectionKind[] = safe.filter((s) => s !== "hero" && s !== "footer");
  const has = (k: SectionKind) => middle.includes(k);
  const appendUnique = (arr: SectionKind[], k: SectionKind) => {
    if (!arr.includes(k) && k !== "hero" && k !== "footer") arr.push(k);
  };

  const out: SectionKind[] = [];
  if (preset === "sales") {
    ["benefits", "services", "pricing", "reviews", "faq", "cta", "gallery", "map", "process"].forEach((k) =>
      appendUnique(out, k as SectionKind),
    );
  } else if (preset === "minimal") {
    ["services", "benefits", "reviews", "cta"].forEach((k) => appendUnique(out, k as SectionKind));
  } else if (preset === "premium") {
    ["gallery", "benefits", "services", "process", "pricing", "reviews", "faq", "map", "cta"].forEach((k) =>
      appendUnique(out, k as SectionKind),
    );
  } else {
    ["reviews", "benefits", "services", "faq", "process", "cta", "pricing", "gallery", "map"].forEach((k) =>
      appendUnique(out, k as SectionKind),
    );
  }

  for (const k of middle) appendUnique(out, k);
  const filtered = out.filter((k) => has(k));
  return ["hero", ...filtered, "footer"];
}

export function applyPreset(data: LandingData, preset: LandingPreset): LandingData {
  const next: LandingData = {
    ...data,
    cta: ctaByPreset(preset, data.locale),
    sections: buildSectionOrder(data.sections, preset),
    sectionVariants: { ...(data.sectionVariants ?? {}) },
  };

  if (preset === "sales") {
    next.sectionVariants!.hero = "b";
    next.sectionVariants!.services = "b";
    next.sectionVariants!.reviews = "b";
  } else if (preset === "minimal") {
    next.sectionVariants!.hero = "a";
    next.sectionVariants!.services = "a";
    next.sectionVariants!.reviews = "a";
  } else if (preset === "premium") {
    next.sectionVariants!.hero = "b";
    next.sectionVariants!.services = "b";
  } else {
    next.sectionVariants!.hero = "b";
    next.sectionVariants!.reviews = "b";
  }

  return next;
}

