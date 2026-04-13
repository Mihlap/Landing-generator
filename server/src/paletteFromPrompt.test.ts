import { describe, expect, it } from "vitest";
import {
  extractHexColorsFromPrompt,
  inferThemeVariablesFromPrompt,
  mergeThemeWithPromptColors,
} from "./paletteFromPrompt.js";

describe("extractHexColorsFromPrompt", () => {
  it("нормализует 3- и 6-значный hex", () => {
    expect(extractHexColorsFromPrompt("цвета #abc и #1a2b3c")).toEqual(["#aabbcc", "#1a2b3c"]);
  });

  it("не дублирует один и тот же цвет", () => {
    expect(extractHexColorsFromPrompt("#f00 #ff0000")).toEqual(["#ff0000"]);
  });
});

describe("inferThemeVariablesFromPrompt", () => {
  it("из одного hex строит акцент и фон", () => {
    const v = inferThemeVariablesFromPrompt("магазин, акцент #6366f1");
    expect(v["--lp-accent"]).toBe("#6366f1");
    expect(v["--lp-hero-bg"]).toContain("linear-gradient");
    expect(v["--lp-page-bg"]).toContain("linear-gradient");
  });

  it("два hex — второй как фон страницы", () => {
    const v = inferThemeVariablesFromPrompt("фон #0f172a кнопки #38bdf8");
    expect(v["--lp-accent"]).toBe("#38bdf8");
    expect(v["--lp-page-bg"]).toBe("#0f172a");
  });

  it("без подписей: первый hex — акцент, второй — фон", () => {
    const v = inferThemeVariablesFromPrompt("палитра #e11d48 и #fff1f2 для витрины");
    expect(v["--lp-accent"]).toBe("#e11d48");
    expect(v["--lp-page-bg"]).toBe("#fff1f2");
  });

  it("подхватывает название цвета без hex", () => {
    const v = inferThemeVariablesFromPrompt("интернет-магазин в бордовых тонах");
    expect(v["--lp-accent"]).toBe("#722f37");
  });
});

describe("mergeThemeWithPromptColors", () => {
  it("палитра из промпта перекрывает неверные переменные модели", () => {
    const t = mergeThemeWithPromptColors(
      {
        variables: {
          "--lp-accent": "#16a34a",
          "--lp-page-bg": "#ffffff",
        },
      },
      "нужен фирменный #7c3aed и фон #faf5ff",
    );
    expect(t?.variables?.["--lp-accent"]).toBe("#7c3aed");
    expect(t?.variables?.["--lp-page-bg"]).toBe("#faf5ff");
  });
});
