import { describe, expect, it } from "vitest";
import { inferTemplateFromPrompt } from "./ai.js";

describe("inferTemplateFromPrompt", () => {
  it("определяет dental по ключевым словам", () => {
    expect(inferTemplateFromPrompt("Стоматология в центре")).toBe("dental");
    expect(inferTemplateFromPrompt("dental clinic")).toBe("dental");
  });

  it("определяет realestate", () => {
    expect(inferTemplateFromPrompt("Риелтор, продажа квартир")).toBe("realestate");
    expect(inferTemplateFromPrompt("real estate listings")).toBe("realestate");
  });

  it("определяет ecommerce", () => {
    expect(inferTemplateFromPrompt("Интернет-магазин с доставкой")).toBe("ecommerce");
    expect(inferTemplateFromPrompt("online store")).toBe("ecommerce");
  });

  it("определяет auto", () => {
    expect(inferTemplateFromPrompt("Автосервис, ремонт АКПП")).toBe("auto");
    expect(inferTemplateFromPrompt("auto shop oil change")).toBe("auto");
  });

  it("определяет repair", () => {
    expect(inferTemplateFromPrompt("Мастер на час, сантехник")).toBe("repair");
    expect(inferTemplateFromPrompt("handyman repair")).toBe("repair");
  });

  it("возвращает repair по умолчанию", () => {
    expect(inferTemplateFromPrompt("абракадабра")).toBe("repair");
    expect(inferTemplateFromPrompt("")).toBe("repair");
  });
});
