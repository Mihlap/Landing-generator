import { getLandingCompositionDefaults } from "../landingCompositionDefaults.js";
import { sanitizeLandingTheme, type LandingTheme } from "../landingTheme.js";
import { mergeThemeWithPromptColors } from "../paletteFromPrompt.js";
import { buildTemplateGalleryPool, REFERENCE_UNSPLASH_PHOTO_IDS_BY_TEMPLATE } from "../templateGalleryPool.js";
import { isTemplateId, type TemplateId } from "../templateId.js";
import type { EnhanceLandingHtmlOptions } from "./landingHtmlPostprocess.js";
import { enhanceLandingHtml } from "./landingHtmlPostprocess.js";
import { repairLandingHtml, validateLandingHtml } from "./landingHtmlValidate.js";
import { type LlmProvider, resolveLlmProvider, runLlmCompletion, runLlmLandingHtml } from "./llm.js";
import { analyzePrompt, buildEnrichedUserMessage } from "./aiContext.js";
import { inferMapEmbedProviderFromPrompt, systemPrompt, systemPromptHtml, systemPromptLandingHtmlFixer } from "./aiPrompts.js";
import {
  extractHtmlFromModelOutput,
  extractTitleFromHtml,
  hasRenderableImages,
  inferTemplateFromPrompt,
  isPlausibleHtml,
  normalizeGeneratedTitle,
  resolveLandingBuildMode,
  themedFallbackImageByPrompt,
} from "./aiUtils.js";

export { inferTemplateFromPrompt, landingBuildMode, resolveLandingBuildMode } from "./aiUtils.js";

export type { LandingTheme } from "../landingTheme.js";

export type GenerateLandingOptions = EnhanceLandingHtmlOptions & {
  generateMode?: "html" | "template";
};

export type SiteLocale = "ru" | "en";

type SalonContextFields = {
  title: string;
  subtitle: string;
  services: string[];
  templateId: TemplateId;
};

export type SectionKind =
  | "hero"
  | "benefits"
  | "services"
  | "gallery"
  | "pricing"
  | "reviews"
  | "process"
  | "faq"
  | "map"
  | "cta"
  | "footer";

export const SECTION_KINDS: readonly SectionKind[] = [
  "hero",
  "benefits",
  "services",
  "gallery",
  "pricing",
  "reviews",
  "process",
  "faq",
  "map",
  "cta",
  "footer",
];

export const DEFAULT_SECTION_ORDER: readonly SectionKind[] = SECTION_KINDS;

export function isSectionKind(x: unknown): x is SectionKind {
  return typeof x === "string" && (SECTION_KINDS as readonly string[]).includes(x);
}

export type SkinId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function clampSkinId(n: unknown): SkinId {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1;
  const i = Math.floor(v);
  if (i < 1) return 1;
  if (i > 10) return 10;
  return i as SkinId;
}

export function defaultSkinForTemplate(templateId: TemplateId): SkinId {
  const map: Record<TemplateId, SkinId> = {
    dental: 1,
    auto: 2,
    repair: 3,
    realestate: 4,
    ecommerce: 5,
  };
  return map[templateId];
}

const DARK_SKINS: SkinId[] = [2, 4];

export function resolveSkinFromPrompt(prompt: string, templateId: TemplateId, modelSkin: SkinId): SkinId {
  const p = prompt.toLowerCase();
  const wantsDark = /тёмн|темн|dark|ночн|уголь|charcoal|anthracite|black\s*theme/i.test(p);
  const wantsLight = /светл|светлый|pastel|белый\s*фон|light\s*theme|airy/i.test(p);
  if (wantsDark && !wantsLight) {
    if (DARK_SKINS.includes(modelSkin)) return modelSkin;
    return templateId === "realestate" ? 4 : 2;
  }
  if (wantsLight && !wantsDark && DARK_SKINS.includes(modelSkin)) {
    return defaultSkinForTemplate(templateId);
  }
  return modelSkin;
}

function isBeautySalonPrompt(prompt: string): boolean {
  return /парикмахер|парикмахерск|салон\s*красоты|барбер|укладк|стрижк|окраш|волос|маникюр|педикюр|hair\s*salon|hairdress|beauty\s*salon|barbershop/i.test(
    prompt.toLowerCase(),
  );
}

function isBeautySalonCore(core: SalonContextFields): boolean {
  const blob = `${core.title}\n${core.subtitle}\n${(core.services ?? []).join(" ")}`.toLowerCase();
  return /парикмахер|салон|красот|барбер|укладк|стрижк|волос|hair|salon|beauty|barber|hairdress|manicure|педикюр/i.test(
    blob,
  );
}

