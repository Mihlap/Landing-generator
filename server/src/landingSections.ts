import { escapeHtml } from "./htmlEscape.js";
import { buildSkinStylesheet } from "./landingSkin.js";
import { buildThemeOverrideCss } from "./landingTheme.js";
import type { LandingData, SectionKind, SiteLocale } from "./services/ai.js";

const FALLBACK_SECTION_ORDER: SectionKind[] = [
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
    font-family: var(--lp-font-stack, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif);
    color: var(--lp-page-fg);
    background: var(--lp-page-bg);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
  .lp-wrap {
    width: 100%;
    max-width: min(92rem, 100%);
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
  @media (min-width: 640px) {
    .lp-price-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    }
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
  .lp-footer-tagline { margin: 0 0 0.75rem; color: var(--lp-page-fg); }
  .lp-footer-social {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 0.5rem;
  }
  .lp-footer-link {
    color: var(--lp-accent);
    font-weight: 600;
    text-decoration: none;
  }
  .lp-footer-link:hover { text-decoration: underline; }
  .lp-footer-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    background: var(--lp-accent-soft);
    color: var(--lp-accent);
    text-decoration: none;
    border: 1px solid var(--lp-border);
  }
  .lp-footer-icon:hover { filter: brightness(1.06); }
  .lp-footer-icon svg {
    width: 1.35rem;
    height: 1.35rem;
    fill: currentColor;
    flex-shrink: 0;
  }
  .lp-gallery-grid {
    display: grid;
    gap: clamp(0.75rem, 2vw, 1rem);
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .lp-gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (min-width: 960px) {
    .lp-gallery-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  .lp-gallery-item {
    margin: 0;
    border-radius: var(--lp-radius);
    overflow: hidden;
    border: 1px solid var(--lp-border);
    background: var(--lp-surface-alt);
  }
  .lp-gallery-item img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
  .lp-gallery-item figcaption {
    padding: 0.5rem 0.65rem;
    font-size: 0.8rem;
    color: var(--lp-muted);
  }
  .lp-map-frame {
    border: 0;
    width: 100%;
    min-height: 320px;
    border-radius: var(--lp-radius-lg);
    display: block;
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
  gallery: string;
  map: string;
};

function isBeautySalonRepairLanding(data: LandingData): boolean {
  if (data.templateId !== "repair") return false;
  const blob = `${data.title}\n${data.subtitle}\n${data.services.join(" ")}`.toLowerCase();
  return /парикмахер|салон|красот|барбер|укладк|стрижк|волос|hair|salon|beauty|barber|hairdress|manicure|педикюр/i.test(
    blob,
  );
}

function headings(locale: SiteLocale, templateId: TemplateId, data: LandingData): Headings {
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
      gallery: "Клиника и атмосфера",
      map: "Как нас найти",
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
      gallery: "Авто и мототехника",
      map: "Сервис на карте",
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
      gallery: "Наши работы",
      map: "Зона выезда",
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
      gallery: "Объекты и локации",
      map: "Офис на карте",
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
      gallery: "Товары в деталях",
      map: "Пункты выдачи",
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
      gallery: "Clinic & atmosphere",
      map: "Find us",
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
      gallery: "Cars & bikes",
      map: "Visit us",
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
      gallery: "Recent work",
      map: "Service area",
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
      gallery: "Listings & places",
      map: "Office location",
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
      gallery: "Product gallery",
      map: "Pickup points",
    },
  };
  const base = locale === "ru" ? ru[templateId] : en[templateId];
  if (templateId === "repair" && isBeautySalonRepairLanding(data)) {
    if (locale === "ru") {
      return {
        ...base,
        services: "Услуги",
        map: "Как нас найти",
        footer: "Красота и стиль — с заботой о вас",
        ctaTitle: "Запись в салон",
        ctaSub: "Согласуем удобное время и ответим на вопросы по услугам.",
        process: "Как проходит визит",
      };
    }
    return {
      ...base,
      services: "Services",
      map: "Find us",
      footer: "Care, craft, and confidence",
      ctaTitle: "Book an appointment",
      ctaSub: "We will confirm your time and walk you through our services.",
      process: "Your visit",
    };
  }
  return base;
}

type SocialNetwork = "telegram" | "vk" | "instagram" | "youtube";

function inferSocialNetwork(href: string, label: string): SocialNetwork | undefined {
  const h = href.toLowerCase();
  const l = label.toLowerCase();
  if (
    h.includes("t.me/") ||
    h.includes("//t.me") ||
    h.includes("telegram.me") ||
    /\btelegram\b/.test(l) ||
    /телеграм/.test(l)
  ) {
    return "telegram";
  }
  if (h.includes("vk.com") || h.includes("vk.ru") || /\bvk\b/.test(l) || /вконтакте/.test(l)) {
    return "vk";
  }
  if (h.includes("instagram.com") || h.includes("instagr.am") || /\binstagram\b/.test(l)) {
    return "instagram";
  }
  if (
    h.includes("youtube.com") ||
    h.includes("youtu.be") ||
    /\byoutube\b/.test(l) ||
    /\byt\b/.test(l)
  ) {
    return "youtube";
  }
  return undefined;
}

const SOCIAL_SVG: Record<SocialNetwork, string> = {
  telegram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>`,
  vk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.536l-1.854.024s-.394.09-.68-.25c-.25-.28-.96-1.12-1.64-1.92-.96-1.12-1.32-1.32-1.84-1.32-.48 0-.62.01-.9.56-.28.56-.96 1.92-1.12 2.32-.16.4-.48.44-.88.16-.4-.32-1.68-.62-3.2-2-.12-1.32-.84-1.92-.88-2.08-.04-.16-.04-.32.16-.32h1.84s.24.04.4.24c.16.16.24.48.24.48s.4 1.28.92 2.44c.56 1.36.84 1.64 1.04 1.64.2 0 .4-.24.56-1.12.16-.88.6-3 .84-3.92.22-.84.44-1.04.84-1.04.24 0 .48.04.76.32.28.24 1.52 1.48 2.12 2.64.64 1.08.76 1.52 1.16 1.52.4 0 .56-.32.56-.32l-.04-2.88s.08-.4.4-.48c.32-.08.64.08.64.08s2.08 1.16 3.24 2.52c.96 1.2 1.2 1.84 1.2 1.84z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
};

function catalogCardSub(locale: SiteLocale): string {
  return locale === "ru" ? "Подробности по запросу" : "Details on request";
}

const GALLERY_DISPLAY_W = 520;
const GALLERY_DISPLAY_H = 390;

function optimizeGalleryImgSrc(src: string): string {
  const s = src.trim();
  if (!/^https:\/\/images\.unsplash\.com\//i.test(s)) return s;
  try {
    const u = new URL(s);
    u.searchParams.set("w", String(GALLERY_DISPLAY_W));
    u.searchParams.set("h", String(GALLERY_DISPLAY_H));
    u.searchParams.set("q", "70");
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
    if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return s;
  }
}

function galleryImageOriginForPreconnect(src: string): string | undefined {
  try {
    const u = new URL(src.trim());
    if (u.protocol !== "https:") return undefined;
    const h = u.hostname.toLowerCase();
    if (h === "images.unsplash.com" || h === "upload.wikimedia.org") {
      return `https://${h}`;
    }
  } catch {
  }
  return undefined;
}

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

