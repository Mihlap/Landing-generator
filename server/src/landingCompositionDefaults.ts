import type { SectionKind, SiteLocale, SkinId } from "./services/ai.js";
import type { TemplateId } from "./templateId.js";

const DEFAULT_SECTION_ORDER: SectionKind[] = [
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

function skinByVertical(templateId: TemplateId): SkinId {
  const map: Record<TemplateId, SkinId> = {
    dental: 1,
    auto: 2,
    repair: 3,
    realestate: 4,
    ecommerce: 5,
  };
  return map[templateId];
}

export type CompositionDefaults = {
  skinId: SkinId;
  sections: SectionKind[];
  benefits: { title: string; text: string }[];
  pricing: { name: string; price: string; bullets: string[] }[];
  processSteps: { title: string; text: string }[];
  faq: { q: string; a: string }[];
};

const ru: Record<TemplateId, CompositionDefaults> = {
  dental: {
    skinId: skinByVertical("dental"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Опытные врачи", text: "Аккуратное лечение и понятный план без лишних процедур." },
      { title: "Современное оборудование", text: "Диагностика и лечение на актуальном парке аппаратов." },
      { title: "Удобная запись", text: "Онлайн и по телефону, напоминания о визите." },
    ],
    pricing: [
      {
        name: "Осмотр",
        price: "от 1 500 ₽",
        bullets: ["Консультация", "План лечения"],
      },
      {
        name: "Лечение",
        price: "по смете",
        bullets: ["Прозрачная цена до начала", "Гарантия на работы"],
      },
      {
        name: "Имплантация",
        price: "индивидуально",
        bullets: ["КТ при необходимости", "Рассрочка"],
      },
    ],
    processSteps: [
      { title: "Запись", text: "Выбираете время и формат визита." },
      { title: "Диагностика", text: "Осмотр, снимки при необходимости, план." },
      { title: "Лечение", text: "Работы по согласованной смете и графику." },
    ],
    faq: [
      { q: "Работаете ли по страховке?", a: "Уточняйте по телефону — зависит от программы и клиники." },
      { q: "Есть ли рассрочка?", a: "Да, на ряд услуг — подберём вариант на консультации." },
    ],
  },
  auto: {
    skinId: skinByVertical("auto"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Честная смета", text: "Согласуем работы и запчасти до начала ремонта." },
      { title: "Гарантия", text: "На выполненные работы — по договору." },
      { title: "Диагностика", text: "Современное оборудование и опытные мастера." },
    ],
    pricing: [
      { name: "Диагностика", price: "от 1 000 ₽", bullets: ["Компьютерная диагностика", "Заключение"] },
      { name: "ТО", price: "от 3 500 ₽", bullets: ["Масло и фильтры", "Проверка узлов"] },
      { name: "Ремонт", price: "по смете", bullets: ["Запчасти по запросу", "Сроки заранее"] },
    ],
    processSteps: [
      { title: "Заявка", text: "Опишите симптомы или приезжайте на диагностику." },
      { title: "Смета", text: "Согласовываем перечень работ и запчастей." },
      { title: "Ремонт", text: "Выполняем работы и выдаём гарантию." },
    ],
    faq: [
      { q: "Сколько ждать запчасти?", a: "Обычно 1–3 дня; срок сообщим при согласовании." },
      { q: "Есть ли замена авто?", a: "По возможности — уточняйте при записи." },
    ],
  },
  repair: {
    skinId: skinByVertical("repair"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Выезд в удобное время", text: "Согласуем окно приезда мастера." },
      { title: "Прозрачная цена", text: "Оценка до начала работ, без скрытых доплат." },
      { title: "Гарантия", text: "На работы и установленные запчасти." },
    ],
    pricing: [
      { name: "Выезд", price: "от 500 ₽", bullets: ["Диагностика на месте", "Смета"] },
      { name: "Стандартный ремонт", price: "по прайсу", bullets: ["Типовые работы", "Запчасти отдельно"] },
      { name: "Сложный случай", price: "индивидуально", bullets: ["Оценка на месте", "Договор"] },
    ],
    processSteps: [
      { title: "Заявка", text: "Опишите проблему и адрес." },
      { title: "Выезд", text: "Мастер диагностирует и согласует смету." },
      { title: "Ремонт", text: "Выполняем работы и проверяем результат." },
    ],
    faq: [
      { q: "Как оплачивать?", a: "Наличные, карта или перевод — как договоримся." },
      { q: "Даете ли чек?", a: "Да, при необходимости оформим документы." },
    ],
  },
  realestate: {
    skinId: skinByVertical("realestate"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Проверка объектов", text: "Юридическая чистота и риски до сделки." },
      { title: "Сопровождение", text: "От подбора до передачи ключей." },
      { title: "Ипотека и новостройки", text: "Помогаем с банками и застройщиками." },
    ],
    pricing: [
      { name: "Консультация", price: "бесплатно", bullets: ["Первичный разбор запроса", "Стратегия поиска"] },
      { name: "Подбор", price: "от 30 000 ₽", bullets: ["Подбор объектов", "Показы"] },
      { name: "Сделка", price: "индивидуально", bullets: ["Сопровождение", "Документы"] },
    ],
    processSteps: [
      { title: "Бриф", text: "Бюджет, район, условия ипотеки." },
      { title: "Подбор", text: "Показы и сравнение вариантов." },
      { title: "Сделка", text: "Документы, расчёты, передача." },
    ],
    faq: [
      { q: "Работаете только с новостройками?", a: "Нет — и вторичка, и новостройки." },
      { q: "Когда платить?", a: "Условия обсуждаются индивидуально и фиксируются в договоре." },
    ],
  },
  ecommerce: {
    skinId: skinByVertical("ecommerce"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Быстрая доставка", text: "Отправляем в согласованные сроки." },
      { title: "Возврат", text: "Понятные условия и поддержка." },
      { title: "Поддержка", text: "Ответим на вопросы по заказу." },
    ],
    pricing: [
      { name: "Стандарт", price: "от 0 ₽ доставка", bullets: ["При заказе от суммы", "ПВЗ и курьер"] },
      { name: "Экспресс", price: "по тарифу", bullets: ["Быстрее сроки", "Курьер"] },
      { name: "Самовывоз", price: "бесплатно", bullets: ["Пункт выдачи", "Уведомление о готовности"] },
    ],
    processSteps: [
      { title: "Корзина", text: "Добавляете товары и оформляете заказ." },
      { title: "Оплата", text: "Удобный способ оплаты и подтверждение." },
      { title: "Получение", text: "Доставка или самовывоз — как выбрали." },
    ],
    faq: [
      { q: "Как отследить заказ?", a: "Отправим статус на email или в SMS." },
      { q: "Можно ли вернуть товар?", a: "Да, в рамках закона и условий магазина." },
    ],
  },
};

const en: Record<TemplateId, CompositionDefaults> = {
  dental: {
    skinId: skinByVertical("dental"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Experienced team", text: "Clear treatment plan without unnecessary procedures." },
      { title: "Modern equipment", text: "Diagnostics and care with up-to-date tools." },
      { title: "Easy booking", text: "Online or phone, with visit reminders." },
    ],
    pricing: [
      { name: "Exam", price: "from $49", bullets: ["Consultation", "Treatment plan"] },
      { name: "Treatment", price: "estimate", bullets: ["Transparent pricing", "Warranty on work"] },
      { name: "Implants", price: "custom", bullets: ["Imaging if needed", "Payment plans"] },
    ],
    processSteps: [
      { title: "Book", text: "Pick a time that works for you." },
      { title: "Diagnose", text: "Exam, imaging if needed, plan." },
      { title: "Treat", text: "Work aligned with the agreed plan." },
    ],
    faq: [
      { q: "Do you accept insurance?", a: "Depends on the plan—ask our front desk." },
      { q: "Payment plans?", a: "Available for many treatments—details at consult." },
    ],
  },
  auto: {
    skinId: skinByVertical("auto"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Clear estimates", text: "We align parts and labor before work starts." },
      { title: "Warranty", text: "Coverage on qualified repairs." },
      { title: "Diagnostics", text: "Experienced techs and modern tooling." },
    ],
    pricing: [
      { name: "Diagnostics", price: "from $89", bullets: ["Computer scan", "Written findings"] },
      { name: "Maintenance", price: "from $129", bullets: ["Fluids & filters", "Multi-point check"] },
      { name: "Repairs", price: "estimate", bullets: ["Parts on approval", "Timeline upfront"] },
    ],
    processSteps: [
      { title: "Intake", text: "Tell us symptoms or come in for diagnostics." },
      { title: "Estimate", text: "We align scope, parts, and price." },
      { title: "Repair", text: "We complete work and verify results." },
    ],
    faq: [
      { q: "How fast are parts?", a: "Often 1–3 days; we confirm when you approve work." },
      { q: "Loaner vehicles?", a: "Ask when booking—availability varies." },
    ],
  },
  repair: {
    skinId: skinByVertical("repair"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "On-site visits", text: "We schedule a window that fits you." },
      { title: "Upfront pricing", text: "Estimate before work begins." },
      { title: "Warranty", text: "On labor and installed parts." },
    ],
    pricing: [
      { name: "Trip", price: "from $39", bullets: ["On-site triage", "Quote"] },
      { name: "Standard job", price: "menu pricing", bullets: ["Common fixes", "Parts extra"] },
      { name: "Complex job", price: "custom", bullets: ["On-site assessment", "Agreement"] },
    ],
    processSteps: [
      { title: "Request", text: "Describe the issue and location." },
      { title: "Visit", text: "Technician diagnoses and quotes." },
      { title: "Fix", text: "We complete work and verify." },
    ],
    faq: [
      { q: "Payment methods?", a: "Card, cash, or transfer—whatever we agree on." },
      { q: "Receipts?", a: "Yes—ask if you need documentation." },
    ],
  },
  realestate: {
    skinId: skinByVertical("realestate"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Due diligence", text: "We highlight risks before you commit." },
      { title: "End-to-end", text: "From search to keys." },
      { title: "Mortgages & new builds", text: "We coordinate with banks and developers." },
    ],
    pricing: [
      { name: "Consultation", price: "complimentary", bullets: ["Initial brief", "Search strategy"] },
      { name: "Search", price: "from $1,500", bullets: ["Curated listings", "Showings"] },
      { name: "Closing", price: "custom", bullets: ["Transaction support", "Paperwork"] },
    ],
    processSteps: [
      { title: "Brief", text: "Budget, area, financing needs." },
      { title: "Search", text: "Showings and shortlisting." },
      { title: "Close", text: "Docs, funds, and handover." },
    ],
    faq: [
      { q: "Only new homes?", a: "No—we work resale and new construction." },
      { q: "When do I pay?", a: "Terms are agreed individually and documented." },
    ],
  },
  ecommerce: {
    skinId: skinByVertical("ecommerce"),
    sections: [...DEFAULT_SECTION_ORDER],
    benefits: [
      { title: "Fast shipping", text: "We ship on agreed timelines." },
      { title: "Returns", text: "Clear policies and support." },
      { title: "Support", text: "Help with your order when you need it." },
    ],
    pricing: [
      { name: "Standard", price: "free shipping*", bullets: ["On qualifying orders", "Pickup points"] },
      { name: "Express", price: "carrier rates", bullets: ["Faster delivery", "Courier"] },
      { name: "Pickup", price: "free", bullets: ["Pickup location", "Ready notifications"] },
    ],
    processSteps: [
      { title: "Cart", text: "Add items and checkout." },
      { title: "Pay", text: "Choose payment and confirm." },
      { title: "Receive", text: "Delivery or pickup—your choice." },
    ],
    faq: [
      { q: "Track my order?", a: "We send status updates by email/SMS." },
      { q: "Returns?", a: "Yes—per policy and local regulations." },
    ],
  },
};

export function getLandingCompositionDefaults(templateId: TemplateId, locale: SiteLocale): CompositionDefaults {
  return locale === "ru" ? ru[templateId] : en[templateId];
}