function promptWantsMap(prompt: string): boolean {
  return /карт(а|е|у|ы)|map|проезд|как\s*доехать|на\s*карт|расположен|адрес.*карт/i.test(prompt.toLowerCase());
}

function promptWantsGallery(prompt: string): boolean {
  return /фото|изображен|галере|картинк|illustration|photo|image|слайд|мотоцикл|\bмото\b|авто\s*и\s*мото|снимк|картин|волос|стрижк|укладк|салон|стоматолог|зубн/i.test(
    prompt.toLowerCase(),
  );
}

function ensureSectionsForPrompt(prompt: string, sections: SectionKind[]): SectionKind[] {
  const out = [...sections];
  const insertBefore = (kind: SectionKind, pivot: SectionKind) => {
    if (out.includes(kind)) return;
    const i = out.indexOf(pivot);
    if (i >= 0) out.splice(i, 0, kind);
    else out.splice(Math.max(0, out.length - 1), 0, kind);
  };
  if (promptWantsGallery(prompt)) insertBefore("gallery", "cta");
  if (promptWantsMap(prompt)) insertBefore("map", "cta");
  return out;
}

function isAllowedGalleryImageUrl(s: string): boolean {
  const t = s.trim();
  if (/^\/image\?/i.test(t)) return true;
  return /^(https:\/\/)(upload\.wikimedia\.org|images\.unsplash\.com)(\/|$)/i.test(t);
}

function isAllowedMapEmbedUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    if (h === "yandex.ru" && u.pathname.startsWith("/map-widget/")) return true;
    if (h === "google.com" && (u.pathname.startsWith("/maps/") || u.pathname === "/maps")) return true;
    if (h === "maps.google.com") return true;
    return false;
  } catch {
    return false;
  }
}

function defaultMapEmbedSrc(locale: SiteLocale): string {
  return locale === "ru"
    ? "https://yandex.ru/map-widget/v1/?ll=37.617635%2C55.755814&z=12"
    : "https://www.google.com/maps?q=55.755814%2C37.617635&output=embed";
}

function galleryPoolForTemplate(
  templateId: TemplateId,
  prompt: string,
  core: SalonContextFields,
  locale: SiteLocale,
): { src: string; altRu: string; altEn: string }[] {
  const useBeauty = isBeautySalonPrompt(prompt) || (templateId === "repair" && isBeautySalonCore(core));
  return buildTemplateGalleryPool(templateId, locale, prompt, useBeauty);
}

function unsplashPhotoKey(src: string): string | undefined {
  const m = src.trim().match(/images\.unsplash\.com\/photo-([^/?#]+)/i);
  return m ? m[1].toLowerCase() : undefined;
}

const FOREIGN_GALLERY_KEYS_BY_TEMPLATE = new Map<TemplateId, Set<string>>();

function foreignGalleryPhotoKeysFor(templateId: TemplateId): Set<string> {
  const cached = FOREIGN_GALLERY_KEYS_BY_TEMPLATE.get(templateId);
  if (cached) return cached;
  const set = new Set<string>();
  (Object.keys(REFERENCE_UNSPLASH_PHOTO_IDS_BY_TEMPLATE) as TemplateId[]).forEach((tid) => {
    if (tid === templateId) return;
    for (const id of REFERENCE_UNSPLASH_PHOTO_IDS_BY_TEMPLATE[tid]) {
      set.add(id.toLowerCase());
    }
  });
  FOREIGN_GALLERY_KEYS_BY_TEMPLATE.set(templateId, set);
  return set;
}

export function filterGalleryItemsForTemplate(
  items: { src: string; alt: string }[] | undefined,
  templateId: TemplateId,
): { src: string; alt: string }[] | undefined {
  if (!items?.length) return items;
  const forbidden = foreignGalleryPhotoKeysFor(templateId);
  const out = items.filter((g) => {
    const key = unsplashPhotoKey(g.src);
    if (key && forbidden.has(key)) return false;
    return true;
  });
  return out.length ? out : undefined;
}

function dedupeAndPadGallery(
  items: { src: string; alt: string }[] | undefined,
  pool: { src: string; altRu: string; altEn: string }[],
  locale: SiteLocale,
  minCount: number,
): { src: string; alt: string }[] {
  const seen = new Set<string>();
  const out: { src: string; alt: string }[] = [];
  for (const g of items ?? []) {
    const src = g.src?.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({ src, alt: g.alt });
  }
  for (const p of pool) {
    if (out.length >= minCount) break;
    if (seen.has(p.src)) continue;
    seen.add(p.src);
    out.push({ src: p.src, alt: locale === "ru" ? p.altRu : p.altEn });
  }
  return out;
}

function parseGalleryItems(x: unknown): { src: string; alt: string }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { src: string; alt: string }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const src = String(o.src ?? "").trim();
    const alt = String(o.alt ?? "").trim();
    if (!src || !alt || !isAllowedGalleryImageUrl(src)) continue;
    out.push({ src, alt });
  }
  return out.length ? out.slice(0, 8) : undefined;
}

function parseSocialLinks(x: unknown): { label: string; href: string }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { label: string; href: string }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    const href = String(o.href ?? "").trim();
    if (!label || !href.startsWith("https://")) continue;
    out.push({ label, href });
  }
   return out.length ? out.slice(0, 6) : undefined;
}

