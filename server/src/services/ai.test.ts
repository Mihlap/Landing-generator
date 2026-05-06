import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enforcePromptContactsAndMapForHtml,
  filterGalleryItemsForTemplate,
  inferContactAddressFromPrompt,
  inferContactPhoneFromPrompt,
  inferMinPricingCardsFromPrompt,
  inferRequestedServiceCount,
  landingBuildMode,
  resolveLandingBuildMode,
  resolveSkinFromPrompt,
} from "./ai.js";

describe("landingBuildMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("по умолчанию для gigachat — html", () => {
    expect(landingBuildMode("gigachat")).toBe("html");
  });

  it("для openai/yandex — template", () => {
    expect(landingBuildMode("openai")).toBe("template");
    expect(landingBuildMode("yandex")).toBe("template");
  });

  it("LANDING_BUILD_MODE=template принудительно для gigachat", () => {
    vi.stubEnv("LANDING_BUILD_MODE", "template");
    expect(landingBuildMode("gigachat")).toBe("template");
  });

  it("LANDING_BUILD_MODE=html для openai", () => {
    vi.stubEnv("LANDING_BUILD_MODE", "html");
    expect(landingBuildMode("openai")).toBe("html");
  });
});

describe("resolveSkinFromPrompt", () => {
  it("не подменяет палитру по ключевым словам — цвета задаются через theme в JSON", () => {
    expect(resolveSkinFromPrompt("розовый лендинг салона", "repair", 3)).toBe(3);
    expect(resolveSkinFromPrompt("стоматология в голубых тонах", "dental", 8)).toBe(8);
  });

  it("тёмная тема по запросу переводит на тёмный skin", () => {
    expect(resolveSkinFromPrompt("тёмная тема, премиум", "dental", 8)).toBe(2);
  });
});

describe("inferMinPricingCardsFromPrompt", () => {
  it("вытаскивает минимальное число цен из формулировки", () => {
    expect(inferMinPricingCardsFromPrompt("ценами (не менее 5) и соцсети")).toBe(5);
    expect(inferMinPricingCardsFromPrompt("at least 4 prices")).toBe(4);
    expect(inferMinPricingCardsFromPrompt("минимум 6 тарифов")).toBe(6);
    expect(inferMinPricingCardsFromPrompt("без цифр")).toBe(0);
  });
});

describe("inferRequestedServiceCount", () => {
  it("понимает категории и виды товаров как управляемые карточки каталога", () => {
    expect(inferRequestedServiceCount("9 видов категорий игрушек и их изображения")).toBe(9);
    expect(inferRequestedServiceCount("12 категорий товаров с фото")).toBe(12);
    expect(inferRequestedServiceCount("8 услугами и изображениями к ним")).toBe(8);
  });
});

describe("inferContactAddressFromPrompt", () => {
  it("извлекает конкретный адрес из промпта", () => {
    expect(
      inferContactAddressFromPrompt(
        "интернет-магазин игрушек, карта и контакты: адрес: Москва, ул. Тверская, 7, телефон +7 999",
      ),
    ).toBe("Москва, ул. Тверская, 7");
    expect(
      inferContactAddressFromPrompt("контакты: с конкретным адресом Москва, ул. Лавочкина, д. 32 и телефоном"),
    ).toBe("Москва, ул. Лавочкина, д. 32");
    expect(inferContactAddressFromPrompt("контакты: Москва, ул. Лавочкина, д. 34, тел 8 999 555 66 77")).toBe(
      "Москва, ул. Лавочкина, д. 34",
    );
    expect(
      inferContactAddressFromPrompt(
        "Контакты: Киров, ул. Ленина, д. 7 и прикрепи карту с этим адресом",
      ),
    ).toBe("Киров, ул. Ленина, д. 7");
    expect(inferContactAddressFromPrompt("контакты: с конкретным адресом")).toBeUndefined();
  });
});

describe("inferContactPhoneFromPrompt", () => {
  it("извлекает телефон из промпта", () => {
    expect(inferContactPhoneFromPrompt("контакты: телефон +7 (999) 123-45-67")).toBe("+7 (999) 123-45-67");
    expect(inferContactPhoneFromPrompt("без телефона")).toBeUndefined();
  });
});

describe("enforcePromptContactsAndMapForHtml", () => {
  it("переписывает карту на адрес из промпта и добавляет footer-контакты", () => {
    const html = `<!doctype html><html><body><section><iframe src="https://yandex.ru/map-widget/v1/?ll=37.1,55.7&z=12"></iframe></section></body></html>`;
    const out = enforcePromptContactsAndMapForHtml(
      html,
      "Контакты: Киров, ул. Ленина, д. 7, тел 8 999 111 22 33 и карта",
      "ru",
    );
    expect(out).toContain("text=%D0%9A%D0%B8%D1%80%D0%BE%D0%B2");
    expect(out).toContain("<footer");
    expect(out).toContain("Адрес:");
    expect(out).toContain("Телефон:");
  });
});

describe("filterGalleryItemsForTemplate", () => {
  it("отбрасывает внешние stock-изображения модели", () => {
    const autoSrc =
      "https://images.unsplash.com/photo-1486262715619-567beee29d4f?auto=format&fit=crop&w=720&q=75";
    const out = filterGalleryItemsForTemplate(
      [{ src: autoSrc, alt: "кабинет" }],
      "dental",
    );
    expect(out).toBeUndefined();
  });

  it("оставляет локальные AI-изображения", () => {
    const src = "/image?prompt=dental%20clinic&w=520&h=390&prefer=gen";
    const out = filterGalleryItemsForTemplate([{ src, alt: "зубы" }], "dental");
    expect(out).toEqual([{ src, alt: "зубы" }]);
  });
});

describe("resolveLandingBuildMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("явный generateMode перекрывает дефолт провайдера", () => {
    expect(resolveLandingBuildMode("gigachat", "template")).toBe("template");
    expect(resolveLandingBuildMode("openai", "html")).toBe("html");
  });

  it("без explicit использует landingBuildMode", () => {
    expect(resolveLandingBuildMode("gigachat", undefined)).toBe("html");
    expect(resolveLandingBuildMode("openai", undefined)).toBe("template");
  });

  it("explicit перекрывает LANDING_BUILD_MODE", () => {
    vi.stubEnv("LANDING_BUILD_MODE", "html");
    expect(resolveLandingBuildMode("openai", "template")).toBe("template");
  });
});
