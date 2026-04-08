import { describe, expect, it } from "vitest";
import { inferMapEmbedProviderFromPrompt } from "./aiPrompts.js";

describe("inferMapEmbedProviderFromPrompt", () => {
  it("при преобладании кириллицы возвращает yandex", () => {
    expect(inferMapEmbedProviderFromPrompt("Стоматология в Москве", "en")).toBe("yandex");
  });

  it("при преобладании латиницы возвращает google", () => {
    expect(inferMapEmbedProviderFromPrompt("Dental clinic in Berlin", "ru")).toBe("google");
  });

  it("при равном числе букв использует локаль: ru → yandex", () => {
    expect(inferMapEmbedProviderFromPrompt("abаб", "ru")).toBe("yandex");
  });

  it("при равном числе букв использует локаль: en → google", () => {
    expect(inferMapEmbedProviderFromPrompt("abаб", "en")).toBe("google");
  });

  it("без букв — по локали", () => {
    expect(inferMapEmbedProviderFromPrompt("123 456", "ru")).toBe("yandex");
    expect(inferMapEmbedProviderFromPrompt("123 456", "en")).toBe("google");
  });
});