function normalizeBeautySocialLinks(
  locale: SiteLocale,
  links: { label: string; href: string }[] | undefined,
  prompt: string,
  core: SalonContextFields,
): { label: string; href: string }[] | undefined {
  const beauty = isBeautySalonPrompt(prompt) || (core.templateId === "repair" && isBeautySalonCore(core));
  const wantsSocial =
    beauty || /соцсет|social\s*link|instagram|telegram|youtube|телег|вконтакте|\bvk\b/i.test(prompt);
  let out = [...(links ?? [])].filter((l) => l.href.startsWith("https://"));
  if (!wantsSocial && out.length === 0) return undefined;

  const hasHref = (re: RegExp) => out.some((l) => re.test(l.href));

  if (locale === "ru" && beauty) {
    out = out.filter((l) => !/instagram\.com|instagr\.am/i.test(l.href));
    if (!hasHref(/t\.me|telegram\.org/i)) out.push({ label: "Telegram", href: "https://t.me/your_salon" });
    if (!hasHref(/vk\.com/i)) out.push({ label: "ВКонтакте", href: "https://vk.com/your_salon" });
  } else if (locale === "en" && beauty) {
    if (!hasHref(/instagram\.com|instagr\.am/i)) out.push({ label: "Instagram", href: "https://instagram.com/your_salon" });
    if (!hasHref(/t\.me|telegram\.org/i)) out.push({ label: "Telegram", href: "https://t.me/your_salon" });
    if (!hasHref(/youtube\.com|youtu\.be/i)) out.push({ label: "YouTube", href: "https://youtube.com/@your_salon" });
  }

  return out.length ? out.slice(0, 6) : undefined;
}

function finalizeTemplateCore(prompt: string, locale: SiteLocale, templateId: TemplateId, core: ContentCore): ContentCore {
  const comp = getLandingCompositionDefaults(templateId, locale);
  const sections = ensureSectionsForPrompt(prompt, core.sections ?? [...comp.sections]);
  const skinId = resolveSkinFromPrompt(prompt, templateId, clampSkinId(core.skinId ?? comp.skinId));

  const rawMap = String(core.mapEmbedSrc ?? "").trim();
  let mapEmbedSrc = rawMap && isAllowedMapEmbedUrl(rawMap) ? rawMap : undefined;
  if (sections.includes("map") && !mapEmbedSrc) mapEmbedSrc = defaultMapEmbedSrc(locale);

  const salonCtx: SalonContextFields = {
    title: core.title,
    subtitle: core.subtitle,
    services: core.services,
    templateId,
  };

  let galleryItems = core.galleryItems;
  if (sections.includes("gallery")) {
    const pool = galleryPoolForTemplate(templateId, prompt, salonCtx, locale);
    galleryItems = dedupeAndPadGallery(
      filterGalleryItemsForTemplate(galleryItems, templateId),
      pool,
      locale,
      4,
    );
  }
  if (!sections.includes("map")) mapEmbedSrc = undefined;
  if (!sections.includes("gallery")) galleryItems = undefined;

  const socialLinks = normalizeBeautySocialLinks(locale, core.socialLinks, prompt, salonCtx);
  const theme = mergeThemeWithPromptColors(core.theme, prompt);

  let pricing = core.pricing?.length ? [...core.pricing] : [];
  if (sections.includes("pricing") && !pricing.length) {
    pricing = [...comp.pricing];
  }
  if (sections.includes("pricing")) {
    const minCards = inferMinPricingCardsFromPrompt(prompt);
    if (minCards > 0 && pricing.length < minCards) {
      pricing = padPricingToMinimum(pricing, minCards, core.services, locale);
    }
  }

  return {
    ...core,
    templateId,
    sections,
    skinId,
    mapEmbedSrc,
    galleryItems,
    socialLinks,
    theme,
    pricing: sections.includes("pricing") ? pricing : core.pricing,
  };
}

