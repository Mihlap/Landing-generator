import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStockImageUrl, stockSearchConfigured } from "./stockImageSearch.js";

describe("stockImageSearch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stockSearchConfigured false при отключённых Commons и Openverse", () => {
    vi.stubEnv("IMAGE_COMMONS_STOCK", "false");
    vi.stubEnv("IMAGE_OPENVERSE_STOCK", "false");
    expect(stockSearchConfigured()).toBe(false);
  });

  it("stockSearchConfigured true если Commons включён по умолчанию", () => {
    delete process.env.IMAGE_COMMONS_STOCK;
    delete process.env.IMAGE_OPENVERSE_STOCK;
    expect(stockSearchConfigured()).toBe(true);
  });

  it("fetchStockImageUrl возвращает null при отключённых Commons/Openverse", async () => {
    vi.stubEnv("IMAGE_COMMONS_STOCK", "false");
    vi.stubEnv("IMAGE_OPENVERSE_STOCK", "false");
    const u = await fetchStockImageUrl("office workspace", { width: 1200, height: 800 });
    expect(u).toBeNull();
  });

  it("fetchStockImageUrl использует Wikimedia Commons при ответе API", async () => {
    delete process.env.IMAGE_COMMONS_STOCK;
    vi.stubEnv("IMAGE_OPENVERSE_STOCK", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: [
              {
                title: "File:Example.jpg",
                imageinfo: [
                  {
                    mime: "image/jpeg",
                    thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/x/x/Example.jpg/800px-Example.jpg",
                  },
                ],
              },
            ],
          },
        }),
      }),
    );
    const u = await fetchStockImageUrl("monument", { width: 1200, height: 800 });
    expect(u).toContain("upload.wikimedia.org");
  });

  it("fetchStockImageUrl с разным v берёт разные кандидаты Commons", async () => {
    delete process.env.IMAGE_COMMONS_STOCK;
    vi.stubEnv("IMAGE_OPENVERSE_STOCK", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: [
              {
                title: "File:A.jpg",
                imageinfo: [
                  {
                    mime: "image/jpeg",
                    thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/A.jpg/800px-A.jpg",
                  },
                ],
              },
              {
                title: "File:B.jpg",
                imageinfo: [
                  {
                    mime: "image/jpeg",
                    thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/B.jpg/800px-B.jpg",
                  },
                ],
              },
            ],
          },
        }),
      }),
    );
    const u0 = await fetchStockImageUrl("rose bouquet", { width: 800, height: 600 }, 0);
    const u1 = await fetchStockImageUrl("rose bouquet", { width: 800, height: 600 }, 1);
    expect(u0).toContain("800px-A.jpg");
    expect(u1).toContain("800px-B.jpg");
    expect(u0).not.toBe(u1);
  });

  it("fetchStockImageUrl использует Openverse при ответе API", async () => {
    vi.stubEnv("IMAGE_COMMONS_STOCK", "false");
    delete process.env.IMAGE_OPENVERSE_STOCK;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ url: "https://live.staticflickr.com/example/photo.jpg", mature: false }],
        }),
      }),
    );
    const u = await fetchStockImageUrl("bridge", { width: 1200, height: 800 });
    expect(u).toContain("staticflickr.com");
  });
});
