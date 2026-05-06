import { toLocalImageUrl } from "./services/landingHtmlPostprocessImageUrl.js";
import type { TemplateId } from "./templateId.js";

const GALLERY_IMG_SIZE = { width: 520, height: 390 };

type AltPair = { altRu: string; altEn: string };

type SeedBundle = { seeds: string[]; labels: AltPair[] };

const BUNDLES: Record<TemplateId, SeedBundle> = {
  dental: {
    seeds: [
      "modern dental clinic interior bright",
      "dentist treating patient dental chair",
      "professional dental instruments clinic",
      "healthy smile dental care aesthetic",
    ],
    labels: [
      { altRu: "Стоматология", altEn: "Dental care" },
      { altRu: "Улыбка", altEn: "Smile" },
      { altRu: "Клиника", altEn: "Clinic" },
      { altRu: "Приём", altEn: "Visit" },
    ],
  },
  auto: {
    seeds: [
      "auto repair workshop garage interior",
      "car mechanic vehicle service bay",
      "car diagnostic service professional",
      "wheel alignment service station",
      "engine repair close up professional mechanic",
      "car wash detailing service clean vehicle",
    ],
    labels: [
      { altRu: "Работа в автосервисе", altEn: "Auto workshop" },
      { altRu: "Ремонт автомобиля", altEn: "Car repair" },
      { altRu: "Диагностика", altEn: "Diagnostics" },
      { altRu: "Развал-схождение", altEn: "Wheel alignment" },
      { altRu: "Ремонт двигателя", altEn: "Engine service" },
      { altRu: "Детейлинг и мойка", altEn: "Car detailing" },
    ],
  },
  repair: {
    seeds: [
      "handyman tools home repair professional",
      "plumber fixing pipes residential",
      "electrician wiring repair work",
      "appliance repair washing machine technician",
    ],
    labels: [
      { altRu: "Ремонт", altEn: "Repair" },
      { altRu: "Инструменты", altEn: "Tools" },
      { altRu: "Электрика", altEn: "Electric" },
      { altRu: "Сантехника", altEn: "Plumbing" },
    ],
  },
  realestate: {
    seeds: [
      "house keys new home real estate",
      "modern residential home exterior",
      "bright living room interior apartment",
      "luxury property real estate facade",
    ],
    labels: [
      { altRu: "Ключи от жилья", altEn: "Keys" },
      { altRu: "Дом", altEn: "Home" },
      { altRu: "Интерьер", altEn: "Interior" },
      { altRu: "Недвижимость", altEn: "Property" },
    ],
  },
  ecommerce: {
    seeds: [
      "online shopping retail bags",
      "package delivery courier box",
      "customer online order laptop",
      "fashion retail store display",
    ],
    labels: [
      { altRu: "Покупки", altEn: "Shopping" },
      { altRu: "Доставка", altEn: "Delivery" },
      { altRu: "Заказ онлайн", altEn: "Online order" },
      { altRu: "Витрина", altEn: "Storefront" },
    ],
  },
};

const BEAUTY_BUNDLE: SeedBundle = {
  seeds: [
    "hair salon interior modern bright",
    "hair stylist cutting hair professional",
    "hair coloring salon beauty",
    "manicure nail salon beauty care",
  ],
  labels: [
    { altRu: "Интерьер салона", altEn: "Salon interior" },
    { altRu: "Уход за волосами", altEn: "Hair care" },
    { altRu: "Стрижка и укладка", altEn: "Cut and style" },
    { altRu: "Колористика", altEn: "Color work" },
  ],
};

function compactContext(userPrompt: string): string {
  const normalized = userPrompt.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return "";
  
  const cleaned = normalized
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(
      /\b(html|css|js|javascript|лендинг|сайт|страниц[аы]|секци[яи]|адаптив|шрифт|цвет|блок|кнопк[аи]|ui|ux)\b/giu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length > 10) return "";
  return words.slice(0, 6).join(" ");
}

function mergeSeed(seed: string, subject: string, ctx: string): string {
  const c = ctx.trim();
  const base = `${seed}. subject: ${subject}`;
  if (!c) return base;
  return `${base}. context: ${c}`;
}

export type GalleryPoolLocale = "ru" | "en";

export function buildTemplateGalleryPool(
  templateId: TemplateId,
  locale: GalleryPoolLocale,
  userPrompt: string,
  useBeauty: boolean,
): { src: string; altRu: string; altEn: string }[] {
  const bundle = useBeauty ? BEAUTY_BUNDLE : BUNDLES[templateId];
  const ctx = compactContext(userPrompt);
  const n = Math.min(bundle.seeds.length, bundle.labels.length);
  const out: { src: string; altRu: string; altEn: string }[] = [];
  for (let i = 0; i < n; i++) {
    const label = bundle.labels[i]!;
    const prompt = mergeSeed(bundle.seeds[i]!, label.altEn, ctx);
    out.push({
      src: toLocalImageUrl(prompt, GALLERY_IMG_SIZE, "gen_first", i),
      altRu: label.altRu,
      altEn: label.altEn,
    });
  }
  return out;
}

