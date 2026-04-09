import { getLandingCompositionDefaults } from "../landingCompositionDefaults.js";
import { isTemplateId, type TemplateId } from "../templateId.js";
import { enhanceLandingHtml } from "./landingHtmlPostprocess.js";
import { type LlmProvider, resolveLlmProvider, runLlmCompletion, runLlmLandingHtml } from "./llm.js";
import { analyzePrompt, buildEnrichedUserMessage } from "./aiContext.js";
import { inferMapEmbedProviderFromPrompt, systemPrompt, systemPromptHtml } from "./aiPrompts.js";
import {
  extractHtmlFromModelOutput,
  extractTitleFromHtml,
  hasRenderableImages,
  inferTemplateFromPrompt,
  isPlausibleHtml,
  landingBuildMode,
  normalizeGeneratedTitle,
  themedFallbackImageByPrompt,
} from "./aiUtils.js";

export { inferTemplateFromPrompt, landingBuildMode } from "./aiUtils.js";

export type SiteLocale = "ru" | "en";

export type SectionKind =
  | "hero"
  | "benefits"
  | "services"
  | "pricing"
  | "reviews"
  | "process"
  | "faq"
  | "cta"
  | "footer";

export const SECTION_KINDS: readonly SectionKind[] = [
  "hero",
  "benefits",
  "services",
  "pricing",
  "reviews",
  "process",
  "faq",
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

async function generateHtmlWithRetries(params: {
  provider: LlmProvider;
  system: string;
  userMessage: string;
  themedImage: string;
}): Promise<string> {
  const { provider, system, userMessage, themedImage } = params;
  const { maxAttempts, timeoutMs } = htmlGenerationLimits();
  const deadline = Date.now() + timeoutMs;
  let lastValidHtml = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() >= deadline) break;
    const raw = await runLlmLandingHtml(provider, system, userMessage);
    const candidate = enhanceLandingHtml(extractHtmlFromModelOutput(raw), themedImage);
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
    return { ...getLandingCompositionDefaults(templateId, locale), ...byVertical[templateId], templateId };
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
  return { ...getLandingCompositionDefaults(templateId, locale), ...byVerticalEn[templateId], templateId };
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
  return out.length ? out.slice(0, 3) : undefined;
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

    return {
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
    };
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

export async function generateLandingContent(prompt: string, locale: SiteLocale): Promise<LandingData> {
  const provider = resolveLlmProvider();
  if (provider === "none") {
    return { ...mockLanding(prompt, locale), locale };
  }

  if (landingBuildMode(provider) === "html") {
    try {
      const mapProvider = inferMapEmbedProviderFromPrompt(prompt, locale);
      const system = systemPromptHtml(locale, mapProvider);
      const y = new Date().getFullYear();
      const ctx = analyzePrompt(prompt);
      const userMessage = buildEnrichedUserMessage(prompt, ctx, y);
      const templateId = inferTemplateFromPrompt(prompt);
      const themedImage = themedFallbackImageByPrompt(prompt, templateId);
      const html = await generateHtmlWithRetries({ provider, system, userMessage, themedImage });

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
          const html = await generateHtmlWithRetries({ provider: "gigachat", system, userMessage, themedImage });

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
