import type { LandingData } from "./services/ai.js";

export const validLandingData: LandingData = {
  title: "Тест",
  subtitle: "Подзаголовок",
  services: ["Услуга 1", "Услуга 2", "Услуга 3"],
  reviews: [
    { quote: "Приняли без очереди, всё объяснили до лечения.", author: "Елена В." },
    { quote: "Чистка без боли, врач спокойный — для меня это важно.", author: "Олег К." },
    { quote: "Поставили пломбу за один визит, ценник прозрачный.", author: "Анна С." },
    { quote: "Детям разрешили посмотреть экран — перестали бояться кресла.", author: "Тимур М." },
  ],
  cta: "Записаться",
  locale: "ru",
  templateId: "dental",
};