function formatUnknownError(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {
    }
  }
  return String(e);
}

export type LandingData = {
  title: string;
  subtitle: string;
  services: string[];
  reviews: { quote: string; author: string }[];
  cta: string;
  locale: SiteLocale;
  templateId: TemplateId;
  generatedHtml?: string;
  generationNotice?: string;
  skinId?: SkinId;
  sections?: SectionKind[];
  sectionVariants?: Partial<Record<SectionKind, "a" | "b">>;
  benefits?: { title: string; text: string }[];
  pricing?: { name: string; price: string; bullets: string[] }[];
  processSteps?: { title: string; text: string }[];
  faq?: { q: string; a: string }[];
  galleryItems?: { src: string; alt: string }[];
  mapEmbedSrc?: string;
  socialLinks?: { label: string; href: string }[];
  theme?: LandingTheme;
};

type ContentCore = Omit<LandingData, "locale">;

function hasGigachatFallback(): boolean {
  return Boolean(process.env.GIGACHAT_CREDENTIALS?.trim());
}

function htmlGenerationLimits(): { maxAttempts: number; timeoutMs: number } {
  const attempts = Number(process.env.LANDING_HTML_MAX_ATTEMPTS);
  const timeout = Number(process.env.LANDING_HTML_TIMEOUT_MS);
  return {
    maxAttempts: Number.isFinite(attempts) && attempts > 0 ? Math.min(Math.floor(attempts), 5) : 2, 
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? Math.min(Math.floor(timeout), 120_000) : 45_000,
  };
}

function landingHtmlFixerEnabled(): boolean {
  return process.env.LANDING_HTML_FIXER?.trim().toLowerCase() === "true";
}

async function maybeRepairWithLlm(params: {
  provider: LlmProvider;
  locale: SiteLocale;
  themedImage: string;
  enhanceOptions?: EnhanceLandingHtmlOptions;
  html: string;
}): Promise<string> {
  const { provider, locale, themedImage, enhanceOptions, html } = params;
  if (!landingHtmlFixerEnabled()) return html;

  let issues = validateLandingHtml(html);
  if (!issues.length) return html;

  const fixerSystem = systemPromptLandingHtmlFixer(locale);
  const payload = JSON.stringify(issues);
  const body = html.length > 100_000 ? `${html.slice(0, 100_000)}\n<!-- truncated -->` : html;
  const fixerUser = `Issues:\n${payload}\n\nHTML:\n${body}`;

  try {
    const raw = await runLlmLandingHtml(provider, fixerSystem, fixerUser);
    const fixed = extractHtmlFromModelOutput(raw);
    const out = repairLandingHtml(enhanceLandingHtml(fixed, themedImage, enhanceOptions));
    if (isPlausibleHtml(out)) return out;
  } catch {
  }
  return html;
}

async function generateHtmlWithRetries(params: {
  provider: LlmProvider;
  system: string;
  userMessage: string;
  themedImage: string;
  locale: SiteLocale;
  enhanceOptions?: EnhanceLandingHtmlOptions;
}): Promise<string> {
  const { provider, system, userMessage, themedImage, locale, enhanceOptions } = params;
  const { maxAttempts, timeoutMs } = htmlGenerationLimits();
  const deadline = Date.now() + timeoutMs;
  let lastValidHtml = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() >= deadline) break;
    const raw = await runLlmLandingHtml(provider, system, userMessage);
    let candidate = enhanceLandingHtml(extractHtmlFromModelOutput(raw), themedImage, enhanceOptions);
    candidate = repairLandingHtml(candidate);
    candidate = await maybeRepairWithLlm({
      provider,
      locale,
      themedImage,
      enhanceOptions,
      html: candidate,
    });
    if (!isPlausibleHtml(candidate)) continue;
    lastValidHtml = candidate;
    if (hasRenderableImages(candidate)) return candidate;
  }

  if (lastValidHtml) return lastValidHtml;
  throw new Error("invalid_html");
}