function renderGallery(data: LandingData, H: Headings): string {
  const items = data.galleryItems?.length ? data.galleryItems.slice(0, 8) : [];
  if (!items.length) return "";
  const sizes =
    "(max-width: 639px) calc(100vw - 2rem), (max-width: 959px) calc(50vw - 1.25rem), min(520px, calc(25vw - 1rem))";
  const figures = items
    .map((g, i) => {
      const src = optimizeGalleryImgSrc(g.src);
      const isFirst = i === 0;
      const loading = isFirst ? "eager" : "lazy";
      const fetchPri = isFirst ? ' fetchpriority="high"' : "";
      return `<figure class="lp-gallery-item"><img src="${escapeHtml(src)}" alt="${escapeHtml(g.alt)}" width="${GALLERY_DISPLAY_W}" height="${GALLERY_DISPLAY_H}" sizes="${escapeHtml(sizes)}" loading="${loading}" decoding="async" referrerpolicy="no-referrer"${fetchPri} /><figcaption>${escapeHtml(g.alt)}</figcaption></figure>`;
    })
    .join("\n");
  return `<section class="lp-section lp-prose" aria-labelledby="lp-gallery">
    <h2 class="lp-h2" id="lp-gallery">${escapeHtml(H.gallery)}</h2>
    <div class="lp-gallery-grid">${figures}</div>
  </section>`;
}

