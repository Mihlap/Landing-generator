import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterGalleryItemsForTemplate,
  inferMinPricingCardsFromPrompt,
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

describe("filterGalleryItemsForTemplate", () => {
  it("для стоматологии отбрасывает сток авто (частая ошибка модели)", () => {
    const autoSrc =
      "https://images.unsplash.com/photo-1486262715619-567beee29d4f?auto=format&fit=crop&w=720&q=75";
    const out = filterGalleryItemsForTemplate(
      [{ src: autoSrc, alt: "кабинет" }],
      "dental",
    );
    expect(out).toBeUndefined();
  });

  it("оставляет релевантные unsplash dental из пула", () => {
    const src =
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=720&q=75";
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