function mockLanding(prompt: string, locale: SiteLocale): ContentCore {
  const templateId = inferTemplateFromPrompt(prompt);
  const p = prompt.trim().slice(0, 120);
  const head = p ? p.split(",")[0].trim() : "";

  if (locale === "ru") {
    const byVertical: Record<TemplateId, Omit<ContentCore, "templateId">> = {
      dental: {
        title: head ? `${head} — стоматология` : "Стоматология рядом с домом",
        subtitle: "Современное оборудование, бережное лечение и понятный план. Запись онлайн и в день обращения.",
        services: ["Профгигиена и осмотр", "Лечение кариеса", "Имплантация и протезирование"],
        reviews: [
          { quote: "Приняли без очереди, всё объяснили и ничего лишнего не навязали.", author: "Марина, СПб" },
          { quote: "Удобная рассрочка и аккуратные руки у врача.", author: "Денис" },
        ],
        cta: "Записаться на приём",
      },
      auto: {
        title: head ? `${head} — надёжный автосервис` : "Надёжный автосервис",
        subtitle:
          "Быстрая диагностика, честные цены и сертифицированные мастера. Запись онлайн или без записи.",
        services: ["Ремонт коробок передач", "Замена масла и фильтров", "Диагностика и тест-драйв"],
        reviews: [
          { quote: "Отремонтировали коробку за два дня. Смета прозрачная, без сюрпризов.", author: "Алексей М., Москва" },
          { quote: "Честные ребята. Перед работами всё объяснили и согласовали.", author: "Игорь К." },
        ],
        cta: "Получить бесплатную оценку",
      },
      repair: {
        title: head ? `${head} — ремонт с гарантией` : "Ремонт под ключ",
        subtitle: "Выезд мастера, диагностика и запчасти с прозрачной ценой. Работаем без выходных по договорённости.",
        services: ["Диагностика на месте", "Замена комплектующих", "Гарантия на работы до 12 мес."],
        reviews: [
          { quote: "Приехал вовремя, всё починил за один визит. Рекомендую.", author: "Сергей" },
          { quote: "Цена как в договоре — никаких доплат «по факту».", author: "Ольга" },
        ],
        cta: "Вызвать мастера",
      },
      realestate: {
        title: head ? `${head} — недвижимость` : "Недвижимость без лишних слов",
        subtitle: "Подбор, проверка юридической чистоты и сопровождение сделки до ключей. Работаем с ипотекой и новостройками.",
        services: ["Подбор под ваш бюджет", "Сопровождение сделки", "Оценка и консультация"],
        reviews: [
          { quote: "Помогли найти квартиру за три недели. Документы — без сюрпризов.", author: "Анна" },
          { quote: "Грамотный риелтор, всегда на связи.", author: "Павел" },
        ],
        cta: "Подобрать вариант",
      },
      ecommerce: {
        title: head ? `${head} — интернет-магазин` : "Онлайн-магазин",
        subtitle: "Быстрая доставка, понятные условия возврата и поддержка. Оформление заказа за пару минут.",
        services: ["Хиты продаж", "Новинки недели", "Бесплатная доставка от суммы заказа"],
        reviews: [
          { quote: "Заказ пришёл в срок, упаковка целая. Буду заказывать ещё.", author: "Покупатель" },
          { quote: "Удобная оплата и быстрый ответ поддержки.", author: "Елена" },
        ],
        cta: "Перейти в каталог",
      },
    };
    return finalizeTemplateCore(prompt, locale, templateId, {
      ...getLandingCompositionDefaults(templateId, locale),
      ...byVertical[templateId],
      templateId,
    });
  }

  const byVerticalEn: Record<TemplateId, Omit<ContentCore, "templateId">> = {
    dental: {
      title: head ? `${head} — dental care` : "Dental care near you",
      subtitle: "Modern equipment, gentle treatment, and a clear plan. Same-day appointments available.",
      services: ["Cleaning & exam", "Fillings & restorative", "Implants & prosthetics"],
      reviews: [
        { quote: "They explained everything and never pushed extra work.", author: "Maria, CA" },
        { quote: "Flexible payment options and a very gentle hygienist.", author: "Dan" },
      ],
      cta: "Book a visit",
    },
    auto: {
      title: head ? `${head} — trusted local service` : "Trusted auto shop",
      subtitle:
        "Fast diagnostics, fair pricing, and certified technicians. Book online or walk in today.",
      services: ["Transmission repair", "Fluid & filter service", "Diagnostics & road test"],
      reviews: [
        { quote: "Fixed my gearbox in two days. Clear estimate, no surprises.", author: "Alex M., local" },
        { quote: "Honest crew. They explained every step before any work.", author: "Jordan K." },
      ],
      cta: "Get a free estimate",
    },
    repair: {
      title: head ? `${head} — repairs done right` : "Repairs you can trust",
      subtitle: "On-site diagnostics, honest quotes, and warranty-backed work. Weekends by appointment.",
      services: ["On-site diagnosis", "Parts replacement", "Up to 12-month labor warranty"],
      reviews: [
        { quote: "Arrived on time and fixed it in one visit.", author: "Steve" },
        { quote: "Price matched the quote exactly.", author: "Laura" },
      ],
      cta: "Request a technician",
    },
    realestate: {
      title: head ? `${head} — real estate` : "Real estate, simplified",
      subtitle: "Search, due diligence, and full transaction support from offer to keys. Mortgages and new builds welcome.",
      services: ["Curated listings for your budget", "End-to-end transaction support", "Valuation & consultation"],
      reviews: [
        { quote: "Found our place in three weeks. Paperwork was spotless.", author: "Anna" },
        { quote: "Professional agent, always responsive.", author: "Paul" },
      ],
      cta: "Get listings",
    },
    ecommerce: {
      title: head ? `${head} — shop online` : "Online store",
      subtitle: "Fast shipping, easy returns, and friendly support. Checkout in minutes.",
      services: ["Best sellers", "New arrivals", "Free shipping on qualifying orders"],
      reviews: [
        { quote: "Arrived on time and well packed. Will order again.", author: "Customer" },
        { quote: "Smooth checkout and quick support replies.", author: "Helen" },
      ],
      cta: "Shop now",
    },
  };
  return finalizeTemplateCore(prompt, locale, templateId, {
    ...getLandingCompositionDefaults(templateId, locale),
    ...byVerticalEn[templateId],
    templateId,
  });
}

