import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postExportHtml, postGenerate, postPreviewHtml } from "./generate";
import type { LandingData } from "../types";

const sample: LandingData = {
  title: "T",
  subtitle: "S",
  services: ["a", "b", "c"],
  reviews: [{ quote: "q", author: "A" }],
  cta: "C",
  locale: "ru",
  templateId: "dental",
};

describe("postGenerate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("возвращает JSON при 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await expect(postGenerate("промпт", "ru")).resolves.toEqual(sample);
    expect(fetch).toHaveBeenCalledWith(
      "/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ prompt: "промпт", locale: "ru" }),
      }),
    );
  });

  it("передаёт layoutMode", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await postGenerate("x", "en", { layoutMode: "minimal" });
    expect(fetch).toHaveBeenCalledWith(
      "/generate",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "x",
          locale: "en",
          layoutMode: "minimal",
        }),
      }),
    );
  });

  it("передаёт generateMode", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    await postGenerate("x", "ru", { generateMode: "template" });
    expect(fetch).toHaveBeenCalledWith(
      "/generate",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "x",
          locale: "ru",
          generateMode: "template",
        }),
      }),
    );
  });

  it("бросает Error с текстом error из тела", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "prompt is required" }), { status: 400 }),
    );
    await expect(postGenerate("", "ru")).rejects.toThrow("prompt is required");
  });

  it("бросает общее сообщение если error не строка", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(postGenerate("x", "en")).rejects.toThrow("Ошибка генерации");
  });
});

describe("postPreviewHtml", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("возвращает текст HTML", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<!DOCTYPE html><html>", { status: 200 }));
    await expect(postPreviewHtml(sample)).resolves.toContain("<!DOCTYPE html>");
  });

  it("бросает при ошибке API", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid data payload" }), { status: 400 }),
    );
    await expect(postPreviewHtml({} as LandingData)).rejects.toThrow("invalid data payload");
  });
});

describe("postExportHtml", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("передаёт x-export-paid при paid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    await postExportHtml(sample, true);
    expect(fetch).toHaveBeenCalledWith(
      "/export",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-export-paid": "true" }),
      }),
    );
  });

  it("бросает при 402", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Payment required" }), { status: 402 }),
    );
    await expect(postExportHtml(sample, false)).rejects.toThrow("Payment required");
  });
});