function renderMap(data: LandingData, H: Headings): string {
  const src = data.mapEmbedSrc?.trim();
  if (!src) return "";
  return `<section class="lp-section lp-prose" aria-labelledby="lp-map">
    <h2 class="lp-h2" id="lp-map">${escapeHtml(H.map)}</h2>
    <iframe class="lp-map-frame" title="${escapeHtml(H.map)}" src="${escapeHtml(src)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen=""></iframe>
  </section>`;
}

function renderPricing(data: LandingData, H: Headings): string {
  const rows = data.pricing?.length ? data.pricing : [];
  if (!rows.length) return "";
  const cards = rows
    .slice(0, 12)
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
  const raw = (data.socialLinks ?? []).filter((l) => l.href.startsWith("https://")).slice(0, 6);
  const links = raw
    .map((l) => {
      const net = inferSocialNetwork(l.href, l.label);
      const aria = escapeHtml(l.label.trim() || net || "Social");
      if (net) {
        return `<a class="lp-footer-icon" href="${escapeHtml(l.href)}" rel="noopener noreferrer" target="_blank" aria-label="${aria}">${SOCIAL_SVG[net]}</a>`;
      }
      return `<a class="lp-footer-link" href="${escapeHtml(l.href)}" rel="noopener noreferrer" target="_blank">${escapeHtml(l.label)}</a>`;
    })
    .join("");
  const social = links ? `<div class="lp-footer-social">${links}</div>` : "";
  return `<footer class="lp-footer lp-prose" id="contact">
    <p class="lp-footer-tagline">${escapeHtml(H.footer)}</p>
    ${social}
  </footer>`;
}

function renderSection(kind: SectionKind, data: LandingData, H: Headings): string {
  switch (kind) {
    case "hero":
      return renderHero(data, H);
    case "benefits":
      return renderBenefits(data, H);
    case "services":
      return renderServices(data, H);
    case "gallery":
      return renderGallery(data, H);
    case "pricing":
      return renderPricing(data, H);
    case "reviews":
      return renderReviews(data, H);
    case "process":
      return renderProcess(data, H);
    case "faq":
      return renderFaq(data, H);
    case "map":
      return renderMap(data, H);
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
  const H = headings(data.locale, data.templateId, data);
  const parts: string[] = [];
  for (const kind of order) {
    const html = renderSection(kind, data, H);
    if (html) parts.push(html);
  }
  const bodyInner = `<div class="lp-wrap lp-sections">${parts.join("\n")}</div>`;
  const skinClass = `lp lp-skin-${skin}`;
  const title = escapeHtml(data.title);
  const firstGallerySrc = data.galleryItems?.[0]?.src;
  const firstGalleryOptimized = firstGallerySrc ? optimizeGalleryImgSrc(firstGallerySrc) : "";
  const galleryOrigin = firstGalleryOptimized ? galleryImageOriginForPreconnect(firstGalleryOptimized) : undefined;
  const galleryPreconnect = galleryOrigin
    ? `  <link rel="preconnect" href="${escapeHtml(galleryOrigin)}" crossorigin />\n`
    : "";
  const galleryPreload = firstGalleryOptimized
    ? `  <link rel="preload" as="image" href="${escapeHtml(firstGalleryOptimized)}" />\n`
    : "";
  const fontPreconnect = data.theme?.fontLinkHref
    ? `  <link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n`
    : "";
  const fontLink = data.theme?.fontLinkHref
    ? `  <link rel="stylesheet" href="${escapeHtml(data.theme.fontLinkHref)}" />\n`
    : "";
  const themeCss = buildThemeOverrideCss(skin, data.theme).trim();

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
${fontPreconnect}${fontLink}${galleryPreconnect}${galleryPreload}  <style>
${buildSkinStylesheet()}
${BASE_STYLE}
${themeCss ? `${themeCss}\n` : ""}  </style>
</head>
<body class="${skinClass}">
${bodyInner}
</body>
</html>`;
}