function parseSectionsOrder(x: unknown): SectionKind[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: SectionKind[] = [];
  const seen = new Set<SectionKind>();
  for (const item of x) {
    if (!isSectionKind(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out.length ? out : undefined;
}

function parseSectionVariants(x: unknown): Partial<Record<SectionKind, "a" | "b">> | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as Record<string, unknown>;
  const out: Partial<Record<SectionKind, "a" | "b">> = {};
  for (const k of Object.keys(o)) {
    if (!isSectionKind(k)) continue;
    const v = o[k];
    if (v === "a" || v === "b") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseBenefitItems(x: unknown): { title: string; text: string }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { title: string; text: string }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const text = String(o.text ?? "").trim();
    if (!title || !text) continue;
    out.push({ title, text });
  }
  return out.length ? out.slice(0, 6) : undefined;
}

function parsePricingItems(x: unknown): { name: string; price: string; bullets: string[] }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { name: string; price: string; bullets: string[] }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    const price = String(o.price ?? "").trim();
    const bulletsRaw = Array.isArray(o.bullets) ? o.bullets : [];
    const bullets = bulletsRaw.map((b) => String(b)).filter(Boolean).slice(0, 5);
    if (!name || !price) continue;
    out.push({ name, price, bullets: bullets.length ? bullets : ["—"] });
  }
  return out.length ? out.slice(0, 12) : undefined;
}

const MAX_PRICING_CARDS = 12;

export function inferMinPricingCardsFromPrompt(prompt: string): number {
  const t = prompt.toLowerCase();
  let max = 0;
  const collect = (source: string) => {
    const r = new RegExp(source, "gi");
    let m: RegExpExecArray | null;
    while ((m = r.exec(t)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= 2 && n <= MAX_PRICING_CARDS) max = Math.max(max, n);
    }
  };
  collect(String.raw`не\s+менее\s+(\d{1,2})\b`);
  collect(String.raw`не\s+меньше\s+(\d{1,2})\b`);
  collect(String.raw`минимум\s+(\d{1,2})\b`);
  collect(String.raw`at\s+least\s+(\d{1,2})\b`);
  return max;
}

function padPricingToMinimum(
  rows: { name: string; price: string; bullets: string[] }[],
  min: number,
  services: string[],
  locale: SiteLocale,
): { name: string; price: string; bullets: string[] }[] {
  const out = rows.slice();
  const need = Math.min(MAX_PRICING_CARDS, Math.max(min, out.length));
  const svcN = Math.max(1, services.length);
  while (out.length < need) {
    const idx = out.length;
    const baseName =
      services[idx] ||
      services[idx % svcN] ||
      (locale === "ru" ? "Работы по заявке" : "On-demand work");
    const name = out.some((r) => r.name === baseName) ? `${baseName} (${idx + 1})` : baseName;
    out.push({
      name,
      price: locale === "ru" ? "по смете" : "quoted",
      bullets: [locale === "ru" ? "Состав согласуем перед стартом" : "Scope agreed before start"],
    });
  }
  return out.slice(0, MAX_PRICING_CARDS);
}

