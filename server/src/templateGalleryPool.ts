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
      "motorcycle workshop maintenance",
      "car diagnostic service professional",
    ],
    labels: [
      { altRu: "Работа в автосервисе", altEn: "Auto workshop" },
      { altRu: "Автомобиль", altEn: "Car" },
      { altRu: "Мототехника", altEn: "Motorcycle" },
      { altRu: "Сервис и обслуживание", altEn: "Service bay" },
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
  const t = userPrompt.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function mergeSeed(seed: string, ctx: string): string {
  const c = ctx.trim();
  if (!c) return seed;
  return `${seed}. ${c}`;
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
    const prompt = mergeSeed(bundle.seeds[i]!, ctx);
    out.push({
      src: toLocalImageUrl(prompt, GALLERY_IMG_SIZE, "stock_first", i),
      altRu: bundle.labels[i]!.altRu,
      altEn: bundle.labels[i]!.altEn,
    });
  }
  return out;
}

export const REFERENCE_UNSPLASH_PHOTO_IDS_BY_TEMPLATE: Record<TemplateId, readonly string[]> = {
  auto: ["1486262715619-567beee29d4f", "1503376780353-7e6692767b70", "1558618666-fcd25c85cd64", "1492144534655-ae79c964c9d7"],
  dental: ["1606811841689-23dfddce3e95", "1629909613654-28e377c37b09", "1588776814546-1ffcf47267a5", "1609840114035-3c981b782dfe"],
  repair: ["1581578731548-c64695cc6952", "1504148455328-c376907d581c", "1621905252507-b35492cc74b4", "1581244277943-fe4a9c777189"],
  realestate: ["1560518883-ce09059eeffa", "1512917774080-9991f1c4c750", "1600596542815-ffad4c1539a9", "1600585154340-be6161a56a0c"],
  ecommerce: ["1472851294608-062f824d29cc", "1607082349566-187342175e2f", "1556742049-0cfed4f6a45d", "1441986300917-64674bd600d8"],
};
