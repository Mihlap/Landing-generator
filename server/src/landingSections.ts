import { escapeHtml } from "./htmlEscape.js";
import { buildSkinStylesheet } from "./landingSkin.js";
import type { LandingData, SectionKind, SiteLocale } from "./services/ai.js";

const FALLBACK_SECTION_ORDER: SectionKind[] = [
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

const SECTION_KIND_SET = new Set<string>(FALLBACK_SECTION_ORDER);

function isSectionKindName(x: unknown): x is SectionKind {
  return typeof x === "string" && SECTION_KIND_SET.has(x);
}
import type { TemplateId } from "./templateId.js";

const BASE_STYLE = `
  .lp {
    --lp-radius: 12px;
    --lp-radius-lg: 18px;
    --lp-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif;
    color: var(--lp-page-fg);
    background: var(--lp-page-bg);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
  .lp-wrap {
    width: 100%;
    max-width: min(90rem, 100%);
    margin-inline: auto;
    padding-inline: clamp(1rem, 4vw, 2rem);
  }
  .lp-sections {
    display: flex;
    flex-direction: column;
    gap: clamp(2rem, 5vw, 3.5rem);
    padding-block: clamp(1.25rem, 4vw, 2.5rem);
  }
  .lp-section {
    padding: clamp(1.25rem, 3vw, 2rem);
    border-radius: var(--lp-radius-lg);
    background: var(--lp-surface);
    border: 1px solid var(--lp-border);
    box-shadow: var(--lp-shadow);
    min-width: 0;
  }
  .lp-prose {
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
  }
  .lp-prose h1, .lp-prose h2, .lp-prose h3, .lp-prose p, .lp-prose li {
    min-width: 0;
  }
  .lp-hero {
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
  }
  .lp-hero-inner {
    border-radius: var(--lp-radius-lg);
    background: var(--lp-hero-bg);
    border: 1px solid var(--lp-border);
    padding: clamp(2rem, 6vw, 3.5rem) clamp(1.25rem, 4vw, 2rem);
    min-width: 0;
  }
  .lp-hero.lp-hero--split .lp-hero-inner {
    display: grid;
    gap: clamp(1.5rem, 4vw, 2.5rem);
  }
  @media (min-width: 768px) {
    .lp-hero.lp-hero--split .lp-hero-inner {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: center;
    }
  }
  .lp-hero-deco {
    min-height: 140px;
    border-radius: var(--lp-radius-lg);
    background: linear-gradient(135deg, var(--lp-accent-soft), transparent);
    border: 1px dashed var(--lp-border);
  }
  .lp-h1 {
    font-size: clamp(1.65rem, 4.5vw, 2.35rem);
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 0.75rem;
    letter-spacing: -0.02em;
  }
  .lp-lead {
    margin: 0 0 1.5rem;
    font-size: clamp(1rem, 2.2vw, 1.1rem);
    line-height: 1.65;
    color: var(--lp-muted);
  }
  .lp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.9rem 1.75rem;
    border-radius: 999px;
    font-weight: 700;
    text-decoration: none;
    background: var(--lp-accent);
    color: var(--lp-accent-on);
    border: none;
    cursor: pointer;
    max-width: 100%;
    text-align: center;
  }
  .lp-btn:hover { filter: brightness(1.06); }
  .lp-h2 {
    font-size: clamp(0.8rem, 1.8vw, 0.95rem);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--lp-muted);
    margin: 0 0 1.25rem;
    font-weight: 700;
  }
  .lp-benefits-grid {
    display: grid;
    gap: clamp(1rem, 3vw, 1.25rem);
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .lp-benefits-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  .lp-benefit {
    padding: 1rem 1.1rem;
    border-radius: var(--lp-radius);
    background: var(--lp-surface-alt);
    border: 1px solid var(--lp-border);
    min-width: 0;
  }
  .lp-benefit h3 {
    margin: 0 0 0.4rem;
    font-size: 1rem;
    font-weight: 700;
  }
  .lp-benefit p { margin: 0; font-size: 0.95rem; line-height: 1.55; color: var(--lp-muted); }
  .lp-svc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  .lp-svc-list li {
    padding: 0.85rem 1rem;
    border-radius: var(--lp-radius);
    background: var(--lp-surface-alt);
    border: 1px solid var(--lp-border);
    min-width: 0;
  }
  .lp-svc-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .lp-svc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (min-width: 960px) {
    .lp-svc-grid.lp-svc-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  .lp-card {
    padding: 1.15rem 1.2rem;
    border-radius: var(--lp-radius);
    background: var(--lp-surface-alt);
    border: 1px solid var(--lp-border);
    min-width: 0;
  }
  .lp-card h3 { margin: 0 0 0.35rem; font-size: 1rem; font-weight: 700; }
  .lp-card-sub { margin: 0; font-size: 0.85rem; color: var(--lp-muted); }
  .lp-price-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 720px) {
    .lp-price-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  .lp-price {
    padding: 1.2rem;
    border-radius: var(--lp-radius-lg);
    border: 1px solid var(--lp-border);
    background: var(--lp-surface-alt);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
  }
  .lp-price-name { font-weight: 800; font-size: 1.05rem; }
  .lp-price-val { font-size: 1.35rem; font-weight: 800; color: var(--lp-accent); }
  .lp-price ul { margin: 0; padding-left: 1.1rem; color: var(--lp-muted); font-size: 0.92rem; line-height: 1.5; }
  .lp-reviews {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  .lp-reviews.lp-reviews--grid {
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .lp-reviews.lp-reviews--grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .lp-review {
    margin: 0;
    padding: 1.1rem 1.15rem;
    border-radius: var(--lp-radius);
    background: var(--lp-surface-alt);
    border: 1px solid var(--lp-border);
    min-width: 0;
  }
  .lp-review blockquote { margin: 0 0 0.45rem; font-style: italic; line-height: 1.55; color: var(--lp-page-fg); }
  .lp-review figcaption { font-size: 0.88rem; color: var(--lp-muted); }
  .lp-process {
    display: grid;
    gap: 1rem;
    counter-reset: step;
  }
  .lp-step {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.85rem;
    align-items: start;
    padding: 1rem;
    border-radius: var(--lp-radius);
    border: 1px solid var(--lp-border);
    background: var(--lp-surface-alt);
    min-width: 0;
  }
  .lp-step::before {
    counter-increment: step;
    content: counter(step);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--lp-accent);
    color: var(--lp-accent-on);
    font-weight: 800;
    font-size: 0.9rem;
    flex-shrink: 0;
  }
  .lp-step h3 { margin: 0 0 0.25rem; font-size: 1rem; }
  .lp-step p { margin: 0; font-size: 0.92rem; line-height: 1.55; color: var(--lp-muted); }
  .lp-faq details {
    padding: 0.9rem 1rem;
    border-radius: var(--lp-radius);
    border: 1px solid var(--lp-border);
    background: var(--lp-surface-alt);
    margin-bottom: 0.6rem;
    min-width: 0;
  }
  .lp-faq summary { cursor: pointer; font-weight: 700; }
  .lp-faq p { margin: 0.6rem 0 0; color: var(--lp-muted); line-height: 1.55; font-size: 0.95rem; }
  .lp-cta-band {
    text-align: center;
    padding: clamp(2rem, 5vw, 3rem);
    border-radius: var(--lp-radius-lg);
    background: linear-gradient(135deg, var(--lp-accent-soft), transparent);
    border: 1px solid var(--lp-border);
  }
  .lp-cta-band h2 { margin: 0 0 0.5rem; font-size: clamp(1.25rem, 3vw, 1.5rem); font-weight: 800; }
  .lp-cta-band p { margin: 0 0 1.25rem; color: var(--lp-muted); line-height: 1.55; }
  .lp-footer {
    text-align: center;
    padding: clamp(1.5rem, 4vw, 2rem);
    font-size: 0.9rem;
    color: var(--lp-muted);
    border: 1px solid var(--lp-border);
    border-radius: var(--lp-radius-lg);
    background: var(--lp-surface-alt);
  }
`;

type Headings = {
  services: string;
  reviews: string;
  footer: string;
  benefits: string;
  pricing: string;
  process: string;
  faq: string;
  ctaTitle: string;
  ctaSub: string;
};

function headings(locale: SiteLocale, templateId: TemplateId): Headings {
  const ru: Record<TemplateId, Headings> = {
    dental: {
      services: "Услуги",
      reviews: "Отзывы пациентов",
      footer: "Забота о здоровье вашей улыбки",
      benefits: "Почему мы",
      pricing: "Тарифы",
      process: "Как проходит приём",
      faq: "Частые вопросы",
      ctaTitle: "Запишитесь на удобное время",
      ctaSub: "Оставьте заявку — перезвоним и подберём врача.",
    },
    auto: {
      services: "Услуги",
      reviews: "Отзывы",
      footer: "Надёжный автосервис рядом с вами",
      benefits: "Наши плюсы",
      pricing: "Прайс и пакеты",
      process: "Как мы работаем",
      faq: "Вопросы",
      ctaTitle: "Нужна диагностика или ремонт?",
      ctaSub: "Напишите — оценим работу и сроки без навязывания.",
    },
    repair: {
      services: "Что ремонтируем",
      reviews: "Отзывы клиентов",
      footer: "Ремонт под ключ — без сюрпризов",
      benefits: "Почему выбирают нас",
      pricing: "Стоимость",
      process: "Как выезжаем",
      faq: "FAQ",
      ctaTitle: "Вызвать мастера",
      ctaSub: "Согласуем время и примерную стоимость до выезда.",
    },
    realestate: {
      services: "Форматы работы",
      reviews: "Отзывы",
      footer: "Недвижимость без лишних слов",
      benefits: "Преимущества",
      pricing: "Условия",
      process: "Этапы сделки",
      faq: "Вопросы",
      ctaTitle: "Подберём вариант под бюджет",
      ctaSub: "Консультация и подбор без обязательств.",
    },
    ecommerce: {
      services: "Каталог",
      reviews: "Отзывы покупателей",
      footer: "Покупайте удобно онлайн",
      benefits: "Почему у нас",
      pricing: "Цены и доставка",
      process: "Как заказать",
      faq: "Доставка и возврат",
      ctaTitle: "Готовы оформить заказ?",
      ctaSub: "Быстрая поддержка и понятные условия.",
    },
  };
  const en: Record<TemplateId, Headings> = {
    dental: {
      services: "Services",
      reviews: "Patient reviews",
      footer: "Care for your smile",
      benefits: "Why choose us",
      pricing: "Pricing",
      process: "How visits work",
      faq: "FAQ",
      ctaTitle: "Book a convenient time",
      ctaSub: "Leave a request — we will call you back.",
    },
    auto: {
      services: "Services",
      reviews: "Reviews",
      footer: "Trusted auto care near you",
      benefits: "Why us",
      pricing: "Packages",
      process: "How we work",
      faq: "Questions",
      ctaTitle: "Need diagnostics or repair?",
      ctaSub: "Message us for a fair estimate.",
    },
    repair: {
      services: "What we fix",
      reviews: "Customer reviews",
      footer: "Repairs done right",
      benefits: "Why hire us",
      pricing: "Rates",
      process: "How we visit",
      faq: "FAQ",
      ctaTitle: "Request a technician",
      ctaSub: "We align time and a rough quote before the visit.",
    },
    realestate: {
      services: "How we work",
      reviews: "Reviews",
      footer: "Properties that fit your life",
      benefits: "Benefits",
      pricing: "Terms",
      process: "Transaction steps",
      faq: "FAQ",
      ctaTitle: "Find the right option",
      ctaSub: "Consultation with no obligation.",
    },
    ecommerce: {
      services: "Catalog",
      reviews: "Customer reviews",
      footer: "Shop online with confidence",
      benefits: "Why shop here",
      pricing: "Pricing & delivery",
      process: "How to order",
      faq: "Shipping & returns",
      ctaTitle: "Ready to order?",
      ctaSub: "Fast support and clear policies.",
    },
  };
  return locale === "ru" ? ru[templateId] : en[templateId];
}

function catalogCardSub(locale: SiteLocale): string {
  return locale === "ru" ? "Подробности по запросу" : "Details on request";
}

/** Порядок: герой первый, подвал последний; остальное — как в списке (без дубликатов). */
export function normalizeSectionOrder(input: SectionKind[] | undefined): SectionKind[] {
  const seen = new Set<SectionKind>();
  const raw: SectionKind[] = [];
  const base = input?.length ? input : [...FALLBACK_SECTION_ORDER];
  for (const k of base) {
    if (!isSectionKindName(k) || seen.has(k)) continue;
    seen.add(k);
    raw.push(k);
  }
  const middle = raw.filter((k) => k !== "hero" && k !== "footer");
  return ["hero", ...middle, "footer"];
}

function renderHero(data: LandingData, H: Headings): string {
  const title = escapeHtml(data.title);
  const subtitle = escapeHtml(data.subtitle);
  const cta = escapeHtml(data.cta);
  const variant = data.sectionVariants?.hero ?? "a";
  const split = variant === "b";

  const inner = split
    ? `<div class="lp-hero-inner lp-prose">
        <div>
          <h1 class="lp-h1">${title}</h1>
          <p class="lp-lead">${subtitle}</p>
          <a class="lp-btn" href="#contact">${cta}</a>
        </div>
        <div class="lp-hero-deco" aria-hidden="true"></div>
      </div>`
    : `<div class="lp-hero-inner lp-prose" style="text-align:center;">
        <h1 class="lp-h1">${title}</h1>
        <p class="lp-lead">${subtitle}</p>
        <a class="lp-btn" href="#contact">${cta}</a>
      </div>`;

  return `<section class="lp-section lp-hero lp-prose${split ? " lp-hero--split" : ""}" aria-label="Hero">${inner}</section>`;
}

function renderBenefits(data: LandingData, H: Headings): string {
  const items = data.benefits?.length ? data.benefits : [];
  if (!items.length) return "";
  const cards = items
    .slice(0, 6)
    .map(
      (b) =>
        `<article class="lp-benefit lp-prose"><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.text)}</p></article>`,
    )
    .join("\n");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-benefits">
    <h2 class="lp-h2" id="lp-benefits">${escapeHtml(H.benefits)}</h2>
    <div class="lp-benefits-grid">${cards}</div>
  </section>`;
}

function renderServices(data: LandingData, H: Headings): string {
  const variant = data.sectionVariants?.services ?? "a";
  const ecommerce = data.templateId === "ecommerce";
  const useGrid = ecommerce || variant === "b";

  if (useGrid) {
    const gridClass = ecommerce ? "lp-svc-grid lp-svc-grid--3" : "lp-svc-grid";
    const cards = data.services
      .map(
        (s) =>
          `<article class="lp-card lp-prose"><h3>${escapeHtml(s)}</h3><p class="lp-card-sub">${escapeHtml(catalogCardSub(data.locale))}</p></article>`,
      )
      .join("\n");
    return `<section class="lp-section lp-prose" aria-labelledby="lp-svc">
      <h2 class="lp-h2" id="lp-svc">${escapeHtml(H.services)}</h2>
      <div class="${gridClass}">${cards}</div>
    </section>`;
  }

  const lis = data.services.map((s) => `<li class="lp-prose">${escapeHtml(s)}</li>`).join("\n");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-svc">
    <h2 class="lp-h2" id="lp-svc">${escapeHtml(H.services)}</h2>
    <ul class="lp-svc-list">${lis}</ul>
  </section>`;
}

function renderPricing(data: LandingData, H: Headings): string {
  const rows = data.pricing?.length ? data.pricing : [];
  if (!rows.length) return "";
  const cards = rows
    .slice(0, 3)
    .map((p) => {
      const bullets = p.bullets
        .slice(0, 5)
        .map((b) => `<li class="lp-prose">${escapeHtml(b)}</li>`)
        .join("");
      return `<article class="lp-price lp-prose">
        <div class="lp-price-name">${escapeHtml(p.name)}</div>
        <div class="lp-price-val">${escapeHtml(p.price)}</div>
        <ul>${bullets}</ul>
      </article>`;
    })
    .join("\n");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-price">
    <h2 class="lp-h2" id="lp-price">${escapeHtml(H.pricing)}</h2>
    <div class="lp-price-grid">${cards}</div>
  </section>`;
}

function renderReviews(data: LandingData, H: Headings): string {
  const variant = data.sectionVariants?.reviews ?? "a";
  const grid = variant === "b" ? " lp-reviews--grid" : "";
  const figures = data.reviews
    .map(
      (r) =>
        `<figure class="lp-review lp-prose"><blockquote>${escapeHtml(r.quote)}</blockquote><figcaption>— ${escapeHtml(r.author)}</figcaption></figure>`,
    )
    .join("\n");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-rev">
    <h2 class="lp-h2" id="lp-rev">${escapeHtml(H.reviews)}</h2>
    <div class="lp-reviews${grid}">${figures}</div>
  </section>`;
}

function renderProcess(data: LandingData, H: Headings): string {
  const steps = data.processSteps?.length ? data.processSteps : [];
  if (!steps.length) return "";
  const inner = steps
    .slice(0, 6)
    .map(
      (s) =>
        `<div class="lp-step lp-prose"><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.text)}</p></div></div>`,
    )
    .join("");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-proc">
    <h2 class="lp-h2" id="lp-proc">${escapeHtml(H.process)}</h2>
    <div class="lp-process">${inner}</div>
  </section>`;
}

function renderFaq(data: LandingData, H: Headings): string {
  const items = data.faq?.length ? data.faq : [];
  if (!items.length) return "";
  const inner = items
    .slice(0, 8)
    .map(
      (f) =>
        `<details class="lp-prose"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`,
    )
    .join("");
  return `<section class="lp-section lp-faq lp-prose" aria-labelledby="lp-faq">
    <h2 class="lp-h2" id="lp-faq">${escapeHtml(H.faq)}</h2>
    ${inner}
  </section>`;
}

function renderCta(data: LandingData, H: Headings): string {
  const cta = escapeHtml(data.cta);
  return `<section class="lp-cta lp-prose" aria-labelledby="lp-cta">
    <div class="lp-cta-band">
      <h2 id="lp-cta">${escapeHtml(H.ctaTitle)}</h2>
      <p>${escapeHtml(H.ctaSub)}</p>
      <a class="lp-btn" href="#contact">${cta}</a>
    </div>
  </section>`;
}

function renderFooter(data: LandingData, H: Headings): string {
  return `<footer class="lp-footer lp-prose" id="contact">${escapeHtml(H.footer)}</footer>`;
}

function renderSection(kind: SectionKind, data: LandingData, H: Headings): string {
  switch (kind) {
    case "hero":
      return renderHero(data, H);
    case "benefits":
      return renderBenefits(data, H);
    case "services":
      return renderServices(data, H);
    case "pricing":
      return renderPricing(data, H);
    case "reviews":
      return renderReviews(data, H);
    case "process":
      return renderProcess(data, H);
    case "faq":
      return renderFaq(data, H);
    case "cta":
      return renderCta(data, H);
    case "footer":
      return renderFooter(data, H);
    default:
      return "";
  }
}

export function renderLandingHtml(data: LandingData): string {
  const lang = data.locale === "ru" ? "ru" : "en";
  const skin = data.skinId ?? 1;
  const order = normalizeSectionOrder(data.sections);
  const H = headings(data.locale, data.templateId);
  const parts: string[] = [];
  for (const kind of order) {
    const html = renderSection(kind, data, H);
    if (html) parts.push(html);
  }
  const bodyInner = `<div class="lp-wrap lp-sections">${parts.join("\n")}</div>`;
  const skinClass = `lp lp-skin-${skin}`;
  const title = escapeHtml(data.title);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
${buildSkinStylesheet()}
${BASE_STYLE}
  </style>
</head>
<body class="${skinClass}">
${bodyInner}
</body>
</html>`;
}