function parseProcessSteps(x: unknown): { title: string; text: string }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { title: string; text: string }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const text = String(o.text ?? "").trim();
    if (!title || !text) continue;
    out.push({ title, text });
  }
  return out.length ? out.slice(0, 6) : undefined;
}

function parseFaqItems(x: unknown): { q: string; a: string }[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: { q: string; a: string }[] = [];
  for (const it of x) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const q = String(o.q ?? "").trim();
    const a = String(o.a ?? "").trim();
    if (!q || !a) continue;
    out.push({ q, a });
  }
  return out.length ? out.slice(0, 8) : undefined;
}

function parseJson(text: string, locale: SiteLocale, prompt: string): ContentCore | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    const rawTid = raw.templateId;
    const templateId: TemplateId = isTemplateId(rawTid) ? rawTid : inferTemplateFromPrompt(prompt);
    const comp = getLandingCompositionDefaults(templateId, locale);

    const title = normalizeGeneratedTitle(String(raw.title ?? ""), locale);
    const subtitle = String(raw.subtitle ?? "");
    const cta = String(raw.cta ?? (locale === "ru" ? "Связаться с нами" : "Contact us"));
    const services = Array.isArray(raw.services)
      ? raw.services.map((s) => String(s)).filter(Boolean).slice(0, 8)
      : [];
    const reviewsRaw = Array.isArray(raw.reviews) ? raw.reviews : [];
    const reviews = reviewsRaw
      .map((r) => {
        if (r && typeof r === "object" && "quote" in r) {
          const o = r as { quote?: string; author?: string };
          return { quote: String(o.quote ?? ""), author: String(o.author ?? "") };
        }
        return null;
      })
      .filter((x): x is { quote: string; author: string } => x !== null && (x.quote.length > 0 || x.author.length > 0))
      .slice(0, 4);

    if (!title || services.length === 0) return null;

    const rawMap = String(raw.mapEmbedSrc ?? "").trim();
    const mapFromModel = rawMap && isAllowedMapEmbedUrl(rawMap) ? rawMap : undefined;

    return finalizeTemplateCore(prompt, locale, templateId, {
      templateId,
      title,
      subtitle,
      services: services.length
        ? services
        : locale === "ru"
          ? ["Консультация", "Диагностика", "Ремонт"]
          : ["Service consultation", "Diagnostics", "Repairs"],
      reviews: reviews.length
        ? reviews
        : locale === "ru"
          ? [
              { quote: "Отличный сервис и адекватные цены.", author: "Клиент" },
              { quote: "Сделали быстро. Рекомендую.", author: "Покупатель" },
            ]
          : [
              { quote: "Great service and fair prices.", author: "Customer" },
              { quote: "Quick turnaround. Highly recommend.", author: "Buyer" },
            ],
      cta,
      skinId: clampSkinId(raw.skinId ?? comp.skinId),
      sections: parseSectionsOrder(raw.sections) ?? comp.sections,
      sectionVariants: parseSectionVariants(raw.sectionVariants),
      benefits: parseBenefitItems(raw.benefits) ?? comp.benefits,
      pricing: parsePricingItems(raw.pricing) ?? comp.pricing,
      processSteps: parseProcessSteps(raw.processSteps) ?? comp.processSteps,
      faq: parseFaqItems(raw.faq) ?? comp.faq,
      galleryItems: parseGalleryItems(raw.galleryItems),
      mapEmbedSrc: mapFromModel,
      socialLinks: parseSocialLinks(raw.socialLinks),
      theme: sanitizeLandingTheme(raw.theme),
    });
  } catch {
    return null;
  }
}

