import { describe, expect, it } from "vitest";
import { isLandingData, isSiteLocale, isTemplateId } from "./validation.js";

describe("isSiteLocale", () => {
  it("принимает ru и en", () => {
    expect(isSiteLocale("ru")).toBe(true);
    expect(isSiteLocale("en")).toBe(true);
  });

  it("отклоняет прочие значения", () => {
    expect(isSiteLocale("de")).toBe(false);
    expect(isSiteLocale("")).toBe(false);
    expect(isSiteLocale(null)).toBe(false);
    expect(isSiteLocale(undefined)).toBe(false);
    expect(isSiteLocale(1)).toBe(false);
  });
});

describe("isTemplateId", () => {
  it("принимает известные шаблоны", () => {
    for (const id of ["dental", "auto", "repair", "realestate", "ecommerce"] as const) {
      expect(isTemplateId(id)).toBe(true);
    }
  });

  it("отклоняет неизвестные", () => {
    expect(isTemplateId("unknown")).toBe(false);
    expect(isTemplateId("")).toBe(false);
  });
});

describe("isLandingData", () => {
  const base = {
    title: "t",
    subtitle: "s",
    cta: "c",
    locale: "ru",
    templateId: "dental",
    services: ["a", "b", "c"],
    reviews: [{ quote: "q", author: "a" }],
  };

  it("принимает полный валидный объект", () => {
    expect(isLandingData(base)).toBe(true);
  });

  it("принимает опциональное generationNotice как строку", () => {
    expect(isLandingData({ ...base, generationNotice: "note" })).toBe(true);
  });

  it("отклоняет неверный generationNotice", () => {
    expect(isLandingData({ ...base, generationNotice: 1 })).toBe(false);
  });

  it("отклоняет не-объект и null", () => {
    expect(isLandingData(null)).toBe(false);
    expect(isLandingData(undefined)).toBe(false);
    expect(isLandingData("x")).toBe(false);
    expect(isLandingData([])).toBe(false);
  });

  it("отклоняет неверный locale", () => {
    expect(isLandingData({ ...base, locale: "de" })).toBe(false);
  });

  it("отклоняет неверный templateId", () => {
    expect(isLandingData({ ...base, templateId: "x" })).toBe(false);
  });

  it("отклоняет нестроковые поля заголовка", () => {
    expect(isLandingData({ ...base, title: 1 })).toBe(false);
    expect(isLandingData({ ...base, subtitle: null })).toBe(false);
    expect(isLandingData({ ...base, cta: {} })).toBe(false);
  });

  it("отклоняет services не-массив или с не-строками", () => {
    expect(isLandingData({ ...base, services: "a" })).toBe(false);
    expect(isLandingData({ ...base, services: [1, 2] })).toBe(false);
  });

  it("принимает generatedHtml как строку", () => {
    expect(
      isLandingData({
        ...base,
        generatedHtml: "<!DOCTYPE html><html><head><title>x</title></head><body></body></html>",
      }),
    ).toBe(true);
  });

  it("отклоняет неверный generatedHtml", () => {
    expect(isLandingData({ ...base, generatedHtml: 1 })).toBe(false);
  });

  it("отклоняет пустой или битый reviews", () => {
    expect(isLandingData({ ...base, reviews: "x" })).toBe(false);
    expect(isLandingData({ ...base, reviews: [{}] })).toBe(false);
    expect(isLandingData({ ...base, reviews: [{ quote: 1, author: "a" }] })).toBe(false);
  });

  it("принимает theme с разрешёнными CSS-переменными", () => {
    expect(
      isLandingData({
        ...base,
        theme: {
          variables: { "--lp-accent": "#0369a1" },
          fontFamily: "'Manrope', sans-serif",
          fontLinkHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@400&display=swap",
        },
      }),
    ).toBe(true);
  });

  it("отклоняет theme с неизвестным ключом variables", () => {
    expect(
      isLandingData({
        ...base,
        theme: { variables: { "--lp-evil": "red" } },
      }),
    ).toBe(false);
  });
});