async function generateLandingFromTemplateJson(
  prompt: string,
  locale: SiteLocale,
  provider: LlmProvider,
): Promise<LandingData> {
  const system = systemPrompt(locale);
  const ctx = analyzePrompt(prompt);
  const userMessage = `Создай структуру лендинга по описанию ниже.
Язык текста на сайте: ${locale === "ru" ? "русский" : "английский"}.

Описание бизнеса (по нему определи нишу и templateId):
${prompt}

Контекст:
- ниша: ${ctx.niche}
- стиль: ${ctx.style}
- тон: ${ctx.tone}
- тип: ${ctx.target}`;

  let text: string;
  try {
    text = await runLlmCompletion(provider, system, userMessage);
  } catch (e) {
    const errText = formatUnknownError(e);

    if (provider === "zai" && hasGigachatFallback()) {
      return generateLandingFromTemplateJson(prompt, locale, "gigachat");
    }

    if (
      provider === "openai" &&
      (errText.includes("insufficient_quota") || errText.includes('"code":"insufficient_quota"'))
    ) {
      return {
        ...mockLanding(prompt, locale),
        locale,
        generationNotice:
          locale === "ru"
            ? "Квота OpenAI исчерпана. Показан демо-вариант. Пополните баланс или переключите AI_PROVIDER на gigachat/yandex в .env."
            : "OpenAI quota exceeded. Demo shown. Add billing or set AI_PROVIDER=zai|gigachat|yandex.",
      };
    }

    if (
      provider === "zai" &&
      (errText.includes("Insufficient balance") ||
        errText.includes('"code":"1113"') ||
        errText.includes("no resource package"))
    ) {
      return {
        ...mockLanding(prompt, locale),
        locale,
        generationNotice:
          locale === "ru"
            ? "Баланс Z.AI исчерпан (код 1113). Показан демо-вариант. Пополните баланс Z.AI или временно переключите AI_PROVIDER на gigachat/openai/yandex."
            : "Z.AI balance is insufficient (code 1113). Demo shown. Please top up Z.AI or switch AI_PROVIDER to gigachat/openai/yandex.",
      };
    }

    if (provider === "openai" && errText.startsWith("OpenAI 429") && !errText.includes("insufficient_quota")) {
      throw new Error(
        locale === "ru"
          ? "Слишком много запросов к OpenAI. Подождите минуту или смените провайдера (AI_PROVIDER)."
          : "OpenAI rate limit. Wait or switch AI_PROVIDER.",
      );
    }

    throw new Error(
      locale === "ru"
        ? `Ошибка ИИ (${provider}): ${errText.slice(0, 600)}`
        : `LLM error (${provider}): ${errText.slice(0, 600)}`,
    );
  }

  const parsed = parseJson(text, locale, prompt);
  if (parsed) return { ...parsed, locale };
  return { ...mockLanding(prompt, locale), locale };
}

export async function generateLandingContent(
  prompt: string,
  locale: SiteLocale,
  options?: GenerateLandingOptions,
): Promise<LandingData> {
  const provider = resolveLlmProvider();
  if (provider === "none") {
    return { ...mockLanding(prompt, locale), locale };
  }

  const enhanceOptions: EnhanceLandingHtmlOptions | undefined = options
    ? {
        layoutMode: options.layoutMode,
        imagePreference: options.imagePreference,
        skipVisualEnrichment: options.skipVisualEnrichment,
      }
    : undefined;

  if (resolveLandingBuildMode(provider, options?.generateMode) === "html") {
    try {
      const mapProvider = inferMapEmbedProviderFromPrompt(prompt, locale);
      const system = systemPromptHtml(locale, mapProvider);
      const y = new Date().getFullYear();
      const ctx = analyzePrompt(prompt);
      const userMessage = buildEnrichedUserMessage(prompt, ctx, y);
      const templateId = inferTemplateFromPrompt(prompt);
      const themedImage = themedFallbackImageByPrompt(prompt, templateId);
      const html = await generateHtmlWithRetries({
        provider,
        system,
        userMessage,
        themedImage,
        locale,
        enhanceOptions,
      });

      const title = normalizeGeneratedTitle(extractTitleFromHtml(html) ?? prompt.trim().slice(0, 120), locale);
      const filler = mockLanding(prompt, locale);
      return {
        ...filler,
        title,
        templateId,
        locale,
        generatedHtml: html,
      };
    } catch {
      if (provider === "zai" && hasGigachatFallback()) {
        try {
          const mapProvider = inferMapEmbedProviderFromPrompt(prompt, locale);
          const system = systemPromptHtml(locale, mapProvider);
          const y = new Date().getFullYear();
          const ctx = analyzePrompt(prompt);
          const userMessage = buildEnrichedUserMessage(prompt, ctx, y);
          const templateId = inferTemplateFromPrompt(prompt);
          const themedImage = themedFallbackImageByPrompt(prompt, templateId);
          const html = await generateHtmlWithRetries({
            provider: "gigachat",
            system,
            userMessage,
            themedImage,
            locale,
            enhanceOptions,
          });

          const title = normalizeGeneratedTitle(extractTitleFromHtml(html) ?? prompt.trim().slice(0, 120), locale);
          const filler = mockLanding(prompt, locale);
          return {
            ...filler,
            title,
            templateId,
            locale,
            generatedHtml: html,
          };
        } catch {        
        }
      }    
    }
  }

  return generateLandingFromTemplateJson(prompt, locale, provider);
}
